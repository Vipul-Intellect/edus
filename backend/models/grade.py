from extensions import db
from datetime import datetime

class Grade(db.Model):
    """Store grades for individual students on assessments"""
    __tablename__ = "grades"
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    assessment_id = db.Column(db.Integer, db.ForeignKey("assessments.id"), nullable=False)
    
    # Grade details
    marks_obtained = db.Column(db.Float, nullable=False)
    percentage = db.Column(db.Float, default=0.0)  # Calculated
    grade_letter = db.Column(db.String(5), nullable=True)  # A+/A/B+/B/C/D/F
    
    # Feedback
    remarks = db.Column(db.Text, nullable=True)
    
    # Grader and timestamps
    graded_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    graded_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = db.relationship("User", foreign_keys=[student_id], backref=db.backref("grades_received", cascade="all, delete-orphan"))
    grader = db.relationship("User", foreign_keys=[graded_by], backref="grades_given")
    assessment = db.relationship("Assessment", back_populates="grades")
    
    def calculate_percentage(self):
        """Calculate percentage based on marks obtained vs max marks"""
        if self.assessment and self.assessment.max_marks > 0:
            self.percentage = round((self.marks_obtained / self.assessment.max_marks) * 100, 2)
        else:
            self.percentage = 0.0
    
    def assign_grade_letter(self):
        """Assign letter grade based on percentage"""
        if self.percentage >= 90:
            self.grade_letter = "A+"
        elif self.percentage >= 80:
            self.grade_letter = "A"
        elif self.percentage >= 70:
            self.grade_letter = "B+"
        elif self.percentage >= 60:
            self.grade_letter = "B"
        elif self.percentage >= 50:
            self.grade_letter = "C"
        elif self.percentage >= 40:
            self.grade_letter = "D"
        else:
            self.grade_letter = "F"
    
    def __repr__(self):
        return f"<Grade {self.student_id} - {self.marks_obtained}/{self.assessment.max_marks if self.assessment else '?'} ({self.grade_letter})>"
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "student_id": self.student_id,
            "student_name": self.student.full_name if self.student else "Unknown",
            "assessment_id": self.assessment_id,
            "assessment_title": self.assessment.title if self.assessment else "Unknown",
            "marks_obtained": self.marks_obtained,
            "max_marks": self.assessment.max_marks if self.assessment else 0,
            "percentage": self.percentage,
            "grade_letter": self.grade_letter,
            "remarks": self.remarks,
            "graded_by": self.grader.full_name if self.grader else "Unknown",
            "graded_at": self.graded_at.isoformat()
        }
