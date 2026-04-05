"""
Authentication routes
"""

from flask import Blueprint, request, jsonify, make_response
from datetime import datetime, timedelta
import jwt
from extensions import db
from models import User, College
from utils.decorators import token_required

auth_bp = Blueprint('auth', __name__)


@auth_bp.route("/register", methods=["GET", "POST", "OPTIONS"])
def register():
    if request.method != "POST":
        return jsonify({"message": "Use POST with JSON: username, password, role (student/teacher/admin), optional dept_id/year/section_id"}), 200
    data = request.json
    username = data.get("username")
    password = data.get("password")
    email = data.get("email")
    role = data.get("role")
    college_code = data.get("college_code")  # Required for multi-tenancy
    dept_id = data.get("dept_id")
    year = data.get("year")

    if not college_code:
        return jsonify({"error": "College code required"}), 400
    
    college = College.query.filter_by(college_code=college_code.upper()).first()
    if not college:
        return jsonify({"error": "Invalid college code"}), 404

    if not username or not password or not email or role not in ["student", "teacher", "admin"]:
        return jsonify({"error": "Invalid data (email is required)"}), 400
    
    if User.query.filter_by(username=username, college_id=college.id).first():
        return jsonify({"error": "Username exists in this college"}), 400
    
    if User.query.filter_by(email=email, college_id=college.id).first():
        return jsonify({"error": "Email already registered in this college"}), 400

    user_data = {
        "username": username,
        "college_id": college.id,
        "role": role,
        "dept_id": dept_id,
        "year": year,
        "email": email,
    }
    user = User(**user_data)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()
    return jsonify({"message": f"{role.capitalize()} registered successfully"}), 201


@auth_bp.route("/login", methods=["GET", "POST", "OPTIONS"])
def login():
    """
    Login with college code (IITB, admin, password)
    """
    # Flask-CORS handles OPTIONS preflight automatically
    if request.method == "OPTIONS":
        return make_response(), 200

    try:
        if request.method != "POST":
            return jsonify({"message": "Use POST with JSON: college_code, username, password"}), 200
        
        data = request.json or {}
        college_code = data.get("college_code")
        username = data.get("username")
        password = data.get("password")
        
        if not all([college_code, username, password]):
            return jsonify({"error": "Missing required fields: college_code, username, password"}), 400
            
        college_code = college_code.upper().strip()
        username = username.strip()

        print(f"🔐 Login attempt: college={college_code}, username={username}")
        
        # Step 1: Find college
        college = College.query.filter_by(college_code=college_code).first()
        if not college:
            print(f"❌ College not found: {college_code}")
            return jsonify({"error": "Invalid college code"}), 404
        
        if not college.is_active:
            print(f"❌ College inactive: {college_code}")
            return jsonify({"error": "College account is inactive"}), 403
        
        print(f"✅ College found: {college.name} (ID: {college.id})")
        
        # Step 2: Find user IN THAT COLLEGE to prevent collisions
        user = User.query.filter_by(
            username=username,
            college_id=college.id,
            is_active=True
        ).first()
        
        if not user:
            print(f"❌ User not found: {username} in college {college.id}")
            return jsonify({"error": "Invalid credentials"}), 401
            
        print(f"✅ User found: {user.username} (ID: {user.id}, Role: {user.role})")

        # Step 3: Verify password (with legacy plain-text fallback/migration)
        from werkzeug.security import check_password_hash, generate_password_hash
        
        is_password_correct = False
        stored_pw = user.password_hash
        
        if stored_pw and (stored_pw.startswith('pbkdf2:sha256:') or stored_pw.startswith('scrypt:') or stored_pw.startswith('bcrypt:')):
            # It's a hash, use standard verification
            is_password_correct = check_password_hash(stored_pw, password)
        else:
            # It's likely plain text (legacy)
            if stored_pw == password:
                is_password_correct = True
                # AUTO-MIGRATE: Upgrade to hash on successful login
                print(f"🔄 Migrating user {username} to secure password hash...")
                user.password_hash = generate_password_hash(password)
                db.session.commit()
        
        if not is_password_correct:
            print(f"❌ Invalid password for {username}")
            return jsonify({"error": "Invalid credentials"}), 401
        
        print(f"✅ Password verified")

        # Step 4: Generate JWT with college_id
        from flask import current_app
        token_payload = {
            'user_id': user.id,
            'college_id': college.id,
            'college_code': college.college_code,
            'username': user.username,
            'role': user.role,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }
        
        token = jwt.encode(
            token_payload,
            current_app.config['SECRET_KEY'],
            algorithm='HS256'
        )
        
        print(f"✅ JWT generated with college_id={college.id}")
        
        # Step 5: Return user data with college info
        response_data = {
            'token': token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'name': user.full_name,
                'college': {
                    'id': college.id,
                    'name': college.name,
                    'code': college.college_code,
                    'features': college.feature_flags or {}
                }
            },
            'role': user.role, # Keep legacy fields for frontend compatibility
            'user_id': user.id,
            'full_name': user.full_name,
            'department': user.department.dept_name if user.department else None
        }
        
        print(f"✅ Login successful for {username}@{college_code}")
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Authentication failed", "details": str(e)}), 500


@auth_bp.route("/admin/login", methods=["GET", "POST", "OPTIONS"])
def admin_login():
    """
    Strict Admin Login with college code
    """
    # Flask-CORS handles OPTIONS preflight automatically
    if request.method == "OPTIONS":
        return make_response(), 200

    try:
        if request.method != "POST":
            return jsonify({"message": "Use POST with JSON: college_code, username, password"}), 200
            
        data = request.json or {}
        college_code = data.get("college_code")
        username = data.get("username")
        password = data.get("password")

        if not all([college_code, username, password]):
            return jsonify({"error": "Missing required fields"}), 400
            
        college_code = college_code.upper().strip()
        username = username.strip()

        print(f"🔐 Admin login attempt: college={college_code}, username={username}")
        
        # Step 1: Find college
        college = College.query.filter_by(college_code=college_code).first()
        if not college:
            print(f"❌ College not found: {college_code}")
            return jsonify({"error": "Invalid college code"}), 404

        if not college.is_active:
            print(f"❌ College inactive: {college_code}")
            return jsonify({"error": "College account is inactive"}), 403

        # Step 2: Find user (Admin or SuperAdmin)
        from sqlalchemy import or_
        user = User.query.filter(
            User.username == username,
            User.college_id == college.id,
            User.role.in_(['admin', 'superadmin']),
            User.is_active == True
        ).first()

        if not user:
            print(f"❌ Admin/SuperAdmin user not found: {username} in college {college.id}")
            return jsonify({"error": "Invalid administrative credentials"}), 401

        # Step 3: Verify password (with legacy plain-text fallback/migration)
        from werkzeug.security import check_password_hash, generate_password_hash
        
        is_password_correct = False
        stored_pw = user.password_hash
        
        if stored_pw and (stored_pw.startswith('pbkdf2:sha256:') or stored_pw.startswith('scrypt:') or stored_pw.startswith('bcrypt:')):
            is_password_correct = check_password_hash(stored_pw, password)
        else:
            if stored_pw == password:
                is_password_correct = True
                print(f"🔄 Migrating Admin {username} to secure password hash...")
                user.password_hash = generate_password_hash(password)
                db.session.commit()
        
        if not is_password_correct:
            print(f"❌ Invalid password for {username}")
            return jsonify({"error": "Invalid administrative credentials"}), 401

        print(f"✅ Admin password verified")

        # Step 4: Generate JWT with college_id
        from flask import current_app
        token_payload = {
            'user_id': user.id,
            'college_id': college.id,
            'college_code': college.college_code,
            'username': user.username,
            'role': user.role,
            'exp': datetime.utcnow() + timedelta(hours=24) # Align to 24h
        }

        token = jwt.encode(
            token_payload,
            current_app.config['SECRET_KEY'],
            algorithm='HS256'
        )

        print(f"✅ Admin JWT generated with college_id={college.id}")

        # Step 5: Return data
        response_data = {
            'message': 'Admin login successful',
            'token': token,
            'user': {
                'id': user.id,
                'username': user.username,
                'role': user.role,
                'college_id': college.id
            },
            'role': user.role,
            'user_id': user.id
        }

        print(f"✅ Admin login successful for {username}@{college_code}")
        return jsonify(response_data), 200

    except Exception as e:
        print(f"❌ Admin login error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# ONE-TIME ADMIN SEED — for fresh production deploys
# Disable by setting SETUP_SECRET=disabled in env vars after first use
# ─────────────────────────────────────────────
@auth_bp.route("/setup/admin", methods=["POST"])
def setup_admin():
    import os, traceback
    secret = os.environ.get("SETUP_SECRET", "")
    if not secret or secret == "disabled":
        return jsonify({"error": "Setup endpoint is disabled"}), 403

    data = request.json or {}
    if data.get("setup_key") != secret:
        return jsonify({"error": "Invalid setup key"}), 403

    try:
        # Only allow if no admin exists yet
        existing = User.query.filter_by(role="admin").first()
        if existing:
            return jsonify({"error": "Admin already exists. Set SETUP_SECRET=disabled in env vars."}), 400

        username = data.get("username", "admin")
        password = data.get("password", "Admin@123")
        email = data.get("email", "admin@school.com")
        full_name = data.get("full_name", "System Admin")

        user = User(
            username=username,
            role="admin",
            email=email,
            full_name=full_name,
            is_active=True
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        return jsonify({
            "message": f"Admin '{username}' created successfully! Now set SETUP_SECRET=disabled in Render env vars.",
            "username": username
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

@auth_bp.route("/setup/migrate_users", methods=["POST"])
def migrate_users():
    import os, traceback
    secret = os.environ.get("SETUP_SECRET", "")
    if not secret or secret == "disabled":
        return jsonify({"error": "Setup endpoint is disabled"}), 403

    data = request.json or {}
    if data.get("setup_key") != secret:
        return jsonify({"error": "Invalid setup key"}), 403

    users_data = data.get("users", [])
    if not users_data:
        return jsonify({"error": "No user data provided"}), 400

    try:
        count = 0
        for u_data in users_data:
            if not u_data.get('username') or not u_data.get('password_hash'):
                continue
                
            existing = User.query.filter_by(username=u_data['username']).first()
            if existing:
                # Update existing user
                existing.password_hash = u_data['password_hash']
                existing.role = u_data.get('role', existing.role)
                existing.full_name = u_data.get('full_name', existing.full_name)
                existing.email = u_data.get('email', existing.email)
                existing.is_active = u_data.get('is_active', True)
            else:
                # Create new user
                new_user = User(
                    username=u_data['username'],
                    password_hash=u_data['password_hash'],
                    role=u_data.get('role', 'student'),
                    full_name=u_data.get('full_name', ''),
                    email=u_data.get('email', ''),
                    is_active=u_data.get('is_active', True)
                )
                db.session.add(new_user)
            count += 1
        
        db.session.commit()
        return jsonify({"message": f"Successfully migrated {count} users"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500
