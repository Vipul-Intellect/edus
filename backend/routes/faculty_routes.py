"""
Faculty routes - Room marking and swap requests
"""

from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from extensions import db
from models import Classroom, RoomOccupancy, Faculty, SwapRequest, Timetable
from utils.decorators import token_required, teacher_required
from utils.export_utils import export_csvs

faculty_bp = Blueprint('faculty', __name__)


@faculty_bp.route("/mark_room", methods=["GET", "POST", "OPTIONS"])
@token_required
def mark_room(current_user):
    if request.method != "POST":
        return jsonify({"message": "Use POST with JSON: room_id, status ('free'|'occupied'), notes (optional)"}), 200
    if current_user.role != "teacher":
        return jsonify({"error": "Unauthorized - Teachers only"}), 403
    
    try:
        data = request.json
        print(f"DEBUG mark_room: Received data: {data}")
        room_id = data.get("room_id")
        print(f"DEBUG mark_room: extracted room_id: {room_id}")
        status = data.get("status")
        notes = data.get("notes", "")
        
        if status not in ["free", "occupied"]:
            return jsonify({"error": "Invalid status. Must be 'free' or 'occupied'"}), 400

        room = Classroom.query.get(room_id)
        if not room:
            return jsonify({"error": "Room not found"}), 404

        occupancy = RoomOccupancy(
            room_id=room_id,
            user_id=current_user.id,
            status=status,
            notes=notes
        )
        db.session.add(occupancy)
        db.session.commit()
        
        export_csvs()
        
        return jsonify({"message": f"Room {room.name} marked as {status}"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# This route is registered directly in app.py at /rooms/status
def get_rooms_status(current_user):
    try:
        all_rooms = Classroom.query.all()
        free_rooms, unmarked_rooms, occupied_rooms = [], [], []
        
        for room in all_rooms:
            occupancy = RoomOccupancy.query.filter_by(room_id=room.room_id)\
                            .order_by(RoomOccupancy.timestamp.desc()).first()
            
            room_info = {
                "room_id": room.room_id,
                "room_name": room.name,
                "capacity": room.capacity,
                "resources": room.resources
            }
            
            if not occupancy:
                room_info["status"] = "unmarked"
                unmarked_rooms.append(room_info)
            elif occupancy.status == "free":
                room_info.update({
                    "status": "free",
                    "last_updated": occupancy.timestamp.isoformat(),
                    "updated_by": occupancy.user.full_name if occupancy.user else "Unknown"
                })
                free_rooms.append(room_info)
            else:
                room_info.update({
                    "status": "occupied",
                    "last_updated": occupancy.timestamp.isoformat(),
                    "updated_by": occupancy.user.full_name if occupancy.user else "Unknown",
                    "notes": occupancy.notes
                })
                occupied_rooms.append(room_info)
        
        return jsonify({
            "free_rooms": free_rooms,
            "unmarked_rooms": unmarked_rooms,
            "occupied_rooms": occupied_rooms,
            "total_rooms": len(all_rooms)
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@faculty_bp.route("/swap-requests", methods=["GET", "POST"])
@token_required
@teacher_required
def teacher_swap_requests(current_user):
    try:
        college_id = current_user.college_id
        # Try to find the faculty record — prefer email match, then name+dept match
        faculty = None
        if current_user.email:
            faculty = Faculty.query.filter_by(
                college_id=college_id,
                email=current_user.email
            ).first()

        if not faculty:
            faculty = Faculty.query.filter_by(
                college_id=college_id,
                faculty_name=current_user.full_name,
                dept_id=current_user.dept_id
            ).first()

        if not faculty:
            # Fallback - try by last name within the same dept
            last_name = current_user.full_name.split()[-1] if current_user.full_name else ""
            if last_name:
                faculty = Faculty.query.filter(
                    Faculty.college_id == college_id,
                    Faculty.faculty_name.contains(last_name),
                    Faculty.dept_id == current_user.dept_id
                ).first()

        if not faculty:
            # Auto-create a linked faculty record so the teacher can use swap features
            faculty = Faculty(
                college_id=college_id,
                faculty_name=current_user.full_name,
                max_hours=12,
                dept_id=current_user.dept_id,
                email=current_user.email
            )
            db.session.add(faculty)
            db.session.commit()

        if request.method == "POST":
            data = request.json
            required = ["original_timetable_id", "proposed_day", "proposed_start_time", "reason"]
            if not all(key in data for key in required):
                return jsonify({"error": f"Missing required fields: {', '.join(required)}"}), 400

            timetable_entry = Timetable.query.get(data['original_timetable_id'])
            if not timetable_entry or timetable_entry.faculty_id != faculty.faculty_id:
                return jsonify({"error": "You can only request to move your own classes."}), 403

            new_request = SwapRequest(
                college_id=college_id,
                requesting_faculty_id=faculty.faculty_id,
                original_timetable_id=data['original_timetable_id'],
                proposed_day=data['proposed_day'],
                proposed_start_time=data['proposed_start_time'],
                reason=data['reason']
            )
            db.session.add(new_request)
            db.session.commit()
            return jsonify({"message": "Swap request submitted successfully."}), 201

        if request.method == "GET":
            # DEBUG LOGGING
            with open("debug_api_log.txt", "a") as f:
                f.write(f"GET /swap-requests: User={current_user.full_name} (ID {current_user.id})\n")
                f.write(f"Resolved Faculty ID: {faculty.faculty_id if faculty else 'None'}\n")
            
            requests = SwapRequest.query.filter_by(requesting_faculty_id=faculty.faculty_id).all()
            
            with open("debug_api_log.txt", "a") as f:
                 f.write(f"Found {len(requests)} swap requests.\n")

            return jsonify([{
                "id": r.id,
                "course_name": r.original_timetable_entry.course.name if r.original_timetable_entry and r.original_timetable_entry.course else "Unknown Course",
                
                "original_day": r.original_timetable_entry.day if r.original_timetable_entry else "N/A",
                "original_start_time": r.original_timetable_entry.start_time if r.original_timetable_entry else "N/A",
                "proposed_day": r.proposed_day,
                "proposed_start_time": r.proposed_start_time,
                "status": r.status,
                "reason": r.reason,
                "admin_notes": r.admin_notes,
                "created_at": r.created_at.isoformat()
            } for r in requests])
            
    except Exception as e:
        with open("debug_api_log.txt", "a") as f:
            f.write(f"ERROR in teacher_swap_requests: {str(e)}\n")
            import traceback
            traceback.print_exc(file=f)
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500


@faculty_bp.route("/students", methods=["GET", "OPTIONS"])
@token_required
@teacher_required
def get_students_for_section(current_user):
    """Get list of students for a specific year/dept/section"""
    try:
        from models import User, Department, Section
        
        dept_name = request.args.get('department')
        year = request.args.get('year', type=int)
        section_name = request.args.get('section')
        
        if not all([dept_name, year, section_name]):
            return jsonify({"error": "Missing required parameters: department, year, section"}), 400
        
        # Find department
        department = Department.query.filter_by(dept_name=dept_name).first()
        if not department:
            return jsonify({"error": f"Department '{dept_name}' not found"}), 404
        
        # Find section
        section = Section.query.filter_by(
            name=section_name,
            dept_id=department.id,
            year=year
        ).first()
        
        if not section:
            return jsonify({"error": f"Section '{section_name}' not found"}), 404
        
        # Get students
        students = User.query.filter_by(
            role='student',
            dept_id=department.id,
            year=year,
            section_id=section.id
        ).order_by(User.roll_number, User.full_name).all()
        
        return jsonify({
            "students": [{
                "id": s.id,
                "full_name": s.full_name,
                "roll_number": s.roll_number,
                "email": s.email,
                "attendance": s.attendance
            } for s in students]
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@faculty_bp.route("/courses", methods=["GET", "OPTIONS"])
@token_required
@teacher_required
def get_courses(current_user):
    """Get courses for a department and year"""
    try:
        from models import Course, Department
        dept_name = request.args.get("department")
        year = request.args.get("year")
        
        if not dept_name or not year:
            return jsonify({"error": "Department and year are required"}), 400
            
        dept = Department.query.filter_by(dept_name=dept_name).first()
        if not dept:
            return jsonify({"error": "Department not found"}), 404
            
        courses = Course.query.filter_by(
            dept_id=dept.id, 
            year=int(year)
        ).all()
        
        return jsonify([
            {
                "id": c.course_id,
                "name": c.name
            } for c in courses
        ]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@faculty_bp.route("/attendance/view", methods=["GET", "OPTIONS"])
@token_required
@teacher_required
def view_attendance_for_date(current_user):
    """View attendance for a date, section, and optional course"""
    try:
        from models import Department, Section, User, Attendance
        from datetime import datetime
        
        date_str = request.args.get("date")
        dept_name = request.args.get("department")
        year = request.args.get("year")
        section_name = request.args.get("section")
        course_id = request.args.get("course_id") # Optional course filter
        
        if not all([date_str, dept_name, year, section_name]):
            return jsonify({"error": "Missing required parameters"}), 400
            
        attendance_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        dept = Department.query.filter_by(dept_name=dept_name).first()
        if not dept:
            return jsonify({"error": "Department not found"}), 404
            
        section = Section.query.filter_by(
            name=section_name,
            dept_id=dept.id,
            year=year
        ).first()
        
        if not section:
            return jsonify({"error": "Section not found"}), 404
        
        # Get all students in this section
        students = User.query.filter_by(
            role='student',
            dept_id=dept.id,
            year=year,
            section_id=section.id
        ).order_by(User.roll_number, User.full_name).all()
        
        # Get attendance records for this date
        query = Attendance.query.filter_by(date=attendance_date)
        
        if course_id:
            query = query.filter_by(course_id=course_id)
        
        attendance_records = query.all()
        attendance_map = {a.student_id: a.status for a in attendance_records}
        
        # Build response with attendance status for each student
        result = []
        for student in students:
            result.append({
                "id": student.id,
                "full_name": student.full_name,
                "roll_number": student.roll_number,
                "status": attendance_map.get(student.id)  # null if unmarked
            })
        
        return jsonify({
            "date": date_str,
            "students": result
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@faculty_bp.route("/mark-attendance", methods=["POST", "OPTIONS"])
@token_required
@teacher_required
def mark_attendance(current_user):
    """Mark attendance for multiple students"""
    try:
        from models import Attendance, Course
        from datetime import datetime, date
        
        data = request.json
        attendance_records = data.get('attendance', [])
        course_id = data.get('course_id')
        date_str = data.get('date')  # Expected format: YYYY-MM-DD
        
        if not attendance_records:
            return jsonify({"error": "No attendance records provided"}), 400
        
        # Parse date
        attendance_date = datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else date.today()
        
        marked_count = 0
        for record in attendance_records:
            student_id = record.get('student_id')
            status = record.get('status', 'absent')  # present, absent, late
            notes = record.get('notes', '')
            
            if not student_id:
                continue
            
            # Check if attendance already exists for this student/course/date
            existing = Attendance.query.filter_by(
                student_id=student_id,
                course_id=course_id,
                date=attendance_date
            ).first()
            
            if existing:
                # Update existing record
                existing.status = status
                existing.notes = notes
                existing.marked_by = current_user.id
            else:
                # Create new record
                new_attendance = Attendance(
                    student_id=student_id,
                    course_id=course_id,
                    date=attendance_date,
                    status=status,
                    marked_by=current_user.id,
                    notes=notes
                )
                db.session.add(new_attendance)
            
            marked_count += 1
        
        db.session.commit()
        
        # Update overall attendance percentage for each student
        for record in attendance_records:
            student_id = record.get('student_id')
            if student_id:
                update_student_overall_attendance(student_id)
        
        return jsonify({
            "message": f"Attendance marked for {marked_count} students",
            "marked_count": marked_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500



@faculty_bp.route("/departments", methods=["GET", "OPTIONS"])
@token_required
@teacher_required
def get_departments_for_teacher(current_user):
    """Get all departments - teacher accessible endpoint"""
    try:
        from models import Department
        departments = Department.query.all()
        return jsonify([{
            "id": d.id,
            "dept_name": d.dept_name
        } for d in departments]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@faculty_bp.route("/sections", methods=["GET", "OPTIONS"])
@token_required
@teacher_required
def get_sections_for_teacher(current_user):
    """Get sections by department and year - teacher accessible endpoint"""
    try:
        from models import Section
        dept_name = request.args.get('department')
        year = request.args.get('year')
        
        query = Section.query
        if dept_name:
            from models import Department
            dept = Department.query.filter_by(dept_name=dept_name).first()
            if dept:
                query = query.filter_by(dept_id=dept.id)
        if year:
            query = query.filter_by(year=int(year))
        
        sections = query.all()
        return jsonify([{
            "id": s.id,
            "name": s.name,
            "year": s.year,
            "dept_id": s.dept_id
        } for s in sections]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def update_student_overall_attendance(student_id):
    """Helper function to recalculate overall attendance percentage"""
    from models import Attendance, User
    from sqlalchemy import func
    
    total = db.session.query(func.count(Attendance.id)).filter_by(student_id=student_id).scalar() or 0
    if total == 0:
        return
    
    present = db.session.query(func.count(Attendance.id)).filter_by(
        student_id=student_id,
        status='present'
    ).scalar() or 0
    
    late = db.session.query(func.count(Attendance.id)).filter_by(
        student_id=student_id,
        status='late'
    ).scalar() or 0
    
    percentage = round(((present + late) / total) * 100, 2)
    
    student = User.query.get(student_id)
    if student:
        student.attendance = percentage
        db.session.commit()
