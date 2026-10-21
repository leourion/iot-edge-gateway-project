# Standalone Relay Test

This sketch isolates relay wiring/polarity from Wi-Fi and ESP-NOW. It toggles GPIO4 between OFF and ON every three seconds and prints each command at 115200 baud.

## Wiring

- Relay `DC+` -> ESP32 `5V/VIN`
- Relay `DC-` -> ESP32 `GND`
- Relay `IN` -> ESP32 `GPIO4`
- Keep relay contacts `NO` and `COM` disconnected from loads during the test.

## Run

1. Open `relay-module-test.ino` in Arduino IDE, select the correct ESP32 board and ESP32 #2's serial port, then upload.
2. Open Serial Monitor at 115200 baud. The log alternates `Relay command: OFF` and `Relay command: ON` every three seconds.
3. The relay should click/change its status indicator once per transition. The board's power LED should remain lit. The relay module's status LED may be inverse to the printed state.
4. If the log alternates but the relay never clicks, change `RELAY_ACTIVE_LOW` from `true` to `false`, upload again, and repeat. Do not change the constant if the relay clicks on either polarity.

After the test, upload `firmware/esp32-relay-node/esp32-relay-node.ino` again to restore the ESP-NOW receiver firmware.
