from flask import Blueprint, request, jsonify
from extensions import db
from models import Assessment, Course, User
from utils.decorators import token_required
from datetime import datetime

assessment_bp = Blueprint('assessment', __name__)

@assessment_bp.route("/assessments", methods=["GET", "POST", "OPTIONS"])
@token_required
def handle_assessments(current_user):
    """Teacher Dashboard: List/Create Assessments"""
    try:
        if request.method == "POST":
            if current_user.role not in ['admin', 'teacher']:
                return jsonify({"error": "Unauthorized"}), 403
            
            data = request.json
            course_id = data.get('course_id')
            title = data.get('title')
            assessment_type = data.get('assessment_type', 'quiz')
            max_marks = data.get('max_marks')
            scheduled_date_str = data.get('scheduled_date') # YYYY-MM-DD
            
            if not all([course_id, title, max_marks, scheduled_date_str]):
                return jsonify({"error": "Missing required fields"}), 400
            
            scheduled_date = datetime.strptime(scheduled_date_str, '%Y-%m-%d').date()
            
            new_assessment = Assessment(
                college_id=current_user.college_id,
                course_id=course_id,
                title=title,
                assessment_type=assessment_type,
                max_marks=float(max_marks),
                scheduled_date=scheduled_date,
                created_by=current_user.id
            )
            
            db.session.add(new_assessment)
            db.session.commit()
            
            return jsonify({
                "message": "Assessment created",
                "assessment": new_assessment.to_dict()
            }), 201
            
        else: # GET
            # Always scope to current tenant
            query = Assessment.query.filter_by(college_id=current_user.college_id)

            # Further filter by course if provided
            course_id = request.args.get('course_id')
            if course_id:
                query = query.filter_by(course_id=course_id)

            # Teachers only see assessments they created
            if current_user.role == 'teacher':
                query = query.filter_by(created_by=current_user.id)

            assessments = query.order_by(Assessment.scheduled_date.desc()).all()

            return jsonify({
                "assessments": [a.to_dict() for a in assessments]
            }), 200
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@assessment_bp.route("/teacher/students", methods=["GET"])
@token_required
def teacher_get_students(current_user):
    """Fetch students for a specific course (Teacher only)"""
    if current_user.role not in ['admin', 'teacher']:
        return jsonify({"error": "Unauthorized"}), 403
        
    course_id = request.args.get('course_id')
    if not course_id:
        # If no course_id, return all students in teacher's department
        students = User.query.filter_by(role='student', dept_id=current_user.dept_id).all()
    else:
        course = Course.query.get(course_id)
        if not course:
            return jsonify({"error": "Course not found"}), 404
            
        # Get students in the same department and year as the course
        students = User.query.filter_by(
            role='student', 
            dept_id=course.dept_id,
            year=course.year
        ).all()
        
    return jsonify({
        "students": [{
            "id": s.id,
            "full_name": s.full_name,
            "username": s.username,
            "roll_number": s.username # Assuming username is roll number
        } for s in students]
    }), 200

@assessment_bp.route("/teacher/my-courses", methods=["GET"])
@token_required
def get_teacher_my_courses(current_user):
    """
    Reliably fetch courses a teacher can create assessments for.
    Fallback chain:
      1. Courses where courses.faculty_id = faculty.faculty_id  (direct assignment)
      2. Courses where courses.dept_id = teacher's dept_id      (department-wide fallback)
      3. All courses in the college                             (last resort — admin/unlinked teachers)
    """
    if current_user.role not in ['admin', 'teacher']:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        from models import Faculty, Course, Timetable

        def _serialize(courses):
            return [{"id": c.course_id, "name": c.name, "dept_id": c.dept_id, "year": c.year} for c in courses]

        # ── Attempt 1: via Timetable entries (most accurate) ────────────────
        # Find all course_ids where this teacher has been assigned in the timetable
        timetable_course_ids = db.session.execute(
            db.text("SELECT DISTINCT course_id FROM timetable WHERE faculty_id IN "
                    "(SELECT faculty_id FROM faculty WHERE faculty_name = :name AND (dept_id = :dept OR dept_id IS NULL))"
                    " AND college_id = :college"),
            {"name": current_user.full_name, "dept": current_user.dept_id, "college": current_user.college_id}
        ).fetchall()
        timetable_course_ids = [r[0] for r in timetable_course_ids if r[0]]

        if timetable_course_ids:
            courses = Course.query.filter(Course.course_id.in_(timetable_course_ids)).all()
            if courses:
                return jsonify({"courses": _serialize(courses), "source": "timetable"}), 200

        # ── Attempt 2: Faculty record → direct course assignment ─────────────
        faculty = Faculty.query.filter(
            Faculty.faculty_name.ilike(current_user.full_name),
            Faculty.dept_id == current_user.dept_id
        ).first()

        if not faculty:
            # Partial last-name match
            last_name = current_user.full_name.split()[-1] if current_user.full_name else ""
            if last_name:
                faculty = Faculty.query.filter(
                    Faculty.faculty_name.ilike(f"%{last_name}%"),
                    Faculty.dept_id == current_user.dept_id
                ).first()

        if faculty:
            courses = Course.query.filter_by(faculty_id=faculty.faculty_id).all()
            if courses:
                return jsonify({"courses": _serialize(courses), "source": "faculty_direct"}), 200

        # ── Attempt 3: Department-wide fallback ──────────────────────────────
        if current_user.dept_id:
            courses = Course.query.filter_by(dept_id=current_user.dept_id).all()
            if courses:
                return jsonify({"courses": _serialize(courses), "source": "department"}), 200

        # ── Attempt 4: All college courses (last resort) ─────────────────────
        courses = Course.query.filter_by(college_id=current_user.college_id).all()
        if courses:
            return jsonify({"courses": _serialize(courses), "source": "college_all"}), 200

        # Truly nothing found
        return jsonify({"courses": [], "source": "none",
                        "hint": "No courses found. Ask admin to add courses and assign them to departments."}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@assessment_bp.route("/assessments/<int:assessment_id>", methods=["GET", "DELETE", "OPTIONS"])
@token_required
def handle_assessment_detail(current_user, assessment_id):
    """Get or Delete Assessment"""
    try:
        assessment = Assessment.query.get(assessment_id)
        if not assessment:
            return jsonify({"error": "Assessment not found"}), 404
            
        if request.method == "DELETE":
            if current_user.role not in ['admin', 'teacher'] or \
               (current_user.role == 'teacher' and assessment.created_by != current_user.id):
                return jsonify({"error": "Unauthorized"}), 403
                
            db.session.delete(assessment)
            db.session.commit()
            return jsonify({"message": "Assessment deleted"}), 200
            
        else: # GET
            return jsonify(assessment.to_dict()), 200
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500
