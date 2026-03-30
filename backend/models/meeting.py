from extensions import db
from datetime import datetime

class Meeting(db.Model):
    """Track faculty meetings and commitments"""
    __tablename__ = "meetings"
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    # Organizer
    organizer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    
    # Timing
    start_datetime = db.Column(db.DateTime, nullable=False)
    end_datetime = db.Column(db.DateTime, nullable=False)
    duration_hours = db.Column(db.Float, default=0.0)  # Calculated
    
    # Location and type
    location = db.Column(db.String(100), nullable=True)
    meeting_type = db.Column(db.String(50), default="other")  # department/research/admin/other
    meeting_link = db.Column(db.String(500), nullable=True)
    
    # Broadcast / Audience details
    audience_role = db.Column(db.String(20), nullable=False, default="all")  # all/teachers/students
    dept_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=True)
    year = db.Column(db.Integer, nullable=True)  # For student targeting
    section_id = db.Column(db.Integer, db.ForeignKey("sections.id"), nullable=True)
    created_by_role = db.Column(db.String(20), nullable=True)
    
    # Status
    status = db.Column(db.String(20), default="scheduled")  # scheduled/completed/cancelled
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    organizer = db.relationship("User", backref=db.backref("organized_meetings", cascade="all, delete-orphan"))
    participants = db.relationship("FacultyMeetingParticipation", back_populates="meeting", cascade="all, delete-orphan")
    
    def calculate_duration(self):
        """Calculate meeting duration in hours"""
        if self.start_datetime and self.end_datetime:
            duration_seconds = (self.end_datetime - self.start_datetime).total_seconds()
            self.duration_hours = round(duration_seconds / 3600, 2)
    
    def __repr__(self):
        return f"<Meeting '{self.title}' on {self.start_datetime.strftime('%Y-%m-%d %H:%M')}>"


class FacultyMeetingParticipation(db.Model):
    """Many-to-many relationship between Faculty and Meetings"""
    __tablename__ = "faculty_meeting_participation"
    
    id = db.Column(db.Integer, primary_key=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey("faculty.faculty_id"), nullable=False)
    meeting_id = db.Column(db.Integer, db.ForeignKey("meetings.id"), nullable=False)
    
    # Participation details
    response_status = db.Column(db.String(20), default="pending")  # pending/accepted/declined
    attended = db.Column(db.Boolean, nullable=True)  # null until meeting is over
    
    # Timestamps
    invited_at = db.Column(db.DateTime, default=datetime.utcnow)
    responded_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    faculty = db.relationship("Faculty", backref="meeting_participations")
    meeting = db.relationship("Meeting", back_populates="participants")
    
    def __repr__(self):
        return f"<Participation Faculty {self.faculty_id} in Meeting {self.meeting_id} - {self.response_status}>"
