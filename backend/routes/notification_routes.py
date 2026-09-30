from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Student, NotificationSetting, Notification
from extensions import db

notification_bp = Blueprint('notifications', __name__)


@notification_bp.route('/api/notifications/settings/<int:student_id>', methods=['GET'])
@jwt_required()
def get_notification_settings(student_id):
    """Get notification preferences for a student's parents"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role not in ('teacher', 'principal'):
            return jsonify({'error': 'Unauthorized'}), 403

        student = Student.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        if user.role == 'teacher':
            from routes.student_routes import _get_teacher_accessible_class_ids
            accessible_ids = _get_teacher_accessible_class_ids(user_id)
            if student.class_id not in accessible_ids:
                return jsonify({'error': 'Access denied'}), 403

        settings = NotificationSetting.query.filter_by(student_id=student_id).first()
        if not settings:
            # Return defaults
            settings = NotificationSetting(
                student_id=student_id,
                send_email=bool(student.parent_email),
                send_sms=False,
                send_whatsapp=False,
                weekly_summary=True,
                alert_on_low_score=True,
                alert_threshold=40.0,
                report_on_new_quiz=True,
            )

        return jsonify({'settings': settings.to_dict()}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@notification_bp.route('/api/notifications/settings/<int:student_id>', methods=['PUT'])
@jwt_required()
def update_notification_settings(student_id):
    """Update parent notification preferences"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role not in ('teacher', 'principal'):
            return jsonify({'error': 'Unauthorized'}), 403

        student = Student.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        if user.role == 'teacher':
            from routes.student_routes import _get_teacher_accessible_class_ids
            accessible_ids = _get_teacher_accessible_class_ids(user_id)
            if student.class_id not in accessible_ids:
                return jsonify({'error': 'Access denied'}), 403

        data = request.get_json()
        settings = NotificationSetting.query.filter_by(student_id=student_id).first()
        if not settings:
            settings = NotificationSetting(student_id=student_id)
            db.session.add(settings)

        if 'send_email' in data:
            settings.send_email = data['send_email']
        if 'send_sms' in data:
            settings.send_sms = data['send_sms']
        if 'send_whatsapp' in data:
            settings.send_whatsapp = data['send_whatsapp']
        if 'weekly_summary' in data:
            settings.weekly_summary = data['weekly_summary']
        if 'alert_on_low_score' in data:
            settings.alert_on_low_score = data['alert_on_low_score']
        if 'alert_threshold' in data:
            settings.alert_threshold = data['alert_threshold']
        if 'report_on_new_quiz' in data:
            settings.report_on_new_quiz = data['report_on_new_quiz']
        if 'language' in data:
            settings.language = data['language']

        db.session.commit()
        return jsonify({'settings': settings.to_dict(), 'message': 'Settings updated'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@notification_bp.route('/api/notifications/send', methods=['POST'])
@jwt_required()
def send_notification():
    """Send a notification to a parent (simulated - logs to DB)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role not in ('teacher', 'principal'):
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json()
        student_id = data.get('student_id')
        notification_type = data.get('notification_type', 'report')
        channel = data.get('channel', 'in_app')
        title = data.get('title', '')
        message = data.get('message', '')

        if not student_id:
            return jsonify({'error': 'Student ID is required'}), 400

        student = Student.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        # Check access
        if user.role == 'teacher':
            from routes.student_routes import _get_teacher_accessible_class_ids
            accessible_ids = _get_teacher_accessible_class_ids(user_id)
            if student.class_id not in accessible_ids:
                return jsonify({'error': 'Access denied'}), 403

        notification = Notification(
            student_id=student_id,
            teacher_id=user_id,
            notification_type=notification_type,
            channel=channel,
            title=title,
            message=message,
            status='sent',
        )
        db.session.add(notification)
        db.session.commit()

        # Simulate delivery for different channels
        delivery_info = {}
        if channel == 'email' and student.parent_email:
            delivery_info['email'] = f'Simulated email to {student.parent_email}'
        if channel == 'sms' and student.parent_phone:
            delivery_info['sms'] = f'Simulated SMS to {student.parent_phone}'
        if channel == 'whatsapp':
            delivery_info['whatsapp'] = f'Simulated WhatsApp to {student.parent_phone}'

        return jsonify({
            'notification': notification.to_dict(),
            'delivery': delivery_info,
            'message': 'Notification sent successfully'
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@notification_bp.route('/api/notifications/history', methods=['GET'])
@jwt_required()
def get_notification_history():
    """Get notification history for teacher's students"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        if user.role == 'teacher':
            from routes.student_routes import _get_teacher_accessible_class_ids
            class_ids = _get_teacher_accessible_class_ids(user_id)
            students = Student.query.filter(Student.class_id.in_(class_ids)).all() if class_ids else []
            student_ids = [s.id for s in students]
            if not student_ids:
                return jsonify({'notifications': [], 'stats': {'total': 0, 'email': 0, 'sms': 0, 'whatsapp': 0}}), 200

            notifications = Notification.query.filter(
                Notification.student_id.in_(student_ids),
                Notification.teacher_id == user_id
            ).order_by(Notification.sent_at.desc()).limit(50).all()
        else:
            notifications = Notification.query.order_by(Notification.sent_at.desc()).limit(50).all()

        return jsonify({
            'notifications': [n.to_dict() for n in notifications],
            'stats': {
                'total': len(notifications),
                'email': sum(1 for n in notifications if n.channel == 'email'),
                'sms': sum(1 for n in notifications if n.channel == 'sms'),
                'whatsapp': sum(1 for n in notifications if n.channel == 'whatsapp'),
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@notification_bp.route('/api/notifications/students-with-parents', methods=['GET'])
@jwt_required()
def get_students_with_parents():
    """Get students who have parent contact info for quick notification"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role != 'teacher':
            return jsonify({'error': 'Unauthorized'}), 403

        from routes.student_routes import _get_teacher_accessible_class_ids
        class_ids = _get_teacher_accessible_class_ids(user_id)

        # Filter by assignment if provided
        assignment_id = request.args.get('assignment_id', type=int)
        if assignment_id:
            assignment = __import__('models', fromlist=['TeacherAssignment']).TeacherAssignment.query.filter_by(
                id=assignment_id, teacher_id=user_id
            ).first()
            if assignment:
                class_ids = [assignment.class_id]

        students = Student.query.filter(
            Student.class_id.in_(class_ids),
            (Student.parent_email != '') | (Student.parent_phone != '')
        ).order_by(Student.class_name, Student.name).all() if class_ids else []

        return jsonify({
            'students': [{
                'id': s.id,
                'name': s.name,
                'class_name': s.class_name,
                'parent_name': s.parent_name or s.name,
                'parent_phone': s.parent_phone,
                'parent_email': s.parent_email,
                'has_email': bool(s.parent_email),
                'has_phone': bool(s.parent_phone),
            } for s in students]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
