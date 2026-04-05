from extensions import db
from datetime import datetime

class Timetable(db.Model):
    __tablename__ = "timetable"
    timetable_id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey("colleges.id"), nullable=False, index=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.course_id"))
    section_id = db.Column(db.Integer, db.ForeignKey("sections.id"))
    faculty_id = db.Column(db.Integer, db.ForeignKey("faculty.faculty_id"))
    room_id = db.Column(db.Integer, db.ForeignKey("classrooms.room_id"))
    day = db.Column(db.String(20))
    start_time = db.Column(db.String(20))
    
    # Audit fields for swapped/rescheduled classes
    is_swapped = db.Column(db.Boolean, default=False)
    swapped_at = db.Column(db.DateTime, nullable=True)
    swapped_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    swap_group_id = db.Column(db.String(50), nullable=True) # UUID for linking swapped pairs
    swapped_with_course = db.Column(db.String(100), nullable=True) # Copy of the course name swapped with

    course = db.relationship("Course")
    faculty = db.relationship("Faculty")
    room = db.relationship("Classroom")
    swapped_by = db.relationship("User", foreign_keys=[swapped_by_id])
