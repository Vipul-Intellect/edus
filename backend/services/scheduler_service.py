"""
Timetable Scheduler Service using OR-Tools Constraint Programming
Handles the core logic for generating timetables — scoped per college (GCP multi-tenant)
"""

import os
import pandas as pd
from ortools.sat.python import cp_model

from extensions import db
from models import (
    Course, Faculty, Classroom, Section, Timetable,
    FacultyUnavailability
)
from services.email_service import send_email


def generate_timetable_internal(college_id=None):
    """
    Generate timetable using constraint programming.

    Parameters
    ----------
    college_id : int | None
        Tenant scope.  When None the function tries g.college_id (set by the
        before_request middleware), then falls back to loading ALL data (legacy
        / single-tenant deployments).
    """

    # ── 1. Resolve college scope ──────────────────────────────────────────────
    if college_id is None:
        try:
            from flask import g as flask_g
            college_id = getattr(flask_g, 'college_id', None)
        except RuntimeError:
            # Called outside Flask request context (e.g. tests or CLI) — no scope available
            college_id = None

    def scoped(model_cls):
        if college_id:
            return model_cls.query.filter_by(college_id=college_id).all()
        return model_cls.query.all()

    courses  = scoped(Course)
    faculty  = scoped(Faculty)
    rooms    = scoped(Classroom)
    sections = scoped(Section)

    # ── 2. Pre-flight checks ──────────────────────────────────────────────────
    if not courses:
        return {"error": "No courses found. Please add courses before generating a timetable."}
    if not rooms:
        return {"error": "No classrooms found. Please add at least one room."}
    if not sections:
        return {"error": "No sections found. Please add sections before generating."}

    # Skip courses that have no relevant section (nothing to schedule)
    def _relevant_sections(course):
        if college_id:
            return Section.query.filter_by(
                college_id=college_id, year=course.year, dept_id=course.dept_id
            ).all()
        return Section.query.filter_by(year=course.year, dept_id=course.dept_id).all()

    schedulable_courses = [c for c in courses if _relevant_sections(c) and c.hours_per_week > 0]
    if not schedulable_courses:
        return {
            "error": (
                "No schedulable courses found.  Make sure courses have hours_per_week > 0 "
                "and matching sections (same year + department)."
            )
        }

    # ── 3. Build time slots ───────────────────────────────────────────────────
    days  = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    hours = ["08", "09", "10", "11", "12", "13", "14", "15", "16"]
    time_slots = [f"{d}_{h}" for d in days for h in hours]  # 45 slots total

    # ── 4. Lookup tables ──────────────────────────────────────────────────────
    faculty_dict = {f.faculty_id: f for f in faculty}
    room_dict    = {r.room_id:    r for r in rooms}

    # Faculty unavailability → fast lookup set
    unavail_query = FacultyUnavailability.query
    if college_id:
        # FacultyUnavailability has no college_id; filter via faculty
        college_faculty_ids = {f.faculty_id for f in faculty}
        unavail_records = [
            u for u in unavail_query.all()
            if u.faculty_id in college_faculty_ids
        ]
    else:
        unavail_records = unavail_query.all()

    unavailable_slots = {
        (u.faculty_id, f"{u.day}_{u.start_time}")
        for u in unavail_records
    }

    # ── 5. OR-Tools model ─────────────────────────────────────────────────────
    model   = cp_model.CpModel()
    assignments = {}   # [course_id][section_id][(slot, room_id)] = BoolVar

    for c in schedulable_courses:
        rel_sections = _relevant_sections(c)
        assignments[c.course_id] = {}
        for section in rel_sections:
            assignments[c.course_id][section.id] = {}
            for slot in time_slots:
                for r in rooms:
                    assignments[c.course_id][section.id][(slot, r.room_id)] = (
                        model.NewBoolVar(
                            f"c{c.course_id}_s{section.id}_{slot}_r{r.room_id}"
                        )
                    )

    # ── 6. Constraints ────────────────────────────────────────────────────────

    # C0 — Fixed classes (pre-assign)
    for c in schedulable_courses:
        if c.is_fixed and c.fixed_day and c.fixed_slot and c.fixed_room_id:
            fixed_slot_key = f"{c.fixed_day}_{c.fixed_slot}"
            if fixed_slot_key not in time_slots:
                continue
            for section in _relevant_sections(c):
                if (c.course_id in assignments and
                        section.id in assignments[c.course_id] and
                        (fixed_slot_key, c.fixed_room_id) in assignments[c.course_id][section.id]):
                    model.Add(
                        assignments[c.course_id][section.id][(fixed_slot_key, c.fixed_room_id)] == 1
                    )

    # C0b — Block faculty's unavailable slots
    for c in schedulable_courses:
        if not c.faculty_id:
            continue
        for slot in time_slots:
            if (c.faculty_id, slot) in unavailable_slots:
                for section in _relevant_sections(c):
                    for r in rooms:
                        key = (slot, r.room_id)
                        if (c.course_id in assignments and
                                section.id in assignments[c.course_id] and
                                key in assignments[c.course_id][section.id]):
                            model.Add(assignments[c.course_id][section.id][key] == 0)

    # C1 — Each course scheduled exactly hours_per_week times per section
    for c in schedulable_courses:
        for section in _relevant_sections(c):
            if c.course_id not in assignments or section.id not in assignments[c.course_id]:
                continue
            all_vars = list(assignments[c.course_id][section.id].values())
            model.Add(sum(all_vars) == c.hours_per_week)

    # C2 — Room conflict: at most 1 class per room per slot
    for slot in time_slots:
        for r in rooms:
            room_vars = []
            for c in schedulable_courses:
                for section in _relevant_sections(c):
                    key = (slot, r.room_id)
                    if (c.course_id in assignments and
                            section.id in assignments[c.course_id] and
                            key in assignments[c.course_id][section.id]):
                        room_vars.append(assignments[c.course_id][section.id][key])
            if room_vars:
                model.Add(sum(room_vars) <= 1)

    # C3 — Faculty conflict: faculty teaches at most 1 class per slot
    for slot in time_slots:
        for f in faculty:
            fac_vars = []
            for c in schedulable_courses:
                if c.faculty_id != f.faculty_id:
                    continue
                for section in _relevant_sections(c):
                    for r in rooms:
                        key = (slot, r.room_id)
                        if (c.course_id in assignments and
                                section.id in assignments[c.course_id] and
                                key in assignments[c.course_id][section.id]):
                            fac_vars.append(assignments[c.course_id][section.id][key])
            if fac_vars:
                model.Add(sum(fac_vars) <= 1)

    # C4 — Section conflict: section has at most 1 class per slot
    for slot in time_slots:
        for section in sections:
            sec_vars = []
            for c in schedulable_courses:
                if c.year != section.year or c.dept_id != section.dept_id:
                    continue
                for r in rooms:
                    key = (slot, r.room_id)
                    if (c.course_id in assignments and
                            section.id in assignments[c.course_id] and
                            key in assignments[c.course_id][section.id]):
                        sec_vars.append(assignments[c.course_id][section.id][key])
            if sec_vars:
                model.Add(sum(sec_vars) <= 1)

    # C5 — Daily class limit per section (soft: use max_hours_per_day)
    for section in sections:
        max_daily = getattr(section, 'max_hours_per_day', 5) or 5
        for day in days:
            day_vars = []
            for c in schedulable_courses:
                if c.year != section.year or c.dept_id != section.dept_id:
                    continue
                for slot in time_slots:
                    if not slot.startswith(day):
                        continue
                    for r in rooms:
                        key = (slot, r.room_id)
                        if (c.course_id in assignments and
                                section.id in assignments[c.course_id] and
                                key in assignments[c.course_id][section.id]):
                            day_vars.append(assignments[c.course_id][section.id][key])
            if day_vars:
                model.Add(sum(day_vars) <= max_daily)

    # ── 7. Solver ─────────────────────────────────────────────────────────────
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds   = 60.0   # give it 60 s (was 30)
    solver.parameters.num_search_workers    = 4       # parallelise search
    solver.parameters.log_search_progress   = False

    print(f"[Scheduler] Solving for college_id={college_id}, "
          f"{len(schedulable_courses)} courses, {len(sections)} sections, "
          f"{len(rooms)} rooms, {len(time_slots)} slots …")

    status = solver.Solve(model)
    status_name = solver.StatusName(status)
    print(f"[Scheduler] Status: {status_name}")

    # ── 8. Infeasibility diagnostics ─────────────────────────────────────────
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        # Build a human-readable reason to help the admin fix things
        reasons = []

        total_hours_needed = sum(c.hours_per_week for c in schedulable_courses)
        total_capacity     = len(time_slots) * len(rooms)
        if total_hours_needed > total_capacity:
            reasons.append(
                f"Total hours required ({total_hours_needed}) exceeds total room-slot capacity "
                f"({total_capacity} = {len(time_slots)} slots × {len(rooms)} rooms). "
                "Add more classrooms or reduce hours_per_week."
            )

        for c in schedulable_courses:
            rel = _relevant_sections(c)
            if not rel:
                reasons.append(
                    f"Course '{c.name}' has no matching section "
                    f"(year={c.year}, dept_id={c.dept_id})."
                )
            if c.hours_per_week > len(time_slots):
                reasons.append(
                    f"Course '{c.name}' requires {c.hours_per_week} hours/week "
                    f"but only {len(time_slots)} slots exist."
                )

        if not reasons:
            reasons.append(
                "The combination of faculty, room, and section constraints made "
                "scheduling impossible.  Try: reducing hours_per_week, removing faculty "
                "unavailability blocks, adding more classrooms, or splitting sections."
            )

        detail = "  •  " + "\n  •  ".join(reasons)
        return {
            "error": f"Could not generate a feasible timetable.\n{detail}",
            "solver_status": status_name,
            "diagnostics": reasons
        }

    # ── 9. Persist results ────────────────────────────────────────────────────
    # Delete ONLY this college's old timetable entries
    try:
        if college_id:
            Timetable.query.filter_by(college_id=college_id).delete()
        else:
            Timetable.query.delete()
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return {"error": f"Failed to clear existing timetable: {str(e)}"}

    timetable_entries = []
    timetable_data    = []

    day_map  = {
        "Mon": "Monday",  "Tue": "Tuesday",  "Wed": "Wednesday",
        "Thu": "Thursday","Fri": "Friday",   "Sat": "Saturday"
    }
    time_map = {
        "08": "08:00", "09": "09:00", "10": "10:00", "11": "11:00",
        "12": "12:00", "13": "13:00", "14": "14:00", "15": "15:00",
        "16": "16:00", "17": "17:00"
    }

    for c in schedulable_courses:
        for section in _relevant_sections(c):
            if c.course_id not in assignments or section.id not in assignments[c.course_id]:
                continue
            for (slot, room_id), var in assignments[c.course_id][section.id].items():
                if solver.Value(var) != 1:
                    continue
                raw_day, raw_time = slot.split("_", 1)
                entry = Timetable(
                    college_id=college_id or c.college_id,
                    course_id=c.course_id,
                    section_id=section.id,
                    faculty_id=c.faculty_id,
                    room_id=room_id,
                    day=day_map.get(raw_day, raw_day),
                    start_time=time_map.get(raw_time, f"{raw_time}:00")
                )
                timetable_entries.append(entry)
                timetable_data.append({
                    "course":      c.name,
                    "section":     section.name,
                    "faculty":     faculty_dict[c.faculty_id].faculty_name if c.faculty_id and c.faculty_id in faculty_dict else "Unassigned",
                    "room":        room_dict[room_id].name,
                    "day":         entry.day,
                    "start_time":  entry.start_time,
                    "year":        c.year,
                    "semester":    c.semester,
                })

    try:
        db.session.add_all(timetable_entries)
        db.session.commit()
        os.makedirs("output", exist_ok=True)

        file_path = "output/timetable_final.csv"
        pd.DataFrame(timetable_data).to_csv(file_path, index=False)
        print(f"[Scheduler] Timetable saved — {len(timetable_entries)} entries.")

        # Email faculty (best-effort)
        try:
            faculty_emails = [f.email for f in faculty if f.email]
            if faculty_emails:
                send_email(
                    subject="New Timetable Generated",
                    recipients=faculty_emails,
                    body=(
                        "Hello,\n\nThe timetable has been updated. "
                        "Please log in to view your schedule.\n\nRegards,\nTimetable System"
                    ),
                    attachment_path=file_path
                )
        except Exception as mail_err:
            print(f"[Scheduler] Email send failed (non-fatal): {mail_err}")

        return {
            "success": True,
            "message": f"Timetable generated successfully — {len(timetable_entries)} slots scheduled.",
            "stats": {
                "entries":          len(timetable_entries),
                "courses_scheduled": len(schedulable_courses),
                "solver_status":    status_name,
            }
        }

    except Exception as e:
        db.session.rollback()
        return {"success": False, "message": f"Failed to save timetable: {str(e)}"}
