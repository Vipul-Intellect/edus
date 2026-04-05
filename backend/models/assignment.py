from extensions import db
from datetime import datetime

class Assignment(db.Model):
    """Stores assignments for courses with targeting (section, department, course)"""
    __tablename__ = "assignments"
    
    id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey("colleges.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    # File details
    file_url = db.Column(db.String(500), nullable=True)
    file_name = db.Column(db.String(255), nullable=True)
    file_type = db.Column(db.String(50), nullable=True)
    
    # Targeting
    # target_audience: 'all', 'course', 'department', 'section'
    target_audience = db.Column(db.String(50), default='course')
    course_id = db.Column(db.Integer, db.ForeignKey("courses.course_id"), nullable=True)
    dept_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=True)
    section_id = db.Column(db.Integer, db.ForeignKey("sections.id"), nullable=True)
    
    # Deadlines and Tracking
    due_date = db.Column(db.DateTime, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    course = db.relationship("Course", backref="assignments")
    department = db.relationship("Department", backref="assignments")
    section = db.relationship("Section", backref="assignments")
    creator = db.relationship("User", backref="created_assignments")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "file_url": self.file_url,
            "file_name": self.file_name,
            "file_type": self.file_type,
            "target_audience": self.target_audience,
            "course_id": self.course_id,
            "course_name": self.course.name if self.course else None,
            "dept_id": self.dept_id,
            "dept_name": self.department.dept_name if self.department else None,
            "section_id": self.section_id,
            "section_name": self.section.name if self.section else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "created_by": self.creator.full_name if self.creator else "Unknown",
            "created_at": self.created_at.isoformat()
        }
