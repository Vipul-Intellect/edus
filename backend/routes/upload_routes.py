"""
CSV / Excel upload routes
"""

import pandas as pd
from flask import Blueprint, request, jsonify
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
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


def _safe_email(val):
    return _safe_str(val).lower()


def _truncate_reasons(reasons, limit=20):
    return reasons[:limit]


def _find_user_by_email(college_id, email):
    if not email:
        return None
    normalized = email.lower()
    return User.query.filter(
        User.college_id == college_id,
        User.email.isnot(None),
        func.lower(User.email) == normalized
    ).first()


def _find_user_by_username(college_id, username):
    if not username:
        return None
    return User.query.filter_by(college_id=college_id, username=username).first()


def _find_faculty_record(college_id, faculty_name, dept_id, email):
    if email:
        faculty = Faculty.query.filter(
            Faculty.college_id == college_id,
            Faculty.email.isnot(None),
            func.lower(Faculty.email) == email.lower()
        ).first()
        if faculty:
            return faculty

    return Faculty.query.filter_by(
        college_id=college_id,
        faculty_name=faculty_name,
        dept_id=dept_id
    ).first()


def _find_faculty_for_user_update(college_id, matched_user, faculty_name, dept_id, email):
    """Prefer the current CSV identity, then fall back to the teacher's old profile."""
    faculty = _find_faculty_record(college_id, faculty_name, dept_id, email)
    if faculty or matched_user is None:
        return faculty

    old_name = _safe_str(matched_user.full_name)
    old_email = _safe_email(matched_user.email)
    old_dept_id = matched_user.dept_id

    if old_name or old_email or old_dept_id:
        return _find_faculty_record(
            college_id,
            old_name or faculty_name,
            old_dept_id or dept_id,
            old_email
        )

    return None


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
        updated = 0
        skipped = 0
        conflicts = 0
        skip_reasons = []
        college_id = current_user.college_id

        for i, row in df.iterrows():
            row_num = i + 2  # header is row 1
            fname = _safe_str(row['faculty_name'])
            dname = _safe_str(row['dept_name'])
            username = _safe_str(row['username'])
            password = _safe_str(row['password'])
            email = _safe_email(row['email'])
            raw_max_hours = _safe_str(row['max_hours'])

            if not fname or not dname or not username or not password or not email or not raw_max_hours:
                skipped += 1
                skip_reasons.append(
                    f"Row {row_num}: missing one or more required fields "
                    "(faculty_name, dept_name, username, password, email, max_hours)"
                )
                continue

            try:
                max_hours = int(float(raw_max_hours))
            except (ValueError, TypeError):
                skipped += 1
                skip_reasons.append(f"Row {row_num}: invalid max_hours value '{raw_max_hours}'")
                continue

            if max_hours <= 0:
                skipped += 1
                skip_reasons.append(f"Row {row_num}: max_hours must be greater than 0")
                continue

            with db.session.no_autoflush:
                dept = Department.query.filter_by(college_id=college_id, dept_name=dname).first()
                if not dept:
                    skipped += 1
                    skip_reasons.append(f"Row {row_num}: department '{dname}' not found")
                    continue

                email_user = _find_user_by_email(college_id, email)
                username_user = _find_user_by_username(college_id, username)

            if email_user and username_user and email_user.id != username_user.id:
                skipped += 1
                conflicts += 1
                skip_reasons.append(
                    f"Row {row_num}: conflict - email '{email}' and username '{username}' "
                    "belong to different existing users"
                )
                continue

            matched_user = email_user or username_user
            if matched_user and matched_user.role != 'teacher':
                skipped += 1
                conflicts += 1
                match_value = email if email_user else username
                skip_reasons.append(
                    f"Row {row_num}: conflict - '{match_value}' belongs to a non-teacher user"
                )
                continue

            try:
                with db.session.begin_nested():
                    if matched_user:
                        faculty = _find_faculty_for_user_update(
                            college_id, matched_user, fname, dept.id, email
                        )

                        matched_user.full_name = fname
                        matched_user.email = email
                        matched_user.dept_id = dept.id

                        if not faculty:
                            faculty = Faculty(
                                college_id=college_id,
                                faculty_name=fname,
                                max_hours=max_hours,
                                dept_id=dept.id,
                                email=email
                            )
                            db.session.add(faculty)
                        else:
                            faculty.faculty_name = fname
                            faculty.max_hours = max_hours
                            faculty.dept_id = dept.id
                            faculty.email = email

                    else:
                        user = User(
                            college_id=college_id,
                            username=username,
                            role='teacher',
                            dept_id=dept.id,
                            full_name=fname,
                            email=email
                        )
                        user.set_password(password)
                        db.session.add(user)

                        faculty = _find_faculty_record(college_id, fname, dept.id, email)
                        if not faculty:
                            faculty = Faculty(
                                college_id=college_id,
                                faculty_name=fname,
                                max_hours=max_hours,
                                dept_id=dept.id,
                                email=email
                            )
                            db.session.add(faculty)
                        else:
                            faculty.faculty_name = fname
                            faculty.max_hours = max_hours
                            faculty.dept_id = dept.id
                            faculty.email = email

                    db.session.flush()
                    if matched_user:
                        updated += 1
                    else:
                        added += 1
            except IntegrityError as exc:
                skipped += 1
                conflicts += 1
                message = str(getattr(exc, "orig", exc))
                skip_reasons.append(f"Row {row_num}: database conflict - {message}")

        db.session.commit()
        if added or updated:
            export_csvs()

        return jsonify({
            "message": (
                f"Faculty import completed: {added} added, {updated} updated, "
                f"{skipped} skipped"
            ),
            "added": added,
            "updated": updated,
            "skipped": skipped,
            "conflicts": conflicts,
            "skip_reasons": _truncate_reasons(skip_reasons)
        }), 200
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
        conflicts = 0
        skip_reasons = []
        college_id = current_user.college_id

        for i, row in df.iterrows():
            row_num = i + 2  # 1-indexed + header row

            username = _safe_str(row['username'])
            if not username:
                skip_reasons.append(f"Row {row_num}: empty username")
                skipped += 1
                continue

            if _find_user_by_username(college_id, username):
                skip_reasons.append(f"Row {row_num}: username '{username}' already exists")
                skipped += 1
                conflicts += 1
                continue

            password = _safe_str(row['password'])
            if not password:
                skip_reasons.append(f"Row {row_num}: empty password for '{username}'")
                skipped += 1
                continue

            dept_name = _safe_str(row['dept_name'])
            dept = Department.query.filter_by(college_id=college_id, dept_name=dept_name).first()
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
                college_id=college_id,
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
            email = _safe_email(row['email']) if 'email' in df.columns else ""
            if email and _find_user_by_email(college_id, email):
                skip_reasons.append(f"Row {row_num}: email '{email}' already exists")
                skipped += 1
                conflicts += 1
                continue

            try:
                with db.session.begin_nested():
                    user = User(
                        college_id=college_id,
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
                    db.session.flush()
                    added += 1
            except IntegrityError as exc:
                skipped += 1
                conflicts += 1
                message = str(getattr(exc, "orig", exc))
                skip_reasons.append(f"Row {row_num}: database conflict - {message}")

        db.session.commit()
        if added:
            export_csvs()
        return jsonify({
            "message": f"Successfully added {added} student(s)",
            "added": added,
            "skipped": skipped,
            "conflicts": conflicts,
            "skip_reasons": skip_reasons[:20]  # cap at 20 to keep response readable
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@upload_bp.route("/departments", methods=["GET", "POST", "OPTIONS"])
@token_required
@admin_required  # FIX: was only @token_required — anyone could call this; also missing college_id scoping
def upload_departments(current_user):
    if request.method != "POST":
        return jsonify({"message": "Use POST with form-data 'file' (CSV)"}), 200

    try:
        file = request.files.get("file")
        if not file:
            return jsonify({"error": "No file uploaded"}), 400

        df = read_file(file)

        if 'dept_name' not in df.columns:
            return jsonify({"error": "CSV must contain column: dept_name"}), 400

        college_id = current_user.college_id  # FIX: scope all queries to this college
        added_count = 0
        skipped_count = 0

        for _, row in df.iterrows():
            dname = _safe_str(row['dept_name'])
            if not dname:
                skipped_count += 1
                continue
            # FIX: was filter_by(dept_name=...) — no college scope → cross-tenant collision
            if not Department.query.filter_by(college_id=college_id, dept_name=dname).first():
                dept = Department(college_id=college_id, dept_name=dname)
                db.session.add(dept)
                added_count += 1
            else:
                skipped_count += 1

        db.session.commit()
        export_csvs()
        return jsonify({
            "message": f"Successfully added {added_count} departments",
            "added": added_count,
            "skipped": skipped_count
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@upload_bp.route("/sections", methods=["GET", "POST", "OPTIONS"])
@token_required
@admin_required  # FIX: was only @token_required — missing college_id scoping
def upload_sections(current_user):
    if request.method != "POST":
        return jsonify({"message": "Use POST with form-data 'file' (CSV)"}), 200

    try:
        file = request.files.get("file")
        if not file:
            return jsonify({"error": "No file uploaded"}), 400

        df = read_file(file)
        required_cols = ['name', 'year', 'dept_name']
        missing_cols = [c for c in required_cols if c not in df.columns]
        if missing_cols:
            return jsonify({"error": f"CSV must contain columns: {', '.join(missing_cols)}"}), 400

        college_id = current_user.college_id  # FIX: scope all queries to this college
        added_count = 0
        skipped_count = 0

        for _, row in df.iterrows():
            dname = _safe_str(row['dept_name'])
            sname = _safe_str(row['name'])
            if not dname or not sname:
                skipped_count += 1
                continue

            # FIX: was filter_by(dept_name=...) — no college_id scope
            dept = Department.query.filter_by(college_id=college_id, dept_name=dname).first()
            if not dept:
                skipped_count += 1
                continue

            try:
                year = int(float(_safe_str(row['year'])))
            except (ValueError, TypeError):
                skipped_count += 1
                continue

            # FIX: was filter_by(name=..., year=..., dept_id=...) — no college_id scope
            if not Section.query.filter_by(
                college_id=college_id, name=sname, year=year, dept_id=dept.id
            ).first():
                section = Section(
                    college_id=college_id, name=sname, year=year, dept_id=dept.id
                )
                db.session.add(section)
                added_count += 1
            else:
                skipped_count += 1

        db.session.commit()
        export_csvs()
        return jsonify({
            "message": f"Successfully added {added_count} sections",
            "added": added_count,
            "skipped": skipped_count
        }), 200
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
        skip_reasons = []
        college_id = current_user.college_id
        
        for i, row in df.iterrows():
            row_num = i + 2
            # Get data and strip whitespace
            c_name = str(row['name']).strip() if pd.notna(row['name']) else ""
            if not c_name:
                skipped_count += 1
                skip_reasons.append(f"Row {row_num}: empty course name")
                continue
                
            # Find department by name, scoped to this college
            dept_name = str(row['dept_name']).strip() if pd.notna(row['dept_name']) else ""
            dept = Department.query.filter_by(college_id=college_id, dept_name=dept_name).first()
            if not dept:
                skipped_count += 1
                skip_reasons.append(f"Row {row_num}: department '{dept_name}' not found for this college")
                continue
                
            # Check if course already exists in that department
            if Course.query.filter_by(college_id=college_id, name=c_name, dept_id=dept.id).first():
                skipped_count += 1
                skip_reasons.append(f"Row {row_num}: course '{c_name}' already exists in '{dept_name}'")
                continue
                
            # Optional faculty assignment, scoped to this college
            faculty_id = None
            if 'faculty_name' in df.columns and pd.notna(row['faculty_name']):
                f_name = str(row['faculty_name']).strip()
                faculty = Faculty.query.filter_by(college_id=college_id, faculty_name=f_name).first()
                if faculty:
                    faculty_id = faculty.faculty_id
                    
            course = Course(
                college_id=college_id,
                name=c_name,
                type=str(row['type']).strip() if pd.notna(row['type']) else "Core",
                credits=int(float(row['credits'])) if pd.notna(row['credits']) else 4,
                year=int(float(row['year'])) if pd.notna(row['year']) else 1,
                semester=int(float(row['semester'])) if pd.notna(row['semester']) else 1,
                dept_id=dept.id,
                faculty_id=faculty_id,
                hours_per_week=int(float(row['hours_per_week'])) if pd.notna(row['hours_per_week']) else 6
            )
            db.session.add(course)
            added_count += 1
            
        db.session.commit()
        export_csvs()
        return jsonify({
            "message": f"Successfully added {added_count} courses",
            "added": added_count,
            "skipped": skipped_count,
            "skip_reasons": skip_reasons[:20]
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
        college_id = current_user.college_id
        
        for _, row in df.iterrows():
            r_name = str(row['name']).strip() if pd.notna(row['name']) else ""
            if not r_name:
                skipped_count += 1
                continue
                
            # FIX: scope to college_id
            if Classroom.query.filter_by(college_id=college_id, name=r_name).first():
                skipped_count += 1
                continue
                
            room = Classroom(
                college_id=college_id,
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
