from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
from fastapi import HTTPException

from ..schemas import PredictionRequest, PredictionResponse


class EnvironmentAnomalyPredictor:
    """Inference wrapper for a trained Isolation Forest baseline."""

    def __init__(self, model_path: Path) -> None:
        self.model_path = model_path
        self.artifact: dict[str, Any] | None = None
        self.load_error: str | None = None
        self.reload()

    @property
    def ready(self) -> bool:
        return self.artifact is not None

    @property
    def model_version(self) -> str | None:
        if not self.artifact:
            return None
        return str(self.artifact["model_version"])

    def reload(self) -> bool:
        try:
            artifact = joblib.load(self.model_path)
            required = {"model", "validation_scores", "threshold", "model_version"}
            if not required.issubset(artifact):
                raise ValueError("model artifact is missing required fields")
            self.artifact = artifact
            self.load_error = None
            return True
        except FileNotFoundError:
            self.artifact = None
            self.load_error = f"Trained model not found: {self.model_path}"
            return False
        except Exception as exc:
            self.artifact = None
            self.load_error = f"Could not load trained model: {exc}"
            return False

    def predict(self, payload: PredictionRequest) -> PredictionResponse:
        if payload.water_detected:
            return PredictionResponse(
                is_anomaly=True,
                risk_level="critical",
                anomaly_score=1.0,
                suggested_action="NONE",
                reason="Water was detected by the sensor; inspect the warehouse area immediately.",
                model_version=self.model_version or "water-rule-v1",
            )

        if not self.artifact:
            raise HTTPException(status_code=503, detail="Trained AI model is not available")

        model = self.artifact["model"]
        validation_scores = np.asarray(self.artifact["validation_scores"], dtype=float)
        features = np.asarray([[payload.temperature, payload.humidity]], dtype=float)
        anomaly_strength = float(-model.score_samples(features)[0])
        threshold = float(self.artifact["threshold"])
        score = float(np.searchsorted(validation_scores, anomaly_strength, side="right") / len(validation_scores))
        score = min(max(score, 0.0), 1.0)
        is_anomaly = anomaly_strength >= threshold

        if not is_anomaly:
            risk_level = "normal"
            action = "NONE"
            reason = "Reading is consistent with the learned dry-warehouse baseline."
        elif score >= 0.999:
            risk_level = "critical"
            action = "NONE"
            reason = "Reading is an extreme outlier compared with the learned warehouse baseline."
        else:
            risk_level = "warning"
            action = "NONE"
            reason = "Reading is unusual compared with the learned warehouse baseline; inspect conditions."

        return PredictionResponse(
            is_anomaly=is_anomaly,
            risk_level=risk_level,
            anomaly_score=round(score, 4),
            suggested_action=action,
            reason=reason,
            model_version=self.model_version or "unknown",
        )
