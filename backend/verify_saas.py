import os
import sys
import json
from datetime import datetime

# Add the current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from extensions import db
from models import College, User, Department, ChatbotConversation
from werkzeug.security import generate_password_hash
from flask import g

def run_verification():
    app = create_app('testing')
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['TESTING'] = True
    
    with app.app_context():
        db.create_all()
        
        print("\n" + "="*50)
        print("🚀 EDUSYNC SAAS VERIFICATION SUITE")
        print("="*50)
        
        # 1. Setup Test Data
        print("\n[SCENARIO 1] Initializing Multi-Tenant Environment...")
        
        # College A (IITB) - All features ON
        iitb = College(name='IIT Bombay', college_code='IITB', feature_flags={'ai_chatbot': True}, subscription_tier='pro')
        db.session.add(iitb)
        
        # College B (MIT) - Features OFF
        mit = College(name='MIT', college_code='MIT', feature_flags={'ai_chatbot': False}, subscription_tier='free')
        db.session.add(mit)
        db.session.commit()
        
        # Admins
        admin_a = User(username='admin_a', college_id=iitb.id, role='admin', password_hash='hash')
        admin_b = User(username='admin_b', college_id=mit.id, role='admin', password_hash='hash')
        sa = User(username='super', college_id=iitb.id, role='superadmin', password_hash='hash')
        
        db.session.add_all([admin_a, admin_b, sa])
        db.session.commit()
        
        print(f"✅ Created College A (IITB, ID:{iitb.id}) and College B (MIT, ID:{mit.id})")

        # 2. Test Global Data Isolation
        print("\n[SCENARIO 2] Testing Data Isolation...")
        
        # Mock Context for College A
        g.college_id = iitb.id
        g.is_super_admin = False
        
        # Create data in College A
        dept_a = Department(dept_name="Computer Science") # college_id should be auto-injected
        db.session.add(dept_a)
        db.session.commit()
        
        # Verify College A sees it
        results = Department.query.all()
        print(f"🔍 College A queries Departments: Found {len(results)} (Expected 1)")
        assert len(results) == 1
        assert results[0].college_id == iitb.id
        
        # Mock Context for College B
        g.college_id = mit.id
        
        # Verify College B does NOT see College A's data
        results = Department.query.all()
        print(f"🔍 College B queries Departments: Found {len(results)} (Expected 0)")
        assert len(results) == 0
        
        print("✅ Data Isolation Verified: SQL queries correctly scoped per tenant.")

        # 3. Test Automatic ID Injection (Before Flush)
        print("\n[SCENARIO 3] Testing Automatic Attribute Injection...")
        
        g.college_id = iitb.id
        new_dept = Department(dept_name="Mechanical Eng")
        db.session.add(new_dept)
        # Flush or commit triggers the before_flush listener
        db.session.commit()
        
        print(f"🔍 New Dept 'Mechanical' created. Assigned college_id: {new_dept.college_id}")
        assert new_dept.college_id == iitb.id
        print("✅ Auto-Injection Verified: Records are automatically stamped with tenant ID.")

        # 4. Test Super Admin Bypass
        print("\n[SCENARIO 4] Testing Super Admin Global Visibility...")
        
        # Mock Context for Super Admin
        g.college_id = iitb.id # SA usually has a home college but...
        g.is_super_admin = True # THIS triggers the bypass
        
        results = Department.query.all()
        print(f"🔍 Super Admin queries Departments: Found {len(results)} (Expected across all colleges: 2)")
        assert len(results) == 2
        print("✅ Super Admin Bypass Verified: Platform owners see global state.")

        # 5. Test Feature Flags (require_feature logic)
        print("\n[SCENARIO 5] Testing Feature Flags...")
        from utils.tenant_middleware import require_feature
        
        @app.route('/test-feature')
        @require_feature('ai_chatbot')
        def feature_route():
            return "SUCCESS"
            
        # College A (Chatbot ON)
        g.college_id = iitb.id
        g.college = iitb
        g.is_super_admin = False
        
        with app.test_client() as client:
            resp = client.get('/test-feature')
            print(f"🔍 Accessing AI Chatbot as College A: {resp.status_code} (Expected 200)")
            assert resp.status_code == 200
            
            # College B (Chatbot OFF)
            g.college_id = mit.id
            g.college = mit
            resp = client.get('/test-feature')
            print(f"🔍 Accessing AI Chatbot as College B: {resp.status_code} (Expected 403)")
            assert resp.status_code == 403
            
        print("✅ Feature Flags Verified: Granular access control enforced.")

        print("\n" + "="*50)
        print("✨ ALL SAAS CORE SYSTEMS VERIFIED")
        print("="*50)

if __name__ == "__main__":
    run_verification()
