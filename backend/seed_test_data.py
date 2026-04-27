from app import create_app
from extensions import db
from models import College, User, Department, Faculty, Course, Section, Classroom, Timetable
from werkzeug.security import generate_password_hash

app = create_app()

with app.app_context():
    print("🚀 Starting comprehensive data seeding...")

    try:
        # 1. Create College
        college = College.query.filter_by(college_code='TEST101').first()
        if not college:
            college = College(name="Test University", college_code="TEST101")
            db.session.add(college)
            db.session.commit()
            print("✅ Created College")

        # 2. Create Department
        dept = Department.query.filter_by(name='Computer Science', college_id=college.id).first()
        if not dept:
            dept = Department(name='Computer Science', college_id=college.id)
            db.session.add(dept)
            db.session.commit()
            print("✅ Created CS Department")

        # 3. Create Section (Year 1, Section A)
        section = Section.query.filter_by(name='A', year=1, dept_id=dept.id).first()
        if not section:
            section = Section(name='A', year=1, dept_id=dept.id, college_id=college.id)
            db.session.add(section)
            db.session.commit()
            print("✅ Created Section A (Year 1)")

        # 4. Create Faculty
        teacher = Faculty.query.filter_by(faculty_name='Dr. Smith', college_id=college.id).first()
        if not teacher:
            teacher = Faculty(faculty_name='Dr. Smith', email='smith@test.com', dept_id=dept.id, college_id=college.id)
            db.session.add(teacher)
            db.session.commit()
            print("✅ Created Faculty: Dr. Smith")

        # 5. Create Course
        course = Course.query.filter_by(name='Data Structures', college_id=college.id).first()
        if not course:
            course = Course(name='Data Structures', type='Theory', credits=4, dept_id=dept.id, college_id=college.id, faculty_id=teacher.faculty_id)
            db.session.add(course)
            db.session.commit()
            print("✅ Created Course: Data Structures")

        # 6. Create Classroom
        room = Classroom.query.filter_by(name='Room 101', college_id=college.id).first()
        if not room:
            room = Classroom(name='Room 101', capacity=60, college_id=college.id)
            db.session.add(room)
            db.session.commit()
            print("✅ Created Classroom: Room 101")

        # 7. Create Student (User)
        student = User.query.filter_by(username='test_student').first()
        if not student:
            student = User(
                username='test_student',
                password_hash=generate_password_hash('student@123'),
                role='student',
                college_id=college.id,
                full_name="John Doe",
                dept_id=dept.id,
                section_id=section.id,
                year=1,
                is_active=True
            )
            db.session.add(student)
            db.session.commit()
            print("✅ Created Student: test_student / student@123")

        # 8. Create Timetable Entry (Monday, 09:00 AM)
        entry = Timetable.query.filter_by(day='Monday', start_time='09:00', section_id=section.id).first()
        if not entry:
            entry = Timetable(
                college_id=college.id,
                course_id=course.course_id,
                section_id=section.id,
                faculty_id=teacher.faculty_id,
                room_id=room.room_id,
                day='Monday',
                start_time='09:00'
            )
            db.session.add(entry)
            db.session.commit()
            print("✅ Created Timetable Entry: Monday 09:00 AM")

        print("\n🏁 Success! Everything is linked.")
        print(f"- Student 'test_student' is in Section A.")
        print(f"- Section A has 'Data Structures' on Monday at 09:00 AM.")

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error: {e}")
