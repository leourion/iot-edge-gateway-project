#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <string.h>
#include "secrets.h"

// ANMOC - ESP32 #2: receives fan commands from ESP32-C3 #1 and drives a relay.
constexpr uint8_t RELAY_PIN = 4;
constexpr bool RELAY_ACTIVE_LOW = false;  // This module appears to be configured for active HIGH
constexpr uint8_t WIFI_CHANNEL_FALLBACK = 1;
constexpr uint32_t FAILSAFE_MS = 10000;    // Tolerate brief ESP-NOW gaps; then turn relay off
constexpr uint32_t MESSAGE_MAGIC = 0x414E4D43; // Must match ESP32 #1 ("ANMC")
constexpr uint32_t RELAY_FEEDBACK_MAGIC = 0x414E5246; // "ANRF"
const uint8_t BROADCAST_ADDRESS[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};

struct __attribute__((packed)) SensorMessage {
  uint32_t magic;
  uint8_t fanOn;
  uint8_t waterDetected;
  float temperatureC;
  float humidityPercent;
};

struct __attribute__((packed)) RelayFeedbackMessage {
  uint32_t magic;
  uint8_t relayOn;
};

portMUX_TYPE stateMux = portMUX_INITIALIZER_UNLOCKED;
volatile bool requestedFanOn = false;
volatile uint32_t lastPacketMs = 0;
volatile bool feedbackPending = false;
volatile bool receiveLogPending = false;
SensorMessage lastReceivedMessage{};
volatile uint32_t lastPacketGapMs = 0;
bool actualFanOn = false;
uint8_t activeWifiChannel = WIFI_CHANNEL_FALLBACK;
uint32_t lastWifiAttemptMs = 0;

void applyFan(bool on) {
  actualFanOn = on;
  const uint8_t onLevel = RELAY_ACTIVE_LOW ? LOW : HIGH;
  const uint8_t offLevel = RELAY_ACTIVE_LOW ? HIGH : LOW;
  digitalWrite(RELAY_PIN, on ? onLevel : offLevel);
}

void handlePacket(const uint8_t* data, int length) {
  if (length != sizeof(SensorMessage)) return;

  SensorMessage message;
  memcpy(&message, data, sizeof(message));
  if (message.magic != MESSAGE_MAGIC || message.fanOn > 1) return;

  portENTER_CRITICAL(&stateMux);
  requestedFanOn = message.fanOn != 0;
  const uint32_t receivedAt = millis();
  if (lastPacketMs != 0) lastPacketGapMs = receivedAt - lastPacketMs;
  lastPacketMs = receivedAt;
  lastReceivedMessage = message;
  receiveLogPending = true;
  feedbackPending = true;
  portEXIT_CRITICAL(&stateMux);
}

#if ESP_IDF_VERSION_MAJOR >= 5
void onReceive(const esp_now_recv_info_t*, const uint8_t* data, int length) {
  handlePacket(data, length);
}
#else
void onReceive(const uint8_t*, const uint8_t* data, int length) {
  handlePacket(data, length);
}
#endif

void connectToSensorWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);

  if (strlen(WIFI_SSID) > 0) {
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print("Connecting to Wi-Fi");
    const uint32_t startedAt = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 15000) {
      Serial.print('.');
      delay(500);
    }
    Serial.println();
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifi_second_chan_t secondaryChannel;
    esp_wifi_get_channel(&activeWifiChannel, &secondaryChannel);
    Serial.printf("Wi-Fi connected; ESP-NOW channel is %u\n", activeWifiChannel);
  } else {
    WiFi.disconnect();
    const esp_err_t result = esp_wifi_set_channel(WIFI_CHANNEL_FALLBACK, WIFI_SECOND_CHAN_NONE);
    if (result != ESP_OK) {
      Serial.printf("Could not set fallback Wi-Fi channel: %d\n", result);
      while (true) delay(1000);
    }
    Serial.printf("Wi-Fi unavailable; listening on fallback channel %u\n", activeWifiChannel);
  }
  lastWifiAttemptMs = millis();
}

void maintainWifiConnection() {
  if (strlen(WIFI_SSID) == 0) return;

  if (WiFi.status() == WL_CONNECTED) {
    wifi_second_chan_t secondaryChannel;
    uint8_t channel;
    esp_wifi_get_channel(&channel, &secondaryChannel);
    if (channel != activeWifiChannel) {
      activeWifiChannel = channel;
      Serial.printf("Wi-Fi reconnected; ESP-NOW channel is %u\n", activeWifiChannel);
    }
    return;
  }

  const uint32_t now = millis();
  if (now - lastWifiAttemptMs < 10000) return;

  lastWifiAttemptMs = now;
  Serial.println("Wi-Fi disconnected; retrying connection...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void setup() {
  Serial.begin(115200);

  const uint8_t offLevel = RELAY_ACTIVE_LOW ? HIGH : LOW;
  digitalWrite(RELAY_PIN, offLevel);
  pinMode(RELAY_PIN, OUTPUT);
  applyFan(false);

  connectToSensorWifi();
  Serial.print("ESP32 #2 MAC: ");
  Serial.println(WiFi.macAddress());

  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed; restart the board.");
    while (true) delay(1000);
  }

  esp_now_peer_info_t broadcastPeer{};
  memcpy(broadcastPeer.peer_addr, BROADCAST_ADDRESS, sizeof(BROADCAST_ADDRESS));
  broadcastPeer.channel = 0; // Use the current station channel after Wi-Fi reconnects.
  broadcastPeer.encrypt = false;
  if (esp_now_add_peer(&broadcastPeer) != ESP_OK) {
    Serial.println("Could not add ESP-NOW feedback broadcast peer.");
    while (true) delay(1000);
  }

  esp_now_register_recv_cb(onReceive);
  Serial.println("ANMOC ESP32 #2 ready; relay starts OFF, waiting for ESP-NOW.");
}

void loop() {
  maintainWifiConnection();

  bool command;
  uint32_t packetTime;
  bool hasNewCommand;
  bool hasReceivedLog;
  SensorMessage receivedMessage;
  uint32_t packetGap;
  portENTER_CRITICAL(&stateMux);
  command = requestedFanOn;
  packetTime = lastPacketMs;
  hasNewCommand = feedbackPending;
  feedbackPending = false;
  hasReceivedLog = receiveLogPending;
  receivedMessage = lastReceivedMessage;
  packetGap = lastPacketGapMs;
  receiveLogPending = false;
  portEXIT_CRITICAL(&stateMux);

  // Print received-packet diagnostics from loop() so callback and failsafe
  // messages cannot race each other on Serial.
  if (hasReceivedLog) {
    Serial.printf("[%lu ms] Received: fan=%s, water=%s, T=%.1f C, RH=%.1f%%, packet gap=%lu ms\n",
                  static_cast<unsigned long>(packetTime),
                  receivedMessage.fanOn ? "ON" : "OFF",
                  receivedMessage.waterDetected ? "DETECTED" : "dry",
                  receivedMessage.temperatureC,
                  receivedMessage.humidityPercent,
                  static_cast<unsigned long>(packetGap));
  }

  bool communicationAlive = packetTime != 0 && millis() - packetTime <= FAILSAFE_MS;
  bool shouldTurnOn = communicationAlive && command;

  // A packet can arrive after the snapshot above but before we apply OFF.
  // Re-read the shared command/timestamp before a timeout-driven shutdown so
  // an already-arrived fresh packet does not get overridden by stale state.
  if (!shouldTurnOn && actualFanOn && !communicationAlive) {
    portENTER_CRITICAL(&stateMux);
    command = requestedFanOn;
    packetTime = lastPacketMs;
    portEXIT_CRITICAL(&stateMux);

    communicationAlive = packetTime != 0 && millis() - packetTime <= FAILSAFE_MS;
    shouldTurnOn = communicationAlive && command;
  }

  const bool outputChanged = actualFanOn != shouldTurnOn;
  if (outputChanged) {
    applyFan(shouldTurnOn);
    if (shouldTurnOn) {
      Serial.println("Relay: ON");
    } else if (communicationAlive) {
      Serial.println("Relay: OFF");
    } else {
      Serial.printf("Relay: OFF (failsafe; last valid ESP-NOW packet %lu ms ago)\n",
                    static_cast<unsigned long>(millis() - packetTime));
    }
  }

  // Acknowledge each received command and report failsafe-driven output changes.
  // This confirms the GPIO output state, not the relay contacts or fan rotation.
  if (hasNewCommand || outputChanged) {
    const RelayFeedbackMessage feedback{RELAY_FEEDBACK_MAGIC, static_cast<uint8_t>(actualFanOn)};
    const esp_err_t result = esp_now_send(
        BROADCAST_ADDRESS,
        reinterpret_cast<const uint8_t*>(&feedback),
        sizeof(feedback));
    if (result != ESP_OK) Serial.printf("Relay feedback send failed: %d\n", result);
  }
  delay(50);
}
