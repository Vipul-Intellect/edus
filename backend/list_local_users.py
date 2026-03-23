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
    cursor.execute("SELECT id, username, role, full_name, email FROM users")
    users = cursor.fetchall()
    print("\nUsers in Local Database:")
    print("-" * 50)
    for user in users:
        print(f"ID: {user[0]} | Username: {user[1]} | Role: {user[2]} | Name: {user[3]}")
    conn.close()
