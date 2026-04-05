from extensions import db

class Section(db.Model):
    __tablename__ = "sections"
    id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey("colleges.id"), nullable=False, index=True)
    name = db.Column(db.String(1), nullable=False)  # A, B, C, etc.
    year = db.Column(db.Integer, nullable=False)
    dept_id = db.Column(db.Integer, db.ForeignKey("departments.id"))

    users = db.relationship("User", backref="section", lazy=True)
    timetables = db.relationship("Timetable", backref="section", lazy=True)
    max_hours_per_day = db.Column(db.Integer, default=5)
    __table_args__ = (db.UniqueConstraint("name", "year", "dept_id", name="unique_section_per_year_dept"),)
