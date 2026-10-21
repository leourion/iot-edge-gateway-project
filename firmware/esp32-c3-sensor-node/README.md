# ESP32-C3 Sensor Node (#1)

Arduino sketch for the paper warehouse monitor's sensor board.

## Pin map

| Part | ESP32-C3 connection |
| --- | --- |
| DHT11 VCC / GND / DATA | 3V3 / GND / GPIO4 |
| Rain sensor VCC / GND / DO | 3V3 / GND / GPIO5 |
| Warning LED anode | GPIO6 through a 220–1,000 Ω resistor |
| Warning LED cathode | GND |

The water input is active-low: LOW means water detected. GPIO5 uses the internal pull-up so an unplugged sensor defaults to dry rather than floating. The LED turns on while water is detected.

## Build and upload

1. Select **ESP32C3 Dev Module** in Arduino IDE and select the board's serial port.
2. Install **DHT sensor library by Adafruit** and **PubSubClient** from Arduino Library Manager. Install **Adafruit Unified Sensor** if Library Manager requests it.
3. Fill in the 2.4 GHz Wi-Fi name and password in `secrets.h`. The MQTT host is prefilled with `192.168.43.48`, the computer's current LAN address.
4. Open `esp32-c3-sensor-node.ino`, upload it, and open Serial Monitor at 115200 baud.

The node publishes `iot/devices/esp32_001/telemetry` to the local broker for NestJS ingestion and the dashboard. It broadcasts the packed `SensorMessage` to ESP32 #2 over ESP-NOW, then receives a separate `RelayFeedbackMessage` from #2. The telemetry JSON keeps `relayStatus` as the fan command and adds nullable `relayActualStatus`, which is the GPIO4 output reported by #2. If feedback is missing for ten seconds, it publishes `null`. This confirms the output level applied by the relay-node firmware, not the relay contacts or fan rotation.

When joined to Wi-Fi, both nodes use the access point's 2.4 GHz channel. Without Wi-Fi credentials, they fall back to ESP-NOW channel 1 and MQTT is disabled.

Fan control turns on at 30 °C or 75% RH, and turns off once temperature is at or below 28 °C and humidity is at or below 70%.

Do not commit `secrets.h`; it is ignored by Git. MQTT is plain TCP on the local network in this setup.
