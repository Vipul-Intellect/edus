from app import create_app
from extensions import db
from models.user import User
from werkzeug.security import generate_password_hash

app = create_app()
with app.app_context():
    user = User.query.filter_by(username='pite_admin').first()
    if user:
        user.password_hash = generate_password_hash("Admin@123")
        db.session.commit()
        print("Password for pite_admin reset to 'Admin@123'")
    else:
        print("User pite_admin not found")
