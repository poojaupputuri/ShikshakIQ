from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Student, Quiz, QuizQuestion, ConceptMastery, Intervention, RemediationQuiz, TeacherAssignment
from extensions import db
from services.gemini_service import GeminiService

remediation_bp = Blueprint('remediation', __name__)
gemini_service = GeminiService()

_REMEDIATION_THRESHOLD = 0.4


def _get_teacher():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'teacher':
        return None
    return user


@remediation_bp.route('/api/remediation/generate/<int:student_id>', methods=['POST'])
@jwt_required()
def generate_student_remediation(student_id):
    """Auto-generate remediation quizzes for a specific student based on their weak concepts."""
    try:
        teacher = _get_teacher()
        if not teacher:
            return jsonify({'error': 'Unauthorized'}), 403

        student = Student.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        # Get weak concepts for this student
        masteries = ConceptMastery.query.filter_by(student_id=student.id).all()
        weak_concepts = [m for m in masteries if m.mastery_level < _REMEDIATION_THRESHOLD]

        if not weak_concepts:
            return jsonify({
                'message': 'No weak concepts found for this student',
                'remediation_quizzes': []
            }), 200

        # Get the teacher's assignment for this student's class
        assignment = TeacherAssignment.query.filter_by(
            teacher_id=teacher.id,
            class_id=student.class_id
        ).first()

        created = []
        skipped = []
        for cm in weak_concepts[:3]:  # Limit to 3 weakest concepts
            # Skip if already has active remediation
            existing = RemediationQuiz.query.filter(
                RemediationQuiz.student_id == student.id,
                RemediationQuiz.concept_name == cm.concept_name,
                RemediationQuiz.is_completed == False
            ).first()
            if existing:
                skipped.append(cm.concept_name)
                continue

            mastery_pct = round(cm.mastery_level * 100)

            # Create intervention record
            intervention = Intervention(
                student_id=student.id,
                teacher_id=teacher.id,
                intervention_type='remediation',
                concept_name=cm.concept_name,
                description=f'Remediation: Student mastery {mastery_pct}% on "{cm.concept_name}". Auto-generated from learning gaps.',
                status='planned',
                priority='high' if cm.mastery_level < 0.2 else 'medium',
                start_date=datetime.utcnow(),
                outcome_score_before=cm.mastery_level,
            )
            db.session.add(intervention)
            db.session.flush()

            # Generate quiz questions
            questions = gemini_service.generate_quiz(
                class_name=student.class_name,
                subject=assignment.subject_ref.name if assignment and assignment.subject_ref else 'General',
                topic=cm.concept_name,
                difficulty='easy' if cm.mastery_level < 0.2 else 'medium',
                num_questions=5,
                total_marks=20
            )

            if not questions:
                questions = _fallback_remediation_questions(cm.concept_name)

            # Create remediation quiz
            rem_quiz = Quiz(
                title=f'Practice: {cm.concept_name}',
                subject=assignment.subject_ref.name if assignment and assignment.subject_ref else 'General',
                subject_id=assignment.subject_id if assignment else None,
                topic=cm.concept_name,
                class_name=student.class_name,
                class_id=student.class_id,
                difficulty='easy' if cm.mastery_level < 0.2 else 'medium',
                total_marks=20,
                duration_minutes=15,
                is_ai_generated=True,
                is_remediation=True,
                teacher_id=teacher.id,
            )
            db.session.add(rem_quiz)
            db.session.flush()

            for i, q_data in enumerate(questions):
                q_mark = q_data.get('marks', 4)
                question = QuizQuestion(
                    quiz_id=rem_quiz.id,
                    question_text=q_data.get('question_text', f'Practice question on {cm.concept_name}'),
                    question_type=q_data.get('question_type', 'short'),
                    options=q_data.get('options', []),
                    correct_answer=q_data.get('correct_answer', ''),
                    marks=q_mark,
                    concept_tag=cm.concept_name,
                    order_index=i,
                    difficulty_param=0.3,
                )
                db.session.add(question)

            db.session.flush()

            rem_record = RemediationQuiz(
                quiz_id=rem_quiz.id,
                student_id=student.id,
                concept_name=cm.concept_name,
                intervention_id=intervention.id,
            )
            db.session.add(rem_record)
            created.append(rem_record)

        db.session.commit()

        return jsonify({
            'message': f'Generated {len(created)} remediation quizzes for {student.name}' + (f'. Skipped {len(skipped)} concepts with existing remediation.' if skipped else ''),
            'remediation_quizzes': [r.to_dict() for r in created],
            'student_name': student.name,
            'generated': len(created),
            'skipped': len(skipped)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@remediation_bp.route('/api/remediation/generate-class/<int:assignment_id>', methods=['POST'])
@jwt_required()
def generate_class_remediation(assignment_id):
    """Auto-generate remediation quizzes for all weak students in a class workspace."""
    try:
        teacher = _get_teacher()
        if not teacher:
            return jsonify({'error': 'Unauthorized'}), 403

        assignment = TeacherAssignment.query.filter_by(
            id=assignment_id, teacher_id=teacher.id
        ).first()
        if not assignment:
            return jsonify({'error': 'Assignment not found'}), 404

        students = Student.query.filter_by(class_id=assignment.class_id).all()
        results = []
        total_generated = 0

        for student in students:
            masteries = ConceptMastery.query.filter_by(student_id=student.id).all()
            weak_concepts = [m for m in masteries if m.mastery_level < _REMEDIATION_THRESHOLD]

            if not weak_concepts:
                continue

            student_generated = 0
            student_skipped = 0
            for cm in weak_concepts[:2]:  # Limit to 2 per student for bulk generation
                existing = RemediationQuiz.query.filter(
                    RemediationQuiz.student_id == student.id,
                    RemediationQuiz.concept_name == cm.concept_name,
                    RemediationQuiz.is_completed == False
                ).first()
                if existing:
                    student_skipped += 1
                    continue

                intervention = Intervention(
                    student_id=student.id,
                    teacher_id=teacher.id,
                    intervention_type='remediation',
                    concept_name=cm.concept_name,
                    description=f'Bulk remediation: {round(cm.mastery_level * 100)}% mastery on "{cm.concept_name}".',
                    status='planned',
                    priority='high' if cm.mastery_level < 0.2 else 'medium',
                    start_date=datetime.utcnow(),
                    outcome_score_before=cm.mastery_level,
                )
                db.session.add(intervention)
                db.session.flush()

                questions = gemini_service.generate_quiz(
                    class_name=student.class_name,
                    subject=assignment.subject_ref.name if assignment.subject_ref else 'General',
                    topic=cm.concept_name,
                    difficulty='easy',
                    num_questions=5,
                    total_marks=20
                )

                if not questions:
                    questions = _fallback_remediation_questions(cm.concept_name)

                rem_quiz = Quiz(
                    title=f'Practice: {cm.concept_name}',
                    subject=assignment.subject_ref.name if assignment.subject_ref else 'General',
                    subject_id=assignment.subject_id,
                    topic=cm.concept_name,
                    class_name=student.class_name,
                    class_id=student.class_id,
                    difficulty='easy',
                    total_marks=20,
                    duration_minutes=15,
                    is_ai_generated=True,
                    is_remediation=True,
                    teacher_id=teacher.id,
                )
                db.session.add(rem_quiz)
                db.session.flush()

                for i, q_data in enumerate(questions):
                    q_mark = q_data.get('marks', 4)
                    question = QuizQuestion(
                        quiz_id=rem_quiz.id,
                        question_text=q_data.get('question_text', f'Practice question on {cm.concept_name}'),
                        question_type=q_data.get('question_type', 'short'),
                        options=q_data.get('options', []),
                        correct_answer=q_data.get('correct_answer', ''),
                        marks=q_mark,
                        concept_tag=cm.concept_name,
                        order_index=i,
                        difficulty_param=0.3,
                    )
                    db.session.add(question)

                db.session.flush()

                rem_record = RemediationQuiz(
                    quiz_id=rem_quiz.id,
                    student_id=student.id,
                    concept_name=cm.concept_name,
                    intervention_id=intervention.id,
                )
                db.session.add(rem_record)
                student_generated += 1

            results.append({
                'student_name': student.name,
                'student_id': student.id,
                'generated': student_generated,
                'skipped': student_skipped
            })
            if student_generated > 0:
                total_generated += student_generated

        db.session.commit()

        return jsonify({
            'message': f'Generated {total_generated} remediation quizzes across {len(results)} students',
            'students': results,
            'total_generated': total_generated
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


def _fallback_remediation_questions(concept):
    """Generate static remediation questions when Gemini is unavailable"""
    return [
        {
            'question_text': f'What is the basic concept of {concept}?',
            'question_type': 'short', 'options': [],
            'correct_answer': f'Understanding of {concept}', 'marks': 4,
            'concept_tag': concept,
        },
        {
            'question_text': f'Solve a simple problem related to {concept}.',
            'question_type': 'short', 'options': [],
            'correct_answer': f'Correct application of {concept}', 'marks': 4,
            'concept_tag': concept,
        },
        {
            'question_text': f'Explain {concept} in your own words.',
            'question_type': 'descriptive', 'options': [],
            'correct_answer': f'Clear explanation of {concept}', 'marks': 4,
            'concept_tag': concept,
        },
        {
            'question_text': f'What are the key principles of {concept}?',
            'question_type': 'short', 'options': [],
            'correct_answer': f'Key principles of {concept}', 'marks': 4,
            'concept_tag': concept,
        },
        {
            'question_text': f'Give a real-world example of {concept}.',
            'question_type': 'descriptive', 'options': [],
            'correct_answer': f'Practical application of {concept}', 'marks': 4,
            'concept_tag': concept,
        },
    ]
