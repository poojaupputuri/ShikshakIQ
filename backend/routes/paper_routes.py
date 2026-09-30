import os
import json
import uuid
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Student, Quiz, QuizQuestion, Result
from extensions import db
from services.gemini_service import GeminiService
from services.education_models import BKTService, IRTService
from config import Config

paper_bp = Blueprint('paper', __name__)
gemini_service = GeminiService()
bkt_service = BKTService()
irt_service = IRTService()

ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _get_teacher():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'teacher':
        return None
    return user


@paper_bp.route('/api/paper/analyze', methods=['POST'])
@jwt_required()
def analyze_paper():
    """Upload and analyze a student answer sheet"""
    try:
        teacher = _get_teacher()
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404

        quiz_id = request.form.get('quiz_id', type=int)
        if not quiz_id:
            return jsonify({'error': 'Quiz ID required'}), 400

        quiz = Quiz.query.filter_by(id=quiz_id, teacher_id=teacher.id).first()
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404

        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not supported. Use PDF, JPG, JPEG, or PNG'}), 400

        # Read file and convert to base64 for Gemini
        file_bytes = file.read()
        import base64
        image_data = base64.b64encode(file_bytes).decode('utf-8')

        # Get quiz questions for analysis
        questions = QuizQuestion.query.filter_by(quiz_id=quiz.id).order_by(QuizQuestion.order_index).all()
        questions_data = [q.to_dict() for q in questions]

        # Analyze with Gemini Vision
        analysis = gemini_service.analyze_answer_sheet(image_data, questions_data)

        if not analysis:
            return jsonify({'error': 'Failed to analyze answer sheet'}), 500

        # Fuzzy search for student matching (by class)
        detected_name = analysis.get('student_name', '')
        detected_roll = analysis.get('roll_number', '')
        students = Student.query.filter_by(class_id=quiz.class_id).all()

        matched_student = None
        match_confidence = 0

        if detected_name or detected_roll:
            from difflib import SequenceMatcher
            best_match = None
            best_score = 0

            for student in students:
                name_score = SequenceMatcher(None, detected_name.lower(), student.name.lower()).ratio() * 100 if detected_name else 0
                roll_score = SequenceMatcher(None, detected_roll.lower(), student.roll_number.lower()).ratio() * 100 if detected_roll else 0
                combined = max(name_score, roll_score)
                if combined > best_score:
                    best_score = combined
                    best_match = student

            if best_match and best_score >= 60:
                matched_student = best_match
                match_confidence = best_score

        # Calculate scores from analysis
        answers_data = analysis.get('answers', [])
        total_score = analysis.get('total_score', 0)
        total_marks = analysis.get('total_marks', quiz.total_marks)
        confidence = analysis.get('confidence', 0.8)

        # Ensure score doesn't exceed max
        total_score = min(total_score, total_marks)

        percentage = (total_score / total_marks * 100) if total_marks > 0 else 0

        # Save to DB if match found with high confidence
        result = None
        needs_confirmation = match_confidence < 85

        if matched_student and match_confidence >= 85:
            # Auto-match with high confidence
            result = Result(
                quiz_id=quiz.id,
                student_id=matched_student.id,
                score=total_score,
                total_marks=total_marks,
                percentage=round(percentage, 2),
                answers_data=answers_data,
                feedback=analysis.get('overall_feedback', ''),
                strengths=analysis.get('strengths', []),
                weaknesses=analysis.get('weaknesses', []),
                confidence=confidence / 100 if confidence > 1 else confidence,
                scanned_data=analysis
            )
            db.session.add(result)
            db.session.commit()

            # Update BKT for concept tags
            for ans in answers_data:
                if ans.get('concept_tag'):
                    bkt_service.update_knowledge_tracing(
                        matched_student.id,
                        ans['concept_tag'],
                        ans.get('is_correct', False)
                    )

        return jsonify({
            'analysis': {
                'student_name': detected_name,
                'roll_number': detected_roll,
                'total_score': total_score,
                'total_marks': total_marks,
                'percentage': round(percentage, 2),
                'confidence': confidence,
                'answers': answers_data,
                'strengths': analysis.get('strengths', []),
                'weaknesses': analysis.get('weaknesses', []),
                'feedback': analysis.get('overall_feedback', ''),
            },
            'matched_student': matched_student.to_dict() if matched_student else None,
            'match_confidence': match_confidence,
            'needs_confirmation': needs_confirmation,
            'available_students': [s.to_dict() for s in students] if needs_confirmation else [],
            'result_saved': result is not None,
            'result': result.to_dict() if result else None
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@paper_bp.route('/api/paper/batch-analyze', methods=['POST'])
@jwt_required()
def batch_analyze_papers():
    """Upload multiple answer sheets for batch processing"""
    try:
        teacher = _get_teacher()
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404

        quiz_id = request.form.get('quiz_id', type=int)
        if not quiz_id:
            return jsonify({'error': 'Quiz ID required'}), 400

        quiz = Quiz.query.filter_by(id=quiz_id, teacher_id=teacher.id).first()
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404

        files = request.files.getlist('files')
        if not files:
            return jsonify({'error': 'No files provided'}), 400

        results_list = []
        errors = []

        for i, file in enumerate(files):
            if not allowed_file(file.filename):
                errors.append({'file': file.filename, 'error': 'Unsupported file type'})
                continue

            try:
                file_bytes = file.read()
                import base64
                image_data = base64.b64encode(file_bytes).decode('utf-8')

                questions = QuizQuestion.query.filter_by(quiz_id=quiz.id).order_by(QuizQuestion.order_index).all()
                questions_data = [q.to_dict() for q in questions]

                analysis = gemini_service.analyze_answer_sheet(image_data, questions_data)

                if analysis:
                    results_list.append({
                        'file': file.filename,
                        'analysis': {
                            'student_name': analysis.get('student_name', 'Unknown'),
                            'total_score': analysis.get('total_score', 0),
                            'confidence': analysis.get('confidence', 0),
                        }
                    })
                else:
                    errors.append({'file': file.filename, 'error': 'Analysis failed'})
            except Exception as e:
                errors.append({'file': file.filename, 'error': str(e)})

        return jsonify({
            'total': len(files),
            'processed': len(results_list),
            'failed': len(errors),
            'results': results_list,
            'errors': errors
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@paper_bp.route('/api/paper/confirm-match', methods=['POST'])
@jwt_required()
def confirm_student_match():
    """Teacher confirms or corrects the student match for a paper analysis"""
    try:
        teacher = _get_teacher()
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404

        data = request.get_json()

        quiz_id = data.get('quiz_id')
        student_id = data.get('student_id')
        analysis_data = data.get('analysis_data', {})

        if not quiz_id or not student_id:
            return jsonify({'error': 'Quiz ID and Student ID required'}), 400

        quiz = Quiz.query.filter_by(id=quiz_id, teacher_id=teacher.id).first()
        student = Student.query.get(student_id)

        if not quiz or not student:
            return jsonify({'error': 'Quiz or Student not found'}), 404

        total_score = analysis_data.get('total_score', 0)
        total_marks = analysis_data.get('total_marks', quiz.total_marks)
        percentage = (total_score / total_marks * 100) if total_marks > 0 else 0

        result = Result(
            quiz_id=quiz.id,
            student_id=student.id,
            score=total_score,
            total_marks=total_marks,
            percentage=round(percentage, 2),
            answers_data=analysis_data.get('answers', []),
            feedback=analysis_data.get('feedback', ''),
            strengths=analysis_data.get('strengths', []),
            weaknesses=analysis_data.get('weaknesses', []),
            confidence=0.95,
            scanned_data=analysis_data
        )
        db.session.add(result)
        db.session.commit()

        return jsonify({
            'message': 'Student match confirmed and result saved',
            'result': result.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@paper_bp.route('/api/paper/scanned-results', methods=['GET'])
@jwt_required()
def get_scanned_results():
    """Get all scanned paper analysis results"""
    try:
        teacher = _get_teacher()
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404

        results = Result.query.join(Quiz).filter(
            Result.scanned_data.isnot(None),
            Result.scanned_data != {},
            Quiz.teacher_id == teacher.id
        ).order_by(Result.submitted_at.desc()).all()

        return jsonify({
            'results': [r.to_dict() for r in results]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
