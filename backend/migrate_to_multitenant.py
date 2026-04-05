import os
import sys
from sqlalchemy import text
from flask import Flask

# Add the current directory to the path so we can import app and models
sys.path.append(os.getcwd())

from app import create_app
from extensions import db
from models.college import College

def migrate():
    app = create_app()
    with app.app_context():
        print("--- STARTING MULTI-TENANT MIGRATION ---")
        
        # Tables to migrate (all entities that need college isolation)
        tables = [
            'users', 'departments', 'faculties', 'sections', 'courses', 
            'classrooms', 'room_occupancy', 'course_allocations', 'timetables', 
            'swap_requests', 'faculty_unavailability', 'leave_requests', 
            'chatbot_conversations', 'system_announcements', 'attendance', 
            'faculty_workload', 'meetings', 'faculty_meeting_participation', 
            'assessments', 'grades', 'student_performance', 'assignments', 
            'resources', 'resource_bookings', 'notifications', 
            'notification_preferences', 'user_google_auth', 'calendar_event_maps'
        ]

        # PHASE 1: Create Colleges Table
        print("\n[Phase 1] Creating colleges table...")
        db.create_all() # This will create the new 'colleges' table if it doesn't exist
        print("Done.")

        # PHASE 2: Add college_id column to all tables (Nullable first)
        print("\n[Phase 2] Adding nullable college_id to all tables...")
        for table in tables:
            try:
                # Check if column already exists (basic check)
                db.session.execute(text(f"ALTER TABLE {table} ADD COLUMN college_id INTEGER"))
                db.session.commit()
                print(f"Added college_id to {table}")
            except Exception as e:
                db.session.rollback()
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    print(f"Column already exists in {table}, skipping.")
                else:
                    print(f"Error adding column to {table}: {e}")

        # PHASE 3: Create DEFAULT college and migrate existing data
        print("\n[Phase 3] Creating default college and migrating data...")
        default_college = College.query.filter_by(college_code="DEFAULT").first()
        if not default_college:
            default_college = College(
                name="Default College",
                college_code="DEFAULT",
                feature_flags={
                    "ai_chatbot": True,
                    "meetings": True,
                    "timetable": True,
                    "assessment": True,
                    "analytics": True
                },
                subscription_tier="enterprise"
            )
            db.session.add(default_college)
            db.session.commit()
            print(f"Created default college: ID {default_college.id}")
        else:
            print(f"Default college already exists: ID {default_college.id}")

        for table in tables:
            try:
                db.session.execute(
                    text(f"UPDATE {table} SET college_id = :cid WHERE college_id IS NULL"),
                    {"cid": default_college.id}
                )
                db.session.commit()
                print(f"Migrated data for {table}")
            except Exception as e:
                db.session.rollback()
                print(f"Error migrating data for {table}: {e}")

        # PHASE 4: Make college_id NOT NULL and add Foreign Keys
        # Performance Note: This phase should be run AFTER the model code is updated.
        # But for the script, we can include the SQL if we're sure.
        print("\n[Phase 4] Enforcing NOT NULL and adding constraints...")
        for table in tables:
            try:
                # 1. Make NOT NULL
                # SQLite doesn't support ALTER COLUMN SET NOT NULL directly, 
                # but PostgreSQL/MySQL do. Since we used psycopg2-binary in requirements,
                # we assume PostgreSQL.
                db.session.execute(text(f"ALTER TABLE {table} ALTER COLUMN college_id SET NOT NULL"))
                
                # 2. Add Foreign Key
                # We need to give the constraint a unique name
                fk_name = f"fk_{table}_college"
                db.session.execute(text(f"ALTER TABLE {table} ADD CONSTRAINT {fk_name} FOREIGN KEY (college_id) REFERENCES colleges(id)"))
                
                # 3. Add Index
                idx_name = f"idx_{table}_college"
                db.session.execute(text(f"CREATE INDEX {idx_name} ON {table} (college_id)"))
                
                db.session.commit()
                print(f"Finalized constraints for {table}")
            except Exception as e:
                db.session.rollback()
                print(f"Could not finalize constraints for {table} (PostgreSQL specific?): {e}")

        print("\n--- MIGRATION COMPLETE ---")

if __name__ == "__main__":
    migrate()
