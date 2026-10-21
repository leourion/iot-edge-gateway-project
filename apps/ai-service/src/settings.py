from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "iot-ai-service"
    model_path: Path = Path("models/environment-isolation-forest.joblib")
    target_false_positive_rate: float = 0.01

    model_config = SettingsConfigDict(env_prefix="AI_", extra="ignore")


settings = Settings()
