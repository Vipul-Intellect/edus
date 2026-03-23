from app import create_app
from extensions import db

app = create_app()

def run_fix():
    with app.app_context():
        print("Verifying database tables...")
        db.create_all()
        print("✅ Success! All database tables exist.")

if __name__ == "__main__":
    run_fix()
