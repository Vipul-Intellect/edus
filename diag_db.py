from app import create_app
from extensions import db
from models import User, College
from werkzeug.security import check_password_hash

app = create_app()
with app.app_context():
    college = College.query.filter_by(college_code='DEFAULT').first()
    if not college:
        print("❌ College DEFAULT not found")
    else:
        print(f"✅ College DEFAULT found (ID: {college.id})")
        user = User.query.filter_by(username='admin', college_id=college.id).first()
        if not user:
            print("❌ User 'admin' not found in DEFAULT college")
        else:
            print(f"✅ User 'admin' found (ID: {user.id}, Role: {user.role})")
            print(f"✅ Password match: {check_password_hash(user.password_hash, 'password')}")
            print(f"✅ Hashed Password: {user.password_hash}")
