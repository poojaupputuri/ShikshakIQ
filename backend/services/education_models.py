import math
from models import BKTTracking, ConceptMastery, IRT_Analysis, Result
from extensions import db
from datetime import datetime


class BKTService:
    """Bayesian Knowledge Tracing Service"""

    @staticmethod
    def update_knowledge_tracing(student_id, concept_name, is_correct):
        """Update BKT parameters based on student response"""
        tracking = BKTTracking.query.filter_by(
            student_id=student_id,
            concept_name=concept_name
        ).first()

        if not tracking:
            tracking = BKTTracking(
                student_id=student_id,
                concept_name=concept_name,
                p_know=0.5,
                p_learn=0.3,
                p_guess=0.2,
                p_slip=0.1,
                observations=0
            )
            db.session.add(tracking)

        # BKT update formulas
        p_know_prev = tracking.p_know
        p_learn = tracking.p_learn
        p_guess = tracking.p_guess
        p_slip = tracking.p_slip

        if is_correct:
            # P(know | correct) = P(know)*(1-P(slip)) / [P(know)*(1-P(slip)) + (1-P(know))*P(guess)]
            numerator = p_know_prev * (1 - p_slip)
            denominator = numerator + (1 - p_know_prev) * p_guess
            p_know_posterior = numerator / denominator if denominator > 0 else p_know_prev
        else:
            # P(know | incorrect) = P(know)*P(slip) / [P(know)*P(slip) + (1-P(know))*(1-P(guess))]
            numerator = p_know_prev * p_slip
            denominator = numerator + (1 - p_know_prev) * (1 - p_guess)
            p_know_posterior = numerator / denominator if denominator > 0 else p_know_prev

        # Update with learning probability
        tracking.p_know = p_know_posterior + (1 - p_know_posterior) * p_learn
        tracking.p_know = min(0.99, max(0.01, tracking.p_know))
        tracking.observations += 1
        tracking.last_updated = datetime.utcnow()

        # Update ConceptMastery
        mastery = ConceptMastery.query.filter_by(
            student_id=student_id,
            concept_name=concept_name
        ).first()

        if not mastery:
            mastery = ConceptMastery(
                student_id=student_id,
                concept_name=concept_name,
                mastery_level=tracking.p_know,
                attempts=0,
                correct_attempts=0
            )
            db.session.add(mastery)

        mastery.attempts += 1
        if is_correct:
            mastery.correct_attempts += 1
        mastery.mastery_level = tracking.p_know
        mastery.last_updated = datetime.utcnow()

        db.session.commit()
        return tracking

    @staticmethod
    def get_student_mastery(student_id):
        """Get all concept mastery for a student"""
        masteries = ConceptMastery.query.filter_by(student_id=student_id).all()
        return [m.to_dict() for m in masteries]

    @staticmethod
    def get_weak_concepts(student_id, threshold=0.4):
        """Get concepts below mastery threshold"""
        weak = ConceptMastery.query.filter(
            ConceptMastery.student_id == student_id,
            ConceptMastery.mastery_level < threshold
        ).all()
        return [w.to_dict() for w in weak]

    @staticmethod
    def predict_performance(student_id, concept_names):
        """Predict performance on given concepts"""
        predictions = {}
        for concept in concept_names:
            tracking = BKTTracking.query.filter_by(
                student_id=student_id,
                concept_name=concept
            ).first()
            if tracking:
                # P(correct) = P(know)*(1-P(slip)) + (1-P(know))*P(guess)
                p_correct = tracking.p_know * (1 - tracking.p_slip) + (1 - tracking.p_know) * tracking.p_guess
                predictions[concept] = round(p_correct, 3)
            else:
                predictions[concept] = 0.5
        return predictions


class IRTService:
    """Item Response Theory (3PL Model) Service"""

    @staticmethod
    def probability_correct(theta, difficulty, discrimination=1.0, guessing=0.25):
        """Calculate probability of correct response using 3PL model
        P(X=1|theta) = c + (1-c) / (1 + exp(-a*(theta-b)))
        where:
        theta = student ability
        b = difficulty parameter
        a = discrimination parameter
        c = guessing parameter (lower asymptote)
        """
        exponent = -discrimination * (theta - difficulty)
        try:
            p = guessing + (1 - guessing) / (1 + math.exp(exponent))
        except OverflowError:
            p = guessing if exponent > 700 else 1.0
        return p

    @staticmethod
    def estimate_ability(student_id, responses):
        """Estimate student ability (theta) using Maximum Likelihood Estimation"""
        if not responses:
            return 0.0

        # Start with initial estimate
        theta = 0.0
        for _ in range(20):  # Iterative MLE
            numerator = 0.0
            denominator = 0.0
            for r in responses:
                diff = r.get('difficulty', 0.0)
                disc = r.get('discrimination', 1.0)
                guess = r.get('guessing', 0.25)
                is_correct = r.get('is_correct', False)

                p = IRTService.probability_correct(theta, diff, disc, guess)
                q = 1 - p

                if p > 0.0001 and q > 0.0001:
                    numerator += disc * (1 if is_correct else 0 - p) * (p - guess) / (p * (1 - guess))
                    denominator += disc ** 2 * (p * q) / (q ** 2) * ((p - guess) / (1 - guess)) ** 2

            if denominator > 0.0001:
                theta += numerator / denominator
            else:
                break

            if abs(numerator / denominator if denominator > 0.0001 else 0) < 0.001:
                break

        # Update IRT analysis in DB
        irt = IRT_Analysis.query.filter_by(student_id=student_id).first()
        if not irt:
            irt = IRT_Analysis(student_id=student_id)
            db.session.add(irt)

        irt.ability_theta = theta
        irt.observations += len(responses)
        irt.last_updated = datetime.utcnow()
        db.session.commit()

        return round(theta, 3)

    @staticmethod
    def estimate_difficulty(responses):
        """Estimate question difficulty from response patterns"""
        if not responses:
            return 0.5

        correct_count = sum(1 for r in responses if r.get('is_correct', False))
        total = len(responses)
        if total == 0:
            return 0.5

        p_correct = correct_count / total
        # Transform proportion correct to difficulty scale
        # b = log((1-p)/p) roughly
        p_correct = max(0.01, min(0.99, p_correct))
        difficulty = math.log((1 - p_correct) / p_correct)
        return round(difficulty, 3)

    @staticmethod
    def get_student_ability(student_id):
        """Get stored student ability estimate"""
        irt = IRT_Analysis.query.filter_by(student_id=student_id).first()
        return irt.ability_theta if irt else 0.0

    @staticmethod
    def predict_quiz_performance(student_id, questions):
        """Predict performance on a set of questions"""
        theta = IRTService.get_student_ability(student_id)
        predictions = []
        for q in questions:
            prob = IRTService.probability_correct(
                theta,
                q.get('difficulty', 0.0),
                q.get('discrimination', 1.0),
                q.get('guessing', 0.25)
            )
            predictions.append({
                'question_id': q.get('id'),
                'probability_correct': round(prob, 3),
                'expected_score': round(prob * q.get('marks', 1), 2)
            })
        return predictions
