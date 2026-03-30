from extensions import db
from datetime import datetime
from sqlalchemy import func

class StudentPerformance(db.Model):
    """Consolidated performance metrics for students"""
    __tablename__ = "student_performance"
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.course_id"), nullable=False)
    
    # Academic period
    semester = db.Column(db.String(20), nullable=True)  # e.g., "Fall 2025"
    year = db.Column(db.Integer, nullable=False)
    
    # Attendance metrics (from Attendance table)
    total_attendance_percentage = db.Column(db.Float, default=0.0)
    
    # Assessment metrics (from Grade table)
    total_assessments = db.Column(db.Integer, default=0)
    completed_assessments = db.Column(db.Integer, default=0)
    average_marks = db.Column(db.Float, default=0.0)
    average_percentage = db.Column(db.Float, default=0.0)
    current_grade = db.Column(db.String(5), nullable=True)  # Overall grade
    
    # Performance indicators
    performance_trend = db.Column(db.String(20), default="stable")  # improving/stable/declining
    at_risk = db.Column(db.Boolean, default=False)  # Low attendance + low grades
    
    # Timestamps
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = db.relationship("User", backref=db.backref("performance_records", cascade="all, delete-orphan"))
    course = db.relationship("Course", backref=db.backref("performance_records", cascade="all, delete-orphan"))
    
    def update_metrics(self):
        """Update all performance metrics for this student-course combination"""
        from models import Attendance, Grade, Assessment
        
        # Update attendance percentage
        total_attendance = db.session.query(func.count(Attendance.id)).filter_by(
            student_id=self.student_id,
            course_id=self.course_id
        ).scalar() or 0
        
        if total_attendance > 0:
            present_count = db.session.query(func.count(Attendance.id)).filter(
                Attendance.student_id == self.student_id,
                Attendance.course_id == self.course_id,
                Attendance.status.in_(['present', 'late'])
            ).scalar() or 0
            
            self.total_attendance_percentage = round((present_count / total_attendance) * 100, 2)
        else:
            self.total_attendance_percentage = 0.0
        
        # Update assessment metrics
        course_assessments = Assessment.query.filter_by(course_id=self.course_id).all()
        self.total_assessments = len(course_assessments)
        
        student_grades = Grade.query.join(Assessment).filter(
            Grade.student_id == self.student_id,
            Assessment.course_id == self.course_id
        ).all()
        
        self.completed_assessments = len(student_grades)
        
        if student_grades:
            self.average_percentage = round(
                sum(g.percentage for g in student_grades) / len(student_grades), 2
            )
            self.average_marks = round(
                sum(g.marks_obtained for g in student_grades) / len(student_grades), 2
            )
            
            # Assign overall grade
            self.assign_overall_grade()
        else:
            self.average_percentage = 0.0
            self.average_marks = 0.0
            self.current_grade = None
        
        # Determine if student is at risk
        self.at_risk = (self.total_attendance_percentage < 75.0 and self.average_percentage < 50.0)
        
        # Calculate performance trend (simplified version)
        if self.average_percentage >= 70:
            self.performance_trend = "improving"
        elif self.average_percentage < 50:
            self.performance_trend = "declining"
        else:
            self.performance_trend = "stable"
        
        self.updated_at = datetime.utcnow()
    
    def assign_overall_grade(self):
        """Assign overall letter grade based on average percentage"""
        if self.average_percentage >= 90:
            self.current_grade = "A+"
        elif self.average_percentage >= 80:
            self.current_grade = "A"
        elif self.average_percentage >= 70:
            self.current_grade = "B+"
        elif self.average_percentage >= 60:
            self.current_grade = "B"
        elif self.average_percentage >= 50:
            self.current_grade = "C"
        elif self.average_percentage >= 40:
            self.current_grade = "D"
        else:
            self.current_grade = "F"
    
    def __repr__(self):
        return f"<StudentPerformance Student {self.student_id} - Course {self.course_id} - {self.current_grade}>"
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "student_id": self.student_id,
            "course_id": self.course_id,
            "course_name": self.course.name if self.course else "Unknown",
            "semester": self.semester,
            "year": self.year,
            "attendance_percentage": self.total_attendance_percentage,
            "total_assessments": self.total_assessments,
            "completed_assessments": self.completed_assessments,
            "average_percentage": self.average_percentage,
            "current_grade": self.current_grade,
            "performance_trend": self.performance_trend,
            "at_risk": self.at_risk,
            "updated_at": self.updated_at.isoformat()
        }
