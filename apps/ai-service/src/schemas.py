from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

RiskLevel = Literal["normal", "warning", "critical"]
SuggestedAction = Literal["NONE", "TURN_RELAY_ON", "TURN_RELAY_OFF"]


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    service: str
    model_ready: bool
    model_version: str | None


class PredictionRequest(BaseModel):
    device_id: str = Field(min_length=1)
    temperature: float = Field(ge=-40, le=80)
    humidity: float = Field(ge=0, le=100)
    water_detected: bool = False
    relay_status: Literal["ON", "OFF"]
    observed_at: datetime


class PredictionResponse(BaseModel):
    is_anomaly: bool
    risk_level: RiskLevel
    anomaly_score: float = Field(ge=0, le=1)
    suggested_action: SuggestedAction
    reason: str
    model_version: str
