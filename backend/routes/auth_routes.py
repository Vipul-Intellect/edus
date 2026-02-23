"""
Authentication routes
"""

from flask import Blueprint, request, jsonify, make_response
from datetime import datetime, timedelta
import jwt
from extensions import db
from models import User
from utils.decorators import token_required

auth_bp = Blueprint('auth', __name__)


@auth_bp.route("/register", methods=["GET", "POST", "OPTIONS"])
def register():
    if request.method != "POST":
        return jsonify({"message": "Use POST with JSON: username, password, role (student/teacher/admin), optional dept_id/year/section_id"}), 200
    data = request.json
    username = data.get("username")
    password = data.get("password")
    role = data.get("role")
    dept_id = data.get("dept_id")
    year = data.get("year")
    email = data.get("email")

    if not username or not password or not email or role not in ["student", "teacher", "admin"]:
        return jsonify({"error": "Invalid data (email is required)"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username exists"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 400

    user_data = {
        "username": username,
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
    # Flask-CORS handles OPTIONS preflight automatically
    if request.method == "OPTIONS":
        return make_response(), 200

    try:
        if request.method != "POST":
            return jsonify({"message": "Use POST with JSON: username, password"}), 200
        data = request.json
        username = data.get("username")
        password = data.get("password")
        
        user = User.query.filter_by(username=username, is_active=True).first()
        if user and user.check_password(password):
            from flask import current_app
            token = jwt.encode({
                "user_id": user.id,
                "exp": datetime.utcnow() + timedelta(hours=8)
            }, current_app.config["SECRET_KEY"], algorithm="HS256")
            
            return jsonify({
                "token": token,
                "role": user.role,
                "user_id": user.id,
                "full_name": user.full_name,
                "department": user.department.dept_name if user.department else None
            }), 200
        
        return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@auth_bp.route("/admin/login", methods=["GET", "POST", "OPTIONS"])
def admin_login():
    # Flask-CORS handles OPTIONS preflight automatically
    if request.method == "OPTIONS":
        return make_response(), 200

    try:
        if request.method != "POST":
            return jsonify({"message": "Use POST with JSON: username, password (admin credentials)"}), 200
        data = request.json or {}
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            return jsonify({"error": "Username and password required"}), 400

        user = User.query.filter_by(username=username, role="admin", is_active=True).first()

        if not user or not user.check_password(password):
            return jsonify({"error": "Invalid admin credentials"}), 401

        from flask import current_app
        token = jwt.encode(
            {
                "user_id": user.id,
                "role": user.role,
                "exp": datetime.utcnow() + timedelta(hours=8)
            },
            current_app.config["SECRET_KEY"],
            algorithm="HS256"
        )

        return jsonify({
            "message": "Admin login successful",
            "token": token,
            "role": user.role,
            "user_id": user.id
        }), 200
    except Exception as e:
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
