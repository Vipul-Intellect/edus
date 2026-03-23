from werkzeug.security import generate_password_hash
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
    
    password_hash = generate_password_hash('Admin@123')
    
    # Check if admin exists
    cursor.execute("SELECT id FROM users WHERE role='admin'")
    admin = cursor.fetchone()
    
    if admin:
        print(f"Updating existing admin (ID: {admin[0]}) password to Admin@123")
        cursor.execute("UPDATE users SET password_hash=?, username='admin', full_name='System Admin', is_active=1 WHERE id=?", (password_hash, admin[0]))
    else:
        print("Creating new admin user with password Admin@123")
        cursor.execute("INSERT INTO users (username, password_hash, role, full_name, is_active) VALUES (?, ?, ?, ?, ?)", 
                       ('admin', password_hash, 'admin', 'System Admin', 1))
    
    conn.commit()
    conn.close()
    print("Local admin credentials set successfully: admin / Admin@123")
