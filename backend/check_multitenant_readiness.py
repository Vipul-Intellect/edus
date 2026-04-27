
import sqlite3
import os

def check_readiness():
    db_path = 'timetable_enhanced.db'
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [t[0] for t in cursor.fetchall() if not t[0].startswith('sqlite_')]
    
    print(f"--- DATABASE READINESS CHECK ---")
    print(f"Tables found: {len(tables)}")
    
    missing_college_id = []
    has_college_id = []
    
    for table in tables:
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [c[1] for c in cursor.fetchall()]
        
        if 'college_id' in columns:
            cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE college_id IS NULL")
            null_count = cursor.fetchone()[0]
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            total_count = cursor.fetchone()[0]
            has_college_id.append((table, null_count, total_count))
        else:
            missing_college_id.append(table)
            
    print("\n[VULNERABLE] Tables missing 'college_id' column:")
    for table in missing_college_id:
        print(f"[MISSING] {table}")
        
    print("\n[OK] Tables with 'college_id' column:")
    for table, nulls, total in has_college_id:
        status = "[  WARN ]" if nulls > 0 else "[   OK  ]"
        print(f"{status} {table}: {nulls}/{total} NULL values")
        
    conn.close()

if __name__ == "__main__":
    check_readiness()
