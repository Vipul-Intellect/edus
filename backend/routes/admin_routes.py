"""
Admin routes - All admin-only endpoints
"""

from datetime import datetime
import uuid
from flask import Blueprint, request, jsonify, make_response
from extensions import db
from models import (
    Department, Faculty, Course, Classroom, Section, User,
    FacultyUnavailability, SwapRequest, LeaveRequest, SystemAnnouncement,
    Timetable
)
from services.scheduler_service import generate_timetable_internal
from utils.decorators import token_required, admin_required
from utils.export_utils import export_csvs

admin_bp = Blueprint('admin', __name__)

# Handle OPTIONS for all admin routes
@admin_bp.before_request
def handle_options():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-access-token,X-Requested-With,Accept')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH')
        response.headers.add('Access-Control-Max-Age', '3600')
        return response


@admin_bp.route("/users", methods=["GET"])
@token_required
@admin_required
def admin_get_users(current_user):
    """Get all registered users scoped to this college"""
    try:
        college_id = current_user.college_id
        users = User.query.filter_by(college_id=college_id).order_by(User.id.desc()).all()
        return jsonify([{
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "department": u.department.dept_name if u.department else None,
            "dept_id": u.dept_id,
            "is_active": u.is_active
        } for u in users])
    except Exception as e:
        return jsonify({"error": f"Failed to fetch users: {str(e)}"}), 500


@admin_bp.route("/users/<int:user_id>", methods=["PUT", "DELETE", "OPTIONS"])
@token_required
@admin_required
def admin_manage_user(current_user, user_id):
    """Edit or delete a specific user"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    if request.method == "PUT":
        try:
            data = request.json or {}

            # Prevent editing own account role/status accidentally
            if user_id == current_user.id and data.get("role") and data["role"] != current_user.role:
                return jsonify({"error": "You cannot change your own role"}), 400

            if "full_name" in data and data["full_name"]:
                user.full_name = data["full_name"].strip()
            if "email" in data:
                user.email = data["email"].strip() if data["email"] else None
            if "role" in data and data["role"] in ["admin", "teacher", "student"]:
                user.role = data["role"]
            if "is_active" in data:
                user.is_active = bool(data["is_active"])
            if "dept_name" in data and data["dept_name"]:
                dept = Department.query.filter_by(college_id=current_user.college_id, dept_name=data["dept_name"]).first()
                if dept:
                    user.dept_id = dept.id
                else:
                    return jsonify({"error": f"Department '{data['dept_name']}' not found"}), 404
            if "password" in data and data["password"]:
                if len(data["password"]) < 6:
                    return jsonify({"error": "Password must be at least 6 characters"}), 400
                user.set_password(data["password"])

            db.session.commit()
            return jsonify({
                "message": f"User '{user.username}' updated successfully",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "full_name": user.full_name,
                    "email": user.email,
                    "role": user.role,
                    "is_active": user.is_active,
                    "department": user.department.dept_name if user.department else None
                }
            }), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Failed to update user: {str(e)}"}), 500

    elif request.method == "DELETE":
        try:
            if user_id == current_user.id:
                return jsonify({"error": "You cannot delete your own account"}), 400
            username = user.username
            db.session.delete(user)
            db.session.commit()
            return jsonify({"message": f"User '{username}' deleted successfully"}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Failed to delete user: {str(e)}"}), 500


@admin_bp.route("/stats", methods=["GET"])
@token_required
@admin_required
def admin_stats(current_user):
    """Get system statistics"""
    try:
        total_users = User.query.count()
        pending_leaves = LeaveRequest.query.filter_by(status='pending').count()
        pending_swaps = SwapRequest.query.filter_by(status='pending').count()
        
        return jsonify({
            "total_users": total_users,
            "pending_requests": pending_leaves + pending_swaps,
            "pending_leaves": pending_leaves,
            "pending_swaps": pending_swaps
        })
    except Exception as e:
        return jsonify({"error": f"Failed to fetch stats: {str(e)}"}), 500


@admin_bp.route("/departments", methods=["GET", "POST", "OPTIONS"])
@token_required
@admin_required
def admin_departments(current_user):
    college_id = current_user.college_id
    if request.method == "GET":
        try:
            depts = Department.query.filter_by(college_id=college_id).all()
            return jsonify([{"id": d.id, "dept_name": d.dept_name} for d in depts])
        except Exception as e:
            return jsonify({"error": f"Failed to fetch departments: {str(e)}"}), 500
    else:
        try:
            data = request.json
            if not data or not data.get("dept_name"):
                return jsonify({"error": "Department name is required"}), 400
            name = data["dept_name"].strip()
            if Department.query.filter_by(college_id=college_id, dept_name=name).first():
                return jsonify({"error": "Department already exists"}), 400
            dept = Department(college_id=college_id, dept_name=name)
            db.session.add(dept)
            db.session.commit()
            export_csvs()
            return jsonify({"message": "Department added", "dept_name": dept.dept_name}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Failed to add department: {str(e)}"}), 500


@admin_bp.route("/faculty", methods=["GET", "POST", "OPTIONS"])
@token_required
@admin_required
def admin_faculty(current_user):
    college_id = current_user.college_id
    if request.method == "GET":
        try:
            faculty = Faculty.query.filter_by(college_id=college_id).all()
            return jsonify([
                {
                    "id": f.faculty_id,
                    "name": f.faculty_name,
                    "dept_name": f.department.dept_name if f.department else None,
                    "max_hours": f.max_hours,
                    "email": f.email,
                    "subject": f.subject
                } for f in faculty
            ])
        except Exception as e:
            return jsonify({"error": f"Failed to fetch faculty: {str(e)}"}), 500
    else:
        try:
            data = request.json
            if not data or not data.get("faculty_name") or not data.get("dept_name"):
                return jsonify({"error": "Faculty name and department are required"}), 400
            dept = Department.query.filter_by(college_id=college_id, dept_name=data["dept_name"]).first()
            if not dept:
                return jsonify({"error": "Department not found"}), 404
            if Faculty.query.filter_by(college_id=college_id, faculty_name=data["faculty_name"].strip()).first():
                return jsonify({"error": "Faculty member already exists"}), 400
            # Also create/link a User account for this faculty member so they can log in
            email = data.get("email", "").strip() if data.get("email") else None
            faculty = Faculty(
                college_id=college_id,
                faculty_name=data["faculty_name"].strip(),
                max_hours=data.get("max_hours", 12),
                dept_id=dept.id,
                email=email,
                subject=data.get("subject", "").strip() if data.get("subject") else None
            )
            db.session.add(faculty)
            db.session.commit()
            export_csvs()
            return jsonify({"message": "Faculty added successfully!", "faculty_id": faculty.faculty_id})
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Failed to add faculty: {str(e)}"}), 500



@admin_bp.route("/faculty/<int:faculty_id>", methods=["PUT", "DELETE", "OPTIONS"])
@token_required
@admin_required
def admin_manage_faculty(current_user, faculty_id):
    faculty = Faculty.query.get(faculty_id)
    if not faculty:
        return jsonify({"error": "Faculty not found"}), 404

    if request.method == "PUT":
        try:
            data = request.json
            if not data:
                return jsonify({"error": "No data provided"}), 400

            if 'faculty_name' in data:
                faculty.faculty_name = data['faculty_name'].strip()
            if 'email' in data:
                faculty.email = data['email'].strip()
            if 'max_hours' in data:
                faculty.max_hours = data['max_hours']
            if 'subject' in data:
                faculty.subject = data['subject'].strip()
            
            if 'dept_name' in data:
                dept = Department.query.filter_by(college_id=current_user.college_id, dept_name=data['dept_name']).first()
                if not dept:
                    return jsonify({"error": "Department not found"}), 404
                faculty.dept_id = dept.id

            db.session.commit()
            export_csvs()
            return jsonify({"message": f"Faculty member {faculty.faculty_name} updated successfully"}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Failed to update faculty: {str(e)}"}), 500

    elif request.method == "DELETE":
        try:
            db.session.delete(faculty)
            db.session.commit()
            export_csvs()
            return jsonify({"message": "Faculty member deleted successfully"}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Failed to delete faculty: {str(e)}"}), 500


@admin_bp.route("/students", methods=["GET", "POST", "OPTIONS"])
@token_required
@admin_required
def admin_students(current_user):
    college_id = current_user.college_id
    if request.method == "GET":
        try:
            students = User.query.filter_by(college_id=college_id, role='student').all()
            return jsonify([
                {
                    "id": s.id,
                    "username": s.username,
                    "full_name": s.full_name,
                    "email": s.email,
                    "dept_name": s.department.dept_name if s.department else None,
                    "year": s.year,
                    "section_name": s.section.name if s.section else None
                } for s in students
            ])
        except Exception as e:
            return jsonify({"error": f"Failed to fetch students: {str(e)}"}), 500
    else:
        try:
            data = request.json
            required_fields = ["username", "full_name", "dept_name", "year", "password"]
            if not all(data.get(field) for field in required_fields):
                return jsonify({"error": "Username, full name, department, year, and password are required"}), 400
            
            # Check if username already exists within this college
            if User.query.filter_by(college_id=college_id, username=data["username"].strip()).first():
                return jsonify({"error": "Username already exists"}), 400
            
            # Find department scoped to college
            dept = Department.query.filter_by(college_id=college_id, dept_name=data["dept_name"]).first()
            if not dept:
                return jsonify({"error": "Department not found"}), 404
            
            # Find section if provided, scoped to college
            section_id = None
            if data.get("section_name"):
                section = Section.query.filter_by(
                    college_id=college_id,
                    name=data["section_name"],
                    year=data["year"],
                    dept_id=dept.id
                ).first()
                if section:
                    section_id = section.id
            
            # Create student user — must include college_id (NOT NULL constraint)
            student = User(
                college_id=college_id,
                username=data["username"].strip(),
                full_name=data["full_name"].strip(),
                email=data.get("email", "").strip() if data.get("email") else None,
                role='student',
                dept_id=dept.id,
                year=data["year"],
                section_id=section_id
            )
            student.set_password(data["password"])
            db.session.add(student)
            db.session.commit()
            export_csvs()
            return jsonify({"message": "Student added successfully!", "student_id": student.id}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Failed to add student: {str(e)}"}), 500


@admin_bp.route("/courses", methods=["GET", "POST", "OPTIONS"])
@token_required
@admin_required
def admin_courses(current_user):
    college_id = current_user.college_id
    if request.method == "GET":
        try:
            courses = Course.query.filter_by(college_id=college_id).all()
            return jsonify([
                {
                    "id": c.course_id,
                    "name": c.name,
                    "type": c.type,
                    "credits": c.credits,
                    "hours_per_week": c.hours_per_week,
                    "year": c.year,
                    "semester": c.semester,
                    "dept_name": c.department.dept_name if c.department else None,
                    "faculty_name": c.faculty.faculty_name if c.faculty else None,
                    "faculty_id": c.faculty_id,
                    "is_fixed": c.is_fixed,
                    "fixed_day": c.fixed_day,
                    "fixed_slot": c.fixed_slot,
                    "fixed_room_id": c.fixed_room_id
                }
                for c in courses
            ])
        except Exception as e:
            return jsonify({"error": f"Failed to fetch courses: {str(e)}"}), 500
    
    elif request.method == "POST":
        try:
            data = request.json
            if not data:
                return jsonify({"error": "No data provided"}), 400
            
            required_fields = ["name", "type", "dept_name", "year", "semester"]
            missing_fields = [field for field in required_fields if data.get(field) is None]
            if missing_fields:
                return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400
            
            dept = Department.query.filter_by(college_id=college_id, dept_name=data["dept_name"]).first()
            if not dept:
                return jsonify({"error": f"Department '{data['dept_name']}' not found"}), 404
            
            faculty_id = data.get("faculty_id")
            if faculty_id:
                faculty = Faculty.query.filter_by(college_id=college_id, faculty_id=faculty_id).first()
                if not faculty:
                    return jsonify({"error": f"Faculty with ID {faculty_id} not found in this college"}), 404
            
            is_fixed = data.get("is_fixed", False)
            fixed_day = data.get("fixed_day")
            fixed_slot = data.get("fixed_slot")
            fixed_room_id = data.get("fixed_room_id")

            if is_fixed:
                if not all([fixed_day, fixed_slot, fixed_room_id]):
                    return jsonify({"error": "For a fixed class, 'fixed_day', 'fixed_slot', and 'fixed_room_id' are required."}), 400
                if not Classroom.query.get(fixed_room_id):
                    return jsonify({"error": f"Fixed room with ID {fixed_room_id} not found."}), 404

            existing_course = Course.query.filter_by(
                college_id=college_id,
                name=data["name"].strip(),
                dept_id=dept.id,
                year=data["year"],
                semester=data["semester"]
            ).first()
            if existing_course:
                return jsonify({"error": "Course already exists for this department/year/semester"}), 400
            
            new_course = Course(
                college_id=college_id,
                name=data["name"].strip(),
                type=data["type"].strip(),
                credits=data.get("credits", 0),
                hours_per_week=data.get("hours_per_week", 4),
                dept_id=dept.id,
                faculty_id=faculty_id,
                year=data["year"],
                semester=data["semester"],
                is_fixed=is_fixed,
                fixed_day=fixed_day,
                fixed_slot=fixed_slot,
                fixed_room_id=fixed_room_id
            )
            
            db.session.add(new_course)
            db.session.commit()
            return jsonify({
                "message": "Course created successfully",
                "course": {
                    "id": new_course.course_id,
                    "name": new_course.name,
                    "type": new_course.type,
                    "hours_per_week": new_course.hours_per_week,
                    "dept_name": dept.dept_name,
                    "faculty_id": new_course.faculty_id,
                    "year": new_course.year,
                    "semester": new_course.semester,
                    "is_fixed": new_course.is_fixed,
                    "fixed_day": new_course.fixed_day,
                    "fixed_slot": new_course.fixed_slot,
                    "fixed_room_id": new_course.fixed_room_id
                }
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Failed to create course: {str(e)}"}), 500


@admin_bp.route("/courses/<int:course_id>", methods=["PUT", "DELETE", "OPTIONS"])
@token_required
@admin_required
def admin_manage_course(current_user, course_id):
    course = Course.query.get(course_id)
    if not course:
        return jsonify({"error": "Course not found"}), 404

    if request.method == "PUT":
        try:
            data = request.json or {}
            
            # Update fields if provided
            if 'name' in data:
                course.name = data['name'].strip()
            if 'type' in data:
                course.type = data['type'].strip()
            if 'credits' in data:
                course.credits = data['credits']
            if 'hours_per_week' in data:
                course.hours_per_week = data['hours_per_week']
            
            if 'dept_name' in data:
                dept = Department.query.filter_by(college_id=current_user.college_id, dept_name=data['dept_name']).first()
                if dept:
                    course.dept_id = dept.id
            
            if 'faculty_id' in data:
                course.faculty_id = data['faculty_id'] # Can be None
                
            if 'year' in data:
                course.year = data['year']
            if 'semester' in data:
                course.semester = data['semester']
                
            # Handle fixed slot updates
            if 'is_fixed' in data:
                course.is_fixed = data['is_fixed']
                if course.is_fixed:
                    course.fixed_day = data.get('fixed_day')
                    course.fixed_slot = data.get('fixed_slot')
                    course.fixed_room_id = data.get('fixed_room_id')
                else:
                    course.fixed_day = None
                    course.fixed_slot = None
                    course.fixed_room_id = None

            db.session.commit()
            export_csvs()
            return jsonify({"message": f"Course {course.name} updated successfully."}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Failed to update course: {str(e)}"}), 500

    elif request.method == "DELETE":
        try:
            db.session.delete(course)
            db.session.commit()
            export_csvs()
            return jsonify({"message": "Course deleted successfully."}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Failed to delete course: {str(e)}"}), 500

@admin_bp.route("/rooms", methods=["GET", "POST", "OPTIONS"])
@token_required
@admin_required
def admin_rooms(current_user):
    from models import Classroom
    from utils.export_utils import export_csvs
    college_id = current_user.college_id
    if request.method == "GET":
        try:
            rooms = Classroom.query.filter_by(college_id=college_id).all()
            return jsonify([
                {
                    "id": r.room_id,
                    "name": r.name,
                    "capacity": r.capacity,
                    "resources": r.resources
                }
                for r in rooms
            ])
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        try:
            data = request.json
            if not data or not data.get("name") or not data.get("capacity"):
                return jsonify({"error": "Room name and capacity are required"}), 400
            room = Classroom(
                college_id=college_id,
                name=data["name"],
                capacity=data["capacity"],
                resources=data.get("resources", "")
            )
            db.session.add(room)
            db.session.commit()
            export_csvs()
            return jsonify({"message": "Room added", "room_id": room.room_id}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500


@admin_bp.route("/sections", methods=["GET", "POST", "OPTIONS"])
@token_required
@admin_required
def admin_sections(current_user):
    college_id = current_user.college_id
    if request.method == "GET":
        try:
            dept_name = request.args.get("dept_name")
            year = request.args.get("year")
            query = Section.query.filter_by(college_id=college_id)
            if dept_name:
                dept = Department.query.filter_by(college_id=college_id, dept_name=dept_name).first()
                if not dept:
                    return jsonify([]), 200
                query = query.filter_by(dept_id=dept.id)
            if year:
                query = query.filter_by(year=int(year))
            sections = query.order_by(Section.year, Section.name).all()
            result = []
            for s in sections:
                student_count = User.query.filter_by(role='student', section_id=s.id).count()
                result.append({
                    "id": s.id,
                    "name": s.name,
                    "year": s.year,
                    "dept_id": s.dept_id,
                    "dept_name": s.department.dept_name if s.department else None,
                    "student_count": student_count,
                    "max_hours_per_day": s.max_hours_per_day
                })
            return jsonify(result), 200
        except Exception as e:
            return jsonify({"error": f"Failed to fetch sections: {str(e)}"}), 500
    else:
        try:
            data = request.json or {}
            dept_name = data.get("dept_name")
            year = data.get("year")
            name = data.get("name")
            max_hours = data.get("max_hours_per_day", 5)

            if not dept_name or year is None:
                return jsonify({"error": "dept_name and year are required"}), 400
            try:
                year = int(year)
                if year < 1 or year > 4:
                    return jsonify({"error": "Year must be between 1 and 4"}), 400
            except (ValueError, TypeError):
                return jsonify({"error": "Year must be an integer"}), 400

            dept = Department.query.filter_by(college_id=college_id, dept_name=dept_name).first()
            if not dept:
                return jsonify({"error": "Department not found"}), 404

            letter = (name or "").strip().upper() if name else None
            if letter:
                if Section.query.filter_by(college_id=college_id, dept_id=dept.id, year=year, name=letter).first():
                    return jsonify({"error": f"Section {letter} already exists"}), 400
            else:
                used = {s.name for s in Section.query.filter_by(college_id=college_id, dept_id=dept.id, year=year).all()}
                for ch in [chr(i) for i in range(65, 91)]:  # A-Z
                    if ch not in used:
                        letter = ch
                        break
                if not letter:
                    return jsonify({"error": "No available section letters left"}), 400

            section = Section(college_id=college_id, name=letter, year=year, dept_id=dept.id, max_hours_per_day=max_hours)
            db.session.add(section)
            db.session.commit()
            
            return jsonify({
                "message": f"Section {letter} added for {dept_name} Year {year}", 
                "section": {
                    "id": section.id, 
                    "name": section.name, 
                    "year": section.year,
                    "max_hours_per_day": section.max_hours_per_day
                }
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Failed to add section: {str(e)}"}), 500


@admin_bp.route("/students/<int:student_id>", methods=["GET", "PUT", "DELETE", "OPTIONS"])
@token_required
@admin_required
def admin_manage_student(current_user, student_id):
    student = User.query.filter_by(id=student_id, role='student').first()
    if not student:
        return jsonify({"error": "Student not found"}), 404
    if request.method == "GET":
        return jsonify({
            "id": student.id,
            "username": student.username,
            "dept_id": student.dept_id,
            "year": student.year,
            "section_id": student.section_id
        }), 200
    elif request.method == "PUT":
        try:
            data = request.json or {}
            if 'username' in data:
                student.username = (data['username'] or "").strip()
            if 'dept_id' in data:
                student.dept_id = data['dept_id']
            if 'year' in data:
                student.year = data['year']
            if 'section_id' in data:
                student.section_id = data['section_id']
            if 'password' in data and data['password']:
                student.set_password(data['password'])
            db.session.commit()
            export_csvs()
            return jsonify({"message": f"Student {student.username} updated successfully."}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Failed to update student: {str(e)}"}), 500
    else:
        try:
            db.session.delete(student)
            db.session.commit()
            export_csvs()
            return jsonify({"message": f"Student {student.username} deleted successfully."}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Failed to delete student: {str(e)}"}), 500


@admin_bp.route("/students/delete_bulk", methods=["POST", "OPTIONS"])
@token_required
@admin_required
def admin_delete_bulk_students(current_user):
    try:
        data = request.json or {}
        ids = data.get('student_ids')
        if not isinstance(ids, list):
            return jsonify({"error": "A list of 'student_ids' is required"}), 400
        if not ids:
            return jsonify({"message": "No student IDs provided."}), 200
        num_deleted = User.query.filter(User.id.in_(ids), User.role == 'student').delete(synchronize_session=False)
        db.session.commit()
        export_csvs()
        return jsonify({"message": f"Successfully deleted {num_deleted} students."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete students in bulk: {str(e)}"}), 500


@admin_bp.route("/faculty/<int:faculty_id>/unavailability", methods=["GET", "POST"])
@token_required
@admin_required
def manage_faculty_unavailability(current_user, faculty_id):
    faculty = Faculty.query.get_or_404(faculty_id)

    if request.method == "GET":
        try:
            slots = FacultyUnavailability.query.filter_by(faculty_id=faculty.faculty_id).all()
            return jsonify([
                {"id": s.id, "day": s.day, "start_time": s.start_time} for s in slots
            ])
        except Exception as e:
            return jsonify({"error": f"Failed to fetch unavailable slots: {str(e)}"}), 500

    if request.method == "POST":
        try:
            data = request.json
            if not data or not data.get("day") or not data.get("start_time"):
                return jsonify({"error": "Day and start_time are required"}), 400

            day = data["day"]
            start_time = data["start_time"]

            existing = FacultyUnavailability.query.filter_by(
                faculty_id=faculty.faculty_id,
                day=day,
                start_time=start_time
            ).first()
            if existing:
                return jsonify({"error": "This unavailability slot already exists for this faculty."}), 400

            new_slot = FacultyUnavailability(
                faculty_id=faculty.faculty_id,
                day=day,
                start_time=start_time
            )
            db.session.add(new_slot)
            db.session.commit()

            return jsonify({
                "message": f"Unavailability added for {faculty.faculty_name}",
                "slot": {"id": new_slot.id, "day": new_slot.day, "start_time": new_slot.start_time}
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Failed to add unavailability: {str(e)}"}), 500


@admin_bp.route("/unavailability/<int:slot_id>", methods=["DELETE"])
@token_required
@admin_required
def delete_unavailability(current_user, slot_id):
    slot = FacultyUnavailability.query.get_or_404(slot_id)
    try:
        db.session.delete(slot)
        db.session.commit()
        return jsonify({"message": "Unavailability slot deleted successfully."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete slot: {str(e)}"}), 500


@admin_bp.route("/swap-requests", methods=["GET"])
@token_required
@admin_required
def admin_get_swap_requests(current_user):
    status_filter = request.args.get('status', 'pending')
    requests = SwapRequest.query.filter_by(status=status_filter).all()
    
    return jsonify([{
        "id": r.id,
        "requesting_faculty": r.requesting_faculty.faculty_name,
        "course_name": r.original_timetable_entry.course.name,
        "section_name": r.original_timetable_entry.section.name,
        "original_day": r.original_timetable_entry.day,
        "original_start_time": r.original_timetable_entry.start_time,
        "proposed_day": r.proposed_day,
        "proposed_start_time": r.proposed_start_time,
        "status": r.status,
        "reason": r.reason,
        "created_at": r.created_at.isoformat()
    } for r in requests])


@admin_bp.route("/swap-requests/<int:request_id>/approve", methods=["POST"])
@token_required
@admin_required
def admin_approve_swap(current_user, request_id):
    from utils.timetable_utils import check_for_conflict
    swap_request = SwapRequest.query.get_or_404(request_id)
    if swap_request.status != 'pending':
        return jsonify({"error": f"This request has already been {swap_request.status}."}), 400

    data = request.json or {}
    force_swap = data.get('force_swap', False)

    timetable_entry = swap_request.original_timetable_entry
    old_day = timetable_entry.day
    old_start_time = timetable_entry.start_time

    # 1. Check for conflict
    conflict_reason, conflicting_entry = check_for_conflict(timetable_entry, swap_request.proposed_day, swap_request.proposed_start_time)
    
    if conflict_reason:
        # Check if it's a "swappable" conflict
        can_swap = (conflicting_entry.faculty_id == timetable_entry.faculty_id or 
                    conflicting_entry.section_id == timetable_entry.section_id)
        
        if not force_swap:
            if can_swap:
                return jsonify({
                    "error": f"Conflict found: {conflict_reason}",
                    "suggest_swap": True,
                    "conflicting_class": conflicting_entry.course.name
                }), 409
            else:
                return jsonify({"error": f"Approval failed. Conflict found: {conflict_reason}"}), 409

        # 2. Perform Swap (Double-move)
        if not can_swap:
            return jsonify({"error": f"Cannot force swap with a class of different faculty/section."}), 400

        # Validate that the conflicting entry can move to the old slot.
        # IMPORTANT: We must exclude BOTH swap entries, because timetable_entry is still
        # sitting in old_day/old_start_time in the DB (it hasn't moved yet).
        # Without excluding it, the check would wrongly see it as a blocking conflict.
        secondary_conflict, _ = check_for_conflict(
            conflicting_entry, old_day, old_start_time,
            exclude_ids=[timetable_entry.timetable_id]  # Exclude the original entry
        )
        if secondary_conflict:
            return jsonify({"error": f"Swap failed: The conflicting class '{conflicting_entry.course.name}' cannot move to the original slot due to another conflict: {secondary_conflict}"}), 409

        try:
            # Generate a unique ID for this swap pair
            swap_group_id = str(uuid.uuid4())
            
            # Record what they swapped with
            original_course_name = timetable_entry.course.name
            conflicting_course_name = conflicting_entry.course.name

            # Update Requested Entry
            timetable_entry.day = swap_request.proposed_day
            timetable_entry.start_time = swap_request.proposed_start_time
            timetable_entry.is_swapped = True
            timetable_entry.swapped_at = datetime.utcnow()
            timetable_entry.swapped_by_id = current_user.id
            timetable_entry.swap_group_id = swap_group_id
            timetable_entry.swapped_with_course = conflicting_course_name

            # Update Conflicting Entry
            conflicting_entry.day = old_day
            conflicting_entry.start_time = old_start_time
            conflicting_entry.is_swapped = True
            conflicting_entry.swapped_at = datetime.utcnow()
            conflicting_entry.swapped_by_id = current_user.id
            conflicting_entry.swap_group_id = swap_group_id
            conflicting_entry.swapped_with_course = original_course_name

            swap_request.status = 'approved'
            swap_request.admin_notes = f"Swap approved (exchanged with {conflicting_course_name}) by {current_user.username}."
            
            db.session.commit()
            return jsonify({"message": f"Swap successful! Exchanged '{original_course_name}' with '{conflicting_course_name}'."})
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Database transaction failed: {str(e)}"}), 500

    # 3. Normal Reschedule (No conflict)
    timetable_entry.day = swap_request.proposed_day
    timetable_entry.start_time = swap_request.proposed_start_time
    timetable_entry.is_swapped = True
    timetable_entry.swapped_at = datetime.utcnow()
    timetable_entry.swapped_by_id = current_user.id
    timetable_entry.swap_group_id = None # Single move doesn't need group ID
    timetable_entry.swapped_with_course = None
    
    swap_request.status = 'approved'
    swap_request.admin_notes = f"Approved by {current_user.username}."
    
    db.session.commit()
    return jsonify({"message": "Swap request approved and timetable updated."})


@admin_bp.route("/swap-requests/<int:request_id>/reject", methods=["POST"])
@token_required
@admin_required
def admin_reject_swap(current_user, request_id):
    swap_request = SwapRequest.query.get_or_404(request_id)
    if swap_request.status != 'pending':
        return jsonify({"error": f"This request has already been {swap_request.status}."}), 400

    data = request.json
    rejection_reason = data.get('reason', 'No reason provided.') if data else 'No reason provided.'

    swap_request.status = 'rejected'
    swap_request.admin_notes = f"Rejected by {current_user.username}. Reason: {rejection_reason}"
    
    db.session.commit()
    
    return jsonify({"message": "Swap request has been rejected."})


@admin_bp.route("/leave-requests", methods=["GET"])
@token_required
@admin_required
def admin_get_leave_requests(current_user):
    try:
        status_filter = request.args.get("status", "pending")
        dept_filter = request.args.get("department")
        leave_type_filter = request.args.get("leave_type")
        
        query = LeaveRequest.query
        if status_filter:
            query = query.filter_by(status=status_filter)
        if leave_type_filter:
            query = query.filter_by(leave_type=leave_type_filter)
        
        requests = query.order_by(LeaveRequest.created_at.desc()).all()
        
        result = []
        for req in requests:
            user = req.user
            if dept_filter and user.department and user.department.dept_name != dept_filter:
                continue
            
            result.append({
                "id": req.id,
                "user_id": req.user_id,
                "username": user.username,
                "full_name": user.full_name,
                "department": user.department.dept_name if user.department else None,
                "leave_type": req.leave_type,
                "start_date": req.start_date.isoformat(),
                "end_date": req.end_date.isoformat(),
                "reason": req.reason,
                "status": req.status,
                "admin_notes": req.admin_notes,
                "created_at": req.created_at.isoformat(),
                "days_requested": (req.end_date - req.start_date).days + 1
            })
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Failed to fetch leave requests: {str(e)}"}), 500


@admin_bp.route("/leave-requests/<int:request_id>", methods=["GET"])
@token_required
@admin_required
def admin_get_leave_request_details(current_user, request_id):
    try:
        leave_request = LeaveRequest.query.get_or_404(request_id)
        return jsonify({
            "id": leave_request.id,
            "user": {
                "id": leave_request.user.id,
                "username": leave_request.user.username,
                "full_name": leave_request.user.full_name,
                "department": leave_request.user.department.dept_name if leave_request.user.department else None
            },
            "leave_type": leave_request.leave_type,
            "start_date": leave_request.start_date.isoformat(),
            "end_date": leave_request.end_date.isoformat(),
            "reason": leave_request.reason,
            "status": leave_request.status,
            "admin_notes": leave_request.admin_notes,
            "created_at": leave_request.created_at.isoformat(),
            "updated_at": leave_request.updated_at.isoformat(),
            "days_requested": (leave_request.end_date - leave_request.start_date).days + 1
        })
    except Exception as e:
        return jsonify({"error": f"Failed to fetch leave request: {str(e)}"}), 500


@admin_bp.route("/leave-requests/<int:request_id>/approve", methods=["POST"])
@token_required
@admin_required
def admin_approve_leave_request(current_user, request_id):
    try:
        leave_request = LeaveRequest.query.get_or_404(request_id)
        if leave_request.status != "pending":
            return jsonify({"error": "Only pending requests can be approved"}), 400
        
        data = request.json or {}
        leave_request.status = "approved"
        leave_request.approved_by = current_user.id
        leave_request.admin_notes = data.get("admin_notes", f"Approved by {current_user.username}")
        leave_request.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            "message": "Leave request approved successfully",
            "request_id": leave_request.id
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to approve leave request: {str(e)}"}), 500


@admin_bp.route("/leave-requests/<int:request_id>/reject", methods=["POST"])
@token_required
@admin_required
def admin_reject_leave_request(current_user, request_id):
    try:
        leave_request = LeaveRequest.query.get_or_404(request_id)
        if leave_request.status != "pending":
            return jsonify({"error": "Only pending requests can be rejected"}), 400
        
        data = request.json or {}
        leave_request.status = "rejected"
        leave_request.admin_notes = data.get("admin_notes", f"Rejected by {current_user.username}")
        leave_request.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            "message": "Leave request rejected",
            "request_id": leave_request.id
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to reject leave request: {str(e)}"}), 500


@admin_bp.route("/leave-requests/stats", methods=["GET"])
@token_required
@admin_required
def admin_get_leave_stats(current_user):
    try:
        total = LeaveRequest.query.count()
        pending = LeaveRequest.query.filter_by(status="pending").count()
        approved = LeaveRequest.query.filter_by(status="approved").count()
        rejected = LeaveRequest.query.filter_by(status="rejected").count()
        
        return jsonify({
            "total": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected
        })
    except Exception as e:
        return jsonify({"error": f"Failed to fetch leave stats: {str(e)}"}), 500


@admin_bp.route("/leave-requests/bulk-action", methods=["POST"])
@token_required
@admin_required
def admin_bulk_leave_action(current_user):
    try:
        data = request.json
        action = data.get("action")  # "approve" or "reject"
        request_ids = data.get("request_ids", [])
        
        if action not in ["approve", "reject"]:
            return jsonify({"error": "Action must be 'approve' or 'reject'"}), 400
        
        if not request_ids:
            return jsonify({"error": "No request IDs provided"}), 400
        
        requests = LeaveRequest.query.filter(
            LeaveRequest.id.in_(request_ids),
            LeaveRequest.status == "pending"
        ).all()
        
        updated_count = 0
        for req in requests:
            req.status = action + "d"  # "approved" or "rejected"
            req.approved_by = current_user.id
            req.admin_notes = f"Bulk {action}d by {current_user.username}"
            req.updated_at = datetime.utcnow()
            updated_count += 1
        
        db.session.commit()
        
        return jsonify({
            "message": f"Successfully {action}d {updated_count} leave request(s)"
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to perform bulk action: {str(e)}"}), 500

@admin_bp.route("/generate_timetable", methods=["GET", "POST", "OPTIONS"])
@token_required
@admin_required
def generate_timetable(current_user):
    if request.method != "POST":
        return jsonify({"message": "Use POST (no body) to generate timetable"}), 200
    
    try:
        result = generate_timetable_internal()
        if "error" in result:
            return jsonify(result), 400
            
        timetable = Timetable.query.all()
        result_data = []
        
        for t in timetable:
            result_data.append({
                "course": t.course.name,
                "section": f"{t.section.name} (Year {t.section.year})",
                "faculty": t.faculty.faculty_name if t.faculty else "N/A",
                "room": t.room.name,
                "day": t.day,
                "start_time": t.start_time,
                "department": t.course.department.dept_name,
                "year": t.section.year,
                "credits": t.course.credits
            })
            
        return jsonify({
            "message": "Timetable generated successfully!",
            "stats": result.get("stats"),
            "timetable": result_data
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/users/register", methods=["POST", "OPTIONS"])
@token_required
@admin_required
def admin_register_user(current_user):
    try:
        data = request.json or {}
        role = data.get("role")
        username = data.get("username")
        password = data.get("password")
        
        if not role or not username or not password:
            return jsonify({"error": "Username, password and role are required"}), 400
            
        if User.query.filter_by(username=username).first():
            return jsonify({"error": "Username already exists"}), 400
            
        user = User(
            username=username,
            role=role,
            full_name=data.get("full_name"),
            email=data.get("email"),
            phone=data.get("phone")
        )
        user.set_password(password)
        
        dept_name = data.get("dept_name")
        department = None
        if dept_name:
            department = Department.query.filter_by(dept_name=dept_name).first()
            if not department:
                return jsonify({"error": "Department not found"}), 404
            user.dept_id = department.id
            
        if role == "student":
            user.year = data.get("year")
            user.roll_number = data.get("roll_number")
            section_name = data.get("section_name")
            
            if user.year and section_name and department:
                section = Section.query.filter_by(
                    name=section_name, 
                    year=user.year, 
                    dept_id=department.id
                ).first()
                if section:
                    user.section_id = section.id
        
        elif role == "teacher":
            # Check if faculty entry exists or create it
            if department and user.full_name:
                faculty = Faculty.query.filter_by(faculty_name=user.full_name, dept_id=department.id).first()
                if not faculty:
                    faculty = Faculty(
                        faculty_name=user.full_name,
                        dept_id=department.id,
                        email=user.email,
                        max_hours=12 # Default
                    )
                    db.session.add(faculty)
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({"message": f"{role.capitalize()} registered successfully", "user_id": user.id}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to register user: {str(e)}"}), 500

