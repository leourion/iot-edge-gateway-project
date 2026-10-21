# Cây MQTT topic

Tài liệu này mô tả các topic MQTT trong firmware ESP32 và backend NestJS. Hệ thống dùng hai broker khác nhau: Mosquitto local trên máy gateway và Mosquitto trên EC2.

**CloudBridge không phải một máy chủ riêng.** Đây là module/service chạy bên trong tiến trình NestJS. NestJS kết nối tới broker local; CloudBridge mở một kết nối MQTT/TLS outbound thứ hai từ NestJS tới broker EC2 để gửi bản sao telemetry đã xử lý.

## 1. Sơ đồ topic

```text
BROKER LOCAL — Mosquitto trong Docker, TCP :1883
│  ESP32-1 và NestJS kết nối qua mạng LAN
└── iot/
    └── devices/
        └── {deviceId}/
            ├── telemetry   ESP32-1 publish → NestJS subscribe
            └── control     NestJS publish → ESP32-1 subscribe

BROKER CLOUD — Mosquitto trên Ubuntu EC2, TLS :8883
│  Kết nối outbound do CloudBridge module bên trong NestJS mở
└── cloud/
    └── iot/
        ├── devices/
        │   └── {deviceId}/
        │       └── telemetry   CloudBridge (trong NestJS) publish → broker EC2
        └── gateways/
            └── {gatewayId}/
                └── status      CloudBridge (trong NestJS) publish → broker EC2
```

`{deviceId}` và `{gatewayId}` là chỗ thay bằng mã thực tế, không gửi nguyên dấu ngoặc nhọn. Ví dụ hiện tại: `esp32_001` và `edge-gateway-001`.

Đọc mũi tên “CloudBridge publish → broker EC2” như sau: **NestJS đang chạy ở máy gateway; module CloudBridge bên trong NestJS làm MQTT client và chủ động kết nối ra EC2.** EC2 không chạy NestJS/CloudBridge trong kiến trúc hiện tại; EC2 chỉ chạy Mosquitto MQTT broker.

## 2. Broker local: telemetry thiết bị

**Topic:** `iot/devices/{deviceId}/telemetry`

**Ví dụ:** `iot/devices/esp32_001/telemetry`

- **Publisher:** ESP32-C3 số 1, node đọc cảm biến.
- **Subscriber:** MQTT service trong NestJS subscribe wildcard `iot/devices/+/telemetry` để nhận telemetry của các device.
- **Broker:** Mosquitto trong Docker trên máy gateway, TCP cổng 1883.
- **QoS:** 0 theo mặc định của PubSubClient trong firmware.
- **Retain:** tắt; subscriber mới không tự nhận bản telemetry cuối từ broker.
- **Tác dụng:** chuyển readings sang NestJS để cập nhật trạng thái thiết bị, gọi AI, lưu PostgreSQL, đánh giá alert và yêu cầu CloudBridge gửi bản đã xử lý lên cloud.
- **Chu kỳ:** khoảng 2 giây khi Wi-Fi và MQTT đang kết nối.

Payload hiện tại:

```json
{
  "temperature": 29.7,
  "humidity": 54.6,
  "relayStatus": "ON",
  "relayActualStatus": "ON",
  "waterDetected": false
}
```

- `temperature`, `humidity`: số đo DHT11.
- `relayStatus`: lệnh quạt do ESP32-1 tính tự động hoặc nhận từ lệnh tay; đây không phải phản hồi relay.
- `relayActualStatus`: mức GPIO relay ESP32-2 phản hồi qua ESP-NOW rồi được ESP32-1 đưa vào telemetry. Giá trị có thể là `null` khi chưa có feedback mới. Nó xác nhận mức output phần mềm, không đo tiếp điểm relay hay vòng quay quạt.
- `waterDetected`: kết quả digital của cảm biến nước/mưa.
- Firmware hiện không gửi timestamp; backend dùng thời điểm nhận làm thời điểm telemetry.

NestJS lấy device ID ở cấp thứ ba của topic: `esp32_001` từ `iot/devices/esp32_001/telemetry`. Payload sai định dạng hoặc thiếu trường bắt buộc sẽ bị bỏ qua.

## 3. Broker local: lệnh điều khiển

**Topic:** `iot/devices/{deviceId}/control`

**Ví dụ:** `iot/devices/esp32_001/control`

- **Nguồn lệnh:** nút Bật/Tắt/Tự động trên dashboard gọi `POST /devices/{deviceId}/control/relay` tới NestJS.
- **Publisher MQTT:** MQTT service trong NestJS publish chuỗi `ON`, `OFF` hoặc `AUTO` lên local broker.
- **Subscriber:** ESP32-C3 số 1 subscribe topic riêng của nó sau khi kết nối local MQTT.
- **QoS:** 1. Xác nhận ở tầng MQTT/broker không đồng nghĩa ESP32 đã thực hiện lệnh.
- **Retain:** tắt; broker không giữ lệnh để gửi cho board khi nó subscribe lại sau này.
- **Sau khi nhận lệnh:** ESP32-1 cập nhật chế độ điều khiển và gửi trạng thái ON/OFF tiếp theo tới ESP32-2 bằng ESP-NOW.

Ý nghĩa ba payload:

- `ON`: giữ quạt bật bằng override tay.
- `OFF`: giữ quạt tắt bằng override tay, kể cả khi cảm biến vượt ngưỡng tự động.
- `AUTO`: xóa override tay và để hysteresis cảm biến điều khiển lại. Nếu nhiệt độ ≥30°C hoặc RH ≥75%, quạt sẽ bật ở vòng xử lý kế tiếp.

Override được giữ trong RAM đến khi chọn AUTO hoặc ESP32-1 khởi động lại. API hiện trả `queued: true` khi broker nhận publish; hiện chưa có MQTT ACK riêng từ ESP32 xác nhận đã xử lý. Cần xem log Serial hoặc telemetry/feedback kế tiếp để kiểm tra kết quả.

## 4. Broker cloud: topic do CloudBridge publish

### Telemetry đã qua backend

**Topic:** `cloud/iot/devices/{deviceId}/telemetry`

**Ví dụ:** `cloud/iot/devices/esp32_001/telemetry`

- **Publisher:** CloudBridge service nằm bên trong ứng dụng NestJS.
- **Luồng kết nối:** NestJS mở kết nối MQTT/TLS outbound tới Mosquitto trên EC2 (`mqtt.cloudbridge.id.vn:8883`) rồi publish topic này.
- **Nguồn dữ liệu:** reading ESP32-1 gửi qua broker local; NestJS đã gọi AI, lưu reading và đánh giá automation trước khi gọi CloudBridge.
- **Subscriber:** consumer cloud bên ngoài nếu được cấu hình để subscribe. Trong luồng project hiện tại, NestJS publish lên topic này; không có consumer cloud cụ thể được cấu hình trong repo.
- **QoS:** 1.
- **Retain:** tắt.

JSON gồm `schemaVersion`, `gatewayId`, `deviceId`, `telemetryId`, số đo, lệnh relay, feedback GPIO, trạng thái nước, thời điểm đo/nhận và object `ai` (anomaly, risk level, score, gợi ý, lý do, model version).

### Trạng thái gateway

**Topic:** `cloud/iot/gateways/{gatewayId}/status`

**Ví dụ:** `cloud/iot/gateways/edge-gateway-001/status`

- **Publisher:** CloudBridge bên trong NestJS khi kết nối thành công với EC2 Mosquitto.
- **Payload:** JSON có `schemaVersion`, `gatewayId`, `status`, `timestamp`.
- **QoS:** 1; **Retain:** bật để subscriber mới nhận trạng thái gần nhất.
- **Giới hạn hiện tại:** code publish `ONLINE` sau khi kết nối; chưa xử lý publish `OFFLINE` đáng tin cậy khi tiến trình/máy mất điện hoặc mất mạng đột ngột.

## 5. MQTT khác ESP-NOW thế nào?

ESP-NOW không phải topic và không qua broker. Đây là liên kết radio trực tiếp giữa hai board:

```text
ESP32-1 -- SensorMessage: lệnh quạt, nước, nhiệt độ, độ ẩm --> ESP32-2
ESP32-1 <-- RelayFeedbackMessage: mức GPIO relay ------------- ESP32-2
```

Vì thế điều khiển dashboard đi theo chuỗi: REST → NestJS → MQTT local → ESP32-1 → ESP-NOW → ESP32-2 → relay. Feedback quay ngược ESP-NOW về ESP32-1, rồi được đưa vào telemetry MQTT kế tiếp. Failsafe và feedback ESP-NOW không có topic riêng.

## 6. Wildcard và cách đọc tên topic

Topic MQTT là các cấp văn bản phân cách bằng `/`. Ví dụ `iot/devices/esp32_001/telemetry` gồm bốn cấp: `iot`, `devices`, `esp32_001`, `telemetry`.

- `+` khớp đúng một cấp trong subscription filter. `iot/devices/+/telemetry` nhận device ID ở cấp thứ ba.
- `#` khớp không hoặc nhiều cấp và thường đặt cuối filter. `cloud/iot/#` nhận các topic dưới `cloud/iot/`.
- Publisher gửi topic đầy đủ, không gửi wildcard. Wildcard chỉ dùng để subscribe.
- `{deviceId}` trong tài liệu là placeholder; không đưa dấu ngoặc nhọn vào topic thật.
- **QoS** (Quality of Service) là mức đảm bảo giao nhận của MQTT. QoS 0 gửi một lần, không có xác nhận ở tầng MQTT; QoS 1 yêu cầu broker xác nhận đã nhận message. QoS 1 không chứng minh ứng dụng ESP32 đã xử lý lệnh.
- **Retain** quyết định broker có giữ lại message mới nhất của topic để gửi cho subscriber vừa kết nối hay không. Lệnh điều khiển hiện tắt retain để không phát lại lệnh cũ khi ESP32 subscribe lại.

## 7. Cấu hình liên quan

- `DEVICE_ID` trong `firmware/esp32-c3-sensor-node/secrets.h` quyết định device ID trong telemetry và control topic.
- NestJS local broker URL lấy từ `MQTT_URL`; telemetry subscription filter lấy từ `MQTT_TELEMETRY_TOPIC`, mặc định `iot/devices/+/telemetry`.
- CloudBridge đọc `CLOUD_MQTT_ENABLED`, `CLOUD_MQTT_URL`, `CLOUD_MQTT_USERNAME`, `CLOUD_MQTT_PASSWORD`, `CLOUD_MQTT_CLIENT_ID`, `CLOUD_MQTT_RECONNECT_MS`; gateway ID lấy từ `GATEWAY_ID`.
- Giá trị bí mật nằm trong `.env` và `secrets.h` cục bộ. Không commit lên Git hoặc gửi lên chat.

## 8. Kiểm tra nhanh lệnh Tắt

1. ESP32-1 khởi động, kết nối local MQTT và in dòng đã subscribe `iot/devices/esp32_001/control`.
2. Bấm Tắt: ESP32-1 cần in `Dashboard command: manual fan OFF`.
3. Lần ESP-NOW tiếp theo gửi `Fan command: OFF`; ESP32-2 nhận `fan=OFF` và đặt relay OFF.
4. HTTP response `queued: true` chỉ xác nhận NestJS/broker nhận publish, không xác nhận các bước 2–3.
