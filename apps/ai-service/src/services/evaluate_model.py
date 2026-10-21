from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
from pathlib import Path

from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support

from ..schemas import PredictionRequest
from ..settings import settings
from .predictor import EnvironmentAnomalyPredictor
from .train_model import _parse_bool

REQUIRED_COLUMNS = {"device_id", "observed_at", "temperature", "humidity", "water_detected", "is_anomaly"}


def evaluate(csv_path: Path, model_path: Path) -> dict[str, object]:
    predictor = EnvironmentAnomalyPredictor(model_path)
    if not predictor.ready:
        raise ValueError(f"trained model is unavailable: {predictor.load_error}")

    expected: list[bool] = []
    predicted: list[bool] = []
    with csv_path.open("r", encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        missing = REQUIRED_COLUMNS - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"CSV is missing required columns: {', '.join(sorted(missing))}")
        for line_number, row in enumerate(reader, start=2):
            try:
                observed_at = datetime.fromisoformat(row["observed_at"].replace("Z", "+00:00"))
                if observed_at.tzinfo is None:
                    observed_at = observed_at.replace(tzinfo=timezone.utc)
                request = PredictionRequest(
                    device_id=row["device_id"],
                    temperature=float(row["temperature"]),
                    humidity=float(row["humidity"]),
                    water_detected=_parse_bool(row["water_detected"]),
                    relay_status="OFF",
                    observed_at=observed_at,
                )
                expected.append(_parse_bool(row["is_anomaly"]))
                predicted.append(predictor.predict(request).is_anomaly)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"invalid data at CSV line {line_number}: {exc}") from exc

    if not expected:
        raise ValueError("evaluation CSV contains no rows")

    precision, recall, f1, _ = precision_recall_fscore_support(
        expected, predicted, average="binary", zero_division=0
    )
    matrix = confusion_matrix(expected, predicted, labels=[False, True])
    return {
        "model_version": predictor.model_version,
        "samples": len(expected),
        "accuracy": round(float(accuracy_score(expected, predicted)), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1": round(float(f1), 4),
        "confusion_matrix": {
            "true_normal_predicted_normal": int(matrix[0][0]),
            "false_alarm": int(matrix[0][1]),
            "missed_anomaly": int(matrix[1][0]),
            "detected_anomaly": int(matrix[1][1]),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate a trained model against labeled incidents.")
    parser.add_argument("csv_path", type=Path, help="independent, manually labeled evaluation CSV")
    parser.add_argument("--model", type=Path, default=settings.model_path)
    args = parser.parse_args()
    for key, value in evaluate(args.csv_path, args.model).items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()
