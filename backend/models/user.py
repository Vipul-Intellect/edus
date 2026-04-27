from extensions import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey("colleges.id"), nullable=False, index=True)
    username = db.Column(db.String(80), nullable=False)
    # Werkzeug's current default scrypt hashes are longer than 128 chars.
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # "teacher", "student", or "admin"
    full_name = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(100), nullable=True)
    dept_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=True)
    year = db.Column(db.Integer, nullable=True)
    section_id = db.Column(db.Integer, db.ForeignKey("sections.id"), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    phone = db.Column(db.String(20), nullable=True)
    roll_number = db.Column(db.String(20), nullable=True)
    attendance = db.Column(db.Float, default=0.0)

    # Unique per college
    __table_args__ = (
        db.UniqueConstraint('username', 'college_id', name='uq_user_username_college'),
        db.UniqueConstraint('email', 'college_id', name='uq_user_email_college'),
    )

    room_occupancies = db.relationship("RoomOccupancy", backref="user", lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
