from app import create_app
from extensions import db
from sqlalchemy import text

app = create_app()

def migrate_db():
    with app.app_context():
        print("Migrating database...")
        # Drop the table if it exists (SQLite doesn't support easy ALTER TABLE for multiple columns/not-null)
        try:
            db.session.execute(text("DROP TABLE IF EXISTS user_google_auth"))
            db.session.execute(text("DROP TABLE IF EXISTS calendar_event_map"))
            db.session.commit()
            print("Dropped old tables.")
        except Exception as e:
            print(f"Error dropping tables: {e}")
            db.session.rollback()

        # Recreate all tables
        db.create_all()
        print("✅ Success! Tables recreated with current schema.")

if __name__ == "__main__":
    migrate_db()
