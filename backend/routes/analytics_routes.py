from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Student, Quiz, QuizQuestion, Result, ConceptMastery, BKTTracking, IRT_Analysis, TeacherAssignment
from extensions import db
from services.education_models import BKTService, IRTService
from services.gemini_service import GeminiService
from services.cache import ResponseCache
from datetime import datetime, timedelta
import threading

analytics_bp = Blueprint('analytics', __name__)
bkt_service = BKTService()
irt_service = IRTService()
gemini_service = GeminiService()

# In-memory cache for fast responses
_dashboard_cache = ResponseCache(default_ttl=30)   # 30s: dashboard (called frequently via polling)
_analytics_cache = ResponseCache(default_ttl=30)  # 30s: class analytics (called on page load)
_report_cache = ResponseCache(default_ttl=60)     # 60s: reports & heavy analytics endpoints


def _get_accessible_class_ids(user_id):
    user = User.query.get(user_id)
    if not user:
        return []
    if user.role == 'teacher':
        assignments = TeacherAssignment.query.filter_by(teacher_id=user_id).all()
        return list(set(a.class_id for a in assignments))
    return []


# ====================
# DASHBOARD (cached for 20 seconds)
# ====================

@analytics_bp.route('/api/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        class_ids = _get_accessible_class_ids(user_id)

        # Support filtering by a specific workspace (assignment_id)
        assignment_id = request.args.get('assignment_id', type=int)
        filter_class_id = None
        filter_subject_id = None

        if assignment_id and user.role == 'teacher':
            assignment = TeacherAssignment.query.filter_by(
                id=assignment_id, teacher_id=user_id
            ).first()
            if assignment:
                filter_class_id = assignment.class_id
                filter_subject_id = assignment.subject_id
                # Narrow class_ids to just this class
                class_ids = [filter_class_id] if filter_class_id in class_ids else []

        cache_key = f'dashboard:{user_id}:{assignment_id or "all"}'
        cached = _dashboard_cache.get(cache_key)
        if cached:
            return jsonify(cached), 200

        if user.role == 'teacher' and not class_ids:
            result = {
                'total_students': 0, 'total_quizzes': 0, 'average_percentage': 0,
                'average_mastery': 0, 'weak_concepts': [], 'risk_students': [],
                'recent_quizzes': [], 'mastery_timeline': []
            }
            _dashboard_cache.set(cache_key, result)
            return jsonify(result), 200

        # Basic stats
        if user.role == 'teacher':
            total_students = Student.query.filter(Student.class_id.in_(class_ids)).count() if class_ids else 0
            quiz_query = Quiz.query.filter_by(teacher_id=user_id)
            if filter_class_id:
                quiz_query = quiz_query.filter_by(class_id=filter_class_id)
            if filter_subject_id:
                quiz_query = quiz_query.filter_by(subject_id=filter_subject_id)
            total_quizzes = quiz_query.count()
        else:
            total_students = Student.query.count()
            total_quizzes = Quiz.query.count()

        # Results stats — scope to filtered quizzes
        if user.role == 'teacher':
            quiz_query = Quiz.query.filter_by(teacher_id=user_id)
            if filter_class_id:
                quiz_query = quiz_query.filter_by(class_id=filter_class_id)
            if filter_subject_id:
                quiz_query = quiz_query.filter_by(subject_id=filter_subject_id)
            scoped_quiz_ids = [q.id for q in quiz_query.all()]
            results = Result.query.filter(Result.quiz_id.in_(scoped_quiz_ids)).all() if scoped_quiz_ids else []
        else:
            results = Result.query.all()
        avg_percentage = sum(r.percentage for r in results) / len(results) if results else 0

        # Mastery stats — scope to filtered students & subject
        student_ids = [s.id for s in Student.query.filter(Student.class_id.in_(class_ids)).all()] if class_ids else []
        mastery_query = ConceptMastery.query.filter(ConceptMastery.student_id.in_(student_ids)) if student_ids else []
        if filter_subject_id:
            mastery_query = mastery_query.filter(ConceptMastery.subject_id == filter_subject_id)
        all_masteries = mastery_query.all() if student_ids else []
        avg_mastery = sum(m.mastery_level for m in all_masteries) / len(all_masteries) if all_masteries else 0

        # Weak concepts across class
        weak_concepts = {}
        for m in all_masteries:
            if m.mastery_level < 0.4:
                if m.concept_name not in weak_concepts:
                    weak_concepts[m.concept_name] = 0
                weak_concepts[m.concept_name] += 1

        # Risk students
        risk_students = []
        for sid in student_ids:
            student_masteries = [m for m in all_masteries if m.student_id == sid]
            avg_s = sum(m.mastery_level for m in student_masteries) / len(student_masteries) if student_masteries else 0
            if avg_s < 0.3:
                student = Student.query.get(sid)
                if student:
                    risk_students.append({'id': sid, 'name': student.name, 'avg_mastery': round(avg_s, 2)})

        # Recent quizzes
        if user.role == 'teacher':
            quiz_query = Quiz.query.filter_by(teacher_id=user_id)
            if filter_class_id:
                quiz_query = quiz_query.filter_by(class_id=filter_class_id)
            if filter_subject_id:
                quiz_query = quiz_query.filter_by(subject_id=filter_subject_id)
            recent_quizzes = quiz_query.order_by(Quiz.created_at.desc()).limit(5).all()
        else:
            recent_quizzes = Quiz.query.order_by(Quiz.created_at.desc()).limit(5).all()

        # Mastery timeline
        mastery_timeline = []
        for m in all_masteries:
            if m.last_updated and m.last_updated >= datetime.utcnow() - timedelta(days=7):
                mastery_timeline.append({
                    'concept': m.concept_name,
                    'mastery': m.mastery_level,
                    'date': m.last_updated.isoformat()
                })

        result = {
            'total_students': total_students,
            'total_quizzes': total_quizzes,
            'average_percentage': round(avg_percentage, 2),
            'average_mastery': round(avg_mastery, 2),
            'weak_concepts': [{'concept': k, 'affected_students': v} for k, v in sorted(weak_concepts.items(), key=lambda x: -x[1])[:10]],
            'risk_students': sorted(risk_students, key=lambda x: -x['avg_mastery'])[:10],
            'recent_quizzes': [q.to_dict() for q in recent_quizzes],
            'mastery_timeline': mastery_timeline
        }
        _dashboard_cache.set(cache_key, result)
        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ====================
# STUDENT ANALYTICS
# ====================

@analytics_bp.route('/api/analytics/student/<int:student_id>', methods=['GET'])
@jwt_required()
def get_student_analytics(student_id):
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        student = Student.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        # Check access for teachers
        if user and user.role == 'teacher':
            accessible_ids = _get_accessible_class_ids(user_id)
            if student.class_id not in accessible_ids:
                return jsonify({'error': 'Access denied'}), 403

        results = Result.query.filter_by(student_id=student_id).order_by(Result.submitted_at).all()
        masteries = ConceptMastery.query.filter_by(student_id=student_id).all()
        bkt_data = BKTTracking.query.filter_by(student_id=student_id).all()
        irt = IRT_Analysis.query.filter_by(student_id=student_id).first()

        performance_timeline = [{
            'quiz_title': r.quiz.title if r.quiz else '',
            'score': r.score,
            'total_marks': r.total_marks,
            'percentage': r.percentage,
            'date': r.submitted_at.isoformat() if r.submitted_at else ''
        } for r in results]

        concept_names = [m.concept_name for m in masteries]
        predictions = bkt_service.predict_performance(student_id, concept_names) if concept_names else {}

        avg_mastery = sum(m.mastery_level for m in masteries) / len(masteries) if masteries else 0
        is_at_risk = avg_mastery < 0.3

        # Generate AI report (non-blocking — fail fast if slow)
        ai_report = None
        try:
            student_data = {
                'name': student.name,
                'average_score': round(sum(r.percentage for r in results) / len(results), 2) if results else 0,
                'quizzes_taken': len(results),
                'masteries': [m.to_dict() for m in masteries],
                'irt_ability': irt.ability_theta if irt else 0
            }
            report_result = [None]
            report_done = threading.Event()

            def _gen():
                try:
                    report_result[0] = gemini_service.generate_report(student_data, 'student')
                except Exception:
                    pass
                finally:
                    report_done.set()

            t = threading.Thread(target=_gen, daemon=True)
            t.start()
            if report_done.wait(timeout=15):
                ai_report = report_result[0]
        except Exception:
            pass

        return jsonify({
            'student': student.to_dict(),
            'performance_timeline': performance_timeline,
            'masteries': [m.to_dict() for m in masteries],
            'weak_concepts': bkt_service.get_weak_concepts(student_id, 0.4),
            'bkt_tracking': [{'concept': b.concept_name, 'p_know': b.p_know, 'observations': b.observations} for b in bkt_data],
            'irt_ability': irt.ability_theta if irt else 0,
            'predictions': predictions,
            'is_at_risk': is_at_risk,
            'risk_score': round(1 - avg_mastery, 2),
            'ai_report': ai_report,
            'overall_mastery': round(avg_mastery, 2)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ====================
# CLASS ANALYTICS
# ====================

@analytics_bp.route('/api/analytics/class', methods=['GET'])
@jwt_required()
def get_class_analytics():
    try:
        user_id = int(get_jwt_identity())

        # Support filtering by assignment_id (teacher's selected workspace)
        assignment_id = request.args.get('assignment_id', type=int)

        cache_key = f'class:{user_id}:{assignment_id or "all"}'
        cached = _analytics_cache.get(cache_key)
        if cached:
            return jsonify(cached), 200

        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        class_ids = _get_accessible_class_ids(user_id)

        if assignment_id:
            from models import TeacherAssignment as TAssignment
            assignment = TAssignment.query.filter_by(id=assignment_id, teacher_id=user_id).first()
            if assignment:
                class_ids = [assignment.class_id] if assignment.class_id in class_ids else []
                # Also filter quizzes/results by subject
                filter_subject_id = assignment.subject_id
            else:
                class_ids = []
                filter_subject_id = None
        else:
            filter_subject_id = None

        if not class_ids:
            return jsonify({
                'total_students': 0, 'student_performance': [],
                'concept_summary': [], 'class_average': 0,
                'class_mastery': 0, 'teacher_report': None
            }), 200

        students = Student.query.filter(Student.class_id.in_(class_ids)).all()
        student_ids = [s.id for s in students]

        # Scope quizzes to the filtered subject if assignment_id is specified
        if filter_subject_id:
            quiz_ids = [q.id for q in Quiz.query.filter_by(subject_id=filter_subject_id).all()]
            all_results = Result.query.filter(
                Result.student_id.in_(student_ids),
                Result.quiz_id.in_(quiz_ids)
            ).all() if student_ids and quiz_ids else []
        else:
            all_results = Result.query.filter(Result.student_id.in_(student_ids)).all() if student_ids else []

        all_masteries = ConceptMastery.query.filter(ConceptMastery.student_id.in_(student_ids)).all() if student_ids else []
        if filter_subject_id:
            all_masteries = [m for m in all_masteries if m.subject_id == filter_subject_id]

        student_performance = []
        for s in students:
            s_results = [r for r in all_results if r.student_id == s.id]
            s_masteries = [m for m in all_masteries if m.student_id == s.id]
            avg_pct = sum(r.percentage for r in s_results) / len(s_results) if s_results else 0
            avg_mast = sum(m.mastery_level for m in s_masteries) / len(s_masteries) if s_masteries else 0
            student_performance.append({
                'id': s.id,
                'name': s.name,
                'roll_number': s.roll_number,
                'class_name': s.class_name,
                'average_percentage': round(avg_pct, 2),
                'average_mastery': round(avg_mast, 2),
                'quizzes_taken': len(s_results)
            })

        concept_aggregate = {}
        for m in all_masteries:
            if m.concept_name not in concept_aggregate:
                concept_aggregate[m.concept_name] = {'total_mastery': 0, 'count': 0}
            concept_aggregate[m.concept_name]['total_mastery'] += m.mastery_level
            concept_aggregate[m.concept_name]['count'] += 1

        concept_summary = [{
            'concept': k,
            'avg_mastery': round(v['total_mastery'] / v['count'], 2),
            'students_count': v['count']
        } for k, v in concept_aggregate.items()]

        # Generate teacher report (non-blocking — fail fast if slow)
        teacher_report = None
        try:
            class_data = {
                'total_students': len(students),
                'average_percentage': round(sum(r.percentage for r in all_results) / len(all_results), 2) if all_results else 0,
                'average_mastery': round(sum(m.mastery_level for m in all_masteries) / len(all_masteries), 2) if all_masteries else 0
            }
            # Use a short timeout so the UI never hangs for a report
            report_result = [None]
            report_done = threading.Event()

            def _gen():
                try:
                    report_result[0] = gemini_service.generate_report(class_data, 'teacher')
                except Exception:
                    pass
                finally:
                    report_done.set()

            t = threading.Thread(target=_gen, daemon=True)
            t.start()
            if report_done.wait(timeout=5):
                teacher_report = report_result[0]
        except Exception:
            pass

        result = {
            'total_students': len(students),
            'student_performance': sorted(student_performance, key=lambda x: -x['average_percentage']),
            'concept_summary': sorted(concept_summary, key=lambda x: x['avg_mastery']),
            'class_average': round(sum(r.percentage for r in all_results) / len(all_results), 2) if all_results else 0,
            'class_mastery': round(sum(m.mastery_level for m in all_masteries) / len(all_masteries), 2) if all_masteries else 0,
            'teacher_report': teacher_report
        }
        # Cache for quick repeat views
        _analytics_cache.set(cache_key, result)
        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ====================
# REPORTS
# ====================

@analytics_bp.route('/api/reports/generate', methods=['POST'])
@jwt_required()
def generate_report():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()
        student_id = data.get('student_id')
        report_type = data.get('report_type', 'student')
        language = data.get('language', 'english')

        student = Student.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        if user.role == 'teacher':
            accessible_ids = _get_accessible_class_ids(user_id)
            if student.class_id not in accessible_ids:
                return jsonify({'error': 'Access denied'}), 403

        results = Result.query.filter_by(student_id=student_id).all()
        masteries = ConceptMastery.query.filter_by(student_id=student_id).all()

        student_data = {
            'name': student.name,
            'class_name': student.class_name,
            'roll_number': student.roll_number,
            'parent_name': student.parent_name,
            'average_score': round(sum(r.percentage for r in results) / len(results), 2) if results else 0,
            'quizzes_taken': len(results),
            'masteries': [{'concept': m.concept_name, 'level': m.mastery_level} for m in masteries],
            'recent_results': [{'quiz': r.quiz.title if r.quiz else '', 'score': r.score, 'total': r.total_marks, 'percentage': r.percentage} for r in results[-5:]]
        }

        report_content = gemini_service.generate_report(student_data, report_type, language)

        from models import Report as ReportModel
        report = ReportModel(
            student_id=student_id,
            teacher_id=user_id,
            report_type=report_type,
            content=report_content,
            language=language
        )
        db.session.add(report)
        db.session.commit()

        parent_message = ""
        if report_type == 'parent':
            parent_message = f"📚 *ShikshakIQ Report - {student.name}*\n\n"
            parent_message += f"📊 Average Score: {student_data['average_score']}%\n"
            parent_message += f"📝 Quizzes Taken: {student_data['quizzes_taken']}\n"
            if masteries:
                parent_message += "\n*Areas to Focus:*\n"
                for m in masteries[:5]:
                    if m.mastery_level < 0.5:
                        parent_message += f"• {m.concept_name}: {round(m.mastery_level * 100)}% mastery\n"
            parent_message += "\n*Recommendations:*\n"
            for rec in report_content.get('recommendations', []):
                parent_message += f"• {rec}\n"

        return jsonify({
            'report': report.to_dict(),
            'parent_whatsapp_message': parent_message if report_type == 'parent' else None
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ====================
# MASTERY MAP
# ====================

@analytics_bp.route('/api/analytics/mastery-map', methods=['GET'])
@jwt_required()
def get_mastery_map():
    try:
        user_id = int(get_jwt_identity())

        # Support filtering by assignment_id (teacher's selected workspace)
        assignment_id = request.args.get('assignment_id', type=int)
        class_ids = _get_accessible_class_ids(user_id)

        if assignment_id:
            from models import TeacherAssignment as TAssignment
            assignment = TAssignment.query.filter_by(id=assignment_id, teacher_id=user_id).first()
            if assignment:
                class_ids = [assignment.class_id] if assignment.class_id in class_ids else []

        cache_key = f'mastery_map:{user_id}:{assignment_id or "all"}'
        cached = _report_cache.get(cache_key)
        if cached:
            return jsonify(cached), 200

        students = Student.query.filter(Student.class_id.in_(class_ids)).all() if class_ids else []
        student_ids = [s.id for s in students]

        if not student_ids:
            return jsonify({'mastery_map': [], 'concepts': [], 'students': [], 'class_averages': {}, 'gap_summary': []}), 200

        masteries = ConceptMastery.query.filter(ConceptMastery.student_id.in_(student_ids)).all()
        concepts = list(set(m.concept_name for m in masteries))
        concepts.sort()

        # Build mastery map & compute class averages + gap metrics
        concept_totals = {c: 0.0 for c in concepts}
        concept_counts = {c: 0 for c in concepts}
        concept_struggling = {c: 0 for c in concepts}  # students below 0.4 threshold

        mastery_map = []
        for student in students:
            student_masteries = [m for m in masteries if m.student_id == student.id]
            row = {'student_id': student.id, 'student_name': student.name, 'concepts': {}, 'overall_mastery': 0.0}
            total = 0.0
            count = 0
            for c in concepts:
                sm = next((m for m in student_masteries if m.concept_name == c), None)
                val = sm.mastery_level if sm else 0
                row['concepts'][c] = val
                if val > 0:
                    concept_totals[c] += val
                    concept_counts[c] += 1
                    total += val
                    count += 1
                    if val < 0.4:
                        concept_struggling[c] += 1
            row['overall_mastery'] = round(total / count, 3) if count > 0 else 0
            mastery_map.append(row)

        # Sort students by overall mastery (weakest first)
        mastery_map.sort(key=lambda r: r['overall_mastery'])

        # Class averages per concept
        class_averages = {}
        gap_summary = []
        for c in concepts:
            avg = concept_totals[c] / concept_counts[c] if concept_counts[c] > 0 else 0
            class_averages[c] = round(avg, 3)
            struggling_pct = round(concept_struggling[c] / len(students) * 100, 1) if len(students) > 0 else 0
            gap_summary.append({
                'concept': c,
                'avg_mastery': round(avg, 3),
                'struggling_students': concept_struggling[c],
                'total_students': len(students),
                'struggling_percentage': struggling_pct,
                'severity': 'critical' if struggling_pct >= 50 else 'high' if struggling_pct >= 30 else 'medium' if struggling_pct >= 15 else 'low'
            })

        # Sort gap summary by severity (most critical first), then by struggling count
        severity_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        gap_summary.sort(key=lambda g: (severity_order.get(g['severity'], 99), -g['struggling_students']))

        result = {
            'mastery_map': mastery_map,
            'concepts': concepts,
            'students': [{'id': s.id, 'name': s.name} for s in students],
            'class_averages': class_averages,
            'gap_summary': gap_summary
        }
        _report_cache.set(cache_key, result)
        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ====================
# GROWTH TIMELINE
# ====================

@analytics_bp.route('/api/analytics/growth/<int:student_id>', methods=['GET'])
@jwt_required()
def get_growth_timeline(student_id):
    try:
        user_id = int(get_jwt_identity())
        student = Student.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        if User.query.get(user_id) and User.query.get(user_id).role == 'teacher':
            accessible_ids = _get_accessible_class_ids(user_id)
            if student.class_id not in accessible_ids:
                return jsonify({'error': 'Access denied'}), 403

        results = Result.query.filter_by(student_id=student_id).order_by(Result.submitted_at).all()
        timeline = [{
            'date': r.submitted_at.isoformat() if r.submitted_at else '',
            'score': r.score, 'total_marks': r.total_marks,
            'percentage': r.percentage, 'quiz_title': r.quiz.title if r.quiz else 'Unknown'
        } for r in results]

        masteries = ConceptMastery.query.filter_by(student_id=student_id).order_by(ConceptMastery.last_updated).all()
        concept_growth = [{
            'concept': m.concept_name, 'mastery': m.mastery_level,
            'attempts': m.attempts, 'correct_attempts': m.correct_attempts,
            'last_updated': m.last_updated.isoformat() if m.last_updated else ''
        } for m in masteries]

        improvement_speed = 0
        if len(timeline) >= 2:
            first_pct = timeline[0]['percentage']
            last_pct = timeline[-1]['percentage']
            if len(timeline) > 1:
                improvement_speed = (last_pct - first_pct) / len(timeline)

        weak_counts = {}
        for r in results:
            if r.weaknesses:
                for w in r.weaknesses:
                    weak_counts[w] = weak_counts.get(w, 0) + 1
        repeated_weaknesses = [{'weakness': k, 'count': v} for k, v in sorted(weak_counts.items(), key=lambda x: -x[1])[:5]]

        return jsonify({
            'timeline': timeline, 'concept_growth': concept_growth,
            'improvement_speed': round(improvement_speed, 2),
            'repeated_weaknesses': repeated_weaknesses,
            'total_quizzes': len(timeline),
            'current_mastery': round(sum(m.mastery_level for m in masteries) / len(masteries), 2) if masteries else 0
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ====================
# RISK PREDICTION
# ====================

@analytics_bp.route('/api/analytics/risk-prediction', methods=['GET'])
@jwt_required()
def get_risk_prediction():
    try:
        user_id = int(get_jwt_identity())
        cache_key = f'risk_prediction:{user_id}'
        cached = _report_cache.get(cache_key)
        if cached:
            return jsonify(cached), 200

        class_ids = _get_accessible_class_ids(user_id)
        students = Student.query.filter(Student.class_id.in_(class_ids)).all() if class_ids else []

        predictions = []
        for s in students:
            masteries = ConceptMastery.query.filter_by(student_id=s.id).all()
            results = Result.query.filter_by(student_id=s.id).order_by(Result.submitted_at.desc()).limit(3).all()
            if not masteries and not results:
                continue

            avg_mastery = sum(m.mastery_level for m in masteries) / len(masteries) if masteries else 0
            recent_trend = 0
            if len(results) >= 2:
                recent_trend = results[0].percentage - results[-1].percentage

            risk_factors = []
            risk_score = 0
            if avg_mastery < 0.3:
                risk_factors.append('Very low concept mastery')
                risk_score += 0.4
            elif avg_mastery < 0.5:
                risk_factors.append('Below average mastery')
                risk_score += 0.2
            if recent_trend < -10:
                risk_factors.append('Declining performance trend')
                risk_score += 0.3
            elif recent_trend < -5:
                risk_factors.append('Slight performance decline')
                risk_score += 0.1
            if results and results[0].percentage < 35:
                risk_factors.append('Very low recent score')
                risk_score += 0.3

            weak_concepts = [m.concept_name for m in masteries if m.mastery_level < 0.4]
            if weak_concepts:
                risk_factors.append(f'{len(weak_concepts)} weak concepts')

            predictions.append({
                'student_id': s.id, 'student_name': s.name,
                'risk_score': round(min(risk_score, 1.0), 2),
                'risk_level': 'high' if risk_score >= 0.5 else 'medium' if risk_score >= 0.3 else 'low',
                'risk_factors': risk_factors[:3],
                'avg_mastery': round(avg_mastery, 2),
                'recent_trend': round(recent_trend, 1),
                'weak_concepts': weak_concepts[:5],
                'prediction': 'Student may struggle in next chapter' if risk_score >= 0.5 else 'Needs monitoring' if risk_score >= 0.3 else 'On track'
            })

        result = {
            'predictions': sorted(predictions, key=lambda x: -x['risk_score']),
            'total_at_risk': sum(1 for p in predictions if p['risk_level'] == 'high'),
            'total_monitoring': sum(1 for p in predictions if p['risk_level'] == 'medium')
        }
        _report_cache.set(cache_key, result)
        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ====================
# QUESTION QUALITY (IRT)
# ====================

@analytics_bp.route('/api/analytics/question-quality', methods=['GET'])
@jwt_required()
def get_question_quality():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        quizzes = Quiz.query.filter_by(teacher_id=user_id).all() if user.role == 'teacher' else Quiz.query.all()
        quiz_ids = [q.id for q in quizzes]

        if not quiz_ids:
            return jsonify({'questions': []}), 200

        questions = QuizQuestion.query.filter(QuizQuestion.quiz_id.in_(quiz_ids)).all()
        results = Result.query.filter(Result.quiz_id.in_(quiz_ids)).all()

        question_stats = []
        for q in questions:
            correct_count = 0
            total_count = 0
            for r in results:
                if isinstance(r.answers_data, list):
                    for a in r.answers_data:
                        if isinstance(a, dict) and a.get('question_id') == q.id:
                            total_count += 1
                            if a.get('is_correct', False):
                                correct_count += 1

            if total_count > 0:
                p_correct = correct_count / total_count
                import math
                p_correct_clamped = max(0.01, min(0.99, p_correct))
                difficulty = round(math.log((1 - p_correct_clamped) / p_correct_clamped), 2)
                success_rate = round(p_correct * 100, 1)
                discrimination = round(abs(success_rate - 50) / 50, 2)

                question_stats.append({
                    'question_id': q.id,
                    'question_text': q.question_text[:100] + ('...' if len(q.question_text) > 100 else ''),
                    'quiz_id': q.quiz_id,
                    'quiz_title': next((qz.title for qz in quizzes if qz.id == q.quiz_id), 'Unknown'),
                    'concept_tag': q.concept_tag,
                    'difficulty': difficulty,
                    'difficulty_label': 'Hard' if difficulty > 1 else 'Medium' if difficulty > -1 else 'Easy',
                    'success_rate': success_rate,
                    'discrimination': discrimination,
                    'total_attempts': total_count,
                    'correct_count': correct_count,
                    'insight': f'Students {"struggled with" if success_rate < 40 else "performed well on"} this question'
                })

        question_stats.sort(key=lambda x: x['difficulty'], reverse=True)

        return jsonify({
            'questions': question_stats,
            'easiest': question_stats[-1] if len(question_stats) > 1 else None,
            'hardest': question_stats[0] if question_stats else None,
            'best_discriminating': max(question_stats, key=lambda x: x['discrimination']) if question_stats else None
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ====================
# PEER COMPARISON
# ====================

@analytics_bp.route('/api/analytics/peer-comparison/<int:student_id>', methods=['GET'])
@jwt_required()
def get_peer_comparison(student_id):
    """Returns a student's rank, percentile, and comparison to class peers."""
    try:
        user_id = int(get_jwt_identity())
        student = Student.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        # Check access
        user = User.query.get(user_id)
        if user and user.role == 'teacher':
            accessible_ids = _get_accessible_class_ids(user_id)
            if student.class_id not in accessible_ids:
                return jsonify({'error': 'Access denied'}), 403

        # Get all students in same class
        peers = Student.query.filter_by(class_id=student.class_id).all()
        peer_ids = [p.id for p in peers]

        # Get mastery scores for all peers
        peer_masteries = {}
        for pid in peer_ids:
            m = ConceptMastery.query.filter_by(student_id=pid).all()
            if m:
                avg = sum(x.mastery_level for x in m) / len(m)
            else:
                avg = 0
            peer_masteries[pid] = round(avg, 3)

        # Get result percentages for all peers
        peer_scores = {}
        for pid in peer_ids:
            results = Result.query.filter_by(student_id=pid).all()
            if results:
                avg_pct = sum(r.percentage for r in results) / len(results)
            else:
                avg_pct = 0
            peer_scores[pid] = round(avg_pct, 2)

        # Current student's values
        student_mastery = peer_masteries.get(student_id, 0)
        student_score = peer_scores.get(student_id, 0)

        # Calculate rank (by mastery)
        sorted_by_mastery = sorted(peer_masteries.items(), key=lambda x: -x[1])
        rank = 1
        for i, (pid, val) in enumerate(sorted_by_mastery):
            if pid == student_id:
                rank = i + 1
                break

        # Percentile
        percentile = round((1 - (rank - 1) / max(len(peers) - 1, 1)) * 100, 1) if len(peers) > 1 else 100

        # Class averages
        class_mastery_avg = round(sum(peer_masteries.values()) / len(peer_masteries), 3) if peer_masteries else 0
        class_score_avg = round(sum(peer_scores.values()) / len(peer_scores), 2) if peer_scores else 0

        # Distribution buckets (by mastery)
        buckets = {'excellent': 0, 'good': 0, 'average': 0, 'below_average': 0, 'struggling': 0}
        for pid, val in peer_masteries.items():
            if val >= 0.8:
                buckets['excellent'] += 1
            elif val >= 0.6:
                buckets['good'] += 1
            elif val >= 0.4:
                buckets['average'] += 1
            elif val >= 0.2:
                buckets['below_average'] += 1
            else:
                buckets['struggling'] += 1

        # Peer names for the list
        top_peers = []
        for pid, val in sorted_by_mastery[:5]:
            if pid != student_id:
                p = Student.query.get(pid)
                if p:
                    top_peers.append({
                        'name': p.name,
                        'mastery': val,
                        'avg_score': peer_scores.get(pid, 0)
                    })

        return jsonify({
            'student_id': student_id,
            'student_name': student.name,
            'class_name': student.class_name,
            'total_peers': len(peers),
            'rank': rank,
            'percentile': percentile,
            'student_mastery': student_mastery,
            'student_avg_score': student_score,
            'class_mastery_avg': class_mastery_avg,
            'class_score_avg': class_score_avg,
            'mastery_gap': round(student_mastery - class_mastery_avg, 3),
            'score_gap': round(student_score - class_score_avg, 2),
            'distribution': buckets,
            'top_peers': top_peers,
            'mastery_trend': 'above' if student_mastery > class_mastery_avg else 'below' if student_mastery < class_mastery_avg else 'on_par'
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ====================
# EARLY WARNING ALERTS
# ====================

@analytics_bp.route('/api/analytics/early-warnings', methods=['GET'])
@jwt_required()
def get_early_warnings():
    """Returns proactive early-warning alerts about at-risk students."""
    try:
        user_id = int(get_jwt_identity())

        # Support filtering by assignment_id (teacher's selected workspace)
        assignment_id = request.args.get('assignment_id', type=int)
        class_ids = _get_accessible_class_ids(user_id)

        if assignment_id:
            from models import TeacherAssignment as TAssignment
            assignment = TAssignment.query.filter_by(id=assignment_id, teacher_id=user_id).first()
            if assignment:
                class_ids = [assignment.class_id] if assignment.class_id in class_ids else []

        cache_key = f'early_warnings:{user_id}:{assignment_id or "all"}'
        cached = _report_cache.get(cache_key)
        if cached:
            return jsonify(cached), 200

        students = Student.query.filter(Student.class_id.in_(class_ids)).all() if class_ids else []

        alerts = []
        for s in students:
            masteries = ConceptMastery.query.filter_by(student_id=s.id).all()
            results = Result.query.filter_by(student_id=s.id).order_by(Result.submitted_at.desc()).limit(5).all()

            if not masteries and not results:
                continue

            avg_mastery = sum(m.mastery_level for m in masteries) / len(masteries) if masteries else 0

            # Risk scoring factors
            risk_score = 0.0
            factors = []

            # Factor 1: Concept mastery below thresholds
            if avg_mastery < 0.2:
                risk_score += 0.5
                factors.append('Very low concept mastery (below 20%)')
            elif avg_mastery < 0.3:
                risk_score += 0.4
                factors.append('Low concept mastery (20-30%)')
            elif avg_mastery < 0.4:
                risk_score += 0.25
                factors.append('Below average concept mastery (30-40%)')

            # Factor 2: Consistent low quiz scores
            if results:
                recent_avg = sum(r.percentage for r in results) / len(results)
                if recent_avg < 30:
                    risk_score += 0.4
                    factors.append(f'Consistently low quiz scores (avg {round(recent_avg)}%)')
                elif recent_avg < 50:
                    risk_score += 0.2
                    factors.append(f'Below average quiz scores (avg {round(recent_avg)}%)')

                # Factor 3: Declining trend
                if len(results) >= 3:
                    recent_trend_pct = results[-1].percentage - results[0].percentage
                    if recent_trend_pct < -20:
                        risk_score += 0.3
                        factors.append(f'Significant performance drop ({round(recent_trend_pct)}% recent trend)')
                    elif recent_trend_pct < -10:
                        risk_score += 0.15
                        factors.append(f'Moderate performance decline ({round(recent_trend_pct)}% recent trend)')

                # Factor 4: Missed/low submissions
                if len(results) <= 1:
                    risk_score += 0.1
                    factors.append('Few quiz submissions (only 1)')

            # Factor 5: Multiple weak concepts
            weak_count = sum(1 for m in masteries if m.mastery_level < 0.4)
            total_concepts = len(masteries)
            if total_concepts > 0 and weak_count / total_concepts > 0.5:
                risk_score += 0.3
                factors.append(f'Majority concepts weak ({weak_count}/{total_concepts} below threshold)')
            elif weak_count >= 3:
                risk_score += 0.15
                factors.append(f'{weak_count} concepts need improvement')

            risk_score = min(risk_score, 1.0)

            if risk_score >= 0.25:  # Only generate alerts for medium+ risk
                alert_level = 'critical' if risk_score >= 0.6 else 'high' if risk_score >= 0.4 else 'medium'
                alerts.append({
                    'student_id': s.id,
                    'student_name': s.name,
                    'class_name': s.class_name,
                    'roll_number': s.roll_number,
                    'risk_score': round(risk_score, 2),
                    'alert_level': alert_level,
                    'avg_mastery': round(avg_mastery, 2),
                    'factors': factors[:3],
                    'weak_concepts': [m.concept_name for m in masteries if m.mastery_level < 0.4][:5],
                    'recent_score': results[0].percentage if results else None,
                    'last_quiz_title': results[0].quiz.title if results and results[0].quiz else None
                })

        # Sort by severity
        severity_order = {'critical': 0, 'high': 1, 'medium': 2}
        alerts.sort(key=lambda a: (severity_order.get(a['alert_level'], 99), -a['risk_score']))

        result = {
            'alerts': alerts,
            'total_alerts': len(alerts),
            'critical_count': sum(1 for a in alerts if a['alert_level'] == 'critical'),
            'high_count': sum(1 for a in alerts if a['alert_level'] == 'high'),
            'medium_count': sum(1 for a in alerts if a['alert_level'] == 'medium'),
            'generated_at': datetime.utcnow().isoformat()
        }
        _report_cache.set(cache_key, result)
        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ====================
# PAPER RESULTS
# ====================

@analytics_bp.route('/api/analytics/paper-results', methods=['GET'])
@jwt_required()
def get_paper_results():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        if user.role == 'teacher':
            quizzes = Quiz.query.filter_by(teacher_id=user_id).all()
            quiz_ids = [q.id for q in quizzes]
            results = Result.query.filter(
                Result.quiz_id.in_(quiz_ids),
                Result.scanned_data.isnot(None)
            ).order_by(Result.submitted_at.desc()).limit(50).all() if quiz_ids else []
        else:
            results = Result.query.filter(Result.scanned_data.isnot(None)).order_by(Result.submitted_at.desc()).limit(50).all()

        return jsonify({'results': [r.to_dict() for r in results]}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
