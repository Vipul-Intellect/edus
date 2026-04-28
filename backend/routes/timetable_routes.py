"""
Timetable routes - Generation and viewing
"""

from flask import Blueprint, request, jsonify, make_response
from extensions import db
from models import Timetable
from utils.decorators import token_required

timetable_bp = Blueprint('timetable', __name__)




@timetable_bp.route("/get_timetable", methods=["GET", "OPTIONS"])
@token_required
def get_timetable(current_user):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        college_id   = current_user.college_id
        dept_name    = request.args.get("dept_name")
        year         = request.args.get("year")
        section_name = request.args.get("section")

        query = Timetable.query.filter_by(college_id=college_id)
        all_entries = query.all()

        timetable = []
        for t in all_entries:
            if dept_name and (not t.course or not t.course.department or t.course.department.dept_name != dept_name):
                continue
            if year and (not t.section or t.section.year != int(year)):
                continue
            if section_name and (not t.section or t.section.name != section_name):
                continue
            timetable.append(t)

        result = []
        for t in timetable:
            result.append({
                "id":                  t.timetable_id,
                "course":              t.course.name if t.course else "N/A",
                "section":             f"{t.section.name} (Year {t.section.year})" if t.section else "N/A",
                "faculty":             t.faculty.faculty_name if t.faculty else "Unassigned",
                "room":                t.room.name if t.room else "N/A",
                "day":                 t.day,
                "start_time":          t.start_time,
                "department":          t.course.department.dept_name if t.course and t.course.department else "N/A",
                "year":                t.section.year if t.section else None,
                "credits":             t.course.credits if t.course else None,
                "type":                t.course.type if t.course else None,
                "is_swapped":          t.is_swapped,
                "swapped_at":          t.swapped_at.isoformat() if t.swapped_at else None,
                "swapped_by":          t.swapped_by.full_name if t.swapped_by else None,
                "swap_group_id":       t.swap_group_id,
                "swapped_with_course": t.swapped_with_course
            })

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@timetable_bp.route("/teacher/timetable", methods=["GET", "OPTIONS"])
@token_required
def teacher_timetable(current_user):
    from models import Faculty
    if current_user.role != "teacher":
        return jsonify({"error": "Unauthorized - Teachers only"}), 403

    try:
        # Check if user has required data
        if not current_user.full_name:
            return jsonify({
                "timetable": [],
                "teacher_name": "Unknown Teacher",
                "department": None,
                "message": "Profile incomplete - please contact admin"
            }), 200
        
        # Try to find faculty record — must be scoped to college_id
        faculty = None
        if current_user.dept_id:
            faculty = Faculty.query.filter_by(
                college_id=current_user.college_id,
                faculty_name=current_user.full_name,
                dept_id=current_user.dept_id
            ).first()

            if not faculty:
                # Try partial last-name match within same college
                faculty = Faculty.query.filter(
                    Faculty.college_id == current_user.college_id,
                    Faculty.faculty_name.contains(current_user.full_name.split()[-1]),
                    Faculty.dept_id == current_user.dept_id
                ).first()
        
        # If still no faculty record, create one
        if not faculty:
            if not current_user.dept_id:
                return jsonify({
                    "timetable": [],
                    "teacher_name": current_user.full_name,
                    "department": None,
                    "message": "No department assigned - please contact admin"
                }), 200
            
            faculty = Faculty(
                faculty_name=current_user.full_name,
                email=current_user.email,
                max_hours=12,
                dept_id=current_user.dept_id,
                college_id=current_user.college_id
            )
            db.session.add(faculty)
            db.session.commit()

        # Get timetable entries
        timetable_entries = Timetable.query.filter_by(faculty_id=faculty.faculty_id).all()
        result = [{
            "id": e.timetable_id,
            "course": e.course.name,
            "course_id": e.course_id,
            "section": f"{e.section.name} (Year {e.section.year})",
            "room": e.room.name,
            "day": e.day,
            "start_time": e.start_time,
            "slot": e.start_time,
            "department": e.course.department.dept_name,
            "is_swapped": e.is_swapped,
            "swapped_at": e.swapped_at.isoformat() if e.swapped_at else None,
            "swapped_by": e.swapped_by.full_name if e.swapped_by else None,
            "swap_group_id": e.swap_group_id,
            "swapped_with_course": e.swapped_with_course
        } for e in timetable_entries]

        return jsonify({
            "timetable": result,
            "teacher_name": current_user.full_name,
            "department": current_user.department.dept_name if current_user.department else None
        }), 200
    except Exception as e:
        print(f"ERROR in teacher_timetable: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "timetable": [],
            "teacher_name": current_user.full_name if hasattr(current_user, 'full_name') else "Unknown",
            "department": None,
            "error": str(e)
        }), 200  # Return 200 instead of 500 to prevent logout


@timetable_bp.route("/student/timetable", methods=["GET", "OPTIONS"])
@token_required
def student_timetable(current_user):
    if current_user.role != "student":
        return jsonify({"error": "Unauthorized - Students only"}), 403
    
    try:
        if not current_user.section_id:
            return jsonify({"error": "Section not assigned"}), 400
        
        timetable_entries = Timetable.query.filter_by(section_id=current_user.section_id).all()
        result = [{
            "course": e.course.name,
            "faculty": e.faculty.faculty_name if e.faculty else "N/A",
            "room": e.room.name,
            "day": e.day,
            "start_time": e.start_time,
            "type": e.course.type,
            "credits": e.course.credits,
            "is_swapped": e.is_swapped,
            "swapped_at": e.swapped_at.isoformat() if e.swapped_at else None,
            "swapped_by": e.swapped_by.full_name if e.swapped_by else None,
            "swap_group_id": e.swap_group_id,
            "swapped_with_course": e.swapped_with_course
        } for e in timetable_entries]
        
        return jsonify({
            "timetable": result,
            "section": current_user.section.name if current_user.section else None,
            "year": current_user.year
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================================================
# ADMIN: Timetable management with Google Calendar hooks
# =========================================================

@timetable_bp.route("/admin/timetable/<int:timetable_id>", methods=["PUT", "OPTIONS"])
@token_required
def update_timetable_entry(current_user, timetable_id):
    """Admin updates a timetable entry → auto-updates all connected users' Google Calendars."""
    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403

    entry = Timetable.query.get(timetable_id)
    if not entry:
        return jsonify({"error": "Timetable entry not found"}), 404

    data = request.json or {}

    # Apply changes
    if 'day' in data:
        entry.day = data['day']
    if 'start_time' in data:
        entry.start_time = data['start_time']
    if 'end_time' in data:
        entry.end_time = data['end_time']
    if 'faculty_id' in data:
        entry.faculty_id = data['faculty_id']
    if 'room_id' in data:
        entry.room_id = data['room_id']

    db.session.commit()

    # Fire Google Calendar hook asynchronously (best effort)
    try:
        from services.google_calendar_service import on_timetable_updated
        on_timetable_updated(entry)
    except Exception as e:
        print(f"[GCal] Hook error on update: {e}")

    return jsonify({"message": "Timetable entry updated"}), 200


@timetable_bp.route("/admin/timetable/<int:timetable_id>", methods=["DELETE", "OPTIONS"])
@token_required
def delete_timetable_entry(current_user, timetable_id):
    """Admin deletes a timetable entry → removes event from all connected users' Google Calendars."""
    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403

    entry = Timetable.query.get(timetable_id)
    if not entry:
        return jsonify({"error": "Timetable entry not found"}), 404

    # Fire Google Calendar hook BEFORE deleting (needs timetable data)
    try:
        from services.google_calendar_service import on_timetable_deleted
        on_timetable_deleted(timetable_id)
    except Exception as e:
        print(f"[GCal] Hook error on delete: {e}")

    db.session.delete(entry)
    db.session.commit()

    return jsonify({"message": "Timetable entry deleted"}), 200
