from extensions import db

class FacultyUnavailability(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey("colleges.id"), nullable=False, index=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey("faculty.faculty_id"), nullable=False)
    day = db.Column(db.String(20), nullable=False)
    start_time = db.Column(db.String(20), nullable=False)

    faculty = db.relationship("Faculty", backref="unavailabilities")
    __table_args__ = (db.UniqueConstraint('faculty_id', 'day', 'start_time', name='_unique_faculty_unavailability'),)
