from extensions import db

class Department(db.Model):
    __tablename__ = "departments"
    id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey("colleges.id"), nullable=False, index=True)
    dept_name = db.Column(db.String(100), nullable=False)

    # Unique per college
    __table_args__ = (
        db.UniqueConstraint('dept_name', 'college_id', name='uq_dept_name_college'),
    )

    faculty = db.relationship("Faculty", backref="department", lazy=True)
    courses = db.relationship("Course", backref="department", lazy=True)
    course_allocations = db.relationship("CourseAllocation", backref="department", lazy=True)
    sections = db.relationship("Section", backref="department", lazy=True)
    users = db.relationship("User", backref="department", lazy=True)
