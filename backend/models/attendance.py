from extensions import db
from datetime import datetime

class Attendance(db.Model):
    __tablename__ = "attendance"
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.course_id"), nullable=True)
    timetable_id = db.Column(db.Integer, db.ForeignKey("timetable.timetable_id"), nullable=True)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    status = db.Column(db.String(20), nullable=False, default="absent")  # "present", "absent", "late"
    marked_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    notes = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    student = db.relationship("User", foreign_keys=[student_id], backref=db.backref("attendance_records", cascade="all, delete-orphan"))
    marker = db.relationship("User", foreign_keys=[marked_by])
    course = db.relationship("Course", backref=db.backref("attendance_records", cascade="all, delete-orphan"))
    timetable_entry = db.relationship("Timetable", backref=db.backref("attendance_records", cascade="all, delete-orphan"))
