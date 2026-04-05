import sqlite3

db_path = 'timetable_enhanced.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id, name FROM colleges WHERE college_code='DEFAULT';")
res = cursor.fetchone()
if res:
    print(f"Default College ID: {res[0]} (Name: {res[1]})")
else:
    print("Default college NOT found")

conn.close()
