from extensions import db

class Classroom(db.Model):
    __tablename__ = "classrooms"
    room_id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey("colleges.id"), nullable=False, index=True)
    name = db.Column(db.String(50), nullable=True)
    capacity = db.Column(db.Integer, nullable=False)
    resources = db.Column(db.String(200))

    occupancies = db.relationship("RoomOccupancy", backref="room", lazy=True)
