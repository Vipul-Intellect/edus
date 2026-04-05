from extensions import db
from datetime import datetime

class SwapRequest(db.Model):
    __tablename__ = 'swap_requests'
    id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey("colleges.id"), nullable=False, index=True)

    # Who is making the request (links to the faculty table)
    requesting_faculty_id = db.Column(db.Integer, db.ForeignKey('faculty.faculty_id'), nullable=False)

    # The specific class session they want to move
    original_timetable_id = db.Column(db.Integer, db.ForeignKey('timetable.timetable_id'), nullable=False)

    # The new time they are proposing
    proposed_day = db.Column(db.String(20), nullable=False)
    proposed_start_time = db.Column(db.String(20), nullable=False)

    # The current state of the request
    status = db.Column(db.String(20), nullable=False, default='pending') # pending, approved, rejected
    reason = db.Column(db.Text, nullable=True) # Teacher's reason for the swap
    admin_notes = db.Column(db.Text, nullable=True) # Admin's notes on approval/rejection
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Define relationships for easy data access
    requesting_faculty = db.relationship("Faculty", foreign_keys=[requesting_faculty_id])
    original_timetable_entry = db.relationship("Timetable", foreign_keys=[original_timetable_id])
