import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app import create_app
from models.user import User

app = create_app()
with app.app_context():
    admin = User.query.filter_by(role='admin').first()
    if admin:
        print(f"Admin: {admin.username}, College ID: {admin.college_id}")
    else:
        print("No admin user found")
