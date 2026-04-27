"""
CSV / Excel upload routes
"""

import pandas as pd
from flask import Blueprint, request, jsonify
from extensions import db
from models import Department, Section, Faculty, User, Course, Classroom
from utils.decorators import token_required, admin_required
from utils.export_utils import export_csvs

upload_bp = Blueprint('upload', __name__)


def _safe_str(val):
    """Convert a cell value to a clean string.
    Handles Excel's habit of storing integers as floats (e.g. password 123456 → '123456.0').
    """
    if pd.isna(val):
        return ""
    # If the float is a whole number, strip the decimal part
    if isinstance(val, float) and val == int(val):
        return str(int(val)).strip()
    return str(val).strip()


def read_file(file):
    """Read an uploaded file into a DataFrame.
    Supports .csv, .xlsx and .xls. Column names are stripped of whitespace.
    """
    filename = file.filename.lower()
    if filename.endswith('.xlsx') or filename.endswith('.xls'):
        df = pd.read_excel(file, engine='openpyxl' if filename.endswith('.xlsx') else 'xlrd',
                           dtype=str)   # read everything as string to avoid numeric coercion
    else:
        df = pd.read_csv(file, dtype=str)
    # Strip whitespace from column names (common Excel issue)
    df.columns = [c.strip() for c in df.columns]
    return df


@upload_bp.route("/faculty", methods=["POST", "OPTIONS"])
@token_required
@admin_required
def upload_faculty(current_user):
    try:
        file = request.files.get("file")
        if not file:
            return jsonify({"error": "No file uploaded"}), 400
        df = read_file(file)
        required_cols = ['faculty_name', 'dept_name', 'username', 'password', 'email', 'max_hours']
        missing_cols = [c for c in required_cols if c not in df.columns]
        if missing_cols:
            return jsonify({"error": f"CSV must contain columns: {', '.join(missing_cols)}"}), 400
        added = 0
        for _, row in df.iterrows():
            fname = str(row['faculty_name']).strip() if pd.notna(row['faculty_name']) else ""
            dname = str(row['dept_name']).strip() if pd.notna(row['dept_name']) else ""
            username = str(row['username']).strip() if pd.notna(row['username']) else ""
            password = str(row['password']).strip() if pd.notna(row['password']) else ""
            email = str(row['email']).strip() if pd.notna(row['email']) else ""
            max_hours = int(row['max_hours']) if pd.notna(row['max_hours']) else None

            if not fname or not dname or not username or not password or not email or not max_hours:
                continue
            
            # Check if Faculty exists
            if Faculty.query.filter_by(faculty_name=fname).first():
                continue
            
            # Check if User exists
            if User.query.filter_by(username=username).first():
                continue

            dept = Department.query.filter_by(dept_name=dname).first()
            if not dept:
                continue

            # Create Faculty record
            faculty = Faculty(
                faculty_name=fname,
                max_hours=max_hours,
                dept_id=dept.id,
                email=email
            )
            db.session.add(faculty)
            
            # Create User record for login
            user = User(
                username=username,
                role='teacher',
                dept_id=dept.id,
                full_name=fname,
                email=faculty.email
            )
            user.set_password(password)
            db.session.add(user)

            added += 1
        db.session.commit()
        export_csvs()
        return jsonify({"message": f"Successfully added {added} faculty members"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@upload_bp.route("/students", methods=["POST", "OPTIONS"])
@token_required
@admin_required
def upload_students(current_user):
    try:
        file = request.files.get("file")
        if not file:
            return jsonify({"error": "No file uploaded"}), 400
        df = read_file(file)

        required_cols = ['username', 'password', 'dept_name', 'year', 'section_name']
        missing_cols = [c for c in required_cols if c not in df.columns]
        if missing_cols:
            return jsonify({
                "error": f"File must contain columns: {', '.join(missing_cols)}",
                "found_columns": list(df.columns)
            }), 400

        added = 0
        skipped = 0
        skip_reasons = []

        for i, row in df.iterrows():
            row_num = i + 2  # 1-indexed + header row

            username = _safe_str(row['username'])
            if not username:
                skip_reasons.append(f"Row {row_num}: empty username")
                skipped += 1
                continue

            if User.query.filter_by(username=username).first():
                skip_reasons.append(f"Row {row_num}: username '{username}' already exists")
                skipped += 1
                continue

            password = _safe_str(row['password'])
            if not password:
                skip_reasons.append(f"Row {row_num}: empty password for '{username}'")
                skipped += 1
                continue

            dept_name = _safe_str(row['dept_name'])
            dept = Department.query.filter_by(dept_name=dept_name).first()
            if not dept:
                skip_reasons.append(f"Row {row_num}: department '{dept_name}' not found")
                skipped += 1
                continue

            # Year — safe int conversion (Excel may store as "1.0")
            try:
                year = int(float(_safe_str(row['year'])))
            except (ValueError, TypeError):
                skip_reasons.append(f"Row {row_num}: invalid year value '{row['year']}'")
                skipped += 1
                continue

            section_name = _safe_str(row['section_name'])
            section = Section.query.filter_by(
                name=section_name,
                year=year,
                dept_id=dept.id
            ).first()
            if not section:
                skip_reasons.append(
                    f"Row {row_num}: section '{section_name}' year={year} "
                    f"in dept '{dept_name}' not found"
                )
                skipped += 1
                continue

            # Optional full_name — leave blank if not provided
            full_name = _safe_str(row['full_name']) if 'full_name' in df.columns else ""

            # Optional email
            email = _safe_str(row['email']) if 'email' in df.columns else ""

            user = User(
                username=username,
                role='student',
                dept_id=dept.id,
                year=year,
                section_id=section.id,
                full_name=full_name,
                email=email if email else None
            )
            user.set_password(password)
            db.session.add(user)
            added += 1

        db.session.commit()
        export_csvs()
        return jsonify({
            "message": f"Successfully added {added} student(s)",
            "added": added,
            "skipped": skipped,
            "skip_reasons": skip_reasons[:20]  # cap at 20 to keep response readable
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@upload_bp.route("/departments", methods=["GET", "POST", "OPTIONS"])
@token_required
def upload_departments(current_user):
    if request.method != "POST":
        return jsonify({"message": "Use POST with form-data 'file' (CSV)"}), 200
    if current_user.role != "admin":
        return jsonify({"error": "Unauthorized - admin only"}), 403
    
    try:
        file = request.files.get("file")
        if not file:
            return jsonify({"error": "No file uploaded"}), 400
        
        df = read_file(file)
        added_count = 0
        for _, row in df.iterrows():
            if not Department.query.filter_by(dept_name=row['dept_name']).first():
                dept = Department(dept_name=row['dept_name'])
                db.session.add(dept)
                added_count += 1
        db.session.commit()
        export_csvs()
        return jsonify({"message": f"Successfully added {added_count} departments"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@upload_bp.route("/sections", methods=["GET", "POST", "OPTIONS"])
@token_required
def upload_sections(current_user):
    if request.method != "POST":
        return jsonify({"message": "Use POST with form-data 'file' (CSV)"}), 200
    if current_user.role != "admin":
        return jsonify({"error": "Unauthorized - admin only"}), 403
    
    try:
        file = request.files.get("file")
        if not file:
            return jsonify({"error": "No file uploaded"}), 400
        
        df = read_file(file)
        required_cols = ['name', 'year', 'dept_name']
        missing_cols = [c for c in required_cols if c not in df.columns]
        if missing_cols:
            return jsonify({"error": f"CSV must contain columns: {', '.join(missing_cols)}"}), 400
        
        added_count = 0
        for _, row in df.iterrows():
            dept = Department.query.filter_by(dept_name=row['dept_name']).first()
            if not dept:
                continue
            if not Section.query.filter_by(name=row['name'], year=int(row['year']), dept_id=dept.id).first():
                section = Section(name=row['name'], year=int(row['year']), dept_id=dept.id)
                db.session.add(section)
                added_count += 1
        db.session.commit()
        export_csvs()
        return jsonify({"message": f"Successfully added {added_count} sections"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@upload_bp.route("/courses", methods=["POST", "OPTIONS"])
@token_required
@admin_required
def upload_courses(current_user):
    """
    Bulk upload courses from CSV.
    Required columns: name, type, credits, year, semester, dept_name, hours_per_week
    Optional: faculty_name (to assign to a faculty)
    """
    try:
        file = request.files.get("file")
        if not file:
            return jsonify({"error": "No file uploaded"}), 400
            
        df = read_file(file)
        # Required columns for a valid course import
        required_cols = ['name', 'type', 'credits', 'year', 'semester', 'dept_name', 'hours_per_week']
        missing_cols = [c for c in required_cols if c not in df.columns]
        if missing_cols:
            return jsonify({"error": f"CSV must contain columns: {', '.join(missing_cols)}"}), 400
            
        added_count = 0
        skipped_count = 0
        
        for _, row in df.iterrows():
            # Get data and strip whitespace
            c_name = str(row['name']).strip() if pd.notna(row['name']) else ""
            if not c_name:
                skipped_count += 1
                continue
                
            # Find department by name
            dept_name = str(row['dept_name']).strip() if pd.notna(row['dept_name']) else ""
            dept = Department.query.filter_by(dept_name=dept_name).first()
            if not dept:
                skipped_count += 1
                continue
                
            # Check if course already exists in that department
            if Course.query.filter_by(name=c_name, dept_id=dept.id).first():
                skipped_count += 1
                continue
                
            # Optional faculty assignment
            faculty_id = None
            if 'faculty_name' in df.columns and pd.notna(row['faculty_name']):
                f_name = str(row['faculty_name']).strip()
                faculty = Faculty.query.filter_by(faculty_name=f_name).first()
                if faculty:
                    faculty_id = faculty.faculty_id
                    
            course = Course(
                name=c_name,
                type=str(row['type']).strip() if pd.notna(row['type']) else "Core",
                credits=int(row['credits']) if pd.notna(row['credits']) else 4,
                year=int(row['year']) if pd.notna(row['year']) else 1,
                semester=int(row['semester']) if pd.notna(row['semester']) else 1,
                dept_id=dept.id,
                faculty_id=faculty_id,
                hours_per_week=int(row['hours_per_week']) if pd.notna(row['hours_per_week']) else 6
            )
            db.session.add(course)
            added_count += 1
            
        db.session.commit()
        export_csvs()
        return jsonify({
            "message": f"Successfully added {added_count} courses",
            "skipped": skipped_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@upload_bp.route("/rooms", methods=["POST", "OPTIONS"])
@token_required
@admin_required
def upload_rooms(current_user):
    """
    Bulk upload rooms (classrooms) from CSV.
    Required columns: name, capacity
    Optional: resources
    """
    try:
        file = request.files.get("file")
        if not file:
            return jsonify({"error": "No file uploaded"}), 400
            
        df = read_file(file)
        required_cols = ['name', 'capacity']
        missing_cols = [c for c in required_cols if c not in df.columns]
        if missing_cols:
            return jsonify({"error": f"CSV must contain columns: {', '.join(missing_cols)}"}), 400
            
        added_count = 0
        skipped_count = 0
        
        for _, row in df.iterrows():
            r_name = str(row['name']).strip() if pd.notna(row['name']) else ""
            if not r_name:
                skipped_count += 1
                continue
                
            # Check if classroom already exists
            if Classroom.query.filter_by(name=r_name).first():
                skipped_count += 1
                continue
                
            room = Classroom(
                name=r_name,
                capacity=int(row['capacity']) if pd.notna(row['capacity']) else 30,
                resources=str(row['resources']).strip() if ('resources' in df.columns and pd.notna(row['resources'])) else ""
            )
            db.session.add(room)
            added_count += 1
            
        db.session.commit()
        export_csvs()
        return jsonify({
            "message": f"Successfully added {added_count} rooms",
            "skipped": skipped_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
