from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

from ..settings import settings

FEATURES = ("temperature", "humidity")
REQUIRED_COLUMNS = set(FEATURES) | {"water_detected", "observed_at"}
MINIMUM_ROWS = 500


def _parse_bool(value: str) -> bool:
    normalized = value.strip().lower()
    if normalized in {"true", "t", "1", "yes", "wet"}:
        return True
    if normalized in {"false", "f", "0", "no", "dry"}:
        return False
    raise ValueError(f"invalid water_detected value: {value!r}")


def load_baseline(csv_path: Path) -> tuple[np.ndarray, int]:
    rows: list[tuple[datetime, list[float]]] = []
    with csv_path.open("r", encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        columns = set(reader.fieldnames or [])
        missing = REQUIRED_COLUMNS - columns
        if missing:
            raise ValueError(f"CSV is missing required columns: {', '.join(sorted(missing))}")

        wet_rows = 0
        for line_number, row in enumerate(reader, start=2):
            try:
                if _parse_bool(row["water_detected"]):
                    wet_rows += 1
                    continue
                observed_at = datetime.fromisoformat(row["observed_at"].replace("Z", "+00:00"))
                if observed_at.tzinfo is None:
                    observed_at = observed_at.replace(tzinfo=timezone.utc)
                temperature = float(row["temperature"])
                humidity = float(row["humidity"])
                if not (-40 <= temperature <= 80 and 0 <= humidity <= 100):
                    raise ValueError("sensor value is outside the supported range")
                rows.append((observed_at, [temperature, humidity]))
            except (TypeError, ValueError) as exc:
                raise ValueError(f"invalid data at CSV line {line_number}: {exc}") from exc

    rows.sort(key=lambda item: item[0])
    if len(rows) < MINIMUM_ROWS:
        raise ValueError(
            f"need at least {MINIMUM_ROWS} dry baseline readings; found {len(rows)}"
        )
    return np.asarray([values for _, values in rows], dtype=float), wet_rows


def train(csv_path: Path, output_path: Path, false_positive_rate: float) -> dict[str, object]:
    if not 0.001 <= false_positive_rate <= 0.1:
        raise ValueError("false-positive rate must be between 0.001 and 0.1")

    readings, skipped_wet_rows = load_baseline(csv_path)
    split_index = int(len(readings) * 0.8)
    training = readings[:split_index]
    validation = readings[split_index:]
    if len(validation) < 100:
        raise ValueError("at least 100 chronological validation readings are required")

    model = IsolationForest(
        n_estimators=300,
        max_samples="auto",
        contamination="auto",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(training)
    validation_scores = np.sort(-model.score_samples(validation))
    threshold = float(np.quantile(validation_scores, 1 - false_positive_rate))
    model_version = f"isolation-forest-{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}"
    artifact = {
        "model": model,
        "features": list(FEATURES),
        "validation_scores": validation_scores,
        "threshold": threshold,
        "target_false_positive_rate": false_positive_rate,
        "model_version": model_version,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "training_rows": int(len(training)),
        "validation_rows": int(len(validation)),
        "training_data": csv_path.name,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = output_path.with_suffix(output_path.suffix + ".tmp")
    joblib.dump(artifact, temporary_path)
    temporary_path.replace(output_path)

    return {
        "model_version": model_version,
        "training_rows": len(training),
        "validation_rows": len(validation),
        "skipped_wet_rows": skipped_wet_rows,
        "target_false_positive_rate": false_positive_rate,
        "calibrated_anomaly_threshold": round(threshold, 6),
        "artifact": str(output_path),
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train a dry-warehouse Isolation Forest baseline from telemetry CSV."
    )
    parser.add_argument("csv_path", type=Path, help="CSV of reviewed, normal warehouse readings")
    parser.add_argument(
        "--output",
        type=Path,
        default=settings.model_path,
        help="path for the trained model artifact",
    )
    parser.add_argument(
        "--false-positive-rate",
        type=float,
        default=settings.target_false_positive_rate,
        help="validation-baseline quantile used as anomaly cutoff (0.01 = 1%%)",
    )
    args = parser.parse_args()
    report = train(args.csv_path, args.output, args.false_positive_rate)
    for key, value in report.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()
