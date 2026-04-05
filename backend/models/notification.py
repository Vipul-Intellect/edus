from extensions import db
from datetime import datetime

class Notification(db.Model):
    """
    Stores system and user notifications.
    """
    __tablename__ = "notifications"
    
    id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey("colleges.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    
    # Content
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    link = db.Column(db.String(255), nullable=True)  # Action link (e.g., /bookings/123)

    # File Attachment
    file_url  = db.Column(db.String(500), nullable=True)   # e.g. /api/uploads/uuid_notes.pdf
    file_name = db.Column(db.String(255), nullable=True)   # original filename shown in UI
    file_type = db.Column(db.String(50),  nullable=True)   # pdf / docx / xlsx / png / jpg / jpeg

    # Sender metadata (optional — set by admin/teacher send routes)
    sender_name = db.Column(db.String(100), nullable=True)

    # Classification
    notification_type = db.Column(db.String(20), default="info")  # info/success/warning/error
    category = db.Column(db.String(50), default="system")  # system/academic/resource/booking

    # Status
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship("User", backref=db.backref("notifications", cascade="all, delete-orphan"))
    
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "message": self.message,
            "link": self.link,
            "file_url": self.file_url,
            "file_name": self.file_name,
            "file_type": self.file_type,
            "sender_name": self.sender_name,
            "type": self.notification_type,
            "category": self.category,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat(),
            "time_ago": self.get_time_ago()
        }
    
    def get_time_ago(self):
        now = datetime.utcnow()
        diff = now - self.created_at
        
        seconds = diff.total_seconds()
        if seconds < 60:
            return "Just now"
        elif seconds < 3600:
            return f"{int(seconds // 60)}m ago"
        elif seconds < 86400:
            return f"{int(seconds // 3600)}h ago"
        else:
            return f"{int(seconds // 86400)}d ago"


class NotificationPreference(db.Model):
    """
    Stores user preferences for notifications.
    """
    __tablename__ = "notification_preferences"
    
    id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey("colleges.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    
    # Channels
    email_enabled = db.Column(db.Boolean, default=True)
    app_enabled = db.Column(db.Boolean, default=True)
    
    # Categories to receive
    system_alerts = db.Column(db.Boolean, default=True)
    academic_updates = db.Column(db.Boolean, default=True)
    resource_updates = db.Column(db.Boolean, default=True)
    marketing = db.Column(db.Boolean, default=False)
    
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship("User", backref=db.backref("notification_preferences", uselist=False, cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "email_enabled": self.email_enabled,
            "app_enabled": self.app_enabled,
            "system_alerts": self.system_alerts,
            "academic_updates": self.academic_updates,
            "resource_updates": self.resource_updates
        }
