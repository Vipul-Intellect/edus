import sys
import os
import requests
import json
from werkzeug.security import generate_password_hash

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# We define a minimal setup that doesn't trigger MetaData collision
def setup_test_data():
    from backend.app import create_app
    from backend.extensions import db
    from backend.models import College, User, Student

    # Use development DB as the app.py is likely using it
    app = create_app('development')
    
    with app.app_context():
        print("--- Step 1: Setting up Test Data ---")
        
        # Cleanup
        User.query.filter(User.username == "admin_test").delete()
        College.query.filter(College.college_code.in_(['TEST1', 'TEST2'])).delete()
        db.session.commit()

        # Create College 1
        c1 = College(
            name="Test College 1",
            college_code="TEST1",
            is_active=True,
            feature_flags={'meetings': True}
        )
        db.session.add(c1)
        db.session.flush()

        a1 = User(
            username="admin_test",
            password=generate_password_hash("admin123"),
            full_name="Admin One",
            email="admin1@test.com",
            role="admin",
            college_id=c1.id,
            is_active=True
        )
        db.session.add(a1)

        # Create College 2
        c2 = College(
            name="Test College 2",
            college_code="TEST2",
            is_active=True,
            feature_flags={'meetings': True}
        )
        db.session.add(c2)
        db.session.flush()

        a2 = User(
            username="admin_test",
            password=generate_password_hash("admin123"),
            full_name="Admin Two",
            email="admin2@test.com",
            role="admin",
            college_id=c2.id,
            is_active=True
        )
        db.session.add(a2)

        db.session.commit()
        print(f"✅ Created College 1 (ID: {c1.id}) and College 2 (ID: {c2.id}) both with 'admin_test'")
        return c1.id, c2.id

BASE_URL = "http://localhost:5000"

def test_login():
    print("\n--- Step 2: Testing Login Isolation ---")
    
    # Login C1
    r1 = requests.post(f"{BASE_URL}/api/login", json={
        "college_code": "TEST1",
        "username": "admin_test",
        "password": "admin123"
    })
    data1 = r1.json()
    token1 = data1.get('token')
    u1 = data1.get('user', {})
    cid1 = u1.get('college', {}).get('id')
    print(f"C1 Login Status: {r1.status_code}, User ID: {u1.get('id')}, College ID: {cid1}")

    # Login C2
    r2 = requests.post(f"{BASE_URL}/api/login", json={
        "college_code": "TEST2",
        "username": "admin_test",
        "password": "admin123"
    })
    data2 = r2.json()
    token2 = data2.get('token')
    u2 = data2.get('user', {})
    cid2 = u2.get('college', {}).get('id')
    print(f"C2 Login Status: {r2.status_code}, User ID: {u2.get('id')}, College ID: {cid2}")

    if not token1 or not token2:
        print("❌ ERROR: Login failed.")
        return None, None

    if cid1 == cid2:
        print("❌ ERROR: Login Collision! Both logins returned same college ID.")
        return None, None
    else:
        print("✅ SUCCESS: Login Isolation works. Different tokens/IDs received.")
        return token1, token2

if __name__ == "__main__":
    setup_test_data()
    t1, t2 = test_login()
    if t1 and t2:
        print("\nVerification complete.")
