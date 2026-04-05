from extensions import db
from datetime import datetime

class FacultyWorkload(db.Model):
    """Track weekly workload metrics for faculty members"""
    __tablename__ = "faculty_workload"
    
    id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey("colleges.id"), nullable=False, index=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey("faculty.faculty_id"), nullable=False)
    week_number = db.Column(db.Integer, nullable=False)  # ISO week number (1-53)
    year = db.Column(db.Integer, nullable=False)
    
    # Workload metrics (in hours)
    total_teaching_hours = db.Column(db.Float, default=0.0)  # Calculated from timetable
    total_meeting_hours = db.Column(db.Float, default=0.0)   # Sum of meeting durations
    total_hours = db.Column(db.Float, default=0.0)           # Teaching + meetings
    max_hours_allowed = db.Column(db.Float, default=40.0)    # Weekly limit
    
    # Calculated fields
    workload_percentage = db.Column(db.Float, default=0.0)   # (total/max) * 100
    status = db.Column(db.String(20), default="balanced")     # underloaded/balanced/overloaded
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    faculty = db.relationship("Faculty", back_populates="workload_records")
    
    def calculate_status(self):
        """Calculate workload status based on percentage"""
        if self.workload_percentage < 60:
            self.status = "underloaded"
        elif self.workload_percentage <= 90:
            self.status = "balanced"
        else:
            self.status = "overloaded"
    
    def update_workload(self):
        """Recalculate total hours and percentage"""
        self.total_hours = self.total_teaching_hours + self.total_meeting_hours
        if self.max_hours_allowed > 0:
            self.workload_percentage = round((self.total_hours / self.max_hours_allowed) * 100, 2)
        else:
            self.workload_percentage = 0.0
        self.calculate_status()
        self.updated_at = datetime.utcnow()
    
    def __repr__(self):
        return f"<FacultyWorkload {self.faculty_id} - Week {self.week_number}/{self.year} - {self.total_hours}h ({self.status})>"
