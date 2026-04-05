import sqlite3
import shutil
import os

db_path = 'timetable_enhanced.db'
backup_path = 'timetable_enhanced.db.bak'

def migrate():
    # 1. Create Backup
    print(f"[*] Creating backup: {backup_path}...")
    shutil.copy2(db_path, backup_path)

    # 2. Connect
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 3. Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]

    print(f"[*] Analyzing {len(tables)} tables...")

    # 4. Migrate
    migration_count = 0
    for table in tables:
        if table in ('sqlite_sequence', 'colleges'):
            continue
            
        cursor.execute(f"PRAGMA table_info({table});")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'college_id' not in columns:
            print(f"[+] Adding 'college_id' to table '{table}'...")
            try:
                # Add column with default value 1 (identifies as 'DEFAULT' college)
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN college_id INTEGER DEFAULT 1;")
                migration_count += 1
            except Exception as e:
                print(f"[!] Error migrating {table}: {e}")
        
    conn.commit()
    conn.close()
    
    print(f"\n[✓] Migration complete. Updated {migration_count} tables.")
    print("[!] Please restart the backend server to apply changes.")

if __name__ == "__main__":
    if os.path.exists(db_path):
        migrate()
    else:
        print(f"[!] Error: {db_path} not found.")
