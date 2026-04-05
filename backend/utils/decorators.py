from functools import wraps
from flask import request, jsonify, make_response, current_app, g
import jwt
from models.user import User
from models.college import College
from utils.tenant_middleware import TenantContext

def _extract_token_from_request():
    # Prefer standard Authorization: Bearer <token>
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        print(f"DEBUG: Found Bearer token: {token[:20]}...")
        return token
    # Backward compatible with existing x-access-token
    x_token = request.headers.get("x-access-token")
    if x_token:
        print(f"DEBUG: Found x-access-token: {x_token[:20]}...")
    else:
        print("DEBUG: No token found in headers")
        print(f"DEBUG: Available headers: {list(request.headers.keys())}")
    return x_token

def token_required(f):
    """Decorator to ensure user is authenticated and tenant context is set"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # Allow OPTIONS requests for CORS preflight
        if request.method == "OPTIONS":
            return make_response(), 200

        # 1. Check if tenant context was set by before_request
        # We rely on g.user_id and g.college_id which were set in load_tenant_from_token
        user_id = getattr(g, 'user_id', None)
        college_id = getattr(g, 'college_id', None)

        if not user_id:
            return jsonify({"error": "Authentication required. Token missing or invalid."}), 401
        
        if not college_id and not getattr(g, 'is_super_admin', False):
            return jsonify({"error": "No college context found. Please log in again."}), 403
        
        # 2. Get User object for the route handler
        current_user = User.query.get(user_id)
        if not current_user or not current_user.is_active:
            return jsonify({"error": "User no longer active"}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def wrapper(current_user, *args, **kwargs):
        # Allow OPTIONS requests for CORS preflight without authentication
        # Flask-CORS will handle the headers automatically
        if request.method == "OPTIONS":
            # Return empty response - Flask-CORS will add headers
            response = make_response()
            response.status_code = 200
            return response

        if current_user.role not in ["admin", "superadmin"]:
            return jsonify({"error": "Admin only"}), 403
        return f(current_user, *args, **kwargs)
    return wrapper

def teacher_required(f):
    @wraps(f)
    def wrapper(current_user, *args, **kwargs):
        if request.method == "OPTIONS":
            response = make_response()
            response.status_code = 200
            return response

        if current_user.role not in ["teacher", "admin", "superadmin"]:
            return jsonify({"error": "Teacher or admin only"}), 403
        return f(current_user, *args, **kwargs)
    return wrapper
