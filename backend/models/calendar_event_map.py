"""
CalendarEventMap Model
Maps internal timetable entries to Google Calendar event IDs.
Critical for incremental sync — without this, update/delete is impossible.
"""
from extensions import db
from datetime import datetime


class CalendarEventMap(db.Model):
    __tablename__ = 'calendar_event_map'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    timetable_id = db.Column(db.Integer, db.ForeignKey('timetable.timetable_id'), nullable=False)
    google_event_id = db.Column(db.String(255), nullable=False)
    calendar_id = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref=db.backref('calendar_event_maps', lazy=True, cascade="all, delete-orphan"))
    timetable = db.relationship('Timetable', backref=db.backref('calendar_event_maps', lazy=True, cascade="all, delete-orphan"))

    __table_args__ = (
        db.UniqueConstraint('user_id', 'timetable_id', name='uq_user_timetable'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'timetable_id': self.timetable_id,
            'google_event_id': self.google_event_id,
            'calendar_id': self.calendar_id,
        }
