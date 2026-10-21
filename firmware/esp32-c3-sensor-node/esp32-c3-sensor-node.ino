#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <DHT.h>
#include <PubSubClient.h>
#include <string.h>
#include "secrets.h"

// ANMOC - ESP32-C3 #1: reads warehouse sensors, lights the warning LED,
// and broadcasts fan commands to ESP32 #2 over ESP-NOW.
constexpr uint8_t WIFI_CHANNEL_FALLBACK = 1;
constexpr uint8_t WATER_PIN = 5;           // Rain sensor digital output (DO)
constexpr uint8_t DHT_PIN = 4;             // DHT11 data
constexpr uint8_t LED_PIN = 6;             // External LED through a resistor
constexpr uint8_t DHT_TYPE = DHT11;

constexpr bool WATER_ACTIVE_LOW = true;    // This sensor reports LOW when wet
constexpr float TEMP_ON_C = 30.0f;
constexpr float TEMP_OFF_C = 28.0f;        // Hysteresis prevents fan chatter
constexpr float HUMIDITY_ON_PERCENT = 75.0f;
constexpr float HUMIDITY_OFF_PERCENT = 70.0f;
constexpr uint32_t SEND_INTERVAL_MS = 2000;

enum class FanControlMode : uint8_t { Automatic, ForceOn, ForceOff };

struct __attribute__((packed)) SensorMessage {
  uint32_t magic;
  uint8_t fanOn;
  uint8_t waterDetected;
  float temperatureC;
  float humidityPercent;
};

constexpr uint32_t MESSAGE_MAGIC = 0x414E4D43; // "ANMC"
constexpr uint32_t RELAY_FEEDBACK_MAGIC = 0x414E5246; // Must match ESP32 #2 ("ANRF")
const uint8_t BROADCAST_ADDRESS[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};

struct __attribute__((packed)) RelayFeedbackMessage {
  uint32_t magic;
  uint8_t relayOn;
};

DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient networkClient;
PubSubClient mqttClient(networkClient);
bool fanOn = false;
FanControlMode fanControlMode = FanControlMode::Automatic;
uint32_t lastSend = 0;
uint32_t lastMqttAttempt = 0;
uint32_t lastWifiAttempt = 0;
uint8_t activeWifiChannel = WIFI_CHANNEL_FALLBACK;
portMUX_TYPE relayFeedbackMux = portMUX_INITIALIZER_UNLOCKED;
volatile uint8_t relayNodeOutput = 2; // 0=OFF, 1=ON, 2=unknown
volatile uint32_t lastRelayFeedbackMs = 0;

constexpr char TELEMETRY_TOPIC[] = "iot/devices/" DEVICE_ID "/telemetry";
constexpr char CONTROL_TOPIC[] = "iot/devices/" DEVICE_ID "/control";

void onMqttMessage(char* topic, byte* payload, unsigned int length);

void setupNetwork() {
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
    Serial.printf("Wi-Fi connected at %s; ESP-NOW channel is %u\n",
                  WiFi.localIP().toString().c_str(), activeWifiChannel);
  } else {
    WiFi.disconnect();
    activeWifiChannel = WIFI_CHANNEL_FALLBACK;
    const esp_err_t channelResult = esp_wifi_set_channel(activeWifiChannel, WIFI_SECOND_CHAN_NONE);
    if (channelResult != ESP_OK) {
      Serial.printf("Could not set fallback Wi-Fi channel: %d\n", channelResult);
      while (true) delay(1000);
    }
    if (strlen(WIFI_SSID) > 0) {
      Serial.println("Wi-Fi unavailable; sensor and ESP-NOW mode will continue.");
    } else {
      Serial.println("Wi-Fi credentials are empty; MQTT is disabled.");
    }
  }

  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setBufferSize(256);
  mqttClient.setKeepAlive(20);
  mqttClient.setCallback(onMqttMessage);
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  if (strcmp(topic, CONTROL_TOPIC) != 0) return;

  if (length == 2 && memcmp(payload, "ON", 2) == 0) {
    fanControlMode = FanControlMode::ForceOn;
    fanOn = true;
    Serial.println("Dashboard command: manual fan ON");
  } else if (length == 3 && memcmp(payload, "OFF", 3) == 0) {
    fanControlMode = FanControlMode::ForceOff;
    fanOn = false;
    Serial.println("Dashboard command: manual fan OFF");
  } else if (length == 4 && memcmp(payload, "AUTO", 4) == 0) {
    fanControlMode = FanControlMode::Automatic;
    Serial.println("Dashboard command: automatic control resumed");
  } else {
    Serial.println("Ignored invalid dashboard relay command");
  }
}

void handleRelayFeedback(const uint8_t* data, int length) {
  if (length != sizeof(RelayFeedbackMessage)) return;

  RelayFeedbackMessage feedback;
  memcpy(&feedback, data, sizeof(feedback));
  if (feedback.magic != RELAY_FEEDBACK_MAGIC || feedback.relayOn > 1) return;

  portENTER_CRITICAL(&relayFeedbackMux);
  relayNodeOutput = feedback.relayOn;
  lastRelayFeedbackMs = millis();
  portEXIT_CRITICAL(&relayFeedbackMux);
  Serial.printf("Relay node feedback: GPIO4=%s\n", feedback.relayOn ? "ON" : "OFF");
}

#if ESP_IDF_VERSION_MAJOR >= 5
void onRelayFeedback(const esp_now_recv_info_t*, const uint8_t* data, int length) {
  handleRelayFeedback(data, length);
}
#else
void onRelayFeedback(const uint8_t*, const uint8_t* data, int length) {
  handleRelayFeedback(data, length);
}
#endif

void setupEspNow() {
  Serial.print("ESP32 #1 MAC: ");
  Serial.println(WiFi.macAddress());

  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed; restart the board.");
    while (true) delay(1000);
  }

  esp_now_peer_info_t peer{};
  memcpy(peer.peer_addr, BROADCAST_ADDRESS, sizeof(BROADCAST_ADDRESS));
  peer.channel = 0; // Follow the current Wi-Fi channel if the AP channel changes.
  peer.encrypt = false;

  if (esp_now_add_peer(&peer) != ESP_OK) {
    Serial.println("Could not add ESP-NOW broadcast peer.");
    while (true) delay(1000);
  }
  esp_now_register_recv_cb(onRelayFeedback);
}

void maintainMqttConnection() {
  if (WiFi.status() != WL_CONNECTED) {
    const uint32_t now = millis();
    if (strlen(WIFI_SSID) > 0 && now - lastWifiAttempt >= 10000) {
      lastWifiAttempt = now;
      WiFi.reconnect();
    }
    return;
  }
  if (mqttClient.connected()) {
    mqttClient.loop();
    return;
  }

  const uint32_t now = millis();
  if (now - lastMqttAttempt < 5000) return;
  lastMqttAttempt = now;

  const bool connected = strlen(MQTT_USERNAME) > 0
      ? mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD)
      : mqttClient.connect(MQTT_CLIENT_ID);
  if (connected) {
    Serial.printf("Connected to local MQTT broker at %s:%u\n", MQTT_HOST, MQTT_PORT);
    if (mqttClient.subscribe(CONTROL_TOPIC, 1)) {
      Serial.printf("Subscribed to relay control topic %s\n", CONTROL_TOPIC);
    } else {
      Serial.printf("Could not subscribe to relay control topic %s\n", CONTROL_TOPIC);
    }
  } else {
    Serial.printf("Local MQTT connection failed, state=%d\n", mqttClient.state());
  }
}

bool readWaterDetected() {
  const int waterLevel = digitalRead(WATER_PIN);
  return waterLevel == (WATER_ACTIVE_LOW ? LOW : HIGH);
}

void updateFanCommand(float temperature, float humidity, bool readingsValid) {
  if (fanControlMode == FanControlMode::ForceOn) {
    fanOn = true;
    return;
  }
  if (fanControlMode == FanControlMode::ForceOff) {
    fanOn = false;
    return;
  }
  if (!readingsValid) return;

  if (!fanOn && (temperature >= TEMP_ON_C || humidity >= HUMIDITY_ON_PERCENT)) {
    fanOn = true;
  } else if (fanOn && temperature <= TEMP_OFF_C && humidity <= HUMIDITY_OFF_PERCENT) {
    fanOn = false;
  }
}

void sendSensorMessage(bool waterDetected, float temperature, float humidity) {
  const SensorMessage message{
      MESSAGE_MAGIC,
      static_cast<uint8_t>(fanOn),
      static_cast<uint8_t>(waterDetected),
      temperature,
      humidity,
  };

  const esp_err_t result = esp_now_send(
      BROADCAST_ADDRESS,
      reinterpret_cast<const uint8_t*>(&message),
      sizeof(message));

  Serial.printf("[%lu ms] Water: %s | T: ",
                static_cast<unsigned long>(millis()),
                waterDetected ? "DETECTED" : "dry");
  if (!isnan(temperature) && !isnan(humidity)) {
    Serial.printf("%.1f C | RH: %.1f%%", temperature, humidity);
  } else {
    Serial.print("sensor error");
  }
  Serial.printf(" | Fan command: %s | Send: %s\n",
                fanOn ? "ON" : "OFF",
                result == ESP_OK ? "queued" : "failed");
}

void publishTelemetry(bool waterDetected, float temperature, float humidity) {
  if (!mqttClient.connected() || isnan(temperature) || isnan(humidity)) return;

  uint8_t reportedRelayOutput;
  uint32_t feedbackAt;
  portENTER_CRITICAL(&relayFeedbackMux);
  reportedRelayOutput = relayNodeOutput;
  feedbackAt = lastRelayFeedbackMs;
  portEXIT_CRITICAL(&relayFeedbackMux);
  const bool feedbackFresh = feedbackAt != 0 && millis() - feedbackAt <= 10000;
  const char* relayActualStatus = !feedbackFresh ? "null" : (reportedRelayOutput ? "\"ON\"" : "\"OFF\"");

  char payload[224];
  snprintf(payload, sizeof(payload),
           "{\"temperature\":%.1f,\"humidity\":%.1f,\"relayStatus\":\"%s\",\"relayActualStatus\":%s,\"waterDetected\":%s}",
           temperature,
           humidity,
           fanOn ? "ON" : "OFF",
           relayActualStatus,
           waterDetected ? "true" : "false");

  if (!mqttClient.publish(TELEMETRY_TOPIC, payload, false)) {
    Serial.println("MQTT telemetry publish failed.");
  }
}

void setup() {
  Serial.begin(115200);

  // The rain-sensor output is active-low. Pull the pin high so a disconnected
  // sensor does not leave GPIO5 floating and falsely report water detected.
  pinMode(WATER_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  dht.begin();

  setupNetwork();
  setupEspNow();
  Serial.println("ANMOC ESP32-C3 #1 ready.");
}

void loop() {
  maintainMqttConnection();

  const uint32_t now = millis();
  if (now - lastSend < SEND_INTERVAL_MS) {
    delay(10);
    return;
  }
  lastSend = now;

  const bool waterDetected = readWaterDetected();
  digitalWrite(LED_PIN, waterDetected ? HIGH : LOW);

  const float temperature = dht.readTemperature();
  const float humidity = dht.readHumidity();
  const bool readingsValid = !isnan(temperature) && !isnan(humidity);
  updateFanCommand(temperature, humidity, readingsValid);
  sendSensorMessage(waterDetected, temperature, humidity);
  publishTelemetry(waterDetected, temperature, humidity);
}
