import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app import create_app
from models.user import User

app = create_app()
with app.app_context():
    users = User.query.limit(20).all()
    for u in users:
        print(f"User: {u.username}, Role: {u.role}, College ID: {u.college_id}")
