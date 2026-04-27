"""
Main Flask Application Entry Point
Uses the modular structure with separate models, routes, services, and utils
"""

import os
import traceback

# Load .env from the backend directory regardless of where the process is launched from
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"), override=True)


from flask import Flask, request, jsonify, g, abort
from config import config
from extensions import init_extensions, db, scheduler
from models import *
from utils.tenant_middleware import load_tenant_from_token
from utils.query_filter import setup_tenant_filtering

def _seed_admin():
    """Create default college and admin on first startup if needed."""
    try:
        from models.user import User
        from models.college import College
        from werkzeug.security import generate_password_hash
        
        # 1. Ensure Default College exists
        default_college = College.query.filter_by(college_code='DEFAULT').first()
        if not default_college:
            default_college = College(
                name='Default College',
                college_code='DEFAULT',
                feature_flags={'ai_chatbot': True, 'meetings': True, 'timetable': True},
                subscription_tier='enterprise'
            )
            db.session.add(default_college)
            db.session.commit()
            print('[Seed] Default college created.')

        # 3. Check for Super Admin (Platform Owner)
        if not User.query.filter_by(role='superadmin').first():
            super_admin = User(
                username='superadmin',
                college_id=default_college.id,
                password_hash=generate_password_hash('Super@123'),
                role='superadmin',
                full_name='Platform Owner',
                email='superadmin@edusync.com',
                is_active=True
            )
            db.session.add(super_admin)
            db.session.commit()
            print('[Seed] Super admin created: username=superadmin password=Super@123')
        
        else:
            print('[Seed] System already initialized, skipping seed.')
    except Exception as e:
        print(f'[Seed] Seeding failed: {e}')
        db.session.rollback()


def create_app(config_name=None):
    """Application factory pattern"""
    app = Flask(__name__)

    # Auto-detect environment from FLASK_ENV or use provided config_name
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    # Load configuration
    app.config.from_object(config[config_name])

    # Initialize extensions (Flask-CORS will handle all CORS automatically)
    init_extensions(app)

    # Create database tables and seed default admin if needed
    with app.app_context():
        try:
            # Ensure uploads directory exists
            import os as _os
            _os.makedirs(app.config.get('UPLOAD_FOLDER', 'uploads'), exist_ok=True)

            db.create_all()
            _seed_admin()
        except Exception as e:
            print("=" * 60)
            print("DATABASE CONNECTION ERROR")
            print("=" * 60)
            print(f"Error: {e}")
            if "could not translate host name" in str(e) or "dpg-" in str(e):
                print("\nTIP: It looks like you're using Render's Internal Database URL.")
                print("If you are connecting from outside Render OR if your app is in a different region,")
                print("please use the 'External Database URL' from your Render PostgreSQL dashboard.")
            print("=" * 60)
            # Still raise if in production to prevent running in invalid state
            # but maybe allow it for setup scripts if needed.
            # For now, let's just log it clearly.

    # Register routes
    from routes.auth_routes import auth_bp
    from routes.super_admin import super_admin_bp
    from routes.admin_routes import admin_bp
    from routes.timetable_routes import timetable_bp
    from routes.faculty_routes import faculty_bp
    from routes.leave_routes import leave_bp
    from routes.upload_routes import upload_bp
    from routes.chat_routes import chat_bp
    from routes.legacy_routes import legacy_bp
    from routes.student_routes import student_bp
    from routes.faculty_workload_routes import workload_bp
    from routes.performance_routes import performance_bp
    from routes.resource_routes import resource_bp
    from routes.notification_routes import notification_bp
    from routes.google_calendar_routes import google_calendar_bp
    from routes.meeting_routes import meeting_bp
    from routes.assessment_routes import assessment_bp
    from routes.marks_routes import marks_bp
    from routes.assignment_routes import assignment_bp
    from routes.room_issue_routes import room_issues_bp

    # Register blueprints with prefixes that match the frontend (ApiService)
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(student_bp, url_prefix='/student')
    app.register_blueprint(timetable_bp)  # Handles /get_timetable, etc.
    app.register_blueprint(faculty_bp, url_prefix='/teacher')
    app.register_blueprint(leave_bp, url_prefix='/api/leave')
    app.register_blueprint(upload_bp, url_prefix='/api/upload')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(legacy_bp)      # Handles /get_faculty, etc.
    app.register_blueprint(super_admin_bp, url_prefix='/api/super')
    app.register_blueprint(performance_bp, url_prefix='/api')
    app.register_blueprint(resource_bp, url_prefix='/api')
    app.register_blueprint(notification_bp, url_prefix='/api')
    app.register_blueprint(google_calendar_bp, url_prefix='/api')
    app.register_blueprint(meeting_bp, url_prefix='/api')
    app.register_blueprint(assessment_bp, url_prefix='/api')
    app.register_blueprint(marks_bp, url_prefix='/api')
    app.register_blueprint(assignment_bp, url_prefix='/api')
    app.register_blueprint(workload_bp, url_prefix='/api/faculty/workload')
    app.register_blueprint(room_issues_bp, url_prefix='/api')
    
    # Rooms status route - register separately at root level
    from routes.faculty_routes import get_rooms_status
    from utils.decorators import token_required
    app.add_url_rule('/rooms/status', 'get_rooms_status', token_required(get_rooms_status), methods=['GET', 'OPTIONS'])

    @app.before_request
    def handle_tenant_context():
        # 1. Skip OPTIONS requests (CORS)
        if request.method == "OPTIONS":
            return
        
        # 2. Skip for public routes
        # We check blueprint name, path prefixes, and common public endpoints
        is_public = (
            request.blueprint == 'auth' or 
            request.path.startswith('/api/login') or
            request.path.startswith('/api/register') or
            request.path.startswith('/api/uploads/') or  # Static file serving — no auth needed
            request.path == '/' or
            request.path == '/api/debug/tenant'
        )
        
        if is_public:
            return
            
        # 4. Load tenant from token
        load_tenant_from_token()
        
        # 5. Fail-safe: Block if context is missing for protected routes
        has_context = getattr(g, 'college_id', None) is not None
        is_super = getattr(g, 'is_super_admin', False)

        if not has_context and not is_super:
            print(f"🚨 [BLOCK] No college_id for protected route {request.path} (Blueprint: {request.blueprint})")
            print(f"   Headers: {dict(request.headers)}")
            abort(403, description="College context required. Please log in.")

    # ── Static file serving for notification attachments ──
    from flask import send_from_directory
    @app.route('/api/uploads/<path:filename>', methods=['GET'])
    def serve_upload(filename):
        import os as _os
        upload_folder = app.config.get('UPLOAD_FOLDER', 'uploads')
        return send_from_directory(_os.path.abspath(upload_folder), filename)

    # Basic home route
    @app.route('/', methods=['GET'])
    def home():
        from flask import jsonify
        return jsonify({
            "message": "Enhanced Timetable Management System API",
            "status": "running",
            "version": "2.0 - Modular Architecture",
            "features": [
                "AI Chat Assistant",
                "Email Notifications",
                "Faculty Workload Management",
                "Meeting Scheduling"
            ],
            "modular_structure": {
                "models": "Database models",
                "routes": "API endpoints",
                "services": "Business logic",
                "utils": "Helper functions"
            }
        })

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        print("!!! INTERNAL SERVER ERROR 500 !!!")
        print(traceback.format_exc())
        response = jsonify({
            "error": "Internal server error", 
            "message": str(error),
            "traceback": traceback.format_exc() if app.debug else None
        })
        # Explicit CORS headers for error responses
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH")
        return response, 500

    @app.errorhandler(404)
    def not_found(error):
        response = jsonify({"error": "Endpoint not found"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 404

    @app.errorhandler(400)
    def bad_request(error):
        response = jsonify({"error": "Bad request"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 400

    # ✅ CRITICAL: Setup tenant filtering
    setup_tenant_filtering(app, db)

    return app

# Create app instance for gunicorn
app = create_app()

# Start background scheduler for Google Calendar sync (only if APScheduler is available)
from extensions import SCHEDULER_AVAILABLE, scheduler

def _background_sync():
    with app.app_context():
        try:
            from services.google_calendar_service import background_sync_all_users
            background_sync_all_users()
        except Exception as e:
            print(f"[GCal BG] Scheduler error: {e}")

if SCHEDULER_AVAILABLE and scheduler is not None:
    try:
        scheduler.add_job(
            _background_sync,
            trigger='interval',
            hours=6,
            id='gcal_sync',
            replace_existing=True
        )
        scheduler.start()
        print("[GCal] Background sync scheduler started (every 6h)")
    except Exception as e:
        print(f"[GCal] Scheduler failed to start: {e}")
else:
    print("[GCal] APScheduler not available — background sync disabled. Install 'APScheduler' to enable.")

if __name__ == "__main__":
    print("Starting Enhanced Flask server...")
    print("API will be available at: http://127.0.0.1:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
