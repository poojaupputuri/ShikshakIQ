from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Student, Intervention, TeacherAssignment, RemediationQuiz, ConceptMastery, Quiz, QuizQuestion
from extensions import db

intervention_bp = Blueprint('interventions', __name__)


def _get_accessible_class_ids(user_id):
    user = User.query.get(user_id)
    if not user or user.role != 'teacher':
        return []
    assignments = TeacherAssignment.query.filter_by(teacher_id=user_id).all()
    return list(set(a.class_id for a in assignments))


@intervention_bp.route('/api/interventions', methods=['GET'])
@jwt_required()
def get_interventions():
    """Get all interventions for the teacher's students"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role != 'teacher':
            return jsonify({'error': 'Unauthorized'}), 403

        class_ids = _get_accessible_class_ids(user_id)
        students = Student.query.filter(Student.class_id.in_(class_ids)).all() if class_ids else []
        student_ids = [s.id for s in students]

        # Filter by assignment if provided
        assignment_id = request.args.get('assignment_id', type=int)
        query = Intervention.query.filter_by(teacher_id=user_id)
        if assignment_id:
            query = query.filter_by(assignment_id=assignment_id)
        if student_ids:
            query = query.filter(Intervention.student_id.in_(student_ids))

        interventions = query.order_by(Intervention.updated_at.desc()).all()

        # Also get stats
        total = len(interventions)
        planned = sum(1 for i in interventions if i.status == 'planned')
        in_progress = sum(1 for i in interventions if i.status == 'in_progress')
        completed = sum(1 for i in interventions if i.status == 'completed')

        return jsonify({
            'interventions': [i.to_dict() for i in interventions],
            'stats': {
                'total': total,
                'planned': planned,
                'in_progress': in_progress,
                'completed': completed,
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@intervention_bp.route('/api/interventions/suggestions', methods=['GET'])
@jwt_required()
def get_intervention_suggestions():
    """Get AI-suggested interventions based on student weak concepts"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role != 'teacher':
            return jsonify({'error': 'Unauthorized'}), 403

        class_ids = _get_accessible_class_ids(user_id)
        students = Student.query.filter(Student.class_id.in_(class_ids)).all() if class_ids else []
        student_ids = [s.id for s in students]

        if not student_ids:
            return jsonify({'suggestions': []}), 200

        # Find students with weak concepts that don't have active interventions
        existing_interventions = Intervention.query.filter(
            Intervention.student_id.in_(student_ids),
            Intervention.status.in_(['planned', 'in_progress'])
        ).all()
        existing_keys = {(i.student_id, i.concept_name) for i in existing_interventions}

        weak_masteries = ConceptMastery.query.filter(
            ConceptMastery.student_id.in_(student_ids),
            ConceptMastery.mastery_level < 0.4
        ).all()

        suggestions = []
        suggested_keys = set()
        for m in weak_masteries:
            key = (m.student_id, m.concept_name)
            if key not in existing_keys and key not in suggested_keys:
                student = Student.query.get(m.student_id)
                if student:
                    mastery_pct = round(m.mastery_level * 100)
                    severity = 'critical' if m.mastery_level < 0.2 else 'high' if m.mastery_level < 0.3 else 'medium'
                    suggestions.append({
                        'student_id': m.student_id,
                        'student_name': student.name,
                        'class_name': student.class_name,
                        'concept_name': m.concept_name,
                        'mastery_level': m.mastery_level,
                        'mastery_pct': mastery_pct,
                        'severity': severity,
                        'suggested_type': 'remediation' if m.mastery_level >= 0.2 else 'tutoring',
                        'suggested_description': f'Schedule targeted remediation for {m.concept_name} — current mastery: {mastery_pct}%',
                    })
                    suggested_keys.add(key)

        return jsonify({'suggestions': suggestions[:20]}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@intervention_bp.route('/api/interventions', methods=['POST'])
@jwt_required()
def create_intervention():
    """Create a new intervention for a student"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role != 'teacher':
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json()
        student_id = data.get('student_id')
        if not student_id:
            return jsonify({'error': 'Student ID is required'}), 400

        student = Student.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        # Find assignment for this student
        assignments = TeacherAssignment.query.filter_by(
            teacher_id=user_id,
            class_id=student.class_id
        ).first()

        intervention = Intervention(
            student_id=student_id,
            teacher_id=user_id,
            assignment_id=data.get('assignment_id', assignments.id if assignments else None),
            intervention_type=data.get('intervention_type', 'remediation'),
            concept_name=data.get('concept_name', ''),
            description=data.get('description', ''),
            status=data.get('status', 'planned'),
            priority=data.get('priority', 'medium'),
            start_date=datetime.fromisoformat(data['start_date']) if data.get('start_date') else datetime.utcnow(),
            outcome_notes=data.get('outcome_notes', ''),
        )
        db.session.add(intervention)
        db.session.commit()

        # If this is a remediation intervention, auto-create a remediation quiz
        if intervention.intervention_type in ('remediation', 'extra_practice') and intervention.concept_name:
            _create_remediation_quiz(intervention)

        return jsonify({'intervention': intervention.to_dict(), 'message': 'Intervention created successfully'}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@intervention_bp.route('/api/interventions/<int:intervention_id>', methods=['PUT'])
@jwt_required()
def update_intervention(intervention_id):
    """Update intervention status, notes, outcome"""
    try:
        user_id = int(get_jwt_identity())
        intervention = Intervention.query.filter_by(id=intervention_id, teacher_id=user_id).first()
        if not intervention:
            return jsonify({'error': 'Intervention not found'}), 404

        data = request.get_json()

        if 'status' in data:
            intervention.status = data['status']
            if data['status'] == 'completed':
                intervention.completion_date = datetime.utcnow()
        if 'description' in data:
            intervention.description = data['description']
        if 'outcome_notes' in data:
            intervention.outcome_notes = data['outcome_notes']
        if 'outcome_score_before' in data:
            intervention.outcome_score_before = data['outcome_score_before']
        if 'outcome_score_after' in data:
            intervention.outcome_score_after = data['outcome_score_after']
        if 'priority' in data:
            intervention.priority = data['priority']
        if 'intervention_type' in data:
            intervention.intervention_type = data['intervention_type']

        db.session.commit()
        return jsonify({'intervention': intervention.to_dict(), 'message': 'Intervention updated'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@intervention_bp.route('/api/interventions/<int:intervention_id>', methods=['DELETE'])
@jwt_required()
def delete_intervention(intervention_id):
    """Delete an intervention"""
    try:
        user_id = int(get_jwt_identity())
        intervention = Intervention.query.filter_by(id=intervention_id, teacher_id=user_id).first()
        if not intervention:
            return jsonify({'error': 'Intervention not found'}), 404

        db.session.delete(intervention)
        db.session.commit()
        return jsonify({'message': 'Intervention deleted'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


def _create_remediation_quiz(intervention):
    """Auto-create a remediation quiz targeting the weak concept"""
    try:
        student = Student.query.get(intervention.student_id)
        teacher = User.query.get(intervention.teacher_id)
        if not student or not teacher:
            return None

        # Find the subject for this concept
        concept = ConceptMastery.query.filter_by(student_id=student.id, concept_name=intervention.concept_name).first()
        if not concept:
            return None

        # Create a focused remediation quiz
        quiz = Quiz(
            title=f'Remediation: {intervention.concept_name}',
            subject='General',
            subject_id=concept.subject_id,
            topic=intervention.concept_name,
            class_name=student.class_name,
            class_id=student.class_id,
            difficulty='easy',
            total_marks=10,
            duration_minutes=15,
            is_ai_generated=True,
            is_remediation=True,
            teacher_id=teacher.id,
        )
        db.session.add(quiz)
        db.session.flush()

        # Add targeted practice questions
        practice_questions = [
            {'text': f'What is the basic definition of {intervention.concept_name}?', 'type': 'short', 'answer': f'Understanding of {intervention.concept_name} concepts'},
            {'text': f'Solve a basic problem related to {intervention.concept_name}.', 'type': 'short', 'answer': 'Correct application of concepts'},
            {'text': f'Explain {intervention.concept_name} in your own words.', 'type': 'descriptive', 'answer': f'Clear explanation of {intervention.concept_name}'},
        ]

        for i, q in enumerate(practice_questions):
            question = QuizQuestion(
                quiz_id=quiz.id,
                question_text=q['text'],
                question_type=q['type'],
                options=[],
                correct_answer=q['answer'],
                marks=4 if q['type'] == 'descriptive' else 3,
                concept_tag=intervention.concept_name,
                order_index=i,
                difficulty_param=0.3,
            )
            db.session.add(question)

        db.session.flush()

        # Link to remediation
        rem_quiz = RemediationQuiz(
            quiz_id=quiz.id,
            student_id=student.id,
            concept_name=intervention.concept_name,
            intervention_id=intervention.id,
        )
        db.session.add(rem_quiz)

        return rem_quiz

    except Exception as e:
        print(f'Error creating remediation quiz: {e}')
        return None
