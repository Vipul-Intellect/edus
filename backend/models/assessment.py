from extensions import db
from datetime import datetime, date

class Assessment(db.Model):
    """Track assessments/tests scheduled for courses"""
    __tablename__ = "assessments"
    
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.course_id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    
    # Assessment details
    assessment_type = db.Column(db.String(50), default="quiz")  # quiz/assignment/midterm/final/project
    max_marks = db.Column(db.Float, nullable=False)
    weightage = db.Column(db.Float, default=0.0)  # Percentage contribution to final grade
    
    # Scheduling
    scheduled_date = db.Column(db.Date, nullable=False)
    scheduled_time = db.Column(db.String(20), nullable=True)
    duration_minutes = db.Column(db.Integer, default=60)
    
    # Location
    location = db.Column(db.String(100), nullable=True)  # Room or "Online"
    
    # Creator and timestamps
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Status
    status = db.Column(db.String(20), default="scheduled")  # scheduled/completed/cancelled
    
    # Relationships
    course = db.relationship("Course", backref="assessments")
    creator = db.relationship("User", backref=db.backref("created_assessments", cascade="all, delete-orphan"))
    grades = db.relationship("Grade", back_populates="assessment", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Assessment '{self.title}' for {self.course.name if self.course else 'Unknown'} on {self.scheduled_date}>"
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "course_id": self.course_id,
            "course_name": self.course.name if self.course else "Unknown",
            "title": self.title,
            "assessment_type": self.assessment_type,
            "max_marks": self.max_marks,
            "weightage": self.weightage,
            "scheduled_date": self.scheduled_date.isoformat(),
            "scheduled_time": self.scheduled_time,
            "duration_minutes": self.duration_minutes,
            "location": self.location,
            "status": self.status,
            "created_at": self.created_at.isoformat()
        }
