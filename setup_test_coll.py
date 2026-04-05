import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.app import create_app
from backend.extensions import db
from backend.models import User, College
from werkzeug.security import generate_password_hash

app = create_app()
with app.app_context():
    print("🧪 Setting up 'TEST_COLL' for multi-tenant testing...")
    
    college = College.query.filter_by(college_code='TEST_COLL').first()
    if not college:
        college = College(name="Test University", college_code="TEST_COLL")
        db.session.add(college)
        db.session.commit()
    
    admin = User.query.filter_by(username='test_admin', college_id=college.id).first()
    if not admin:
        admin = User(
            username='test_admin',
            password_hash=generate_password_hash('password'),
            role='admin',
            college_id=college.id,
            is_active=True,
            full_name="Test Administrator"
        )
        db.session.add(admin)
        db.session.commit()
    
    print(f"✅ Setup complete. College ID: {college.id}, Admin ID: {admin.id}")
