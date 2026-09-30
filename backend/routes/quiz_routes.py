import json
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Quiz, QuizQuestion, Result, Student, ConceptMastery, BKTTracking, IRT_Analysis, Intervention, RemediationQuiz
from extensions import db
from services.gemini_service import GeminiService
from services.education_models import BKTService, IRTService

quiz_bp = Blueprint('quizzes', __name__)
gemini_service = GeminiService()
bkt_service = BKTService()
irt_service = IRTService()


# Threshold below which a concept is considered weak and triggers auto-remediation
_REMEDIATION_THRESHOLD = 0.4
# Only auto-remediate if the student scored below this percentage on the quiz
_REMEDIATION_SCORE_THRESHOLD = 70.0


# ====================
# HELPERS
# ====================

def _get_teacher():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'teacher':
        return None
    return user


# ====================
# QUIZ CRUD
# ====================

@quiz_bp.route('/api/quizzes', methods=['GET'])
@jwt_required()
def get_quizzes():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Filter by assignment if provided
        assignment_id = request.args.get('assignment_id', type=int)
        if assignment_id and user.role == 'teacher':
            from models import TeacherAssignment
            assignment = TeacherAssignment.query.filter_by(id=assignment_id, teacher_id=user_id).first()
            if assignment:
                quizzes = Quiz.query.filter_by(
                    teacher_id=user_id,
                    class_id=assignment.class_id,
                    subject_id=assignment.subject_id
                ).order_by(Quiz.created_at.desc()).all()
                return jsonify({'quizzes': [q.to_dict() for q in quizzes]}), 200

        quizzes = Quiz.query.filter_by(teacher_id=user_id).order_by(Quiz.created_at.desc()).all()
        return jsonify({'quizzes': [q.to_dict() for q in quizzes]}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@quiz_bp.route('/api/quizzes/<int:quiz_id>', methods=['GET'])
@jwt_required()
def get_quiz(quiz_id):
    try:
        user_id = int(get_jwt_identity())
        quiz = Quiz.query.filter_by(id=quiz_id, teacher_id=user_id).first()
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404

        questions = QuizQuestion.query.filter_by(quiz_id=quiz.id).order_by(QuizQuestion.order_index).all()
        return jsonify({
            'quiz': quiz.to_dict(),
            'questions': [q.to_dict() for q in questions]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@quiz_bp.route('/api/quizzes', methods=['POST'])
@jwt_required()
def create_quiz():
    try:
        teacher = _get_teacher()
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404

        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        student_id = data.get('student_id')
        if student_id:
            # Verify the student exists and belongs to a class the teacher has access to
            target_student = Student.query.get(student_id)
            if not target_student:
                return jsonify({'error': 'Student not found'}), 404
            # Check teacher has access to this student's class
            from models import TeacherAssignment
            assignment = TeacherAssignment.query.filter_by(
                teacher_id=teacher.id,
                class_id=target_student.class_id
            ).first()
            if not assignment:
                return jsonify({'error': 'You do not have access to this student'}), 403

        quiz = Quiz(
            title=data.get('title', 'Untitled Quiz'),
            subject=data.get('subject', ''),
            subject_id=data.get('subject_id'),
            topic=data.get('topic', ''),
            class_name=data.get('class_name', ''),
            class_id=data.get('class_id'),
            difficulty=data.get('difficulty', 'medium'),
            total_marks=data.get('total_marks', 0),
            duration_minutes=data.get('duration_minutes', 30),
            is_ai_generated=data.get('is_ai_generated', False),
            teacher_id=teacher.id,
            student_id=student_id
        )
        db.session.add(quiz)
        db.session.flush()

        # Add questions
        questions_data = data.get('questions', [])
        for i, q_data in enumerate(questions_data):
            question = QuizQuestion(
                quiz_id=quiz.id,
                question_text=q_data.get('question_text', ''),
                question_type=q_data.get('question_type', 'mcq'),
                options=q_data.get('options', []),
                correct_answer=q_data.get('correct_answer', ''),
                marks=q_data.get('marks', 1),
                concept_tag=q_data.get('concept_tag', ''),
                order_index=i,
                difficulty_param=q_data.get('difficulty', 0.5)
            )
            db.session.add(question)

        total = sum(q.get('marks', 1) for q in questions_data)
        quiz.total_marks = total

        # If this quiz is assigned to a student, create a RemediationQuiz link so it shows in their practice quizzes
        if student_id:
            rem_quiz_record = RemediationQuiz(
                quiz_id=quiz.id,
                student_id=student_id,
                concept_name=data.get('topic', quiz.subject),
                is_completed=False
            )
            db.session.add(rem_quiz_record)

        db.session.commit()

        questions = QuizQuestion.query.filter_by(quiz_id=quiz.id).order_by(QuizQuestion.order_index).all()
        return jsonify({
            'quiz': quiz.to_dict(),
            'questions': [q.to_dict() for q in questions],
            'message': 'Quiz created successfully'
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@quiz_bp.route('/api/quizzes/generate-ai', methods=['POST'])
@jwt_required()
def generate_ai_quiz():
    try:
        teacher = _get_teacher()
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404

        data = request.get_json()
        class_name = data.get('class_name', '')
        subject = data.get('subject', '')
        topic = data.get('topic', '')
        difficulty = data.get('difficulty', 'medium')
        num_questions = data.get('num_questions', 5)
        raw_total_marks = data.get('total_marks')
        if raw_total_marks is None or (isinstance(raw_total_marks, (int, float)) and (raw_total_marks <= 0 or raw_total_marks != raw_total_marks)):
            total_marks = 25
        else:
            try:
                total_marks = int(raw_total_marks)
            except (ValueError, TypeError):
                total_marks = 25
        if total_marks <= 0:
            total_marks = 25

        try:
            questions = gemini_service.generate_quiz(
                class_name, subject, topic, difficulty, num_questions, total_marks
            )
        except Exception as gen_err:
            return jsonify({'error': f'Quiz generation failed: {str(gen_err)}'}), 500

        if not questions:
            return jsonify({'error': 'Failed to generate quiz questions'}), 500

        student_id = data.get('student_id')
        if student_id:
            target_student = Student.query.get(student_id)
            if not target_student:
                return jsonify({'error': 'Student not found'}), 404
            from models import TeacherAssignment
            assignment = TeacherAssignment.query.filter_by(
                teacher_id=teacher.id,
                class_id=target_student.class_id
            ).first()
            if not assignment:
                return jsonify({'error': 'You do not have access to this student'}), 403

        marks_per_q = float(total_marks) / len(questions) if questions else 5.0
        quiz = Quiz(
            title=f"{subject} - {topic} ({difficulty})",
            subject=subject,
            subject_id=data.get('subject_id'),
            topic=topic,
            class_name=class_name,
            class_id=data.get('class_id'),
            difficulty=difficulty,
            total_marks=total_marks,
            duration_minutes=data.get('duration_minutes', 30),
            is_ai_generated=True,
            teacher_id=teacher.id,
            student_id=student_id
        )
        db.session.add(quiz)
        db.session.flush()

        for i, q_data in enumerate(questions):
            q_mark = q_data.get('marks', marks_per_q)
            question = QuizQuestion(
                quiz_id=quiz.id,
                question_text=q_data.get('question_text', ''),
                question_type=q_data.get('question_type', 'mcq'),
                options=q_data.get('options', []),
                correct_answer=q_data.get('correct_answer', ''),
                marks=q_mark,
                concept_tag=q_data.get('concept_tag', topic),
                order_index=i,
                difficulty_param=0.5
            )
            db.session.add(question)

        # If this AI quiz is assigned to a student, create a RemediationQuiz link
        if student_id:
            rem_quiz_record = RemediationQuiz(
                quiz_id=quiz.id,
                student_id=student_id,
                concept_name=topic or subject,
                is_completed=False
            )
            db.session.add(rem_quiz_record)

        db.session.commit()

        questions_db = QuizQuestion.query.filter_by(quiz_id=quiz.id).order_by(QuizQuestion.order_index).all()
        return jsonify({
            'quiz': quiz.to_dict(),
            'questions': [q.to_dict() for q in questions_db],
            'message': 'AI quiz generated successfully'
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@quiz_bp.route('/api/quizzes/<int:quiz_id>', methods=['PUT'])
@jwt_required()
def update_quiz(quiz_id):
    try:
        user_id = int(get_jwt_identity())
        quiz = Quiz.query.filter_by(id=quiz_id, teacher_id=user_id).first()
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404

        data = request.get_json()
        if data.get('title'): quiz.title = data['title']
        if data.get('subject'): quiz.subject = data['subject']
        if data.get('topic'): quiz.topic = data['topic']
        if data.get('difficulty'): quiz.difficulty = data['difficulty']
        if data.get('duration_minutes'): quiz.duration_minutes = data['duration_minutes']

        if 'questions' in data:
            QuizQuestion.query.filter_by(quiz_id=quiz.id).delete()
            for i, q_data in enumerate(data['questions']):
                question = QuizQuestion(
                    quiz_id=quiz.id,
                    question_text=q_data.get('question_text', ''),
                    question_type=q_data.get('question_type', 'mcq'),
                    options=q_data.get('options', []),
                    correct_answer=q_data.get('correct_answer', ''),
                    marks=q_data.get('marks', 1),
                    concept_tag=q_data.get('concept_tag', ''),
                    order_index=i,
                    difficulty_param=q_data.get('difficulty', 0.5)
                )
                db.session.add(question)

        db.session.commit()

        questions = QuizQuestion.query.filter_by(quiz_id=quiz.id).order_by(QuizQuestion.order_index).all()
        return jsonify({
            'quiz': quiz.to_dict(),
            'questions': [q.to_dict() for q in questions],
            'message': 'Quiz updated successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@quiz_bp.route('/api/quizzes/<int:quiz_id>', methods=['DELETE'])
@jwt_required()
def delete_quiz(quiz_id):
    try:
        user_id = int(get_jwt_identity())
        quiz = Quiz.query.filter_by(id=quiz_id, teacher_id=user_id).first()
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404

        db.session.delete(quiz)
        db.session.commit()

        return jsonify({'message': 'Quiz deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ====================
# QUIZ SUBMISSION
# ====================

@quiz_bp.route('/api/quizzes/<int:quiz_id>/submit', methods=['POST'])
@jwt_required()
def submit_quiz(quiz_id):
    try:
        user_id = int(get_jwt_identity())
        quiz = Quiz.query.filter_by(id=quiz_id, teacher_id=user_id).first()
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404

        data = request.get_json()
        student_id = data.get('student_id')
        answers = data.get('answers', [])

        student = Student.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        # Evaluate answers
        total_score = 0
        answers_data = []
        strengths = set()
        weaknesses = set()
        concept_responses = {}

        for answer in answers:
            question_id = answer.get('question_id')
            student_answer = answer.get('answer', '')

            question = QuizQuestion.query.get(question_id)
            if not question or question.quiz_id != quiz.id:
                continue

            is_correct = _check_answer(question, student_answer)
            marks_obtained = question.marks if is_correct else 0
            total_score += marks_obtained

            answers_data.append({
                'question_id': question_id,
                'question_text': question.question_text,
                'student_answer': student_answer,
                'correct_answer': question.correct_answer,
                'marks_obtained': marks_obtained,
                'marks': question.marks,
                'is_correct': is_correct,
                'concept_tag': question.concept_tag
            })

            concept = question.concept_tag or 'general'
            if concept not in concept_responses:
                concept_responses[concept] = []
            concept_responses[concept].append(is_correct)

            bkt_service.update_knowledge_tracing(student_id, concept, is_correct)

            if is_correct:
                strengths.add(concept)
            else:
                weaknesses.add(concept)

        percentage = (total_score / quiz.total_marks * 100) if quiz.total_marks > 0 else 0

        # Update IRT
        irt_responses = [{
            'difficulty': q.difficulty_param,
            'discrimination': 1.0,
            'guessing': 0.25,
            'is_correct': a['is_correct']
        } for q, a in zip(QuizQuestion.query.filter_by(quiz_id=quiz.id).all(), answers_data) if q]

        if irt_responses:
            irt_service.estimate_ability(student_id, irt_responses)

        # Generate AI feedback
        feedback_data = gemini_service.generate_feedback(
            student.name,
            total_score,
            quiz.total_marks,
            list(strengths),
            list(weaknesses)
        )

        result = Result(
            quiz_id=quiz.id,
            student_id=student_id,
            score=total_score,
            total_marks=quiz.total_marks,
            percentage=round(percentage, 2),
            answers_data=answers_data,
            feedback=feedback_data.get('feedback', ''),
            strengths=list(strengths),
            weaknesses=list(weaknesses),
            confidence=0.9
        )
        db.session.add(result)
        db.session.commit()

        # ── Auto-remediation: if score is low, create remediation quizzes ──
        auto_remediation = []
        try:
            if percentage < _REMEDIATION_SCORE_THRESHOLD and weaknesses:
                auto_remediation = _auto_create_remediation(
                    student=student,
                    quiz=quiz,
                    weaknesses=list(weaknesses),
                    concept_responses=concept_responses,
                    teacher_id=user_id
                )
        except Exception as rem_err:
            print(f"[Auto-Remediation] Error: {rem_err}")

        return jsonify({
            'result': result.to_dict(),
            'feedback': feedback_data,
            'auto_remediation': [r.to_dict() for r in auto_remediation] if auto_remediation else [],
            'message': 'Quiz submitted successfully'
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@quiz_bp.route('/api/quizzes/<int:quiz_id>/results', methods=['GET'])
@jwt_required()
def get_quiz_results(quiz_id):
    try:
        user_id = int(get_jwt_identity())
        quiz = Quiz.query.filter_by(id=quiz_id, teacher_id=user_id).first()
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404

        results = Result.query.filter_by(quiz_id=quiz.id).all()
        return jsonify({
            'quiz': quiz.to_dict(),
            'results': [r.to_dict() for r in results]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ====================
# PRINT QUIZ
# ====================

@quiz_bp.route('/api/quizzes/<int:quiz_id>/print', methods=['GET'])
@jwt_required()
def get_printable_quiz(quiz_id):
    """Returns quiz data formatted for printing with exam-style header"""
    try:
        user_id = int(get_jwt_identity())
        quiz = Quiz.query.filter_by(id=quiz_id, teacher_id=user_id).first()
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404

        teacher = User.query.get(user_id)
        questions = QuizQuestion.query.filter_by(quiz_id=quiz.id).order_by(QuizQuestion.order_index).all()

        # Get school name
        school_name = ''
        if teacher and teacher.school_id:
            from models import School
            school = School.query.get(teacher.school_id)
            school_name = school.name if school else ''

        return jsonify({
            'print_data': {
                'school': {'name': school_name},
                'quiz': {
                    'id': quiz.id,
                    'title': quiz.title,
                    'subject': quiz.subject,
                    'class_name': quiz.class_name,
                    'teacher_name': teacher.name if teacher else '',
                    'date': datetime.utcnow().strftime('%B %d, %Y'),
                    'total_marks': quiz.total_marks,
                    'duration_minutes': quiz.duration_minutes,
                    'difficulty': quiz.difficulty,
                    'questions': [{
                        'id': q.id,
                        'number': i + 1,
                        'question_text': q.question_text,
                        'question_type': q.question_type,
                        'options': q.options,
                        'marks': q.marks,
                        'concept_tag': q.concept_tag
                    } for i, q in enumerate(questions)]
                }
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


def _check_answer(question, student_answer):
    if question.question_type == 'mcq':
        return student_answer.strip().lower() == question.correct_answer.strip().lower()
    else:
        return student_answer.strip().lower() == question.correct_answer.strip().lower()


def _auto_create_remediation(student, quiz, weaknesses, concept_responses, teacher_id):
    """
    Automatically create remediation quizzes for weak concepts after a quiz submission.
    Uses Gemini AI to generate targeted practice questions, with fallback to static content.
    Returns a list of RemediationQuiz records created.
    """
    created = []

    for concept in weaknesses:
        # Check if this concept already has an active intervention or pending remediation
        existing_intervention = Intervention.query.filter(
            Intervention.student_id == student.id,
            Intervention.concept_name == concept,
            Intervention.status.in_(['planned', 'in_progress'])
        ).first()

        existing_remediation = RemediationQuiz.query.filter(
            RemediationQuiz.student_id == student.id,
            RemediationQuiz.concept_name == concept,
            RemediationQuiz.is_completed == False
        ).first()

        if existing_intervention or existing_remediation:
            continue

        # Calculate mastery based on concept_responses
        responses = concept_responses.get(concept, [])
        correct_count = sum(1 for r in responses if r)
        total_count = len(responses)
        mastery = correct_count / total_count if total_count > 0 else 0

        # Only remediate if below threshold
        if mastery >= _REMEDIATION_THRESHOLD:
            continue

        mastery_pct = round(mastery * 100)

        # ── 1. Create Intervention ──
        intervention = Intervention(
            student_id=student.id,
            teacher_id=teacher_id,
            intervention_type='remediation',
            concept_name=concept,
            description=f'Auto-remediation: Student scored {mastery_pct}% on "{concept}" in quiz "{quiz.title}".',
            status='in_progress',
            priority='high' if mastery < 0.2 else 'medium',
            start_date=datetime.utcnow(),
            outcome_score_before=mastery,
        )
        db.session.add(intervention)
        db.session.flush()

        # ── 2. Create remediation Quiz via Gemini ──
        topic = quiz.topic if quiz.topic else concept
        questions = gemini_service.generate_quiz(
            class_name=quiz.class_name,
            subject=quiz.subject,
            topic=f"{topic} - {concept}",
            difficulty='easy' if mastery < 0.2 else 'medium',
            num_questions=5,
            total_marks=20
        )

        if not questions:
            questions = _fallback_remediation_questions(concept, quiz.subject)

        rem_quiz = Quiz(
            title=f'Remediation: {concept} ({quiz.subject})',
            subject=quiz.subject,
            subject_id=quiz.subject_id,
            topic=concept,
            class_name=student.class_name,
            class_id=student.class_id,
            difficulty='easy' if mastery < 0.2 else 'medium',
            total_marks=20,
            duration_minutes=15,
            is_ai_generated=True,
            is_remediation=True,
            teacher_id=teacher_id,
        )
        db.session.add(rem_quiz)
        db.session.flush()

        for i, q_data in enumerate(questions):
            q_mark = q_data.get('marks', 4)
            question = QuizQuestion(
                quiz_id=rem_quiz.id,
                question_text=q_data.get('question_text', f'Practice question on {concept}'),
                question_type=q_data.get('question_type', 'short'),
                options=q_data.get('options', []),
                correct_answer=q_data.get('correct_answer', ''),
                marks=q_mark,
                concept_tag=concept,
                order_index=i,
                difficulty_param=0.3,
            )
            db.session.add(question)

        db.session.flush()

        # ── 3. Create RemediationQuiz link ──
        rem_quiz_record = RemediationQuiz(
            quiz_id=rem_quiz.id,
            student_id=student.id,
            concept_name=concept,
            intervention_id=intervention.id,
        )
        db.session.add(rem_quiz_record)
        created.append(rem_quiz_record)

    if created:
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"[Auto-Remediation] Commit failed: {e}")

    return created


def _fallback_remediation_questions(concept, subject):
    """Generate static remediation questions when Gemini is unavailable"""
    return [
        {
            'question_text': f'What is the basic concept of {concept} in {subject}?',
            'question_type': 'short',
            'options': [],
            'correct_answer': f'Understanding of {concept} in {subject}',
            'marks': 4,
            'concept_tag': concept,
        },
        {
            'question_text': f'Solve a simple problem related to {concept}.',
            'question_type': 'short',
            'options': [],
            'correct_answer': f'Correct application of {concept}',
            'marks': 4,
            'concept_tag': concept,
        },
        {
            'question_text': f'Explain {concept} in your own words.',
            'question_type': 'descriptive',
            'options': [],
            'correct_answer': f'Clear explanation of {concept}',
            'marks': 4,
            'concept_tag': concept,
        },
        {
            'question_text': f'What are the key principles of {concept}?',
            'question_type': 'short',
            'options': [],
            'correct_answer': f'Key principles and concepts of {concept}',
            'marks': 4,
            'concept_tag': concept,
        },
        {
            'question_text': f'Give a real-world example of {concept}.',
            'question_type': 'descriptive',
            'options': [],
            'correct_answer': f'Practical application of {concept}',
            'marks': 4,
            'concept_tag': concept,
        },
    ]
