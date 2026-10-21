# ESP32 Relay Node (#2)

Receives the packed ESP-NOW `SensorMessage` broadcast by `esp32-c3-sensor-node`, drives a 5 V relay module, and broadcasts a `RelayFeedbackMessage` acknowledgement. The relay output is GPIO4 and defaults to active-low. If your relay module is active-high, change `RELAY_ACTIVE_LOW` in the sketch.

## Wiring

| Relay module | ESP32 #2 |
| --- | --- |
| DC+ | 5V/VIN |
| DC- | GND |
| IN | GPIO4 |

Leave relay contacts NO and COM disconnected during the first test. This lets you check the relay module's indicator/click without a load connected. When a suitable low-voltage DC fan is available, wire its supply through COM and NO according to the fan's voltage and current rating. Do not use mains voltage for this classroom test.

## Build and test

1. Copy `secrets.h.example` to `secrets.h` and enter the same 2.4 GHz Wi-Fi/hotspot credentials used by ESP32 #1. Do not commit `secrets.h`.
2. In Arduino IDE, select the correct board for ESP32 #2, open `esp32-relay-node.ino`, and upload it.
3. Open Serial Monitor at 115200 baud. It should report its Wi-Fi/ESP-NOW channel and `relay starts OFF`.
4. Power ESP32 #1 and ESP32 #2 together. ESP32 #2 should print `Received: ...` and relay state changes; ESP32 #1 should print `Relay node feedback: GPIO4=ON/OFF` after each acknowledgement.
5. If no messages arrive, verify both boards joined the same access point and report the same channel. Without Wi-Fi credentials, this receiver stays on channel 1, which must match ESP32 #1's fallback channel.

If Wi-Fi disconnects, the receiver retries every ten seconds and follows the access point's channel after reconnecting. A loose power cable can still reset or power off the board; software cannot reconnect while it has no power. The receiver turns the relay off if no valid ESP-NOW message arrives for ten seconds, then reports that output change if radio communication is available. Feedback represents the GPIO output, not measured relay contacts or fan rotation.
