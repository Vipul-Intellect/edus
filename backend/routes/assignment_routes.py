from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models import Assignment, Course, User, Department, Section
from utils.decorators import token_required
from datetime import datetime
import os
import uuid
from werkzeug.utils import secure_filename

assignment_bp = Blueprint('assignment', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'docx', 'xlsx', 'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@assignment_bp.route("/assignments/create", methods=["POST", "OPTIONS"])
@token_required
def create_assignment(current_user):
    """
    Teacher creates an assignment with targeting.
    Supports multipart/form-data for file upload.
    """
    if current_user.role not in ['admin', 'teacher']:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        title = request.form.get('title', '').strip()
        description = request.form.get('description', '').strip()
        due_date_str = request.form.get('due_date')
        
        # Targeting
        target_audience = request.form.get('target_audience', 'course') # 'all', 'course', 'department', 'section'
        course_id = request.form.get('course_id')
        dept_id = request.form.get('dept_id')
        section_id = request.form.get('section_id')

        if not title:
            return jsonify({"error": "Title is required"}), 400

        # Handle File Upload
        file_url = None
        file_name = None
        file_type = None

        uploaded_file = request.files.get('file')
        if uploaded_file and uploaded_file.filename:
            original_name = uploaded_file.filename
            
            if not allowed_file(original_name):
                return jsonify({'error': 'File type not allowed'}), 400

            # File size check (5MB)
            uploaded_file.seek(0, os.SEEK_END)
            file_size = uploaded_file.tell()
            uploaded_file.seek(0)
            
            if file_size > 5 * 1024 * 1024:
                return jsonify({'error': 'File too large. Maximum size is 5MB.'}), 400

            ext = original_name.rsplit('.', 1)[1].lower()
            safe_name = secure_filename(original_name)
            unique_name = f"{uuid.uuid4().hex}_{safe_name}"
            upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
            os.makedirs(upload_folder, exist_ok=True)
            save_path = os.path.join(upload_folder, unique_name)
            uploaded_file.save(save_path)

            file_url = f"/api/uploads/{unique_name}"
            file_name = original_name
            file_type = ext

        due_date = None
        if due_date_str:
            due_date = datetime.strptime(due_date_str, '%Y-%m-%d')

        new_assignment = Assignment(
            college_id=current_user.college_id,
            title=title,
            description=description,
            file_url=file_url,
            file_name=file_name,
            file_type=file_type,
            target_audience=target_audience,
            course_id=int(course_id) if course_id else None,
            dept_id=int(dept_id) if dept_id else None,
            section_id=int(section_id) if section_id else None,
            due_date=due_date,
            created_by=current_user.id
        )

        db.session.add(new_assignment)
        db.session.commit()

        # Send notification logic (optional but recommended)
        # We can reuse notification_routes logic later if needed
        
        return jsonify({
            "message": "Assignment created successfully",
            "assignment": new_assignment.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@assignment_bp.route("/student/assignments", methods=["GET", "OPTIONS"])
@token_required
def get_student_assignments(current_user):
    """View assignments targeted to the current student"""
    if current_user.role != 'student':
        return jsonify({"error": "Unauthorized"}), 403

    try:
        # Assignments for student's section OR student's department OR their enrolled courses
        # Since course names are unique and students are in specific sections
        
        # 1. Matching Section
        q1 = Assignment.query.filter_by(target_audience='section', section_id=current_user.section_id)
        
        # 2. Matching Department
        q2 = Assignment.query.filter_by(target_audience='department', dept_id=current_user.dept_id)
        
        # 3. Matching Course (if target_audience is course)
        # Filter all assignments that match the criteria
        assignments = Assignment.query.filter(
            Assignment.college_id == current_user.college_id,
            (
                ((Assignment.target_audience == 'section') & (Assignment.section_id == current_user.section_id)) |
                ((Assignment.target_audience == 'department') & (Assignment.dept_id == current_user.dept_id)) |
                (Assignment.target_audience == 'all')
            )
        ).order_by(Assignment.created_at.desc()).all()
        
        return jsonify({
            "assignments": [a.to_dict() for a in assignments]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@assignment_bp.route("/faculty/assignments", methods=["GET", "OPTIONS"])
@token_required
def get_faculty_assignments(current_user):
    """View assignments created by the teacher"""
    if current_user.role not in ['admin', 'teacher']:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        assignments = Assignment.query.filter_by(
            college_id=current_user.college_id,
            created_by=current_user.id
        ).order_by(Assignment.created_at.desc()).all()
        return jsonify({
            "assignments": [a.to_dict() for a in assignments]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
