"""
UserGoogleAuth Model
Stores OAuth tokens and sync metadata for Google Calendar integration.
"""
from extensions import db
from datetime import datetime


class UserGoogleAuth(db.Model):
    __tablename__ = 'user_google_auth'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)

    # OAuth Tokens
    access_token = db.Column(db.Text, nullable=False)
    refresh_token = db.Column(db.Text, nullable=True)
    token_expiry = db.Column(db.DateTime, nullable=True)

    # Google Calendar Info
    calendar_id = db.Column(db.String(255), nullable=True)

    # Sync State Tracking
    last_synced_at = db.Column(db.DateTime, nullable=True)
    sync_version = db.Column(db.Integer, default=0)
    sync_status = db.Column(db.String(20), default='pending')  # pending, syncing, synced, failed
    last_error = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('google_auth', uselist=False, cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            'is_connected': True,
            'calendar_id': self.calendar_id,
            'last_synced_at': self.last_synced_at.isoformat() if self.last_synced_at else None,
            'sync_version': self.sync_version,
            'sync_status': self.sync_status,
            'last_error': self.last_error,
        }
