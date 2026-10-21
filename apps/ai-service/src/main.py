from fastapi import FastAPI

from .schemas import HealthResponse, PredictionRequest, PredictionResponse
from .settings import settings
from .services.predictor import EnvironmentAnomalyPredictor

app = FastAPI(
    title=settings.service_name,
    version="0.1.0",
    description="AI boundary service for IoT environmental anomaly detection.",
)
predictor = EnvironmentAnomalyPredictor(settings.model_path)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok" if predictor.ready else "degraded",
        service=settings.service_name,
        model_ready=predictor.ready,
        model_version=predictor.model_version,
    )


@app.post("/predict", response_model=PredictionResponse)
def predict(payload: PredictionRequest) -> PredictionResponse:
    return predictor.predict(payload)
