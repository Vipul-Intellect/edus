import sqlite3
import os

db_path = 'timetable_enhanced.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found.")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [row[0] for row in cursor.fetchall()]

print(f"Checking {len(tables)} tables for 'college_id' column...")

missing_column = []
for table in tables:
    if table == 'sqlite_sequence' or table == 'colleges':
        continue
    
    cursor.execute(f"PRAGMA table_info({table});")
    columns = [row[1] for row in cursor.fetchall()]
    
    if 'college_id' not in columns:
        missing_column.append(table)
        print(f"[-] Table '{table}' is MISSING 'college_id'")
    else:
        print(f"[+] Table '{table}' has 'college_id'")

conn.close()

if missing_column:
    print(f"\nTotal tables missing 'college_id': {len(missing_column)}")
    print("Action needed: ALTER TABLE to add the column.")
else:
    print("\nAll tables are up to date.")
