from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash
from models import User, School, AcademicYear, Class, Subject, TeacherAssignment, Student
from extensions import db

admin_bp = Blueprint('admin', __name__)


def _require_principal():
    """Decorator-like helper to verify the current user is a principal"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'principal':
        return None, jsonify({'error': 'Unauthorized. Principal access required.'}), 403
    return user, None, None


# ====================
# SCHOOL MANAGEMENT
# ====================

@admin_bp.route('/api/admin/school', methods=['GET'])
@jwt_required()
def get_school():
    user, error, status = _require_principal()
    if error:
        return error, status
    school = School.query.filter_by(id=user.school_id).first()
    if not school:
        return jsonify({'error': 'School not found'}), 404
    return jsonify({'school': school.to_dict()}), 200


@admin_bp.route('/api/admin/school', methods=['PUT'])
@jwt_required()
def update_school():
    user, error, status = _require_principal()
    if error:
        return error, status
    school = School.query.filter_by(id=user.school_id).first()
    if not school:
        return jsonify({'error': 'School not found'}), 404
    data = request.get_json()
    if data.get('name'): school.name = data['name']
    if data.get('address'): school.address = data['address']
    db.session.commit()
    return jsonify({'school': school.to_dict(), 'message': 'School updated successfully'}), 200


# ====================
# ACADEMIC YEAR MANAGEMENT
# ====================

@admin_bp.route('/api/admin/academic-years', methods=['GET'])
@jwt_required()
def get_academic_years():
    user, error, status = _require_principal()
    if error:
        return error, status
    years = AcademicYear.query.filter_by(school_id=user.school_id).order_by(AcademicYear.name.desc()).all()
    return jsonify({'academic_years': [y.to_dict() for y in years]}), 200


@admin_bp.route('/api/admin/academic-years', methods=['POST'])
@jwt_required()
def create_academic_year():
    user, error, status = _require_principal()
    if error:
        return error, status
    data = request.get_json()
    year = AcademicYear(
        school_id=user.school_id,
        name=data.get('name', ''),
        start_date=data.get('start_date'),
        end_date=data.get('end_date'),
        is_active=data.get('is_active', True)
    )
    db.session.add(year)
    db.session.commit()
    return jsonify({'academic_year': year.to_dict(), 'message': 'Academic year created'}), 201


@admin_bp.route('/api/admin/academic-years/<int:year_id>', methods=['PUT'])
@jwt_required()
def update_academic_year(year_id):
    user, error, status = _require_principal()
    if error:
        return error, status
    year = AcademicYear.query.filter_by(id=year_id, school_id=user.school_id).first()
    if not year:
        return jsonify({'error': 'Academic year not found'}), 404
    data = request.get_json()
    if data.get('name'): year.name = data['name']
    if data.get('is_active') is not None: year.is_active = data['is_active']
    db.session.commit()
    return jsonify({'academic_year': year.to_dict(), 'message': 'Updated'}), 200


@admin_bp.route('/api/admin/academic-years/<int:year_id>/activate', methods=['POST'])
@jwt_required()
def activate_academic_year(year_id):
    user, error, status = _require_principal()
    if error:
        return error, status
    # Deactivate all, activate one
    AcademicYear.query.filter_by(school_id=user.school_id).update({'is_active': False})
    year = AcademicYear.query.filter_by(id=year_id, school_id=user.school_id).first()
    if not year:
        return jsonify({'error': 'Academic year not found'}), 404
    year.is_active = True
    db.session.commit()
    return jsonify({'academic_year': year.to_dict(), 'message': 'Academic year activated'}), 200


# ====================
# CLASS MANAGEMENT
# ====================

@admin_bp.route('/api/admin/classes', methods=['GET'])
@jwt_required()
def get_classes():
    user, error, status = _require_principal()
    if error:
        return error, status
    classes = Class.query.filter_by(school_id=user.school_id).order_by(Class.name).all()
    return jsonify({'classes': [c.to_dict() for c in classes]}), 200


@admin_bp.route('/api/admin/classes', methods=['POST'])
@jwt_required()
def create_class():
    user, error, status = _require_principal()
    if error:
        return error, status
    data = request.get_json()
    # Find active academic year if not specified
    year_id = data.get('academic_year_id')
    if not year_id:
        active_year = AcademicYear.query.filter_by(school_id=user.school_id, is_active=True).first()
        if not active_year:
            return jsonify({'error': 'No active academic year. Create one first.'}), 400
        year_id = active_year.id
    cls = Class(
        school_id=user.school_id,
        academic_year_id=year_id,
        name=data.get('name', ''),
        section=data.get('section', 'A')
    )
    db.session.add(cls)
    db.session.commit()
    return jsonify({'class': cls.to_dict(), 'message': 'Class created'}), 201


@admin_bp.route('/api/admin/classes/<int:class_id>', methods=['PUT'])
@jwt_required()
def update_class(class_id):
    user, error, status = _require_principal()
    if error:
        return error, status
    cls = Class.query.filter_by(id=class_id, school_id=user.school_id).first()
    if not cls:
        return jsonify({'error': 'Class not found'}), 404
    data = request.get_json()
    if data.get('name'): cls.name = data['name']
    if data.get('section'): cls.section = data['section']
    db.session.commit()
    return jsonify({'class': cls.to_dict(), 'message': 'Updated'}), 200


@admin_bp.route('/api/admin/classes/<int:class_id>', methods=['DELETE'])
@jwt_required()
def delete_class(class_id):
    user, error, status = _require_principal()
    if error:
        return error, status
    cls = Class.query.filter_by(id=class_id, school_id=user.school_id).first()
    if not cls:
        return jsonify({'error': 'Class not found'}), 404
    db.session.delete(cls)
    db.session.commit()
    return jsonify({'message': 'Class deleted'}), 200


# ====================
# SUBJECT MANAGEMENT
# ====================

@admin_bp.route('/api/admin/subjects', methods=['GET'])
@jwt_required()
def get_subjects():
    user, error, status = _require_principal()
    if error:
        return error, status
    subjects = Subject.query.filter_by(school_id=user.school_id).order_by(Subject.name).all()
    return jsonify({'subjects': [s.to_dict() for s in subjects]}), 200


@admin_bp.route('/api/admin/subjects', methods=['POST'])
@jwt_required()
def create_subject():
    user, error, status = _require_principal()
    if error:
        return error, status
    data = request.get_json()
    subject = Subject(
        school_id=user.school_id,
        name=data.get('name', ''),
        code=data.get('code', '')
    )
    db.session.add(subject)
    db.session.commit()
    return jsonify({'subject': subject.to_dict(), 'message': 'Subject created'}), 201


@admin_bp.route('/api/admin/subjects/<int:subject_id>', methods=['PUT'])
@jwt_required()
def update_subject(subject_id):
    user, error, status = _require_principal()
    if error:
        return error, status
    subject = Subject.query.filter_by(id=subject_id, school_id=user.school_id).first()
    if not subject:
        return jsonify({'error': 'Subject not found'}), 404
    data = request.get_json()
    if data.get('name'): subject.name = data['name']
    if data.get('code'): subject.code = data['code']
    db.session.commit()
    return jsonify({'subject': subject.to_dict(), 'message': 'Updated'}), 200


@admin_bp.route('/api/admin/subjects/<int:subject_id>', methods=['DELETE'])
@jwt_required()
def delete_subject(subject_id):
    user, error, status = _require_principal()
    if error:
        return error, status
    subject = Subject.query.filter_by(id=subject_id, school_id=user.school_id).first()
    if not subject:
        return jsonify({'error': 'Subject not found'}), 404
    db.session.delete(subject)
    db.session.commit()
    return jsonify({'message': 'Subject deleted'}), 200


# ====================
# TEACHER MANAGEMENT
# ====================

@admin_bp.route('/api/admin/teachers', methods=['GET'])
@jwt_required()
def get_teachers():
    user, error, status = _require_principal()
    if error:
        return error, status
    teachers = User.query.filter_by(role='teacher', school_id=user.school_id).order_by(User.name).all()
    return jsonify({
        'teachers': [{
            **t.to_dict(),
            'assignments_count': len(t.assignments),
            'assignments': [a.to_dict() for a in t.assignments]
        } for t in teachers]
    }), 200


@admin_bp.route('/api/admin/teachers', methods=['POST'])
@jwt_required()
def create_teacher():
    user, error, status = _require_principal()
    if error:
        return error, status
    data = request.get_json()

    existing = User.query.filter_by(email=data.get('email', '').strip().lower()).first()
    if existing:
        return jsonify({'error': 'A user with this email already exists'}), 409

    teacher = User(
        name=data.get('name', ''),
        email=data.get('email', '').strip().lower(),
        password=generate_password_hash(data.get('password', 'password123')),
        role='teacher',
        phone=data.get('phone', ''),
        subject_specialization=data.get('subject_specialization', ''),
        is_active=True,
        school_id=user.school_id
    )
    db.session.add(teacher)
    db.session.commit()
    return jsonify({'teacher': teacher.to_dict(), 'message': 'Teacher created successfully'}), 201


@admin_bp.route('/api/admin/teachers/<int:teacher_id>', methods=['PUT'])
@jwt_required()
def update_teacher(teacher_id):
    user, error, status = _require_principal()
    if error:
        return error, status
    teacher = User.query.filter_by(id=teacher_id, role='teacher', school_id=user.school_id).first()
    if not teacher:
        return jsonify({'error': 'Teacher not found'}), 404
    data = request.get_json()
    if data.get('name'): teacher.name = data['name']
    if data.get('phone'): teacher.phone = data['phone']
    if data.get('subject_specialization'): teacher.subject_specialization = data['subject_specialization']
    if data.get('is_active') is not None: teacher.is_active = data['is_active']
    if data.get('password'): teacher.password = generate_password_hash(data['password'])
    db.session.commit()
    return jsonify({'teacher': teacher.to_dict(), 'message': 'Teacher updated'}), 200


@admin_bp.route('/api/admin/teachers/<int:teacher_id>', methods=['DELETE'])
@jwt_required()
def delete_teacher(teacher_id):
    user, error, status = _require_principal()
    if error:
        return error, status
    teacher = User.query.filter_by(id=teacher_id, role='teacher', school_id=user.school_id).first()
    if not teacher:
        return jsonify({'error': 'Teacher not found'}), 404
    db.session.delete(teacher)
    db.session.commit()
    return jsonify({'message': 'Teacher deleted'}), 200


# ====================
# TEACHER ASSIGNMENTS
# ====================

@admin_bp.route('/api/admin/assignments', methods=['GET'])
@jwt_required()
def get_assignments():
    user, error, status = _require_principal()
    if error:
        return error, status
    # Get all assignments for the school's teachers
    teacher_ids = [t.id for t in User.query.filter_by(role='teacher', school_id=user.school_id).all()]
    assignments = TeacherAssignment.query.filter(TeacherAssignment.teacher_id.in_(teacher_ids)).all() if teacher_ids else []
    return jsonify({'assignments': [a.to_dict() for a in assignments]}), 200


@admin_bp.route('/api/admin/assignments', methods=['POST'])
@jwt_required()
def create_assignment():
    user, error, status = _require_principal()
    if error:
        return error, status
    data = request.get_json()

    # Verify teacher belongs to this school
    teacher = User.query.filter_by(id=data.get('teacher_id'), role='teacher', school_id=user.school_id).first()
    if not teacher:
        return jsonify({'error': 'Teacher not found in your school'}), 404

    # Find active academic year if not specified
    year_id = data.get('academic_year_id')
    if not year_id:
        active_year = AcademicYear.query.filter_by(school_id=user.school_id, is_active=True).first()
        if not active_year:
            return jsonify({'error': 'No active academic year'}), 400
        year_id = active_year.id

    # Check for duplicate assignment
    existing = TeacherAssignment.query.filter_by(
        teacher_id=teacher.id,
        class_id=data.get('class_id'),
        subject_id=data.get('subject_id'),
        academic_year_id=year_id
    ).first()
    if existing:
        return jsonify({'error': 'This teacher is already assigned to this class and subject'}), 409

    assignment = TeacherAssignment(
        teacher_id=teacher.id,
        class_id=data.get('class_id'),
        subject_id=data.get('subject_id'),
        academic_year_id=year_id
    )
    db.session.add(assignment)
    db.session.commit()
    return jsonify({'assignment': assignment.to_dict(), 'message': 'Assignment created'}), 201


@admin_bp.route('/api/admin/assignments/<int:assignment_id>', methods=['DELETE'])
@jwt_required()
def delete_assignment(assignment_id):
    user, error, status = _require_principal()
    if error:
        return error, status
    assignment = TeacherAssignment.query.get(assignment_id)
    if not assignment:
        return jsonify({'error': 'Assignment not found'}), 404
    # Verify the assignment's teacher belongs to this school
    teacher = User.query.filter_by(id=assignment.teacher_id, school_id=user.school_id).first()
    if not teacher:
        return jsonify({'error': 'Assignment not found in your school'}), 404
    db.session.delete(assignment)
    db.session.commit()
    return jsonify({'message': 'Assignment removed'}), 200


# ====================
# DASHBOARD STATS
# ====================

@admin_bp.route('/api/admin/dashboard', methods=['GET'])
@jwt_required()
def admin_dashboard():
    user, error, status = _require_principal()
    if error:
        return error, status
    school_id = user.school_id

    total_teachers = User.query.filter_by(role='teacher', school_id=school_id).count()
    total_classes = Class.query.filter_by(school_id=school_id).count()
    total_subjects = Subject.query.filter_by(school_id=school_id).count()
    total_students = Student.query.join(Class).filter(Class.school_id == school_id).count()
    total_assignments = TeacherAssignment.query.join(User).filter(User.school_id == school_id).count()

    active_year = AcademicYear.query.filter_by(school_id=school_id, is_active=True).first()
    inactive_teachers = User.query.filter_by(role='teacher', school_id=school_id, is_active=False).count()

    return jsonify({
        'total_teachers': total_teachers,
        'total_classes': total_classes,
        'total_subjects': total_subjects,
        'total_students': total_students,
        'total_assignments': total_assignments,
        'active_academic_year': active_year.to_dict() if active_year else None,
        'inactive_teachers': inactive_teachers,
        'school_name': user.managed_school.name if user.managed_school else ''
    }), 200


# ====================
# GET STRUCTURED DATA FOR FORMS
# ====================

@admin_bp.route('/api/admin/structure', methods=['GET'])
@jwt_required()
def get_school_structure():
    """Returns all classes, subjects, teachers, and academic years for dropdowns"""
    user, error, status = _require_principal()
    if error:
        return error, status
    school_id = user.school_id

    classes = Class.query.filter_by(school_id=school_id).order_by(Class.name).all()
    subjects = Subject.query.filter_by(school_id=school_id).order_by(Subject.name).all()
    teachers = User.query.filter_by(role='teacher', school_id=school_id, is_active=True).order_by(User.name).all()
    years = AcademicYear.query.filter_by(school_id=school_id).order_by(AcademicYear.name.desc()).all()

    return jsonify({
        'classes': [c.to_dict() for c in classes],
        'subjects': [s.to_dict() for s in subjects],
        'teachers': [t.to_dict() for t in teachers],
        'academic_years': [y.to_dict() for y in years]
    }), 200
