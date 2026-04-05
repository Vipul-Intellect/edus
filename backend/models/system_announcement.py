from extensions import db
from datetime import datetime

class SystemAnnouncement(db.Model):
    __tablename__ = "system_announcements"
    id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey("colleges.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(20), default="normal")  # low, normal, high, urgent
    target_roles = db.Column(db.String(100), nullable=True)  # comma-separated roles
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=True)

    creator = db.relationship("User", backref=db.backref("announcements", cascade="all, delete-orphan"))
