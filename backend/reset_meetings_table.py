import os
import sys

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app import app
from extensions import db
from models import Meeting, FacultyMeetingParticipation

with app.app_context():
    print("Dropping Meeting tables...")
    FacultyMeetingParticipation.__table__.drop(db.engine, checkfirst=True)
    Meeting.__table__.drop(db.engine, checkfirst=True)
    print("Recreating database tables...")
    db.create_all()
    print("Done!")
