import csv
import io
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Student, Class, TeacherAssignment
from extensions import db

student_bp = Blueprint('students', __name__)


def _get_teacher_accessible_class_ids(teacher_id):
    """Get all class IDs that a teacher has assignments for"""
    assignments = TeacherAssignment.query.filter_by(teacher_id=teacher_id).all()
    return list(set(a.class_id for a in assignments))


@student_bp.route('/api/students', methods=['GET'])
@jwt_required()
def get_students():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        if user.role == 'teacher':
            class_ids = _get_teacher_accessible_class_ids(user_id)
            if not class_ids:
                return jsonify({'students': []}), 200

            assignment_id = request.args.get('assignment_id', type=int)
            if assignment_id:
                assignment = TeacherAssignment.query.filter_by(id=assignment_id, teacher_id=user_id).first()
                if assignment:
                    students = Student.query.filter_by(class_id=assignment.class_id).order_by(Student.roll_number).all()
                    return jsonify({'students': [s.to_dict() for s in students]}), 200

            students = Student.query.filter(Student.class_id.in_(class_ids)).order_by(Student.roll_number).all()
        else:
            # In theory principals can see all students in their school
            from models import Class as ClassModel
            school_classes = ClassModel.query.filter_by(school_id=user.school_id).all() if user.school_id else []
            class_ids = [c.id for c in school_classes]
            students = Student.query.filter(Student.class_id.in_(class_ids)).order_by(Student.roll_number).all() if class_ids else []

        return jsonify({'students': [s.to_dict() for s in students]}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@student_bp.route('/api/students/by-class/<int:class_id>', methods=['GET'])
@jwt_required()
def get_students_by_class(class_id):
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        if user.role == 'teacher':
            accessible_ids = _get_teacher_accessible_class_ids(user_id)
            if class_id not in accessible_ids:
                return jsonify({'error': 'Access denied'}), 403

        students = Student.query.filter_by(class_id=class_id).order_by(Student.roll_number).all()
        return jsonify({'students': [s.to_dict() for s in students]}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@student_bp.route('/api/students/<int:student_id>', methods=['GET'])
@jwt_required()
def get_student(student_id):
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        student = Student.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        # Check access
        if user.role == 'teacher':
            accessible_ids = _get_teacher_accessible_class_ids(user_id)
            if student.class_id not in accessible_ids:
                return jsonify({'error': 'Access denied'}), 403

        return jsonify({'student': student.to_dict()}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@student_bp.route('/api/students', methods=['POST'])
@jwt_required()
def create_student():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        class_id = data.get('class_id')
        if not class_id:
            return jsonify({'error': 'Class ID is required'}), 400

        # Check teacher access
        if user.role == 'teacher':
            accessible_ids = _get_teacher_accessible_class_ids(user_id)
            if class_id not in accessible_ids:
                return jsonify({'error': 'Access denied to this class'}), 403

        class_obj = Class.query.get(class_id)
        if not class_obj:
            return jsonify({'error': 'Class not found'}), 404

        # Check for duplicate roll number in class
        existing = Student.query.filter_by(class_id=class_id, roll_number=data.get('roll_number', '')).first()
        if existing:
            return jsonify({'error': 'A student with this roll number already exists in this class'}), 409

        student = Student(
            name=data.get('name', ''),
            roll_number=data.get('roll_number', ''),
            class_id=class_id,
            class_name=class_obj.display_name,
            section=data.get('section', class_obj.section),
            parent_name=data.get('parent_name', ''),
            parent_phone=data.get('parent_phone', ''),
            parent_email=data.get('parent_email', '')
        )
        db.session.add(student)
        db.session.commit()

        return jsonify({'student': student.to_dict(), 'message': 'Student added successfully'}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@student_bp.route('/api/students/<int:student_id>', methods=['PUT'])
@jwt_required()
def update_student(student_id):
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        student = Student.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        # Check access
        if user.role == 'teacher':
            accessible_ids = _get_teacher_accessible_class_ids(user_id)
            if student.class_id not in accessible_ids:
                return jsonify({'error': 'Access denied'}), 403

        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        student.name = data.get('name', student.name)
        student.roll_number = data.get('roll_number', student.roll_number)
        student.section = data.get('section', student.section)
        student.parent_name = data.get('parent_name', student.parent_name)
        student.parent_phone = data.get('parent_phone', student.parent_phone)
        student.parent_email = data.get('parent_email', student.parent_email)

        # Update class if changed
        if data.get('class_id') and data['class_id'] != student.class_id:
            new_class = Class.query.get(data['class_id'])
            if new_class:
                student.class_id = new_class.id
                student.class_name = new_class.display_name

        db.session.commit()

        return jsonify({'student': student.to_dict(), 'message': 'Student updated successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@student_bp.route('/api/students/<int:student_id>', methods=['DELETE'])
@jwt_required()
def delete_student(student_id):
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        student = Student.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        # Check access
        if user.role == 'teacher':
            accessible_ids = _get_teacher_accessible_class_ids(user_id)
            if student.class_id not in accessible_ids:
                return jsonify({'error': 'Access denied'}), 403

        db.session.delete(student)
        db.session.commit()

        return jsonify({'message': 'Student deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@student_bp.route('/api/students/import-csv', methods=['POST'])
@jwt_required()
def import_students_csv():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        class_id = request.form.get('class_id', type=int)
        if not class_id:
            return jsonify({'error': 'Class ID required'}), 400

        if user.role == 'teacher':
            accessible_ids = _get_teacher_accessible_class_ids(user_id)
            if class_id not in accessible_ids:
                return jsonify({'error': 'Access denied to this class'}), 403

        class_obj = Class.query.get(class_id)
        if not class_obj:
            return jsonify({'error': 'Class not found'}), 404

        content = file.read().decode('utf-8')
        reader = csv.DictReader(io.StringIO(content))

        students_created = 0
        errors = []

        for row_num, row in enumerate(reader, start=2):
            try:
                name = row.get('name', '').strip()
                roll_number = row.get('roll_number', '').strip()
                if not name or not roll_number:
                    errors.append(f"Row {row_num}: Missing name or roll_number")
                    continue

                existing = Student.query.filter_by(class_id=class_id, roll_number=roll_number).first()
                if existing:
                    errors.append(f"Row {row_num}: Roll number {roll_number} already exists")
                    continue

                student = Student(
                    name=name,
                    roll_number=roll_number,
                    class_id=class_id,
                    class_name=class_obj.display_name,
                    section=row.get('section', class_obj.section).strip(),
                    parent_name=row.get('parent_name', '').strip(),
                    parent_phone=row.get('parent_phone', '').strip(),
                    parent_email=row.get('parent_email', '').strip()
                )
                db.session.add(student)
                students_created += 1

            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")

        db.session.commit()

        return jsonify({
            'message': f'Successfully imported {students_created} students',
            'students_created': students_created,
            'errors': errors
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
