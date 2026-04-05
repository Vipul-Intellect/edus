from flask import Blueprint, request, jsonify
from extensions import db
from models.college import College
from models.user import User
from utils.decorators import token_required
from utils.tenant_middleware import require_super_admin
from werkzeug.security import generate_password_hash

super_admin_bp = Blueprint('super_admin', __name__)

@super_admin_bp.route("/colleges", methods=["GET"])
@token_required
@require_super_admin
def list_colleges(current_user):
    colleges = College.query.all()
    return jsonify([c.to_dict() for c in colleges]), 200

@super_admin_bp.route("/colleges", methods=["POST"])
@token_required
@require_super_admin
def create_college(current_user):
    data = request.json
    name = data.get("name")
    college_code = data.get("college_code", "").upper()
    admin_email = data.get("admin_email")
    admin_username = data.get("admin_username", "admin")
    admin_password = data.get("admin_password", "Admin@123")
    
    if not name or not college_code or not admin_email:
        return jsonify({"error": "Missing required fields (name, college_code, admin_email)"}), 400
    
    if College.query.filter_by(college_code=college_code).first():
        return jsonify({"error": f"College code '{college_code}' already exists"}), 400

    try:
        # 1. Create College
        new_college = College(
            name=name,
            college_code=college_code,
            feature_flags=data.get("feature_flags", {"ai_chatbot": True, "meetings": True, "timetable": True}),
            subscription_tier=data.get("subscription_tier", "free")
        )
        db.session.add(new_college)
        db.session.flush() # Get ID before commit
        
        # 2. Create default College Admin
        admin = User(
            username=admin_username,
            college_id=new_college.id,
            email=admin_email,
            password_hash=generate_password_hash(admin_password),
            role="admin",
            full_name=f"{name} Admin",
            is_active=True
        )
        db.session.add(admin)
        db.session.commit()
        
        return jsonify({
            "message": "College and Admin created successfully",
            "college": new_college.to_dict(),
            "admin_username": admin.username
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@super_admin_bp.route("/colleges/<int:college_id>", methods=["PATCH"])
@token_required
@require_super_admin
def update_college(current_user, college_id):
    college = College.query.get_or_404(college_id)
    data = request.json
    
    if "name" in data:
        college.name = data["name"]
    if "is_active" in data:
        college.is_active = data["is_active"]
    if "feature_flags" in data:
        # Merge flags
        current_flags = college.feature_flags or {}
        current_flags.update(data["feature_flags"])
        college.feature_flags = current_flags
    if "subscription_tier" in data:
        college.subscription_tier = data["subscription_tier"]
        
    db.session.commit()
    return jsonify(college.to_dict()), 200

@super_admin_bp.route("/stats", methods=["GET"])
@token_required
@require_super_admin
def get_platform_stats(current_user):
    college_count = College.query.count()
    user_count = User.query.count()
    
    return jsonify({
        "total_colleges": college_count,
        "total_users": user_count,
        "platform_status": "healthy"
    }), 200
