# Warehouse Environment AI Service

FastAPI inference service for an unsupervised Isolation Forest trained on reviewed, normal warehouse telemetry. It learns the joint temperature/humidity baseline; an independent safety rule raises a critical result whenever the water sensor reports water. It does not switch a relay.

## Important: train with project data

There is intentionally no bundled model or fabricated training dataset. A model is not considered ready until you train it on real, dry readings collected in the paper warehouse. The trainer holds out the latest 20% of the time-ordered normal readings to calibrate the anomaly cutoff. This is an unsupervised baseline, so the configured false-positive rate is a calibration target, **not a measured accuracy score**. To report precision/recall or claim accuracy, separately label abnormal events and evaluate against those labels.

The trainer requires at least 500 dry readings, including at least 100 in its chronological validation split. For a more stable 1% cutoff, collect several days and aim for 5,000+ reviewed normal readings; sample at a sensible interval (for example once per minute) so adjacent sensor values are not treated as independent evidence. Keep known incidents out of the normal baseline; the trainer skips rows with `water_detected=true`.

## Training CSV

Required columns (extra columns are ignored):

```csv
observed_at,temperature,humidity,water_detected
2026-10-03T08:00:00Z,28.6,70.9,false
```

Export the project's reviewed telemetry from PostgreSQL to CSV. One option in `psql` is:

```sql
\copy (SELECT "observedAt" AS observed_at, temperature, humidity, "waterDetected" AS water_detected FROM telemetry_readings ORDER BY "observedAt") TO 'warehouse-baseline.csv' CSV HEADER
```

Review the exported rows before training. Remove known abnormal periods from the baseline; the water sensor is still handled as a critical rule at inference time.

## Train and run locally

```bash
cd apps/ai-service
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python -m src.services.train_model warehouse-baseline.csv
uvicorn src.main:app --reload --port 8000
```

The model artifact is written to `models/environment-isolation-forest.joblib` and is ignored by Git. Set `AI_MODEL_PATH` to load it from another location. `AI_TARGET_FALSE_POSITIVE_RATE` defaults to `0.01`; tune only after evaluating labeled incidents and normal readings.

When the service runs in Docker Compose, the model directory is mounted from `apps/ai-service/models`. Train the artifact first, then restart the service:

```bash
docker compose up -d --build ai-service
```

## API

- `GET /health`: reports `model_ready` and loaded model version; status is `degraded` when no trained artifact is available.
- `POST /predict`: scores a single telemetry record.

Example request:

```json
{
  "device_id": "esp32_001",
  "temperature": 29.3,
  "humidity": 56,
  "water_detected": false,
  "relay_status": "OFF",
  "observed_at": "2026-10-03T08:00:00.000Z"
}
```

Without a model, `/predict` returns HTTP 503. NestJS records AI as unavailable while still storing telemetry. On a wet reading, the service returns a critical risk directly; recommendations remain informational and relay control stays with the project's explicit automation rules.

## Evaluate before reporting model quality

Use a separate, manually reviewed CSV containing the required telemetry columns plus `is_anomaly` (`true` for a known abnormal event, `false` for normal). Do not use those labels as the normal training baseline. Run:

```bash
python -m src.services.evaluate_model labeled-evaluation.csv
```

The command reports accuracy, precision, recall, F1, and the confusion matrix. Report the test period and sample counts with these metrics; do not call the target false-positive rate a measured accuracy.
