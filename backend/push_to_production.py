import sqlite3
import requests
import os
import sys

# Try to load .env if available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

print("=" * 60)
print("Local to Production User Migration Tool")
print("=" * 60)

RENDER_URL = input("\nEnter your Render backend URL (e.g., https://your-app.onrender.com): ").strip()
if not RENDER_URL:
    print("Error: Render URL is required.")
    sys.exit(1)
    
if RENDER_URL.endswith('/'):
    RENDER_URL = RENDER_URL[:-1]

# Ensure we have the base URL without /api if user added it
if RENDER_URL.endswith('/api'):
    RENDER_URL = RENDER_URL[:-4]

SETUP_SECRET = os.environ.get("SETUP_SECRET")
if not SETUP_SECRET:
    SETUP_SECRET = input("Enter your SETUP_SECRET (same as set on Render): ").strip()

if not SETUP_SECRET:
    print("Error: SETUP_SECRET is required.")
    sys.exit(1)

DB_PATH = 'timetable_enhanced.db'

def push_users():
    if not os.path.exists(DB_PATH):
        # Try finding it in instance/
        alt_path = os.path.join('instance', 'timetable_enhanced.db')
        if os.path.exists(alt_path):
            db_to_use = alt_path
        else:
            print(f"Error: {DB_PATH} not found in current directory or instance/ folder.")
            return
    else:
        db_to_use = DB_PATH

    try:
        print(f"Reading data from {db_to_use}...")
        conn = sqlite3.connect(db_to_use)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # We only migrate users. Other data (departments, courses) should be added via UI 
        # or separate migration scripts if needed. Users are most critical for login.
        try:
            cursor.execute("SELECT username, password_hash, role, full_name, email, is_active FROM users")
        except sqlite3.OperationalError:
            print("Error: 'users' table not found in database.")
            conn.close()
            return
            
        users = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        if not users:
            print("No users found in local database.")
            return

        print(f"Found {len(users)} users in local database.")
        
        payload = {
            "setup_key": SETUP_SECRET,
            "users": users
        }
        
        print(f"Sending data to {RENDER_URL}/api/setup/migrate_users...")
        response = requests.post(f"{RENDER_URL}/api/setup/migrate_users", json=payload)
        
        if response.status_code == 200:
            print(f"\n✅ Success: {response.json().get('message')}")
            print("\nYou can now login to your production site with your local credentials.")
        else:
            error_data = response.json()
            print(f"\n❌ Error ({response.status_code}): {error_data.get('error')}")
            if error_data.get('trace'):
                print("\nServer Traceback:")
                print(error_data.get('trace'))
                
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Connection Error: {e}")
        print("Make sure your Render backend is awake and the URL is correct.")
    except Exception as e:
        print(f"\n❌ An unexpected error occurred: {e}")

if __name__ == "__main__":
    push_users()
    input("\nPress Enter to exit...")
