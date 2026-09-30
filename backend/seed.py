from werkzeug.security import generate_password_hash
from models import (
    User, School, AcademicYear, Class, Subject,
    TeacherAssignment, Student, Quiz, QuizQuestion,
    Result, ConceptMastery, BKTTracking, StudentUser,
    Intervention, NotificationSetting, Notification,
    RemediationQuiz
)
from extensions import db
from datetime import datetime, timedelta


def seed_data(app):
    """Seed the database with comprehensive demo data including all new features"""
    with app.app_context():
        if User.query.first():
            print("Database already seeded, skipping...")
            return

        import random
        random.seed(42)  # Reproducible demo data

        print("Seeding database with comprehensive demo data...")

        # ====================
        # 1. Create School
        # ====================
        school = School(
            name='Shikshak International School',
            address='123 Education Lane, Knowledge City'
        )
        db.session.add(school)
        db.session.flush()

        # ====================
        # 2. Create Principal
        # ====================
        principal = User(
            name='Principal Admin',
            email='principal@shikshakiq.com',
            password=generate_password_hash('Principal@123'),
            role='principal',
            phone='+91-9876543200',
            is_active=True,
            school_id=school.id
        )
        db.session.add(principal)
        db.session.flush()

        # ====================
        # 3. Create Academic Years
        # ====================
        year1 = AcademicYear(
            school_id=school.id,
            name='2025-2026',
            is_active=False
        )
        year2 = AcademicYear(
            school_id=school.id,
            name='2026-2027',
            is_active=True
        )
        db.session.add(year1)
        db.session.add(year2)
        db.session.flush()

        # ====================
        # 4. Create Classes
        # ====================
        class_configs = [
            ('6', 'A'), ('6', 'B'),
            ('7', 'A'), ('7', 'B'),
            ('8', 'A'), ('8', 'B'),
            ('9', 'A'), ('9', 'B'),
            ('10', 'A'), ('10', 'B'),
        ]
        classes = []
        for name, section in class_configs:
            cls = Class(
                school_id=school.id,
                academic_year_id=year2.id,
                name=name,
                section=section
            )
            db.session.add(cls)
            classes.append(cls)
        db.session.flush()

        # ====================
        # 5. Create Subjects
        # ====================
        subject_names = ['Mathematics', 'Science', 'English', 'Social Science', 'Hindi', 'Sanskrit']
        subjects = []
        for sname in subject_names:
            subject = Subject(
                school_id=school.id,
                name=sname,
                code=sname[:4].upper()
            )
            db.session.add(subject)
            subjects.append(subject)
        db.session.flush()

        # ====================
        # 6. Create Teachers
        # ====================
        teachers_data = [
            {'name': 'Lakshmi Mam', 'email': 'lakshmi@shikshakiq.com', 'password': 'Teacher@123', 'specialization': 'Mathematics'},
            {'name': 'Rajan Sir', 'email': 'rajan@shikshakiq.com', 'password': 'Teacher@123', 'specialization': 'Science'},
            {'name': 'Priya Mam', 'email': 'priya@shikshakiq.com', 'password': 'Teacher@123', 'specialization': 'English'},
            {'name': 'Anil Sir', 'email': 'anil@shikshakiq.com', 'password': 'Teacher@123', 'specialization': 'Social Science'},
            {'name': 'Sunita Mam', 'email': 'sunita@shikshakiq.com', 'password': 'Teacher@123', 'specialization': 'Hindi'},
            {'name': 'Ravi Sir', 'email': 'ravi@shikshakiq.com', 'password': 'Teacher@123', 'specialization': 'Mathematics'},
            {'name': 'Neha Mam', 'email': 'neha@shikshakiq.com', 'password': 'Teacher@123', 'specialization': 'Science'},
        ]
        teachers = []
        for t_data in teachers_data:
            teacher = User(
                name=t_data['name'],
                email=t_data['email'],
                password=generate_password_hash(t_data['password']),
                role='teacher',
                phone='',
                subject_specialization=t_data['specialization'],
                is_active=True,
                school_id=school.id
            )
            db.session.add(teacher)
            teachers.append(teacher)
        db.session.flush()

        # ====================
        # 7. Create Teacher Assignments
        # ====================
        assignment_map = [
            (0, 0, 0), (0, 1, 0),  # Lakshmi: Maths for 6A, 6B
            (0, 2, 0), (0, 3, 0),  # Lakshmi: Maths for 7A, 7B
            (0, 4, 0), (0, 5, 0),  # Lakshmi: Maths for 8A, 8B
            (1, 0, 1), (1, 1, 1),  # Rajan: Science for 6A, 6B
            (1, 2, 1), (1, 3, 1),  # Rajan: Science for 7A, 7B
            (1, 4, 1), (1, 5, 1),  # Rajan: Science for 8A, 8B
            (2, 0, 2), (2, 1, 2),  # Priya: English for 6A, 6B
            (2, 2, 2), (2, 3, 2),  # Priya: English for 7A, 7B
            (3, 4, 3), (3, 5, 3),  # Anil: SST for 8A, 8B
            (4, 0, 4), (4, 1, 4),  # Sunita: Hindi for 6A, 6B
            (5, 6, 0), (5, 7, 0),  # Ravi: Maths for 9A, 9B
            (5, 8, 0), (5, 9, 0),  # Ravi: Maths for 10A, 10B
            (6, 6, 1), (6, 7, 1),  # Neha: Science for 9A, 9B
            (6, 8, 1), (6, 9, 1),  # Neha: Science for 10A, 10B
        ]

        all_assignments = []
        for teacher_idx, class_idx, subject_idx in assignment_map:
            assignment = TeacherAssignment(
                teacher_id=teachers[teacher_idx].id,
                class_id=classes[class_idx].id,
                subject_id=subjects[subject_idx].id,
                academic_year_id=year2.id
            )
            db.session.add(assignment)
            all_assignments.append(assignment)
        db.session.flush()

        # ====================
        # 8. Create Students
        # ====================
        sample_students = {
            0: ['Aarav Sharma', 'Ananya Patel', 'Arjun Singh', 'Diya Gupta', 'Ishaan Verma'],
            1: ['Kavya Reddy', 'Rohan Joshi', 'Saanvi Kapoor', 'Neha Jain', 'Vikram Rao'],
            2: ['Aanya Desai', 'Dhruv Malhotra', 'Ishita Bhatia', 'Kabir Nair', 'Myra Kaur'],
            3: ['Reyansh Choudhury', 'Vihaan Saxena', 'Anika Shah', 'Yash Thakur', 'Shreya Das'],
            4: ['Advik Mehta', 'Anvi Tiwari', 'Atharva Rao', 'Ira Menon', 'Krishna Iyer'],
            5: ['Nandini Gokhale', 'Rohit Pillai', 'Sara Khanna', 'Tanvi Chauhan', 'Uday Mishra'],
            6: ['Arnav Kumar', 'Disha Agarwal', 'Harsh Singhania', 'Kiara Dsouza', 'Parth Shetty'],
            7: ['Sara Khan', 'Yuvraj Thakur', 'Zara Ansari', 'Amit Yadav', 'Bhavana Reddy'],
            8: ['Aditya Prakash', 'Bhavya Mishra', 'Chirag Arora', 'Esha Pandey', 'Gaurav Chauhan'],
            9: ['Navya Bhat', 'Tanya Rai', 'Vivek Saxena', 'Kriti Agarwal', 'Manav Desai'],
        }

        all_students = []
        for cls_idx, student_names in sample_students.items():
            cls = classes[cls_idx]
            for i, sname in enumerate(student_names, start=1):
                student = Student(
                    name=sname,
                    roll_number=f'{cls.name}{cls.section}{i:02d}',
                    class_id=cls.id,
                    class_name=cls.display_name,
                    section=cls.section,
                    parent_name=f'Parent of {sname}',
                    parent_phone=f'+91-98765{cls_idx}{i:04d}',
                    parent_email=f'parent.{sname.lower().replace(" ", ".")}@email.com'
                )
                db.session.add(student)
                all_students.append(student)
        db.session.flush()

        # ====================
        # 9. Create Student Portal Accounts
        # ====================
        print("   Creating student portal accounts...")
        student_users_data = [
            # First 3 students get portal access
            {'username': 'student.aarav', 'student_idx': 0, 'password': 'student123'},
            {'username': 'student.ananya', 'student_idx': 1, 'password': 'student123'},
            {'username': 'student.arjun', 'student_idx': 2, 'password': 'student123'},
            {'username': 'student.kavya', 'student_idx': 5, 'password': 'student123'},
            {'username': 'student.rohan', 'student_idx': 6, 'password': 'student123'},
            {'username': 'student.saanvi', 'student_idx': 7, 'password': 'student123'},
            {'username': 'student.aanya', 'student_idx': 10, 'password': 'student123'},
            {'username': 'student.dhruv', 'student_idx': 11, 'password': 'student123'},
            {'username': 'student.ishita', 'student_idx': 12, 'password': 'student123'},
            {'username': 'student.advik', 'student_idx': 20, 'password': 'student123'},
        ]
        for su_data in student_users_data:
            student = all_students[su_data['student_idx']]
            student_user = StudentUser(
                student_id=student.id,
                username=su_data['username'],
                password=generate_password_hash(su_data['password']),
                is_active=True,
            )
            db.session.add(student_user)
        db.session.flush()

        # ====================
        # 10. Create Sample Quizzes
        # ====================
        sample_quizzes = [
            {
                'subject': 'Mathematics',
                'subject_idx': 0,
                'topic': 'Algebra Basics',
                'difficulty': 'medium',
                'total_marks': 25,
                'duration_minutes': 30,
                'questions': [
                    {'text': 'What is the value of x in 2x + 5 = 15?', 'type': 'mcq',
                     'options': ['5', '3', '10', '7'], 'answer': '5', 'marks': 5, 'concept': 'Linear Equations'},
                    {'text': 'Simplify: 3(a + 2b) - 2(a + b)', 'type': 'mcq',
                     'options': ['a + 4b', 'a + 2b', 'a + b', 'a + 5b'], 'answer': 'a + 4b', 'marks': 5,
                     'concept': 'Algebraic Expressions'},
                    {'text': 'Solve: x² - 9 = 0', 'type': 'short', 'options': [], 'answer': 'x = ±3', 'marks': 5,
                     'concept': 'Quadratic Equations'},
                    {'text': 'If y = 2x + 3, find y when x = 4', 'type': 'short', 'options': [], 'answer': '11',
                     'marks': 5, 'concept': 'Linear Functions'},
                    {'text': 'Explain the difference between an expression and an equation with examples.',
                     'type': 'descriptive', 'options': [],
                     'answer': 'An expression has no equals sign (2x+3). An equation shows equality (2x+3=7).',
                     'marks': 5, 'concept': 'Algebra Fundamentals'},
                ]
            },
            {
                'subject': 'Science',
                'subject_idx': 1,
                'topic': 'Motion & Forces',
                'difficulty': 'medium',
                'total_marks': 25,
                'duration_minutes': 30,
                'questions': [
                    {'text': 'What is the SI unit of force?', 'type': 'mcq',
                     'options': ['Newton', 'Joule', 'Watt', 'Pascal'], 'answer': 'Newton', 'marks': 5,
                     'concept': 'Forces'},
                    {'text': 'A car travels 100 km in 2 hours. What is its average speed?', 'type': 'mcq',
                     'options': ['40 km/h', '50 km/h', '60 km/h', '100 km/h'], 'answer': '50 km/h', 'marks': 5,
                     'concept': 'Speed and Velocity'},
                    {'text': "State Newton's First Law of Motion.", 'type': 'short', 'options': [],
                     'answer': 'An object at rest stays at rest unless acted upon by an unbalanced force.', 'marks': 5,
                     'concept': "Newton's Laws"},
                    {'text': 'Calculate acceleration when velocity changes from 10 m/s to 30 m/s in 5 seconds.',
                     'type': 'short', 'options': [], 'answer': '4 m/s²', 'marks': 5, 'concept': 'Acceleration'},
                    {'text': 'Explain the principle of conservation of energy with a real-world example.',
                     'type': 'descriptive', 'options': [],
                     'answer': 'Energy cannot be created or destroyed, only converted. Example: roller coaster PE to KE.',
                     'marks': 5, 'concept': 'Energy Conservation'},
                ]
            },
        ]

        # Create quizzes for each teacher's math and science assignments
        for teacher in teachers:
            math_assignments = [a for a in teacher.assignments if a.subject_ref.name == 'Mathematics']
            science_assignments = [a for a in teacher.assignments if a.subject_ref.name == 'Science']

            for assignment in math_assignments + science_assignments:
                class_obj = assignment.class_ref
                subject_obj = assignment.subject_ref
                is_math = subject_obj.name == 'Mathematics'
                q_data = sample_quizzes[0] if is_math else sample_quizzes[1]

                quiz = Quiz(
                    title=f'{subject_obj.name} - {q_data["topic"]} ({class_obj.display_name})',
                    subject=subject_obj.name,
                    subject_id=subject_obj.id,
                    topic=q_data['topic'],
                    class_name=class_obj.display_name,
                    class_id=class_obj.id,
                    difficulty=q_data['difficulty'],
                    total_marks=q_data['total_marks'],
                    duration_minutes=q_data['duration_minutes'],
                    is_ai_generated=False,
                    teacher_id=teacher.id
                )
                db.session.add(quiz)
                db.session.flush()

                for i, q_text_data in enumerate(q_data['questions']):
                    question = QuizQuestion(
                        quiz_id=quiz.id,
                        question_text=q_text_data['text'],
                        question_type=q_text_data['type'],
                        options=q_text_data['options'],
                        correct_answer=q_text_data['answer'],
                        marks=q_text_data['marks'],
                        concept_tag=q_text_data['concept'],
                        order_index=i,
                        difficulty_param=0.5
                    )
                    db.session.add(question)

                # Create sample results for first 3 students in this class
                class_students = [s for s in all_students if s.class_id == class_obj.id]
                for student in class_students[:3]:
                    score = random.randint(10, q_data['total_marks'])
                    percentage = (score / q_data['total_marks']) * 100

                    # Deliberately make some scores low for demo interventions
                    if random.random() < 0.25:
                        score = random.randint(3, 9)
                        percentage = (score / q_data['total_marks']) * 100

                    result = Result(
                        quiz_id=quiz.id,
                        student_id=student.id,
                        score=score,
                        total_marks=q_data['total_marks'],
                        percentage=round(percentage, 2),
                        answers_data=[],
                        feedback='Good attempt! Keep practicing.',
                        strengths=['Shows potential'],
                        weaknesses=['Needs more practice on core concepts'],
                        confidence=random.uniform(0.5, 0.95)
                    )
                    db.session.add(result)

                    # Add concept masteries with varied levels
                    for q in q_data['questions']:
                        mastery_level = random.uniform(0.2, 0.9)
                        # Some students get low mastery for demo purposes
                        if student.name in ['Arjun Singh', 'Rohan Joshi', 'Dhruv Malhotra', 'Ishita Bhatia']:
                            mastery_level = random.uniform(0.1, 0.35)

                        mastery = ConceptMastery(
                            student_id=student.id,
                            subject_id=subject_obj.id,
                            concept_name=q['concept'],
                            mastery_level=mastery_level,
                            attempts=random.randint(1, 5),
                            correct_attempts=max(1, int(mastery_level * random.randint(1, 5))),
                        )
                        db.session.add(mastery)

                        # Add BKT tracking
                        bkt = BKTTracking(
                            student_id=student.id,
                            subject_id=subject_obj.id,
                            concept_name=q['concept'],
                            p_know=mastery_level,
                            p_learn=0.3,
                            p_guess=0.2,
                            p_slip=0.1,
                            observations=random.randint(1, 5)
                        )
                        db.session.add(bkt)

        db.session.flush()

        # ====================
        # 11. Create Demo Interventions
        # ====================
        print("   Creating demo interventions...")
        # Find students with weak concepts
        weak_students_data = [
            {'student_name': 'Arjun Singh', 'concept': 'Linear Equations'},
            {'student_name': 'Rohan Joshi', 'concept': 'Forces'},
            {'student_name': 'Dhruv Malhotra', 'concept': 'Quadratic Equations'},
            {'student_name': 'Ishita Bhatia', 'concept': 'Algebraic Expressions'},
            {'student_name': 'Arjun Singh', 'concept': 'Newton\'s Laws'},
        ]

        for ws in weak_students_data:
            student = next((s for s in all_students if s.name == ws['student_name']), None)
            if not student:
                continue

            # Find Lakshmi Mam (teacher index 0) or Rajan Sir (teacher index 1)
            teacher_idx = 0 if ws['concept'] in ['Linear Equations', 'Quadratic Equations', 'Algebraic Expressions'] else 1
            teacher = teachers[teacher_idx]

            # Find assignment for this student's class and teacher
            assignment = TeacherAssignment.query.filter_by(
                teacher_id=teacher.id,
                class_id=student.class_id
            ).first()

            interventions = Intervention(
                student_id=student.id,
                teacher_id=teacher.id,
                assignment_id=assignment.id if assignment else None,
                intervention_type='remediation',
                concept_name=ws['concept'],
                description=f'Scheduled targeted remediation session for {ws["concept"]} — student shows below-average mastery.',
                status=random.choice(['planned', 'in_progress', 'completed']),
                priority='high' if random.random() < 0.5 else 'medium',
                start_date=datetime.utcnow() - timedelta(days=random.randint(1, 14)),
                outcome_score_before=random.uniform(20, 45),
                outcome_notes='Student responded well to extra practice. ' if random.random() < 0.5 else '',
            )
            db.session.add(interventions)

        db.session.flush()

        # ====================
        # 12. Create Remediation Quizzes
        # ====================
        print("   Creating remediation quizzes...")
        interventions_list = Intervention.query.all()
        for i, intervention in enumerate(interventions_list[:3]):  # First 3 get remediation quizzes
            student = Student.query.get(intervention.student_id)
            if not student:
                continue

            quiz = Quiz(
                title=f'Remediation: {intervention.concept_name}',
                subject='General',
                topic=intervention.concept_name,
                class_name=student.class_name,
                class_id=student.class_id,
                difficulty='easy',
                total_marks=10,
                duration_minutes=15,
                is_ai_generated=True,
                is_remediation=True,
                teacher_id=intervention.teacher_id,
            )
            db.session.add(quiz)
            db.session.flush()

            # Add practice questions
            practice_qs = [
                f'What is the basic definition of {intervention.concept_name}?',
                f'Solve a basic problem related to {intervention.concept_name}.',
                f'Explain {intervention.concept_name} in your own words with an example.',
            ]
            for j, q_text in enumerate(practice_qs):
                q = QuizQuestion(
                    quiz_id=quiz.id,
                    question_text=q_text,
                    question_type='short',
                    options=[],
                    correct_answer=f'Correct understanding of {intervention.concept_name}',
                    marks=4 if j == 2 else 3,
                    concept_tag=intervention.concept_name,
                    order_index=j,
                    difficulty_param=0.3,
                )
                db.session.add(q)

            # Link to student
            rem = RemediationQuiz(
                quiz_id=quiz.id,
                student_id=intervention.student_id,
                concept_name=intervention.concept_name,
                intervention_id=intervention.id,
                is_completed=intervention.status == 'completed',
                score=random.uniform(40, 85) if intervention.status == 'completed' else None,
                completed_at=datetime.utcnow() - timedelta(days=random.randint(0, 5)) if intervention.status == 'completed' else None,
            )
            db.session.add(rem)

        db.session.flush()

        # ====================
        # 13. Create Notification Settings & History
        # ====================
        print("   Creating notification demo data...")
        for student in all_students[:20]:  # First 20 students
            settings = NotificationSetting(
                student_id=student.id,
                send_email=bool(student.parent_email),
                send_sms=random.random() < 0.3,
                send_whatsapp=random.random() < 0.15,
                weekly_summary=True,
                alert_on_low_score=True,
                alert_threshold=40.0,
                language='en',
            )
            db.session.add(settings)

        # Create notification history
        for i in range(15):
            student = random.choice(all_students)
            teacher = random.choice(teachers)
            n = Notification(
                student_id=student.id,
                teacher_id=teacher.id,
                notification_type=random.choice(['report', 'alert', 'weekly_summary']),
                channel=random.choice(['email', 'sms', 'in_app']),
                title=f'Update: {student.name}\'s Performance',
                message=f'Your child {student.name} scored {random.randint(30, 95)}% in their recent {random.choice(["Mathematics", "Science", "English"])} quiz. Please review their progress.',
                status=random.choice(['sent', 'delivered', 'read']),
                sent_at=datetime.utcnow() - timedelta(days=random.randint(0, 10), hours=random.randint(0, 23)),
            )
            db.session.add(n)

        db.session.commit()
        print()
        print("=" * 50)
        print("  ✅ SEEDED SUCCESSFULLY!")
        print("=" * 50)
        print()
        print(f"   📚 School: {school.name}")
        print(f"   👤 Principal: principal@shikshakiq.com / Principal@123")
        print(f"   👩‍🏫 {len(teachers)} teachers with {len(all_assignments)} assignments")
        print(f"   🏫 {len(classes)} classes, {len(subjects)} subjects")
        print(f"   👨‍🎓 {len(all_students)} students")
        print(f"   🎯 {len(interventions_list)} interventions created")
        print(f"   📝 Remediation quizzes linked to interventions")
        print(f"   📧 Notification settings & history created")
        print(f"   🔑 {len(student_users_data)} student portal accounts")
        print()
        print("   🎓 Student Portal Login Credentials:")
        for su_data in student_users_data:
            print(f"      👤 {su_data['username']} / {su_data['password']}")
        print()
        print("   👩‍🏫 Teacher Login Credentials:")
        for t in teachers_data:
            print(f"      👤 {t['email']} / {t['password']}")
        print(f"      👤 principal@shikshakiq.com / Principal@123")
        print()
        print("   🌐 Navigate to /student-portal to access Student Portal")
        print()
