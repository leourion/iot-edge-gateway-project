## 1. Cài đặt Mosquitto
```bash
sudo apt update
sudo apt install mosquitto mosquitto-clients
sudo systemctl enable --now mosquitto

# Tạo user gateway
sudo mosquitto_passwd -c /etc/mosquitto/passwd gateway

# Cấu hình TLS
sudo tee /etc/mosquitto/conf.d/iot.conf <<'EOF'
listener 8883
allow_anonymous false
password_file /etc/mosquitto/passwd

cafile /etc/letsencrypt/live/mqtt.example.com/chain.pem
certfile /etc/letsencrypt/live/mqtt.example.com/cert.pem
keyfile /etc/letsencrypt/live/mqtt.example.com/privkey.pem

persistence true
persistence_location /var/lib/mosquitto/
EOF

sudo systemctl restart mosquitto
```
## 2.Cấu hình Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 8883/tcp
sudo ufw enable
```
