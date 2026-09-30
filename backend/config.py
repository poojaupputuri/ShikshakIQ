import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))


def _is_postgresql(database_uri: str | None) -> bool:
    """Return True if the given URI points to a PostgreSQL database."""
    if not database_uri:
        return False
    return database_uri.strip().lower().startswith('postgresql')


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'shikshak-iq-secret')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'shikshak-iq-jwt-secret-key-32chars!')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)

    # ------------------------------------------------------------------
    # Database
    # ------------------------------------------------------------------
    # In production, set DATABASE_URL to a PostgreSQL connection string.
    #   e.g. postgresql://user:pass@host:5432/shikshakiq?sslmode=require
    # Locally it falls back to SQLite so no external DB is needed.
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///shikshakiq.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ------------------------------------------------------------------
    # Connection pooling (PostgreSQL only — ignored for SQLite)
    #
    # These settings are passed to SQLAlchemy's create_engine() via
    # SQLALCHEMY_ENGINE_OPTIONS.  Each can be overridden with an env var.
    # ------------------------------------------------------------------
    _pool_size = int(os.getenv('DB_POOL_SIZE', '5'))
    _pool_max_overflow = int(os.getenv('DB_POOL_MAX_OVERFLOW', '5'))
    _pool_recycle = int(os.getenv('DB_POOL_RECYCLE', '1800'))      # 30 minutes
    _pool_pre_ping = os.getenv('DB_POOL_PRE_PING', 'true').lower() == 'true'

    if _is_postgresql(SQLALCHEMY_DATABASE_URI):
        SQLALCHEMY_ENGINE_OPTIONS = {
            'pool_size': _pool_size,
            'max_overflow': _pool_max_overflow,
            'pool_recycle': _pool_recycle,
            'pool_pre_ping': _pool_pre_ping,
        }
    else:
        SQLALCHEMY_ENGINE_OPTIONS = {}

    # ------------------------------------------------------------------
    # Google Gemini AI
    # ------------------------------------------------------------------
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')

    # Comma-separated list of Gemini API keys for automatic key rotation.
    # If GEMINI_API_KEYS is empty, falls back to GEMINI_API_KEY (single key).
    GEMINI_API_KEYS = os.getenv('GEMINI_API_KEYS', '')

    # ------------------------------------------------------------------
    # App behaviour
    # ------------------------------------------------------------------
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads'))
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB
    GEMINI_TIMEOUT_SECONDS = int(os.getenv('GEMINI_TIMEOUT_SECONDS', '20'))
    GEMINI_REPORT_TIMEOUT_SECONDS = int(os.getenv('GEMINI_REPORT_TIMEOUT_SECONDS', '15'))
