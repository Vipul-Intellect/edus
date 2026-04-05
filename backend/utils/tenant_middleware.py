from flask import g, request, abort, current_app
from functools import wraps
from sqlalchemy import event
from sqlalchemy.orm import Session, with_loader_criteria
import jwt

class TenantContext:
    """Stores current tenant details in Flask's g object"""
    @staticmethod
    def set_college(college):
        g.college_id = college.id
        g.college = college
    
    @staticmethod
    def get_college_id():
        return getattr(g, 'college_id', None)
    
    @staticmethod
    def is_super_admin():
        return getattr(g, 'is_super_admin', False)

def require_tenant(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not TenantContext.get_college_id():
            abort(403, description="No college context found. Please log in with a valid college.")
        return f(*args, **kwargs)
    return decorated_function

def require_super_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not TenantContext.is_super_admin():
            abort(403, description="Super Admin access required.")
        return f(*args, **kwargs)
    return decorated_function

def require_feature(feature_name):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if TenantContext.is_super_admin():
                return f(*args, **kwargs)
            
            college = getattr(g, 'college', None)
            if not college:
                # Should have been caught by require_tenant, but safety first
                abort(403, description="No college context found.")
            
            # Check feature flag in college's JSON feature_flags
            if not college.feature_flags.get(feature_name, False):
                abort(403, description=f"The feature '{feature_name}' is not enabled for your college.")
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def load_tenant_from_token():
    """Extract tenant context from JWT and set in Flask's g"""
    
    # Get Authorization header
    # Get Token from either Authorization or x-access-token
    auth_header = request.headers.get('Authorization', '')
    x_token = request.headers.get('x-access-token', '')
    
    token = None
    if auth_header:
        if auth_header.lower().startswith('bearer '):
            token = auth_header[7:]
        else:
            token = auth_header
    elif x_token:
        token = x_token
        
    # Skip if no token found
    if not token:
        # print(f"⚠️ No auth token found for {request.path}")
        return
    
    try:
        
        # Decode JWT
        payload = jwt.decode(
            token,
            current_app.config['SECRET_KEY'],
            algorithms=['HS256']
        )
        
        # Set global context
        g.user_id = payload.get('user_id')
        g.college_id = payload.get('college_id')
        g.username = payload.get('username')
        g.role = payload.get('role')
        g.is_super_admin = (payload.get('role') == 'superadmin')
        
        # Fallback/Ensuring full object is loaded for feature checks (backward compatibility)
        if g.user_id:
            from models.user import User
            from models.college import College
            
            # Fetch college if we only have the ID (to support feature flags in g.college)
            if g.college_id and not getattr(g, 'college', None):
                g.college = College.query.get(g.college_id)
            
            # Fallback for older tokens missing college_id during transition
            elif not g.college_id and not g.is_super_admin:
                # 🚨 CRITICAL: Enter Recovery Mode to bypass isolation filter
                # This allows us to fetch the user's college_id from the DB
                # without hitting the circular deadlock.
                g.is_recovery_mode = True
                try:
                    user = User.query.get(g.user_id)
                    if user:
                        g.college_id = user.college_id
                        g.college = user.college
                        print(f"🔄 [TRANSITION] Recovered college_id={g.college_id} for user {g.username}")
                finally:
                    g.is_recovery_mode = False

        print(f"🛡️  [TENANT] context: college_id={g.college_id}, user={g.username}, role={g.role}")
        
    except jwt.ExpiredSignatureError:
        print(f"❌ Token expired")
        g.college_id = None
    except jwt.InvalidTokenError as e:
        print(f"❌ Invalid token: {e}")
        g.college_id = None
    except Exception as e:
        print(f"❌ Unexpected error in load_tenant_from_token: {e}")
        import traceback
        traceback.print_exc()
        g.college_id = None

# --- Global Data Isolation Layer ---
# This has been moved to backend/utils/query_filter.py for better organization
# and explicit logging as requested.
