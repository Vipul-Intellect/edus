from extensions import db

class CourseAllocation(db.Model):
    __tablename__ = "course_allocations"
    id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey("colleges.id"), nullable=False, index=True)
    dept_id = db.Column(db.Integer, db.ForeignKey("departments.id"))
    year = db.Column(db.Integer, nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    total_courses = db.Column(db.Integer, nullable=False, default=0)
    allocated_courses = db.Column(db.Integer, nullable=False, default=0)

    __table_args__ = (db.UniqueConstraint('dept_id', 'year', 'semester', name='_dept_year_sem_uc'),)
