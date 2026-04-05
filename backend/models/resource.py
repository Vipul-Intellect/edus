from extensions import db
from datetime import datetime

class Resource(db.Model):
    """
    Represents bookable resources like Labs, Equipment, or Seminar Halls.
    Can be linked to a physical Classroom if applicable.
    """
    __tablename__ = "resources"
    
    id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey("colleges.id"), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    resource_type = db.Column(db.String(50), nullable=False)  # 'lab', 'equipment', 'room', 'sports'
    description = db.Column(db.Text, nullable=True)
    
    # Capacity/Quantity
    capacity = db.Column(db.Integer, default=1)  # Seating capacity for rooms, or quantity for equipment
    
    # Status
    status = db.Column(db.String(20), default="available")  # available/maintenance/retired
    is_active = db.Column(db.Boolean, default=True)
    
    # Link to physical classroom (optional)
    classroom_id = db.Column(db.Integer, db.ForeignKey("classrooms.room_id"), nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    classroom = db.relationship("Classroom", backref="resource_link")
    bookings = db.relationship("ResourceBooking", back_populates="resource", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Resource {self.name} ({self.resource_type})>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "resource_type": self.resource_type,
            "description": self.description,
            "capacity": self.capacity,
            "status": self.status,
            "is_active": self.is_active,
            "classroom_id": self.classroom_id,
            "classroom_name": self.classroom.name if self.classroom else None,
            "created_at": self.created_at.isoformat()
        }
