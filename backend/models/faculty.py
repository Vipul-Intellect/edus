from extensions import db

class Faculty(db.Model):
    __tablename__ = "faculty"
    faculty_id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey("colleges.id"), nullable=False, index=True)
    faculty_name = db.Column(db.String(100), nullable=False)
    max_hours = db.Column(db.Integer, default=12)
    dept_id = db.Column(db.Integer, db.ForeignKey("departments.id"))
    email = db.Column(db.String(100), nullable=True)
    subject = db.Column(db.String(100), nullable=True)
    
    # Workload management fields
    weekly_max_hours = db.Column(db.Float, default=40.0)  # Total weekly hours limit
    preferred_max_teaching_hours = db.Column(db.Float, default=18.0)  # Preferred teaching hours per week
    
    # Availability
    is_active = db.Column(db.Boolean, default=True)  # Whether faculty is currently active
    
    # Relationships for workload tracking
    workload_records = db.relationship("FacultyWorkload", back_populates="faculty", lazy=True)
