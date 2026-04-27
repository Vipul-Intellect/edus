
from flask import Blueprint, jsonify
from sqlalchemy import func, case
from extensions import db
from utils.decorators import token_required
from models import User, Attendance, Course

student_bp = Blueprint('student', __name__)

@student_bp.route("/profile", methods=["GET", "OPTIONS"])
@token_required
def get_profile(current_user):
    if current_user.role != "student":
        return jsonify({"error": "Unauthorized"}), 403
    
    return jsonify({
        "user_id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "department": current_user.department.dept_name if current_user.department else None,
        "year": current_user.year,
        "section": current_user.section.name if current_user.section else None,
        "phone": current_user.phone,
        "roll_number": current_user.roll_number,
        "attendance": current_user.attendance
    }), 200


@student_bp.route("/attendance/details", methods=["GET", "OPTIONS"])
@token_required
def get_attendance_details(current_user):
    """Get subject-wise attendance breakdown for the logged-in student"""
    if current_user.role != "student":
        return jsonify({"error": "Unauthorized"}), 403
    
    try:
        # Query attendance grouped by course
        # Join through course_id if available, otherwise return empty
        attendance_stats = db.session.query(
            Course.name.label('course_name'),
            Course.course_id,
            func.count(Attendance.id).label('total_classes'),
            func.sum(case((Attendance.status == 'present', 1), else_=0)).label('present_count'),
            func.sum(case((Attendance.status == 'late', 1), else_=0)).label('late_count')
        ).join(
            Attendance, Attendance.course_id == Course.course_id
        ).filter(
            Attendance.student_id == current_user.id
        ).group_by(
            Course.course_id, Course.name
        ).all()
        
        result = []
        for stat in attendance_stats:
            total = stat.total_classes or 1  # Avoid division by zero
            present = (stat.present_count or 0) + (stat.late_count or 0)
            percentage = round((present / total) * 100, 2)
            
            result.append({
                "course_name": stat.course_name,
                "course_id": stat.course_id,
                "total_classes": stat.total_classes,
                "present": stat.present_count or 0,
                "late": stat.late_count or 0,
                "absent": total - present,
                "percentage": percentage
            })
        
        # Calculate overall attendance
        # Calculate overall attendance directly from Attendance table (including non-course specific)
        total_stats = db.session.query(
            func.count(Attendance.id),
            func.sum(case((Attendance.status == 'present', 1), (Attendance.status == 'late', 1), else_=0)),
            func.sum(case((Attendance.status == 'absent', 1), else_=0))
        ).filter(Attendance.student_id == current_user.id).first()

        total_all = total_stats[0] or 0
        present_all = total_stats[1] or 0
        absent_all = total_stats[2] or 0
        
        overall = round((present_all / total_all) * 100, 2) if total_all > 0 else 0
        
        return jsonify({
            "overall_attendance": overall,
            "total_classes_all": total_all,
            "attended_classes_all": present_all,
            "absent_classes_all": absent_all,
            "subjects": result
        }), 200
        
    except Exception as e:
        print(f"ERROR in get_attendance_details: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return graceful error instead of 500
        return jsonify({
            "overall_attendance": current_user.attendance or 0,
            "subjects": [],
            "error": str(e)
        }), 200
