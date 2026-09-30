from datetime import datetime, date
from extensions import db

# ====================
# SCHOOL HIERARCHY
# ====================

class School(db.Model):
    __tablename__ = 'schools'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    address = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    academic_years = db.relationship('AcademicYear', backref='school', lazy=True, cascade='all, delete-orphan')
    classes = db.relationship('Class', backref='school', lazy=True, cascade='all, delete-orphan')
    subjects = db.relationship('Subject', backref='school', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class AcademicYear(db.Model):
    __tablename__ = 'academic_years'

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    name = db.Column(db.String(50), nullable=False)  # e.g. "2026-2027"
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    classes = db.relationship('Class', backref='academic_year', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'school_id': self.school_id,
            'name': self.name,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'is_active': self.is_active
        }


class Class(db.Model):
    __tablename__ = 'classes'

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    academic_year_id = db.Column(db.Integer, db.ForeignKey('academic_years.id'), nullable=False)
    name = db.Column(db.String(20), nullable=False)       # e.g. "6"
    section = db.Column(db.String(10), default='A')       # e.g. "A"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    students = db.relationship('Student', backref='class_ref', lazy=True, cascade='all, delete-orphan')
    assignments = db.relationship('TeacherAssignment', backref='class_ref', lazy=True, cascade='all, delete-orphan')

    @property
    def display_name(self):
        return f"Class {self.name}{self.section}"

    def to_dict(self):
        return {
            'id': self.id,
            'school_id': self.school_id,
            'academic_year_id': self.academic_year_id,
            'name': self.name,
            'section': self.section,
            'display_name': self.display_name,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Subject(db.Model):
    __tablename__ = 'subjects'

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)      # e.g. "Mathematics"
    code = db.Column(db.String(20), default='')           # e.g. "MATH"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    assignments = db.relationship('TeacherAssignment', backref='subject_ref', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'school_id': self.school_id,
            'name': self.name,
            'code': self.code
        }


# ====================
# USER ROLES
# ====================

class User(db.Model):
    """Unified user model for both Principal/Admin and Teachers"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='teacher', index=True)  # 'principal' or 'teacher'
    phone = db.Column(db.String(20), default='')
    subject_specialization = db.Column(db.String(100), default='')
    is_active = db.Column(db.Boolean, default=True)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Principal relationship
    managed_school = db.relationship('School', backref='principal', lazy=True, uselist=False)

    # Teacher relationships
    assignments = db.relationship('TeacherAssignment', backref='teacher', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        d = {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'phone': self.phone,
            'subject_specialization': self.subject_specialization,
            'is_active': self.is_active,
            'school_id': self.school_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if self.role == 'teacher' and self.assignments:
            d['assignments'] = [a.to_dict() for a in self.assignments]
        return d


# ====================
# TEACHER ASSIGNMENTS
# ====================

class TeacherAssignment(db.Model):
    __tablename__ = 'teacher_assignments'

    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id'), nullable=False, index=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False, index=True)
    academic_year_id = db.Column(db.Integer, db.ForeignKey('academic_years.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    interventions = db.relationship('Intervention', backref='assignment', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'teacher_id': self.teacher_id,
            'class_id': self.class_id,
            'subject_id': self.subject_id,
            'academic_year_id': self.academic_year_id,
            'class_name': self.class_ref.display_name if self.class_ref else '',
            'subject_name': self.subject_ref.name if self.subject_ref else '',
            'academic_year': self.class_ref.academic_year.name if self.class_ref and self.class_ref.academic_year else ''
        }


# ====================
# STUDENT MANAGEMENT
# ====================

class Student(db.Model):
    __tablename__ = 'students'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    roll_number = db.Column(db.String(20), nullable=False, index=True)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id'), nullable=False, index=True)
    class_name = db.Column(db.String(10), nullable=False)  # Denormalized: e.g. "6A"
    section = db.Column(db.String(10), default='A')
    parent_name = db.Column(db.String(100), default='')
    parent_phone = db.Column(db.String(20), default='')
    parent_email = db.Column(db.String(120), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    results = db.relationship('Result', backref='student', lazy=True, cascade='all, delete-orphan')
    concept_masteries = db.relationship('ConceptMastery', backref='student', lazy=True, cascade='all, delete-orphan')
    bkt_trackings = db.relationship('BKTTracking', backref='student', lazy=True, cascade='all, delete-orphan')
    irt_analyses = db.relationship('IRT_Analysis', backref='student', lazy=True, cascade='all, delete-orphan')
    interventions = db.relationship('Intervention', lazy=True, cascade='all, delete-orphan')
    notifications = db.relationship('Notification', backref='student', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'roll_number': self.roll_number,
            'class_id': self.class_id,
            'class_name': self.class_name,
            'section': self.section,
            'parent_name': self.parent_name,
            'parent_phone': self.parent_phone,
            'parent_email': self.parent_email,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# ====================
# STUDENT USER LOGIN
# ====================

class StudentUser(db.Model):
    """Student login credentials for the student portal"""
    __tablename__ = 'student_users'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False, unique=True, index=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    password = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    last_login = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'username': self.username,
            'is_active': self.is_active,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }


# ====================
# INTERVENTION TRACKING
# ====================

class Intervention(db.Model):
    """Track teacher interventions for at-risk students"""
    __tablename__ = 'interventions'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False, index=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    assignment_id = db.Column(db.Integer, db.ForeignKey('teacher_assignments.id'), nullable=True)
    intervention_type = db.Column(db.String(50), default='remediation')
    concept_name = db.Column(db.String(100), default='')
    description = db.Column(db.Text, default='')
    status = db.Column(db.String(20), default='planned')  # planned, in_progress, completed, cancelled
    priority = db.Column(db.String(20), default='medium')
    start_date = db.Column(db.DateTime, nullable=True)
    completion_date = db.Column(db.DateTime, nullable=True)
    outcome_notes = db.Column(db.Text, default='')
    outcome_score_before = db.Column(db.Float, nullable=True)
    outcome_score_after = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship backrefs
    intervention_student = db.relationship('Student', backref='interventions_list', lazy=True, foreign_keys=[student_id], viewonly=True)
    intervention_teacher = db.relationship('User', backref='teacher_interventions', lazy=True, foreign_keys=[teacher_id], overlaps='teacher_interventions')

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'student_name': self.intervention_student.name if self.intervention_student else '',
            'teacher_id': self.teacher_id,
            'teacher_name': self.intervention_teacher.name if self.intervention_teacher else '',
            'assignment_id': self.assignment_id,
            'intervention_type': self.intervention_type,
            'concept_name': self.concept_name,
            'description': self.description,
            'status': self.status,
            'priority': self.priority,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'completion_date': self.completion_date.isoformat() if self.completion_date else None,
            'outcome_notes': self.outcome_notes,
            'outcome_score_before': self.outcome_score_before,
            'outcome_score_after': self.outcome_score_after,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


# ====================
# PARENT NOTIFICATIONS
# ====================

class NotificationSetting(db.Model):
    """Per-student parent notification preferences"""
    __tablename__ = 'notification_settings'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False, unique=True, index=True)
    send_email = db.Column(db.Boolean, default=True)
    send_sms = db.Column(db.Boolean, default=False)
    send_whatsapp = db.Column(db.Boolean, default=False)
    weekly_summary = db.Column(db.Boolean, default=True)
    alert_on_low_score = db.Column(db.Boolean, default=True)
    alert_threshold = db.Column(db.Float, default=40.0)  # Alert if score below this %
    report_on_new_quiz = db.Column(db.Boolean, default=True)
    language = db.Column(db.String(10), default='en')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'send_email': self.send_email,
            'send_sms': self.send_sms,
            'send_whatsapp': self.send_whatsapp,
            'weekly_summary': self.weekly_summary,
            'alert_on_low_score': self.alert_on_low_score,
            'alert_threshold': self.alert_threshold,
            'report_on_new_quiz': self.report_on_new_quiz,
            'language': self.language,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class Notification(db.Model):
    """Notification history log"""
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False, index=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    notification_type = db.Column(db.String(30), default='report')  # report, alert, weekly_summary, intervention_update
    channel = db.Column(db.String(20), default='email')  # email, sms, whatsapp, in_app
    title = db.Column(db.String(200), default='')
    message = db.Column(db.Text, default='')
    status = db.Column(db.String(20), default='sent')  # sent, delivered, failed, read
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    read_at = db.Column(db.DateTime, nullable=True)

    notification_teacher = db.relationship('User', backref='sent_notifications', lazy=True, foreign_keys=[teacher_id])

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'student_name': self.student.name if self.student else '',
            'teacher_id': self.teacher_id,
            'teacher_name': self.notification_teacher.name if self.notification_teacher else '',
            'notification_type': self.notification_type,
            'channel': self.channel,
            'title': self.title,
            'message': self.message,
            'status': self.status,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'read_at': self.read_at.isoformat() if self.read_at else None,
        }


# ====================
# QUIZ SYSTEM
# ====================

class Quiz(db.Model):
    __tablename__ = 'quizzes'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    subject = db.Column(db.String(100), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=True, index=True)
    topic = db.Column(db.String(200), default='')
    class_name = db.Column(db.String(10), nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id'), nullable=True, index=True)
    difficulty = db.Column(db.String(20), default='medium')
    total_marks = db.Column(db.Float, default=0)
    duration_minutes = db.Column(db.Integer, default=30)
    is_ai_generated = db.Column(db.Boolean, default=False)
    is_remediation = db.Column(db.Boolean, default=False)  # Flag for auto-generated remediation quizzes
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=True, index=True)  # Direct assignment to a student
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    assigned_student = db.relationship('Student', backref='assigned_quizzes', lazy=True, foreign_keys=[student_id])

    questions = db.relationship('QuizQuestion', backref='quiz', lazy=True, cascade='all, delete-orphan')
    results = db.relationship('Result', backref='quiz', lazy=True, cascade='all, delete-orphan')
    answer_sheets = db.relationship('AnswerSheet', backref='quiz', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'subject': self.subject,
            'subject_id': self.subject_id,
            'topic': self.topic,
            'class_name': self.class_name,
            'class_id': self.class_id,
            'difficulty': self.difficulty,
            'total_marks': self.total_marks,
            'duration_minutes': self.duration_minutes,
            'is_ai_generated': self.is_ai_generated,
            'is_remediation': self.is_remediation,
            'teacher_id': self.teacher_id,
            'student_id': self.student_id,
            'questions_count': len(self.questions) if self.questions else 0,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class RemediationQuiz(db.Model):
    """Links a remediation quiz to a student and concept"""
    __tablename__ = 'remediation_quizzes'

    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quizzes.id'), nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False, index=True)
    concept_name = db.Column(db.String(100), nullable=False)
    intervention_id = db.Column(db.Integer, db.ForeignKey('interventions.id'), nullable=True)
    is_completed = db.Column(db.Boolean, default=False)
    score = db.Column(db.Float, nullable=True)
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

    remediation_quiz = db.relationship('Quiz', backref='remediation_links', lazy=True, foreign_keys=[quiz_id])
    remediation_student = db.relationship('Student', backref='remediation_assignments', lazy=True, foreign_keys=[student_id])

    def to_dict(self):
        return {
            'id': self.id,
            'quiz_id': self.quiz_id,
            'quiz_title': self.remediation_quiz.title if self.remediation_quiz else '',
            'student_id': self.student_id,
            'student_name': self.remediation_student.name if self.remediation_student else '',
            'concept_name': self.concept_name,
            'intervention_id': self.intervention_id,
            'is_completed': self.is_completed,
            'score': self.score,
            'assigned_at': self.assigned_at.isoformat() if self.assigned_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
        }


class QuizQuestion(db.Model):
    __tablename__ = 'quiz_questions'

    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quizzes.id'), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    question_type = db.Column(db.String(20), default='mcq')
    options = db.Column(db.JSON, default=[])
    correct_answer = db.Column(db.Text, nullable=False)
    marks = db.Column(db.Float, default=1)
    concept_tag = db.Column(db.String(100), default='')
    order_index = db.Column(db.Integer, default=0)
    difficulty_param = db.Column(db.Float, default=0.5)

    def to_dict(self):
        return {
            'id': self.id,
            'quiz_id': self.quiz_id,
            'question_text': self.question_text,
            'question_type': self.question_type,
            'options': self.options,
            'correct_answer': self.correct_answer,
            'marks': self.marks,
            'concept_tag': self.concept_tag,
            'order_index': self.order_index,
            'difficulty_param': self.difficulty_param
        }


class AnswerSheet(db.Model):
    __tablename__ = 'answer_sheets'

    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quizzes.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=True)
    file_path = db.Column(db.String(500), default='')
    file_type = db.Column(db.String(10), default='')  # pdf, jpg, png
    status = db.Column(db.String(20), default='pending')  # pending, processing, completed, failed
    scanned_data = db.Column(db.JSON, default={})
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'quiz_id': self.quiz_id,
            'student_id': self.student_id,
            'file_path': self.file_path,
            'file_type': self.file_type,
            'status': self.status,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
        }


# ====================
# RESULTS & ANALYTICS
# ====================

class Result(db.Model):
    __tablename__ = 'results'

    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quizzes.id'), nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False, index=True)
    score = db.Column(db.Float, default=0)
    total_marks = db.Column(db.Float, default=0)
    percentage = db.Column(db.Float, default=0)
    answers_data = db.Column(db.JSON, default=[])
    feedback = db.Column(db.Text, default='')
    strengths = db.Column(db.JSON, default=[])
    weaknesses = db.Column(db.JSON, default=[])
    confidence = db.Column(db.Float, default=0.0)
    scanned_data = db.Column(db.JSON, default={})
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'quiz_id': self.quiz_id,
            'student_id': self.student_id,
            'score': self.score,
            'total_marks': self.total_marks,
            'percentage': self.percentage,
            'answers_data': self.answers_data,
            'feedback': self.feedback,
            'strengths': self.strengths,
            'weaknesses': self.weaknesses,
            'confidence': self.confidence,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'student_name': self.student.name if self.student else '',
            'quiz_title': self.quiz.title if self.quiz else ''
        }


class ConceptMastery(db.Model):
    __tablename__ = 'concept_mastery'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False, index=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=True, index=True)
    concept_name = db.Column(db.String(100), nullable=False, index=True)
    mastery_level = db.Column(db.Float, default=0.0)
    attempts = db.Column(db.Integer, default=0)
    correct_attempts = db.Column(db.Integer, default=0)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'subject_id': self.subject_id,
            'concept_name': self.concept_name,
            'mastery_level': self.mastery_level,
            'attempts': self.attempts,
            'correct_attempts': self.correct_attempts,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None
        }


class BKTTracking(db.Model):
    __tablename__ = 'bkt_tracking'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False, index=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=True, index=True)
    concept_name = db.Column(db.String(100), nullable=False, index=True)
    p_know = db.Column(db.Float, default=0.5)
    p_learn = db.Column(db.Float, default=0.3)
    p_guess = db.Column(db.Float, default=0.2)
    p_slip = db.Column(db.Float, default=0.1)
    observations = db.Column(db.Integer, default=0)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'subject_id': self.subject_id,
            'concept_name': self.concept_name,
            'p_know': self.p_know,
            'p_learn': self.p_learn,
            'p_guess': self.p_guess,
            'p_slip': self.p_slip,
            'observations': self.observations
        }


class IRT_Analysis(db.Model):
    __tablename__ = 'irt_analysis'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    ability_theta = db.Column(db.Float, default=0.0)
    question_difficulty = db.Column(db.JSON, default={})
    discrimination = db.Column(db.Float, default=1.0)
    guessing_param = db.Column(db.Float, default=0.25)
    observations = db.Column(db.Integer, default=0)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)


class Report(db.Model):
    __tablename__ = 'reports'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    report_type = db.Column(db.String(20), default='student')
    content = db.Column(db.JSON, default={})
    language = db.Column(db.String(20), default='english')
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'teacher_id': self.teacher_id,
            'report_type': self.report_type,
            'content': self.content,
            'language': self.language,
            'generated_at': self.generated_at.isoformat() if self.generated_at else None
        }
