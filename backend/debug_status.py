from app import create_app
from extensions import db
from models import User, UserGoogleAuth
import traceback

app = create_app()

def debug_status():
    with app.app_context():
        try:
            print("--- Debugging Google Auth Status ---")
            teacher = User.query.filter_by(role='teacher').first()
            if not teacher:
                print("No teacher found in database.")
                return

            print(f"Checking status for teacher: {teacher.username} (ID: {teacher.id})")
            auth = UserGoogleAuth.query.filter_by(user_id=teacher.id).first()
            
            if not auth:
                print("No UserGoogleAuth record found for this teacher.")
                print("This is normal for a non-connected user.")
                return

            print("UserGoogleAuth record found! Attempting to run to_dict()...")
            status_dict = auth.to_dict()
            print("SUCCESS! to_dict() output:")
            print(status_dict)

        except Exception as e:
            print("!!! ERROR DURING DEBUG !!!")
            print(traceback.format_exc())

if __name__ == "__main__":
    debug_status()
