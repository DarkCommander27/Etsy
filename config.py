import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'etsy_items.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB max upload size
    ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "gif", "svg", "zip", "eps"}

    # Etsy API credentials (set via .env or environment variables)
    ETSY_API_KEY = os.environ.get("ETSY_API_KEY", "")
    ETSY_API_SECRET = os.environ.get("ETSY_API_SECRET", "")
    ETSY_ACCESS_TOKEN = os.environ.get("ETSY_ACCESS_TOKEN", "")
    ETSY_SHOP_ID = os.environ.get("ETSY_SHOP_ID", "")
    ETSY_BASE_URL = "https://openapi.etsy.com/v3"
    ETSY_TAXONOMY_ID = int(os.environ.get("ETSY_TAXONOMY_ID", "2078"))  # Digital prints


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False
    UPLOAD_FOLDER = "/tmp/test_uploads"
