import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import create_app
from extensions import db
from models.user import User
from models.college import College
from utils.tenant_middleware import TenantContext
from flask import g

app = create_app()

def test_isolation():
    with app.app_context():
        print("--- TESTING MULTI-TENANCY ISOLATION ---")
        
        # 0. Cleanup existing test data for a fresh run
        User.query.filter_by(username='test_user').delete()
        # Note: Be careful with deleting colleges if they have other relationships, 
        # but for this test it should be fine as we just deleted the test_user.
        College.query.filter_by(college_code='TEST').delete()
        db.session.commit()
        print("--- CLEANUP COMPLETED ---")
        
        # 1. Check existing data (Default College)
        default_college = College.query.filter_by(college_code='DEFAULT').first()
        print(f"Default College: {default_college.name} (ID: {default_college.id})")
        
        # 2. Create a Second College
        test_college = College.query.filter_by(college_code='TEST').first()
        if not test_college:
            print("TEST college not found in query, attempting creation...")
            # Use a separate session or just catch integrity error to ensure we have it
            try:
                test_college = College(name="Test University", college_code="TEST")
                db.session.add(test_college)
                db.session.commit()
                print(f"Created Second College: {test_college.name} (ID: {test_college.id})")
            except Exception as e:
                db.session.rollback()
                # Re-query without any filters just in case (though g is None here)
                test_college = College.query.filter_by(college_code='TEST').first()
                if not test_college:
                    print(f"Failed to find or create TEST college: {e}")
                    return
                print(f"Found existing TEST college after rollback (ID: {test_college.id})")
        else:
            print(f"Found existing TEST college: {test_college.name} (ID: {test_college.id})")
        
        # 3. Create a user in the second college
        test_user = User.query.filter_by(username='test_user', college_id=test_college.id).first()
        if not test_user:
            test_user = User(
                username='test_user',
                college_id=test_college.id,
                email='test@test.com',
                role='teacher',
                full_name='Test Teacher'
            )
            db.session.add(test_user)
            db.session.commit()
            print(f"Created User '{test_user.username}' in College '{test_college.college_code}'")

        # --- SIMULATE TENANT 1 (DEFAULT) ---
        print("\nScoping to DEFAULT college...")
        TenantContext.set_college(default_college)
        users = User.query.all()
        print(f"Users found for DEFAULT: {[u.username for u in users]}")
        # Ensure test_user is NOT in the list
        if 'test_user' in [u.username for u in users]:
            print("❌ FAILURE: Data Leakage! Test user found in Default college scope.")
        else:
            print("✅ SUCCESS: Data Isolation works for DEFAULT college.")

        # --- SIMULATE TENANT 2 (TEST) ---
        print("\nScoping to TEST college...")
        TenantContext.set_college(test_college)
        users = User.query.all()
        print(f"Users found for TEST: {[u.username for u in users]}")
        # Ensure only test_user is in the list (or other users created in TEST)
        if all(u.college_id == test_college.id for u in users):
            print("✅ SUCCESS: Data Isolation works for TEST college.")
        else:
            print("❌ FAILURE: Data Leakage! Foreign users found in TEST college scope.")

        # --- SIMULATE SUPER ADMIN ---
        print("\nScoping to SUPER ADMIN...")
        g.is_super_admin = True
        users = User.query.all()
        print(f"Total Users found for SUPER ADMIN: {len(users)}")
        if len(users) > 1:
            print("✅ SUCCESS: Super Admin sees all data.")
        else:
            print("❌ FAILURE: Super Admin restricted by tenant filters.")

if __name__ == "__main__":
    test_isolation()
