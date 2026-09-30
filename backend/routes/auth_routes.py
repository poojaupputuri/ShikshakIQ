from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash
from models import User, Student, Quiz
from extensions import db

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401

        if not check_password_hash(user.password, password):
            return jsonify({'error': 'Invalid email or password'}), 401

        if not user.is_active:
            return jsonify({'error': 'Account is deactivated. Contact your principal.'}), 403

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={
                'user_id': user.id,
                'email': user.email,
                'name': user.name,
                'role': user.role
            }
        )

        response_data = {
            'token': access_token,
            'user': user.to_dict()
        }

        # Role-specific response
        if user.role == 'principal':
            school = user.managed_school
            response_data['school'] = school.to_dict() if school else None
            response_data['stats'] = {
                'total_teachers': User.query.filter_by(role='teacher', school_id=user.school_id).count(),
                'total_students': Student.query.join(
                    __import__('models', fromlist=['Class']).Class
                ).filter(
                    __import__('models', fromlist=['Class']).Class.school_id == user.school_id
                ).count() if school else 0
            }
        else:
            # Teacher - include assignment workspaces
            assignments = user.assignments
            workspaces = []
            for a in assignments:
                class_obj = a.class_ref
                subject_obj = a.subject_ref
                if class_obj and subject_obj:
                    student_count = Student.query.filter_by(class_id=class_obj.id).count()
                    workspaces.append({
                        'assignment_id': a.id,
                        'class_id': class_obj.id,
                        'class_name': class_obj.display_name,
                        'subject_id': subject_obj.id,
                        'subject_name': subject_obj.name,
                        'academic_year': a.class_ref.academic_year.name if a.class_ref and a.class_ref.academic_year else '',
                        'students_count': student_count
                    })

            response_data['workspaces'] = workspaces

        return jsonify(response_data), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        response_data = {
            'user': user.to_dict()
        }

        if user.role == 'teacher':
            assignments = user.assignments
            workspaces = []
            for a in assignments:
                class_obj = a.class_ref
                subject_obj = a.subject_ref
                if class_obj and subject_obj:
                    student_count = Student.query.filter_by(class_id=class_obj.id).count()
                    workspaces.append({
                        'assignment_id': a.id,
                        'class_id': class_obj.id,
                        'class_name': class_obj.display_name,
                        'subject_id': subject_obj.id,
                        'subject_name': subject_obj.name,
                        'academic_year': a.class_ref.academic_year.name if a.class_ref and a.class_ref.academic_year else '',
                        'students_count': student_count
                    })
            response_data['workspaces'] = workspaces

        return jsonify(response_data), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/api/auth/change-password', methods=['PUT'])
@jwt_required()
def change_password():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        if not check_password_hash(user.password, data.get('current_password', '')):
            return jsonify({'error': 'Current password is incorrect'}), 401

        from werkzeug.security import generate_password_hash
        user.password = generate_password_hash(data.get('new_password', ''))
        db.session.commit()

        return jsonify({'message': 'Password changed successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/api/auth/student-token', methods=['GET'])
@jwt_required()
def get_student_token():
    """Get student login token (for in-app student portal access from teacher view)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role != 'teacher':
            return jsonify({'error': 'Unauthorized'}), 403

        student_id = request.args.get('student_id', type=int)
        if not student_id:
            return jsonify({'error': 'Student ID required'}), 400

        student = Student.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        # Check access
        from models import TeacherAssignment
        assignments = TeacherAssignment.query.filter_by(
            teacher_id=user_id,
            class_id=student.class_id
        ).first()
        if not assignments:
            return jsonify({'error': 'Access denied'}), 403

        return jsonify({
            'student_token': create_access_token(
                identity=f'student_{student.id}',
                additional_claims={
                    'student_id': student.id,
                    'name': student.name,
                    'role': 'student',
                    'class_name': student.class_name
                },
                expires_delta=False  # Match the session lifetime
            ),
            'student_name': student.name
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/api/auth/teacher-workspace/<int:assignment_id>', methods=['GET'])
@jwt_required()
def get_teacher_workspace(assignment_id):
    """Get workspace details for a specific teacher assignment"""
    from models import TeacherAssignment, Result
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'teacher':
        return jsonify({'error': 'Unauthorized'}), 403

    assignment = TeacherAssignment.query.filter_by(id=assignment_id, teacher_id=user_id).first()
    if not assignment:
        return jsonify({'error': 'Assignment not found'}), 404

    class_obj = assignment.class_ref
    subject_obj = assignment.subject_ref

    students = Student.query.filter_by(class_id=class_obj.id).order_by(Student.roll_number).all()
    quizzes = Quiz.query.filter_by(
        teacher_id=user_id,
        class_id=class_obj.id,
        subject_id=subject_obj.id
    ).order_by(Quiz.created_at.desc()).all()

    # Calculate average mastery for this subject
    student_ids = [s.id for s in students]
    from models import ConceptMastery
    all_masteries = ConceptMastery.query.filter(
        ConceptMastery.student_id.in_(student_ids),
        ConceptMastery.subject_id == subject_obj.id
    ).all() if student_ids else []
    avg_mastery = sum(m.mastery_level for m in all_masteries) / len(all_masteries) if all_masteries else 0

    return jsonify({
        'workspace': {
            'assignment_id': assignment.id,
            'class_name': class_obj.display_name,
            'subject_name': subject_obj.name,
            'students_count': len(students),
            'quizzes_count': len(quizzes),
            'average_mastery': round(avg_mastery, 2),
            'students': [s.to_dict() for s in students],
            'quizzes': [q.to_dict() for q in quizzes]
        }
    }), 200
