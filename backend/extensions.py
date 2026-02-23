from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_mail import Mail

# APScheduler is optional — app starts normally without it
try:
    from apscheduler.schedulers.background import BackgroundScheduler
    scheduler = BackgroundScheduler(timezone='Asia/Kolkata')
    SCHEDULER_AVAILABLE = True
except ImportError:
    scheduler = None
    SCHEDULER_AVAILABLE = False

# Initialize extensions
db = SQLAlchemy()
cors = CORS()
mail = Mail()


def init_extensions(app):
    """Initialize Flask extensions"""
    db.init_app(app)

    # CORS configuration
    cors.init_app(app,
                  origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173",
                           "http://127.0.0.1:5174", "http://localhost:3000", "http://127.0.0.1:3000",
                           "https://timetable-project.vercel.app", "https://*.vercel.app"],
                  methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
                  allow_headers=["Content-Type", "Authorization", "x-access-token", "X-Requested-With", "Accept"],
                  expose_headers=["Content-Type", "Authorization"],
                  supports_credentials=True,
                  max_age=3600,
                  automatic_options=True)

    # Mail configuration
    mail.init_app(app)
