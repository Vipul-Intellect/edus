import os

class Config:
    """Base configuration class"""
    SECRET_KEY = os.environ.get("SECRET_KEY", "TimetableSecretKey2025")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # File Upload
    UPLOAD_FOLDER = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5 MB
    ALLOWED_EXTENSIONS = {'pdf', 'docx', 'xlsx', 'png', 'jpg', 'jpeg'}

    # CORS configuration - support environment variable for production
    cors_origins_env = os.environ.get("CORS_ORIGINS", "")
    if cors_origins_env:
        CORS_ORIGINS = [origin.strip() for origin in cors_origins_env.split(",")]
    else:
        CORS_ORIGINS = ["http://localhost:5173", "http://localhost:5174"]

    # Mail configuration
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USE_SSL = False
    MAIL_USERNAME = os.getenv("MAIL_USER")
    MAIL_PASSWORD = os.getenv("MAIL_PASS")
    MAIL_DEFAULT_SENDER = ("Timetable System", os.getenv("MAIL_USER"))

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'timetable_enhanced.db')}"

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    # Production database - use DATABASE_URL from environment
    database_url = os.environ.get("DATABASE_URL")
    
    if not database_url:
        SQLALCHEMY_DATABASE_URI = "sqlite:///timetable_enhanced_prod.db"
    else:
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        SQLALCHEMY_DATABASE_URI = database_url

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
