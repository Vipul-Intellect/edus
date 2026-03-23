import sqlite3
import os

db_path = os.path.join('instance', 'timetable_enhanced.db')
if not os.path.exists(db_path):
    db_path = 'timetable_enhanced.db'

if not os.path.exists(db_path):
    print(f"Error: Database {db_path} not found.")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, role, full_name FROM users WHERE role='admin'")
    admin = cursor.fetchone()
    if admin:
        print(f"Found Admin: ID={admin[0]}, Username={admin[1]}, Role={admin[2]}, Name={admin[3]}")
    else:
        print("No admin user found.")
    conn.close()
