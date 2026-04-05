import sqlite3

db_path = 'timetable_enhanced.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Colleges ---")
cursor.execute("SELECT id, name, college_code FROM colleges;")
for row in cursor.fetchall():
    print(f"ID: {row[0]} | Code: {row[1]} | Name: {row[2]}")

print("\n--- Users ---")
query = """
SELECT u.username, u.role, u.college_id, c.college_code, u.is_active 
FROM users u 
JOIN colleges c ON u.college_id = c.id;
"""
cursor.execute(query)
for row in cursor.fetchall():
    print(f"User: {row[0]} | Role: {row[1]} | CID: {row[2]} | Code: {row[3]} | Active: {row[4]}")

conn.close()
