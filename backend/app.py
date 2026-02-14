"""
Main Flask Application Entry Point
Uses the modular structure with separate models, routes, services, and utils
"""

import os
from flask import Flask, request
from config import config
from extensions import init_extensions, db
from models import *
from utils import *

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

    # Create database tables
    with app.app_context():
        db.create_all()

    # Register routes
    from routes.auth_routes import auth_bp
    from routes.admin_routes import admin_bp
    from routes.timetable_routes import timetable_bp
    from routes.faculty_routes import faculty_bp
    from routes.leave_routes import leave_bp
    from routes.upload_routes import upload_bp
    from routes.chat_routes import chat_bp
    from routes.legacy_routes import legacy_bp
    from routes.student_routes import student_bp

    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(student_bp, url_prefix='/student')
    # Timetable routes - some have no prefix, some have /teacher or /student
    app.register_blueprint(timetable_bp)
    # Faculty routes - /teacher prefix
    app.register_blueprint(faculty_bp, url_prefix='/teacher')
    # Rooms status route - register separately at root level
    from routes.faculty_routes import get_rooms_status
    from utils.decorators import token_required
    app.add_url_rule('/rooms/status', 'get_rooms_status', token_required(get_rooms_status), methods=['GET', 'OPTIONS'])
    app.register_blueprint(leave_bp, url_prefix='/leave')
    app.register_blueprint(upload_bp, url_prefix='/upload')
    app.register_blueprint(chat_bp, url_prefix='/api')
    app.register_blueprint(legacy_bp)

    # Basic home route
    @app.route('/', methods=['GET'])
    def home():
        from flask import jsonify
        return jsonify({
            "message": "Enhanced Timetable Management System API",
            "status": "running",
            "version": "2.0 - Modular Architecture",
            "features": [
                "User Authentication (JWT)",
                "Role-based Access (Teacher/Student/Admin)",
                "Room Occupancy Tracking",
                "Section-based Timetables",
                "Personalized Views",
                "CSV Upload Support",
                "Leave Request System",
                "Class Swap Requests",
                "AI Chat Assistant",
                "Email Notifications"
            ],
            "modular_structure": {
                "models": "Database models",
                "routes": "API endpoints",
                "services": "Business logic",
                "utils": "Helper functions"
            }
        })

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        from flask import jsonify
        return jsonify({"error": "Endpoint not found"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        from flask import jsonify
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500

    @app.errorhandler(400)
    def bad_request(error):
        from flask import jsonify
        return jsonify({"error": "Bad request"}), 400

    return app

# Create app instance for gunicorn
app = create_app()

if __name__ == "__main__":
    #app = create_app()
    print("Starting Enhanced Flask server...")
    print("API will be available at: http://127.0.0.1:5000")
    print("\n=== MODULAR ARCHITECTURE ===")
    print("✅ Models: Separate database models")
    print("✅ Routes: Organized API endpoints")
    print("✅ Services: Business logic layer")
    print("✅ Utils: Helper functions and decorators")
    print("===============================")
    app.run(debug=True, host='0.0.0.0', port=5000)
