from pathlib import Path


class Settings:
    APP_NAME = "Event Sync Service"
    APP_VERSION = "1.0.0"

    BASE_DIR = Path(__file__).resolve().parents[2]

    DATA_DIR = BASE_DIR / "data"

    CRM_FILE = DATA_DIR / "crm_events.json"
    CALENDAR_FILE = DATA_DIR / "calendar_events.json"

    API_PREFIX = "/api"


settings = Settings()