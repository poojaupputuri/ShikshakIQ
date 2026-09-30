from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash
from models import StudentUser, Student, Result, ConceptMastery, Quiz, QuizQuestion, RemediationQuiz, Intervention, User, TeacherAssignment, Class, Subject
from extensions import db
from services.gemini_service import GeminiService

gemini_service = GeminiService()

student_portal_bp = Blueprint('student_portal', __name__)


@student_portal_bp.route('/api/student/login', methods=['POST'])
def student_login():
    """Student login to access their own progress"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip().lower()
        password = data.get('password', '')

        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400

        student_user = StudentUser.query.filter_by(username=username).first()
        if not student_user or not check_password_hash(student_user.password, password):
            return jsonify({'error': 'Invalid username or password'}), 401

        if not student_user.is_active:
            return jsonify({'error': 'Account is deactivated'}), 403

        student = Student.query.get(student_user.student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        student_user.last_login = datetime.utcnow()
        db.session.commit()

        # Get class and subject info
        class_obj = Class.query.get(student.class_id)
        assignments = TeacherAssignment.query.filter_by(class_id=student.class_id).all()

        subjects = []
        for a in assignments:
            subj = Subject.query.get(a.subject_id)
            if subj:
                subjects.append({
                    'assignment_id': a.id,
                    'subject_id': subj.id,
                    'subject_name': subj.name,
                    'teacher_name': User.query.get(a.teacher_id).name if User.query.get(a.teacher_id) else '',
                })

        # Calculate progress stats
        results = Result.query.filter_by(student_id=student.id).all()
        total_quizzes = len(results)
        avg_score = sum(r.percentage for r in results) / total_quizzes if total_quizzes > 0 else 0
        masteries = ConceptMastery.query.filter_by(student_id=student.id).all()
        avg_mastery = sum(m.mastery_level for m in masteries) / len(masteries) if masteries else 0

        access_token = create_access_token(
            identity=f'student_{student.id}',
            additional_claims={
                'student_id': student.id,
                'name': student.name,
                'role': 'student',
                'class_name': student.class_name
            }
        )

        return jsonify({
            'token': access_token,
            'student': {
                'id': student.id,
                'name': student.name,
                'roll_number': student.roll_number,
                'class_name': student.class_name,
                'section': student.section,
                'parent_name': student.parent_name,
                'total_quizzes': total_quizzes,
                'average_score': round(avg_score, 2),
                'average_mastery': round(avg_mastery, 2),
                'subjects': subjects,
                'last_login': student_user.last_login.isoformat() if student_user.last_login else None,
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@student_portal_bp.route('/api/student/me', methods=['GET'])
@jwt_required()
def get_student_profile():
    """Get student's own profile and progress summary"""
    try:
        identity = get_jwt_identity()
        student_id = int(identity.replace('student_', ''))
        student = Student.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        results = Result.query.filter_by(student_id=student.id).order_by(Result.submitted_at.desc()).all()
        masteries = ConceptMastery.query.filter_by(student_id=student.id).all()

        # Recent results
        recent_results = []
        for r in results[:5]:
            recent_results.append({
                'id': r.id,
                'quiz_title': r.quiz.title if r.quiz else '',
                'subject': r.quiz.subject if r.quiz else '',
                'score': r.score,
                'total_marks': r.total_marks,
                'percentage': r.percentage,
                'submitted_at': r.submitted_at.isoformat() if r.submitted_at else '',
                'strengths': r.strengths,
                'weaknesses': r.weaknesses,
            })

        # Concept performance
        concept_performance = [{
            'concept': m.concept_name,
            'mastery_level': m.mastery_level,
            'attempts': m.attempts,
            'correct_attempts': m.correct_attempts,
            'last_updated': m.last_updated.isoformat() if m.last_updated else '',
        } for m in masteries]

        # Overall stats
        total_quizzes = len(results)
        avg_score = sum(r.percentage for r in results) / total_quizzes if total_quizzes > 0 else 0
        avg_mastery = sum(m.mastery_level for m in masteries) / len(masteries) if masteries else 0
        weak_concepts = [m.concept_name for m in masteries if m.mastery_level < 0.4]

        return jsonify({
            'student': student.to_dict(),
            'stats': {
                'total_quizzes': total_quizzes,
                'average_score': round(avg_score, 2),
                'average_mastery': round(avg_mastery, 2),
                'weak_concepts_count': len(weak_concepts),
                'strong_concepts_count': sum(1 for m in masteries if m.mastery_level >= 0.7),
            },
            'recent_results': recent_results,
            'concept_performance': sorted(concept_performance, key=lambda x: x['mastery_level']),
            'weak_concepts': weak_concepts[:10],
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@student_portal_bp.route('/api/student/progress', methods=['GET'])
@jwt_required()
def get_student_progress():
    """Detailed progress timeline and growth data"""
    try:
        identity = get_jwt_identity()
        student_id = int(identity.replace('student_', ''))
        student = Student.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        results = Result.query.filter_by(student_id=student.id).order_by(Result.submitted_at).all()
        masteries = ConceptMastery.query.filter_by(student_id=student.id).all()

        # Score timeline
        timeline = [{
            'date': r.submitted_at.strftime('%Y-%m-%d') if r.submitted_at else '',
            'score': r.score,
            'total_marks': r.total_marks,
            'percentage': r.percentage,
            'quiz_title': r.quiz.title if r.quiz else '',
            'subject': r.quiz.subject if r.quiz else '',
        } for r in results]

        # Mastery growth per concept
        concept_growth = {}
        for m in masteries:
            if m.concept_name not in concept_growth:
                concept_growth[m.concept_name] = []
            concept_growth[m.concept_name].append({
                'mastery': m.mastery_level,
                'date': m.last_updated.strftime('%Y-%m-%d') if m.last_updated else '',
            })

        # Subject-wise breakdown
        subject_performance = {}
        for r in results:
            subject = r.quiz.subject if r.quiz else 'General'
            if subject not in subject_performance:
                subject_performance[subject] = {'total': 0, 'count': 0, 'highest': 0, 'lowest': 100}
            subject_performance[subject]['total'] += r.percentage
            subject_performance[subject]['count'] += 1
            subject_performance[subject]['highest'] = max(subject_performance[subject]['highest'], r.percentage)
            subject_performance[subject]['lowest'] = min(subject_performance[subject]['lowest'], r.percentage)

        subject_breakdown = [{
            'subject': subj,
            'average': round(data['total'] / data['count'], 2),
            'quizzes': data['count'],
            'highest': data['highest'],
            'lowest': data['lowest'],
        } for subj, data in subject_performance.items()]

        # Improvement metrics
        improvement_rate = 0
        if len(timeline) >= 2:
            first_score = timeline[0]['percentage']
            last_score = timeline[-1]['percentage']
            improvement_rate = round((last_score - first_score) / len(timeline), 2)

        return jsonify({
            'timeline': timeline,
            'concept_growth': concept_growth,
            'subject_breakdown': subject_breakdown,
            'improvement_rate': improvement_rate,
            'total_quizzes': len(timeline),
            'current_average': round(sum(r.percentage for r in results) / len(results), 2) if results else 0,
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@student_portal_bp.route('/api/student/remediation-quizzes', methods=['GET'])
@jwt_required()
def get_student_remediation():
    """Get remediation quizzes assigned to the student"""
    try:
        identity = get_jwt_identity()
        student_id = int(identity.replace('student_', ''))
        student = Student.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        # 1) Get RemediationQuiz records (auto-generated from weak concepts)
        remediation_quizzes = RemediationQuiz.query.filter_by(student_id=student.id).order_by(RemediationQuiz.assigned_at.desc()).all()

        # 2) Get quizzes directly assigned by teachers (quiz.student_id = student.id)
        directly_assigned = Quiz.query.filter_by(student_id=student.id).order_by(Quiz.created_at.desc()).all()

        # 3) Merge both sources – build response from RemediationQuiz records first,
        #    then include any directly-assigned quizzes that don't have a RemediationQuiz entry yet.
        existing_quiz_ids = {rq.quiz_id for rq in remediation_quizzes}

        # Track completed quiz IDs and scores for marking direct assignments as completed
        completed_results = Result.query.filter_by(student_id=student.id).all()
        completed_quiz_ids = {r.quiz_id for r in completed_results}
        result_scores = {r.quiz_id: r.percentage for r in completed_results}

        result_data = []

        # Add RemediationQuiz records
        for rq in remediation_quizzes:
            rq_data = rq.to_dict()
            quiz = Quiz.query.get(rq.quiz_id)
            if quiz:
                questions = QuizQuestion.query.filter_by(quiz_id=quiz.id).order_by(QuizQuestion.order_index).all()
                rq_data['questions'] = [q.to_dict() for q in questions]
                rq_data['quiz'] = quiz.to_dict()
            else:
                rq_data['questions'] = []
                rq_data['quiz'] = None
            result_data.append(rq_data)

        # Add directly-assigned quizzes that don't have a RemediationQuiz record
        for quiz in directly_assigned:
            if quiz.id not in existing_quiz_ids:
                questions = QuizQuestion.query.filter_by(quiz_id=quiz.id).order_by(QuizQuestion.order_index).all()
                rq_data = {
                    'id': -(quiz.id),  # negative synthetic ID to avoid collisions
                    'quiz_id': quiz.id,
                    'quiz_title': quiz.title,
                    'student_id': student.id,
                    'concept_name': quiz.topic or quiz.subject,
                    'intervention_id': None,
                    'is_completed': quiz.id in completed_quiz_ids,
                    'score': result_scores.get(quiz.id),
                    'assigned_at': quiz.created_at.isoformat() if quiz.created_at else None,
                    'completed_at': None,
                    'questions': [q.to_dict() for q in questions],
                    'quiz': quiz.to_dict(),
                }
                result_data.append(rq_data)

        return jsonify({
            'remediation_quizzes': result_data,
            'pending_count': sum(1 for q in result_data if not q.get('is_completed')),
            'completed_count': sum(1 for q in result_data if q.get('is_completed')),
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@student_portal_bp.route('/api/student/remediation-quizzes/<int:rem_id>/complete', methods=['POST'])
@jwt_required()
def complete_remediation_quiz(rem_id):
    """Mark a remediation quiz as completed with score"""
    try:
        identity = get_jwt_identity()
        student_id = int(identity.replace('student_', ''))

        remediation_quiz = RemediationQuiz.query.filter_by(id=rem_id, student_id=student_id).first()
        if not remediation_quiz:
            return jsonify({'error': 'Remediation quiz not found'}), 404

        data = request.get_json() or {}
        score = data.get('score', 0)

        remediation_quiz.is_completed = True
        remediation_quiz.score = score
        remediation_quiz.completed_at = datetime.utcnow()

        # Update the associated intervention
        if remediation_quiz.intervention_id:
            intervention = Intervention.query.get(remediation_quiz.intervention_id)
            if intervention:
                intervention.status = 'completed'
                intervention.outcome_score_after = score
                intervention.completion_date = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'message': 'Remediation quiz completed',
            'remediation_quiz': remediation_quiz.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@student_portal_bp.route('/api/student/quizzes/<int:quiz_id>/submit', methods=['POST'])
@jwt_required()
def student_submit_quiz(quiz_id):
    """Student submits answers to a practice/remediation quiz"""
    try:
        identity = get_jwt_identity()
        if not identity or not isinstance(identity, str) or not identity.startswith('student_'):
            return jsonify({'error': 'Invalid token'}), 401
        student_id = int(identity.replace('student_', ''))
        student = Student.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        quiz = Quiz.query.get(quiz_id)
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404

        data = request.get_json() or {}
        answers = data.get('answers', [])

        questions = QuizQuestion.query.filter_by(quiz_id=quiz.id).order_by(QuizQuestion.order_index).all()
        if not questions:
            return jsonify({'error': 'No questions in this quiz'}), 400

        # Evaluate answers
        total_score = 0
        answers_data = []
        strengths = set()
        weaknesses = set()
        concept_responses = {}

        for answer in answers:
            question_id = answer.get('question_id')
            student_answer = answer.get('answer', '')

            question = next((q for q in questions if q.id == question_id), None)
            if not question:
                continue

            is_correct = _check_student_answer(question, student_answer)
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

            if is_correct:
                strengths.add(concept)
            else:
                weaknesses.add(concept)

        percentage = (total_score / quiz.total_marks * 100) if quiz.total_marks > 0 else 0

        # Create result record
        result = Result(
            quiz_id=quiz.id,
            student_id=student.id,
            score=total_score,
            total_marks=quiz.total_marks,
            percentage=round(percentage, 2),
            answers_data=answers_data,
            feedback=f'Completed practice quiz: {quiz.title}. Score: {total_score}/{quiz.total_marks}',
            strengths=list(strengths),
            weaknesses=list(weaknesses),
            confidence=0.9
        )
        db.session.add(result)

        # Mark associated RemediationQuiz as completed
        rem_quiz = RemediationQuiz.query.filter_by(quiz_id=quiz.id, student_id=student.id).first()
        if rem_quiz:
            rem_quiz.is_completed = True
            rem_quiz.score = round(percentage, 2)
            rem_quiz.completed_at = datetime.utcnow()

            if rem_quiz.intervention_id:
                intervention = Intervention.query.get(rem_quiz.intervention_id)
                if intervention:
                    intervention.status = 'completed'
                    intervention.outcome_score_after = percentage
                    intervention.completion_date = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'result': result.to_dict(),
            'total_score': total_score,
            'total_marks': quiz.total_marks,
            'percentage': round(percentage, 2),
            'strengths': list(strengths),
            'weaknesses': list(weaknesses),
            'message': 'Quiz submitted successfully'
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@student_portal_bp.route('/api/student/remediation/generate', methods=['POST'])
@jwt_required()
def student_generate_remediation():
    """Student generates practice quizzes on-demand for their weak concepts"""
    try:
        identity = get_jwt_identity()
        if not identity or not isinstance(identity, str) or not identity.startswith('student_'):
            return jsonify({'error': 'Invalid token'}), 401
        student_id = int(identity.replace('student_', ''))
        student = Student.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        # Get weak concepts (mastery < 40%)
        masteries = ConceptMastery.query.filter_by(student_id=student.id).all()
        weak_concepts = [m for m in masteries if m.mastery_level < 0.4]

        if not weak_concepts:
            return jsonify({
                'message': 'No weak concepts found. Great job!',
                'remediation_quizzes': [],
                'generated': 0
            }), 200

        # Find a teacher for this student's class (needed for quiz.teacher_id)
        assignment = TeacherAssignment.query.filter_by(class_id=student.class_id).first()
        teacher_id = assignment.teacher_id if assignment else 1

        created = []
        skipped = []

        for cm in weak_concepts[:3]:  # Limit to 3 weakest concepts
            # Skip if already has an active (pending) remediation quiz for this concept
            existing = RemediationQuiz.query.filter(
                RemediationQuiz.student_id == student.id,
                RemediationQuiz.concept_name == cm.concept_name,
                RemediationQuiz.is_completed == False
            ).first()
            if existing:
                skipped.append(cm.concept_name)
                continue

            # Generate quiz questions via Gemini or fallback
            questions = gemini_service.generate_quiz(
                class_name=student.class_name,
                subject=assignment.subject_ref.name if assignment and assignment.subject_ref else 'General',
                topic=cm.concept_name,
                difficulty='easy' if cm.mastery_level < 0.2 else 'medium',
                num_questions=5,
                total_marks=20
            )

            if not questions:
                questions = _fallback_student_remediation_questions(cm.concept_name)

            # Create the quiz
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
                teacher_id=teacher_id,
            )
            db.session.add(rem_quiz)
            db.session.flush()

            # Add questions
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

            # Create RemediationQuiz link (no Intervention for student self-generation)
            rem_record = RemediationQuiz(
                quiz_id=rem_quiz.id,
                student_id=student.id,
                concept_name=cm.concept_name,
                is_completed=False,
            )
            db.session.add(rem_record)
            created.append(rem_record)

        db.session.commit()

        return jsonify({
            'message': f'Generated {len(created)} practice quiz(zes)' + (f'. Skipped {len(skipped)} with existing quizzes.' if skipped else ''),
            'generated': len(created),
            'skipped': len(skipped),
            'weak_concepts_count': len(weak_concepts),
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


def _check_student_answer(question, student_answer):
    """Check if student answer matches correct answer (case-insensitive)"""
    if not student_answer or not question.correct_answer:
        return False
    if question.question_type == 'mcq':
        return student_answer.strip().lower() == question.correct_answer.strip().lower()
    else:
        return student_answer.strip().lower() == question.correct_answer.strip().lower()


def _fallback_student_remediation_questions(concept):
    """Generate static remediation questions when AI is unavailable"""
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
