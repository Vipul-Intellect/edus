import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.app import create_app
from backend.extensions import db
from backend.models import User, College
from werkzeug.security import generate_password_hash

app = create_app()
with app.app_context():
    print("🛠️  Synchronizing Database with Quick Login Credentials...")
    
    college = College.query.filter_by(college_code='DEFAULT').first()
    if not college:
        # Create default college if missing
        college = College(name="Default College", college_code="DEFAULT")
        db.session.add(college)
        db.session.commit()
    
    creds = [
        {'username': 'admin',      'password': 'Admin@123',   'role': 'admin'},
        {'username': 'teacher1',   'password': 'Teacher@123', 'role': 'teacher'},
        {'username': 'student1',   'password': 'Student@123', 'role': 'student'},
        {'username': 'superadmin', 'password': 'Super@123',   'role': 'superadmin'}
    ]
    
    for c in creds:
        user = User.query.filter_by(username=c['username'], college_id=college.id).first()
        if user:
            print(f"✅ Updating {c['username']}...")
            user.password_hash = generate_password_hash(c['password'])
            user.role = c['role']
        else:
            print(f"➕ Creating {c['username']}...")
            user = User(
                username=c['username'],
                password_hash=generate_password_hash(c['password']),
                role=c['role'],
                college_id=college.id,
                is_active=True
            )
            db.session.add(user)
    
    db.session.commit()
    print("🎉 Database sync complete!")
