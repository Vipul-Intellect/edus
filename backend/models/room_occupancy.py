from extensions import db
from datetime import datetime

class RoomOccupancy(db.Model):
    __tablename__ = "room_occupancy"
    id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey("colleges.id"), nullable=False, index=True)
    room_id = db.Column(db.Integer, db.ForeignKey("classrooms.room_id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="free")  # "free", "occupied"
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.String(200), nullable=True)
