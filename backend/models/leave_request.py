from extensions import db
from datetime import datetime

class LeaveRequest(db.Model):
    __tablename__ = "leave_requests"
    id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey("colleges.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    leave_type = db.Column(db.String(50), nullable=False)  # sick, vacation, personal, emergency, medical, family
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default="pending")  # pending, approved, rejected
    approved_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    admin_notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship("User", foreign_keys=[user_id], backref=db.backref("leave_requests", cascade="all, delete-orphan"))
    approver = db.relationship("User", foreign_keys=[approved_by], backref="approved_leave_requests")
