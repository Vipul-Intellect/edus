from extensions import db

class Course(db.Model):
    __tablename__ = "courses"
    course_id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey("colleges.id"), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(20), nullable=False)
    credits = db.Column(db.Integer, nullable=True)
    year = db.Column(db.Integer, nullable=False, default=1)
    semester = db.Column(db.Integer, nullable=False, default=1)
    dept_id = db.Column(db.Integer, db.ForeignKey("departments.id"))
    faculty_id = db.Column(db.Integer, db.ForeignKey("faculty.faculty_id"))
    hours_per_week = db.Column(db.Integer, nullable=False, default=6)
    is_fixed = db.Column(db.Boolean, default=False)
    fixed_day = db.Column(db.String(20), nullable=True)
    fixed_slot = db.Column(db.String(20), nullable=True)
    fixed_room_id = db.Column(db.Integer, db.ForeignKey("classrooms.room_id"), nullable=True)

    faculty = db.relationship("Faculty", backref="courses", lazy=True)
