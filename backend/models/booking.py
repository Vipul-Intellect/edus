from extensions import db
from datetime import datetime

class ResourceBooking(db.Model):
    """
    Tracks bookings/reservations for resources.
    """
    __tablename__ = "resource_bookings"
    
    id = db.Column(db.Integer, primary_key=True)
    resource_id = db.Column(db.Integer, db.ForeignKey("resources.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    
    # Timing
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    
    # Details
    title = db.Column(db.String(100), nullable=False)  # Event title or purpose summary
    purpose = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default="pending")  # pending/approved/rejected/cancelled/completed
    
    # Approval workflow (optional but good for labs)
    approved_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    approval_date = db.Column(db.DateTime, nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    resource = db.relationship("Resource", back_populates="bookings")
    user = db.relationship("User", foreign_keys=[user_id], backref=db.backref("my_bookings", cascade="all, delete-orphan"))
    approver = db.relationship("User", foreign_keys=[approved_by], backref="approved_bookings")
    
    def __repr__(self):
        return f"<Booking {self.title} - {self.resource.name} by {self.user.id}>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "resource_id": self.resource_id,
            "resource_name": self.resource.name if self.resource else "Unknown",
            "resource_type": self.resource.resource_type if self.resource else "Unknown",
            "user_id": self.user_id,
            "user_name": self.user.full_name if self.user else "Unknown",
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat(),
            "title": self.title,
            "purpose": self.purpose,
            "status": self.status,
            "approved_by": self.approver.full_name if self.approver else None,
            "rejection_reason": self.rejection_reason,
            "created_at": self.created_at.isoformat()
        }
