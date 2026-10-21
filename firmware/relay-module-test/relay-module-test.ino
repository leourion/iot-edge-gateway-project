// Standalone relay test for ESP32 / ESP32-C3.
// Disconnect NO and COM from any load while testing.

constexpr uint8_t RELAY_PIN = 4;
constexpr bool RELAY_ACTIVE_LOW = true;  // Change to false only if the module is active-high.
constexpr uint32_t SWITCH_INTERVAL_MS = 3000;

bool relayOn = false;
uint32_t lastSwitchMs = 0;

void setRelay(bool on) {
  const uint8_t onLevel = RELAY_ACTIVE_LOW ? LOW : HIGH;
  const uint8_t offLevel = RELAY_ACTIVE_LOW ? HIGH : LOW;
  digitalWrite(RELAY_PIN, on ? onLevel : offLevel);
  relayOn = on;
  Serial.printf("Relay command: %s (GPIO%d=%s)\n",
                relayOn ? "ON" : "OFF",
                RELAY_PIN,
                (on == RELAY_ACTIVE_LOW) ? "LOW" : "HIGH");
}

void setup() {
  Serial.begin(115200);

  // Drive the inactive level as soon as the pin becomes an output.
  const uint8_t offLevel = RELAY_ACTIVE_LOW ? HIGH : LOW;
  digitalWrite(RELAY_PIN, offLevel);
  pinMode(RELAY_PIN, OUTPUT);
  setRelay(false);

  lastSwitchMs = millis();
  Serial.println("Standalone relay test started; state changes every 3 seconds.");
}

void loop() {
  const uint32_t now = millis();
  if (now - lastSwitchMs < SWITCH_INTERVAL_MS) return;

  lastSwitchMs = now;
  setRelay(!relayOn);
}
