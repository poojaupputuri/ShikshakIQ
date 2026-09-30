import os
import json
import base64
import re
import random
import time
import threading
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from config import Config


class GeminiService:
    """Service to interact with Google Gemini API with automatic key rotation.

    Features:
    - Multiple API keys with automatic rotation on quota/rate-limit errors
    - 24-hour cooldown for exhausted keys (free tier resets daily)
    - Per-call timeout to prevent hanging
    - Transparent fallback to static content when all keys are exhausted
    """

    KEY_COOLDOWN_SECONDS = 24 * 60 * 60   # 24h for free-tier daily reset
    SERVER_ERROR_COOLDOWN = 30              # 30s for transient 503/429 errors

    def __init__(self):
        self._parse_api_keys()
        self._client = None
        self._model_name = None
        self._using_old_sdk = False
        self._initialized = False
        self._lock = threading.Lock()
        self._current_key_index = 0
        self._failed_keys = {}         # api_key -> timestamp when marked failed
        self._timeout = getattr(Config, 'GEMINI_TIMEOUT_SECONDS', 15)

    # ------------------------------------------------------------------
    # Key management
    # ------------------------------------------------------------------

    def _parse_api_keys(self):
        """Parse comma-separated GEMINI_API_KEYS from config."""
        raw = Config.GEMINI_API_KEYS
        self.api_keys = []
        if raw:
            self.api_keys = [k.strip() for k in raw.split(',') if k.strip()]
        # Fallback to the single-key env-var
        if not self.api_keys and Config.GEMINI_API_KEY:
            self.api_keys = [Config.GEMINI_API_KEY]
        # Strip placeholder sentinel
        self.api_keys = [k for k in self.api_keys
                         if k and k != 'your-gemini-api-key-here']
        if not self.api_keys:
            print("[GeminiService] No API keys configured. Fallback only.")

    def _get_active_key(self):
        """Return the first non-cooldown key, or None if all are exhausted."""
        now = time.time()
        for _ in range(len(self.api_keys)):
            if self._current_key_index >= len(self.api_keys):
                self._current_key_index = 0
            key = self.api_keys[self._current_key_index]

            if key in self._failed_keys:
                elapsed = now - self._failed_keys[key]
                if elapsed < self.KEY_COOLDOWN_SECONDS:
                    self._current_key_index += 1
                    continue
                else:
                    # Cooldown expired – remove from failed set
                    del self._failed_keys[key]
                    return key
            return key
        return None

    def _mark_key_failed(self, key, cooldown=None):
        if cooldown is None:
            cooldown = self.KEY_COOLDOWN_SECONDS
        self._failed_keys[key] = time.time() - (self.KEY_COOLDOWN_SECONDS - cooldown)
        alive = len(self.api_keys) - len(self._failed_keys)
        print(f"[GeminiService] Key exhausted. {alive}/{len(self.api_keys)} keys remain.")

    def _fail_all_keys(self):
        """Mark every configured key as failed immediately."""
        now = time.time()
        for k in self.api_keys:
            self._failed_keys[k] = now
        print(f"[GeminiService] All {len(self.api_keys)} keys marked as failed instantly.")

    @staticmethod
    @staticmethod
    def _is_auth_error(error_text):
        """Check if the error is a permanent auth/permission error (not quota)."""
        lower = str(error_text).lower()
        # 403 PERMISSION_DENIED, API key invalid, project denied, billing errors
        auth_keywords = (
            '403', 'permission_denied', 'permission denied',
            'api key not valid', 'api key expired', 'api key invalid',
            'project has been denied', 'access denied',
            'billing', 'account disabled',
            'not found for url', '404'
        )
        return any(kw in lower for kw in auth_keywords)

    @staticmethod
    def _is_server_error(error_text):
        """Check if the error is a transient server/quota error (503/429)."""
        lower = str(error_text).lower()
        server_keywords = (
            '500', '503', '429', 'unavailable', 'resource_exhausted',
            'high demand', 'rate limit', 'quota'
        )
        return any(kw in lower for kw in server_keywords)

    # ------------------------------------------------------------------
    # SDK initialisation (once)
    # ------------------------------------------------------------------

    def _ensure_init(self):
        if self._initialized:
            return
        with self._lock:
            if self._initialized:
                return
            self._initialized = True

            if not self.api_keys:
                return

            # Lazy-import SDK modules so they land in sys.modules
            import sys
            import importlib
            for mod_name in ('google.genai', 'google.generativeai'):
                if mod_name not in sys.modules:
                    try:
                        importlib.import_module(mod_name)
                    except ImportError:
                        continue
            self._init_client()

    def _init_client(self):
        """Create a client with the current active key."""
        key = self._get_active_key()
        if not key:
            return

        import sys
        if 'google.genai' in sys.modules:
            try:
                import google.genai as genai_new
                self._client = genai_new.Client(api_key=key)
                self._model_name = 'gemini-2.5-flash'
                self._using_old_sdk = False
                print("[GeminiService] Initialised with google.genai SDK")
                return
            except Exception as exc:
                print(f"[GeminiService] google.genai init failed: {exc}")

        if 'google.generativeai' in sys.modules:
            try:
                import google.generativeai as genai_old
                genai_old.configure(api_key=key)
                self._client = genai_old
                self._model_name = 'models/gemini-2.5-flash'
                self._using_old_sdk = True
                print("[GeminiService] Initialised with google.generativeai SDK")
                return
            except Exception as exc:
                print(f"[GeminiService] google.generativeai init failed: {exc}")

        print("[GeminiService] No Gemini SDK available. Using fallback.")

    # ------------------------------------------------------------------
    # Core generation with key rotation & timeout
    # ------------------------------------------------------------------

    def is_available(self):
        self._ensure_init()
        return self._client is not None and self._get_active_key() is not None

    def _generate(self, prompt):
        """Generate content, automatically rotating keys on quota errors.

        Returns None when all keys have been tried and exhausted.
        """
        self._ensure_init()
        if not self.api_keys:
            return None

        for attempt in range(len(self.api_keys) + 1):
            key = self._get_active_key()
            if not key:
                print("[GeminiService] All keys exhausted. Using fallback.")
                return None

            # Ensure client is initialised for this key
            with self._lock:
                if not self._client:
                    self._init_client()
                if not self._client:
                    return None

            pool = None
            try:
                pool = ThreadPoolExecutor(max_workers=1)
                future = pool.submit(self._do_generate, prompt)
                result = future.result(timeout=self._timeout)
                return result
            except FutureTimeout:
                print(f"[GeminiService] Timeout ({self._timeout}s) on key #{self._current_key_index}")
                self._mark_key_failed(key, cooldown=self.SERVER_ERROR_COOLDOWN)
                with self._lock:
                    self._client = None
            except Exception as exc:
                err_text = str(exc)[:300]
                print(f"[GeminiService] Error on key #{self._current_key_index}: {err_text}")
                # Different cooldowns based on error type
                if self._is_auth_error(err_text):
                    print(f"[GeminiService] Auth error on key #{self._current_key_index} — marking that key as failed for 24h.")
                    self._mark_key_failed(key, cooldown=self.KEY_COOLDOWN_SECONDS)
                elif self._is_server_error(err_text):
                    print(f"[GeminiService] Server error on key #{self._current_key_index} — retrying in 30s.")
                    self._mark_key_failed(key, cooldown=self.SERVER_ERROR_COOLDOWN)
                else:
                    print(f"[GeminiService] Unknown error on key #{self._current_key_index} — marking as failed.")
                    self._mark_key_failed(key, cooldown=self.KEY_COOLDOWN_SECONDS)
                with self._lock:
                    self._client = None
            finally:
                if pool is not None:
                    pool.shutdown(wait=False)

        return None

    def _do_generate(self, prompt):
        """Actual SDK call (runs in a thread-pool worker)."""
        if not self._using_old_sdk:
            response = self._client.models.generate_content(
                model=self._model_name,
                contents=prompt
            )
            return response.text
        else:
            model = self._client.GenerativeModel(self._model_name)
            response = model.generate_content(prompt)
            return response.text

    # ------------------------------------------------------------------
    # JSON extraction helper
    # ------------------------------------------------------------------

    def _extract_json(self, text):
        if not text:
            return None
        for bracket_type in ('[', '{'):
            start = text.find(bracket_type)
            if start < 0:
                continue
            end = text.rfind(']' if bracket_type == '[' else '}')
            if end > start:
                try:
                    return json.loads(text[start:end + 1])
                except json.JSONDecodeError:
                    pass
        return None

    # ------------------------------------------------------------------
    # Quiz generation
    # ------------------------------------------------------------------

    def generate_quiz(self, class_name, subject, topic, difficulty,
                      num_questions=5, total_marks=25):
        if not total_marks or total_marks <= 0:
            total_marks = 25
        if not num_questions or num_questions <= 0:
            num_questions = 5

        prompt = f"""Generate a quiz for Class {class_name} students on {subject} - {topic}.
Difficulty: {difficulty}
Number of questions: {num_questions}
Total marks: {total_marks}

Create a mix of:
- MCQ questions (with 4 options each)
- Short answer questions
- 1 descriptive question

For each question provide:
- question_text
- question_type (mcq/short/descriptive)
- options (for MCQ)
- correct_answer
- marks
- concept_tag

Return as valid JSON array. Example format:
[
  {{
    "question_text": "...",
    "question_type": "mcq",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct_answer": "A) ...",
    "marks": 5,
    "concept_tag": "concept_name"
  }}
]

Make sure the questions are age-appropriate for Class {class_name} students."""

        text = self._generate(prompt)
        if text:
            questions = self._extract_json(text)
            if questions and isinstance(questions, list):
                return questions

        return self._fallback_quiz(subject, topic, difficulty, num_questions, total_marks)

    def _fallback_quiz(self, subject, topic, difficulty, num_questions, total_marks=25):
        """Generate topic-aware fallback quiz when Gemini is unavailable"""
        # ── identical to the original _fallback_quiz ──
        if not total_marks or total_marks <= 0:
            total_marks = 25
        if not num_questions or num_questions <= 0:
            num_questions = 5

        lower_subject = subject.lower().strip()
        lower_topic = topic.lower().strip() if topic else ''

        questions = []

        # --- Expanded question bank organized by subject + topic keywords ---
        question_bank = {
            'mathematics': {
                'algebra': [
                    ('If x + 5 = 12, what is x?', ['5', '7', '10', '12'], '7'),
                    ('What is the value of 3x when x = 4?', ['7', '12', '14', '81'], '12'),
                    ('Simplify: 2a + 3a - a', ['3a', '4a', '5a', '6a'], '4a'),
                    ('If 2x + 3 = 11, what is x?', ['3', '4', '5', '6'], '4'),
                    ('What is the coefficient of x in 5x + 2?', ['2', '5', '7', 'x'], '5'),
                    ('What is 2t + 3t - t?', ['3t', '4t', '5t', '6t'], '4t'),
                    ('If y/4 = 8, what is y?', ['24', '28', '30', '32'], '32'),
                    ('Explain how to solve 2x + 5 = 13', [], 'Subtract 5 from both sides, then divide by 2'),
                ],
                'geometry': [
                    ('How many sides does a triangle have?', ['2', '3', '4', '5'], '3'),
                    ('What is the area of a rectangle with length 6 and width 4?', ['10', '20', '24', '36'], '24'),
                    ('What is the perimeter of a square with side 5 cm?', ['10 cm', '15 cm', '20 cm', '25 cm'], '20 cm'),
                    ('How many degrees are in a right angle?', ['45', '60', '90', '180'], '90'),
                    ('What is the sum of interior angles of a triangle?', ['90', '180', '270', '360'], '180'),
                    ('What is the circumference of a circle with radius 7? (Use pi = 22/7)', ['44', '154', '22', '77'], '44'),
                    ('A square has side 8 cm. What is its perimeter?', ['24 cm', '32 cm', '36 cm', '64 cm'], '32 cm'),
                    ('Explain the difference between area and perimeter', [], 'Area measures surface, perimeter measures boundary length'),
                ],
                'fractions': [
                    ('What is 1/2 + 1/4?', ['1/6', '2/6', '3/4', '2/4'], '3/4'),
                    ('Which fraction is largest?', ['1/3', '2/5', '3/8', '1/2'], '1/2'),
                    ('What is 3/5 of 100?', ['30', '40', '50', '60'], '60'),
                    ('Simplify 8/12', ['1/3', '2/3', '4/6', '3/4'], '2/3'),
                    ('Which is equivalent to 0.5?', ['1/4', '1/3', '1/2', '3/4'], '1/2'),
                    ('What is 2/3 of 90?', ['90', '60', '45', '30'], '60'),
                    ('1/8 as a decimal is:', ['0.125', '0.25', '0.5', '0.75'], '0.125'),
                    ('Explain how to add two fractions with different denominators', [], 'Find LCM of denominators, convert fractions, then add numerators'),
                ],
                'ratio_and_proportions': [
                    ('What is the ratio of 4 to 8 in simplest form?', ['1:2', '2:1', '4:8', '1:4'], '1:2'),
                    ('If there are 3 boys and 5 girls in a class, what is the ratio of boys to girls?', ['3:5', '5:3', '3:8', '5:8'], '3:5'),
                    ('If 5 pens cost \u20b9100, what is the cost of 12 pens? (using unitary method)', ['\u20b9120', '\u20b9240', '\u20b9200', '\u20b9150'], '\u20b9240'),
                    ('Find the missing number: 2/5 = ?/20', ['4', '6', '8', '10'], '8'),
                    ('Are the ratios 3:4 and 9:12 equivalent?', ['Yes', 'No', 'Cannot determine', 'Only if simplified'], 'Yes'),
                    ('If a map scale is 1 cm : 10 km, what distance is represented by 5 cm?', ['10 km', '25 km', '50 km', '100 km'], '50 km'),
                    ('In a proportion a:b = c:d, the product of means equals the product of:', ['extremes', 'means', 'consequents', 'antecedents'], 'extremes'),
                    ('Divide \u20b9500 in the ratio 2:3', ['\u20b9100 and \u20b9400', '\u20b9200 and \u20b9300', '\u20b9150 and \u20b9350', '\u20b9250 and \u20b9250'], '\u20b9200 and \u20b9300'),
                    ('If 6 workers can build a wall in 12 days, how many days will 8 workers take? (direct/inverse proportion)', ['9 days', '10 days', '16 days', '8 days'], '9 days'),
                    ('Explain the difference between direct and inverse proportion with examples.', [], 'In direct proportion, both quantities increase together. In inverse proportion, when one increases, the other decreases.'),
                    ('If the ratio of ages of two brothers is 3:5 and the elder is 20 years old, find the younger brother\'s age.', ['10', '12', '15', '8'], '12'),
                    ('What is the simplest form of the ratio 15:45?', ['1:3', '3:1', '5:15', '15:45'], '1:3'),
                ],
                'percentage': [
                    ('What is 25% of 200?', ['25', '50', '75', '100'], '50'),
                    ('What percentage is 15 out of 60?', ['15%', '20%', '25%', '30%'], '25%'),
                    ('If 40% of students pass, how many out of 300 pass?', ['100', '120', '140', '160'], '120'),
                    ('A shirt costs $80 with 20% off. What is the discount?', ['$8', '$12', '$16', '$20'], '$16'),
                    ('What is 10% of 500?', ['10', '25', '50', '100'], '50'),
                    ('Increase 200 by 15%', ['210', '215', '225', '230'], '230'),
                    ('Convert 3/4 to percentage', ['25%', '50%', '60%', '75%'], '75%'),
                    ('Explain the concept of percentage', [], 'Percentage means per hundred; fraction with denominator 100'),
                ],
                'trigonometry': [
                    ('What is sin 30 degrees?', ['0', '1/2', '1/root2', 'root3/2'], '1/2'),
                    ('What is cos 0 degrees?', ['0', '1/2', '1', 'root3/2'], '1'),
                    ('In a right triangle, sin theta = opposite/hypotenuse. This is:', ['True', 'False', 'Only for acute angles', 'None'], 'True'),
                    ('What is tan 45 degrees?', ['1/root3', '1', 'root3', '0'], '1'),
                    ('What is cos 90 degrees?', ['0', '1', '-1', '1/2'], '0'),
                    ('Pythagorean identity: sin^2 theta + cos^2 theta = ?', ['0', '1', '-1', '2'], '1'),
                    ('What is the sine rule for triangles?', ['a/sinA = b/sinB = c/sinC', 'a^2 = b^2 + c^2', 'sinA + sinB = sinC', 'None'], 'a/sinA = b/sinB = c/sinC'),
                    ('Explain the relationship between sin and cos in a right triangle', [], 'Sin of an angle equals cos of its complementary angle'),
                ],
                'statistics': [
                    ('What is the mean of 2, 4, 6, 8, 10?', ['4', '5', '6', '7'], '6'),
                    ('What is the median of 3, 7, 9, 12, 15?', ['7', '9', '10', '12'], '9'),
                    ('What does the mode represent?', ['Middle value', 'Most frequent', 'Average', 'Range'], 'Most frequent'),
                    ('The range of 10, 20, 30, 40, 50 is:', ['30', '40', '50', '60'], '40'),
                    ('What is the probability of rolling a 6 on a die?', ['1/2', '1/3', '1/6', '1/12'], '1/6'),
                    ('What is the mean of first 5 natural numbers?', ['2', '3', '4', '5'], '3'),
                    ('What is the mode of 1,2,2,3,4,4,4,5?', ['2', '3', '4', '5'], '4'),
                    ('Explain the difference between mean, median, and mode', [], 'Mean is average, median is middle value, mode is most frequent'),
                ],
            },
            'science': {
                'photosynthesis': [
                    ('What gas do plants absorb during photosynthesis?', ['Oxygen', 'CO2', 'Nitrogen', 'Hydrogen'], 'CO2'),
                    ('What is the main pigment involved in photosynthesis?', ['Melanin', 'Chlorophyll', 'Hemoglobin', 'Carotene'], 'Chlorophyll'),
                    ('What is the main product of photosynthesis?', ['Oxygen only', 'Glucose and oxygen', 'Carbon dioxide', 'Water'], 'Glucose and oxygen'),
                    ('Where does photosynthesis mainly occur?', ['Roots', 'Stems', 'Leaves', 'Flowers'], 'Leaves'),
                    ('What energy source drives photosynthesis?', ['Wind', 'Sunlight', 'Water', 'Soil nutrients'], 'Sunlight'),
                    ('Which part of the plant is commonly called the "food factory"?', ['Root', 'Stem', 'Leaf', 'Fruit'], 'Leaf'),
                    ('What is the by-product of photosynthesis?', ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Water vapor'], 'Oxygen'),
                    ('Explain the process of photosynthesis step by step', [], 'Plants absorb sunlight via chlorophyll, take in CO2 and water, produce glucose and release oxygen'),
                ],
                'human_body': [
                    ('What is the largest organ in the human body?', ['Heart', 'Brain', 'Skin', 'Liver'], 'Skin'),
                    ('How many bones are in the adult human body?', ['106', '206', '306', '406'], '206'),
                    ('What organ pumps blood throughout the body?', ['Lungs', 'Heart', 'Brain', 'Kidneys'], 'Heart'),
                    ('What is the function of red blood cells?', ['Fight infection', 'Carry oxygen', 'Clot blood', 'Digest food'], 'Carry oxygen'),
                    ('Which organ is responsible for filtering blood?', ['Heart', 'Liver', 'Kidneys', 'Lungs'], 'Kidneys'),
                    ('What is the largest bone in the human body?', ['Spine', 'Femur', 'Humerus', 'Skull'], 'Femur'),
                    ('How many chambers does the human heart have?', ['2', '3', '4', '6'], '4'),
                    ('Explain the function of the digestive system', [], 'Breaks down food into nutrients, absorbs them into bloodstream, eliminates waste'),
                ],
            },
            'physics': {
                'force_and_motion': [
                    ('What is the SI unit of force?', ['Newton', 'Joule', 'Watt', 'Pascal'], 'Newton'),
                    ('What is Newton\'s first law of motion also called?', ['Law of inertia', 'Law of acceleration', 'Action-reaction', 'Law of gravity'], 'Law of inertia'),
                    ('What is acceleration?', ['Speed in a direction', 'Rate of change of velocity', 'Change in position', 'Distance per time'], 'Rate of change of velocity'),
                    ('What is the formula for force?', ['F = mv', 'F = ma', 'F = mg', 'F = md'], 'F = ma'),
                    ('What is inertia?', ['Tendency to accelerate', 'Tendency to resist change in motion', 'Force of gravity', 'Friction force'], 'Tendency to resist change in motion'),
                    ('What is the unit of acceleration?', ['m/s', 'm/s^2', 'm^2/s', 'N/kg'], 'm/s^2'),
                    ('An object at rest tends to stay at rest. This is:', ['Newton first law', 'Newton second law', 'Newton third law', 'Law of gravitation'], 'Newton first law'),
                    ('Explain Newton\'s third law of motion with an example', [], 'Every action has equal and opposite reaction; e.g., when you push a wall, the wall pushes back'),
                ],
                'electricity': [
                    ('What is the unit of electric current?', ['Volt', 'Ampere', 'Ohm', 'Watt'], 'Ampere'),
                    ('What is Ohm\'s Law?', ['V = IR', 'V = I/R', 'V = R/I', 'P = VI'], 'V = IR'),
                    ('What is the unit of resistance?', ['Volt', 'Ampere', 'Ohm', 'Watt'], 'Ohm'),
                    ('What does a battery provide?', ['Resistance', 'Current', 'Potential difference', 'Power'], 'Potential difference'),
                    ('What is the SI unit of electric charge?', ['Ampere', 'Volt', 'Coulomb', 'Ohm'], 'Coulomb'),
                    ('What is the function of a fuse in a circuit?', ['Increase current', 'Reduce voltage', 'Safety device', 'Store charge'], 'Safety device'),
                    ('What is a series circuit?', ['Components in parallel', 'Components in one path', 'Components in loops', 'Components combined'], 'Components in one path'),
                    ('Explain the difference between series and parallel circuits', [], 'Series has one current path, parallel has multiple branches with same voltage across each'),
                ],
                'light': [
                    ('What is the speed of light in vacuum?', ['3 x 10^6 m/s', '3 x 10^8 m/s', '3 x 10^10 m/s', '3 x 10^12 m/s'], '3 x 10^8 m/s'),
                    ('What happens when light passes through a convex lens?', ['Diverges', 'Converges', 'Reflects', 'Scatters'], 'Converges'),
                    ('What is the angle of incidence equal to?', ['Angle of refraction', 'Angle of reflection', '90 degrees', 'Critical angle'], 'Angle of reflection'),
                    ('What is refraction of light?', ['Bouncing of light', 'Bending of light', 'Absorption of light', 'Scattering of light'], 'Bending of light'),
                    ('What color has the longest wavelength?', ['Blue', 'Green', 'Red', 'Violet'], 'Red'),
                    ('What is a concave mirror used for?', ['Shaving mirror', 'Rear view mirror', 'Solar cooker', 'Both A and C'], 'Both A and C'),
                    ('What is the focal length of a plane mirror?', ['Zero', 'Infinite', 'Equal to object distance', 'Half of object distance'], 'Infinite'),
                    ('Explain the difference between reflection and refraction', [], 'Reflection is bouncing back of light, refraction is bending of light when passing through different media'),
                ],
            },
            'chemistry': {
                'atoms_and_molecules': [
                    ('What is the chemical symbol for water?', ['H2O', 'CO2', 'NaCl', 'O2'], 'H2O'),
                    ('What is the atomic number of carbon?', ['4', '6', '8', '12'], '6'),
                    ('What is a molecule?', ['Single atom', 'Group of atoms bonded together', 'Type of element', 'Charged particle'], 'Group of atoms bonded together'),
                    ('What are protons?', ['Negatively charged', 'Positively charged', 'Neutral', 'No charge'], 'Positively charged'),
                    ('What is the atomic number of oxygen?', ['6', '8', '10', '16'], '8'),
                    ('What is a covalent bond?', ['Transfer of electrons', 'Sharing of electrons', 'Metal-nonmetal bond', 'Ionic attraction'], 'Sharing of electrons'),
                    ('What is the chemical formula for carbon dioxide?', ['CO', 'CO2', 'C2O', 'CO3'], 'CO2'),
                    ('Explain the structure of an atom', [], 'Atom has nucleus with protons and neutrons, surrounded by electrons in shells/orbitals'),
                ],
                'chemical_reactions': [
                    ('What is a chemical reaction?', ['Physical change', 'Process forming new substances', 'Change in state', 'Mixing substances'], 'Process forming new substances'),
                    ('What is a catalyst?', ['Slows reaction', 'Speeds up reaction without being used', 'Reacts completely', 'Stops reaction'], 'Speeds up reaction without being used'),
                    ('What is the pH of pure water?', ['5', '6', '7', '8'], '7'),
                    ('What is an acid?', ['pH > 7', 'pH < 7', 'pH = 7', 'pH = 14'], 'pH < 7'),
                    ('What is oxidation?', ['Gain of electrons', 'Loss of electrons', 'Gain of protons', 'No change'], 'Loss of electrons'),
                    ('What is a base?', ['pH < 7', 'pH > 7', 'pH = 7', 'pH = 0'], 'pH > 7'),
                    ('What is the chemical formula for common salt?', ['NaCl', 'NaCl2', 'Na2Cl', 'KCl'], 'NaCl'),
                    ('Explain the difference between physical and chemical changes', [], 'Physical change alters form but not composition; chemical change creates new substances'),
                ],
            },
            'biology': {
                'cell_structure': [
                    ('What is the basic unit of life?', ['Atom', 'Cell', 'Tissue', 'Organ'], 'Cell'),
                    ('What is the function of the nucleus?', ['Energy production', 'Controls cell activities', 'Protein synthesis', 'Waste removal'], 'Controls cell activities'),
                    ('What organelle is responsible for energy production?', ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], 'Mitochondria'),
                    ('What is the cell wall made of in plants?', ['Cellulose', 'Chitin', 'Protein', 'Lipid'], 'Cellulose'),
                    ('What is the function of chloroplasts?', ['Storage', 'Photosynthesis', 'Respiration', 'Reproduction'], 'Photosynthesis'),
                    ('What is the jelly-like substance filling the cell?', ['Nucleoplasm', 'Cytoplasm', 'Cell sap', 'Matrix'], 'Cytoplasm'),
                    ('What is the function of ribosomes?', ['Energy production', 'Protein synthesis', 'Lipid synthesis', 'Waste removal'], 'Protein synthesis'),
                    ('Explain the difference between plant and animal cells', [], 'Plant cells have cell wall, chloroplasts, large vacuole; animal cells do not'),
                ],
                'reproduction': [
                    ('What is the male reproductive cell called?', ['Egg', 'Sperm', 'Zygote', 'Embryo'], 'Sperm'),
                    ('What is the female reproductive cell called?', ['Sperm', 'Egg', 'Zygote', 'Embryo'], 'Egg'),
                    ('What is the process of fusion of male and female gametes called?', ['Fertilization', 'Pollination', 'Germination', 'Metamorphosis'], 'Fertilization'),
                    ('What is the human gestation period?', ['6 months', '7 months', '8 months', '9 months'], '9 months'),
                    ('What is the function of the placenta?', ['Protect fetus', 'Nutrient/Oxygen exchange', 'Produce eggs', 'None'], 'Nutrient/Oxygen exchange'),
                    ('What is pollination in plants?', ['Fertilization', 'Transfer of pollen', 'Seed formation', 'Fruit development'], 'Transfer of pollen'),
                    ('What is binary fission?', ['Sexual reproduction', 'Asexual division into two', 'Budding', 'Spore formation'], 'Asexual division into two'),
                    ('Explain the process of fertilization', [], 'Sperm fuses with egg to form zygote, which develops into an embryo'),
                ],
            },
            'english': {
                'grammar': [
                    ('What is a noun?', ['Action word', 'Naming word', 'Describing word', 'Connecting word'], 'Naming word'),
                    ('What is a verb?', ['Naming word', 'Action word', 'Describing word', 'Modifying word'], 'Action word'),
                    ('Identify the verb: "She runs fast"', ['She', 'runs', 'fast', 'None'], 'runs'),
                    ('What is the past tense of "go"?', ['goed', 'went', 'gone', 'going'], 'went'),
                    ('What is an adjective?', ['Action word', 'Naming word', 'Describing word', 'Connecting word'], 'Describing word'),
                    ('Which is a proper noun?', ['city', 'river', 'London', 'mountain'], 'London'),
                    ('What is the plural of "child"?', ['childs', 'childes', 'children', 'child\'s'], 'children'),
                    ('Explain the difference between "their", "there", and "they\'re"', [], 'Their = possession, There = location, They\'re = they are'),
                ],
                'vocabulary': [
                    ('What is a synonym for "happy"?', ['sad', 'angry', 'joyful', 'tired'], 'joyful'),
                    ('What is an antonym of "hot"?', ['warm', 'cold', 'cool', 'mild'], 'cold'),
                    ('What does "enormous" mean?', ['tiny', 'very large', 'medium', 'average'], 'very large'),
                    ('What is a synonym for "brave"?', ['scared', 'courageous', 'weak', 'shy'], 'courageous'),
                    ('What does "benevolent" mean?', ['kind and generous', 'angry', 'lazy', 'sad'], 'kind and generous'),
                    ('What is an antonym of "ancient"?', ['old', 'modern', 'aged', 'historic'], 'modern'),
                    ('What does "whisper" mean?', ['shout', 'speak very softly', 'sing', 'cry'], 'speak very softly'),
                    ('Write a sentence using the word "extraordinary"', [], 'The fireworks display was extraordinary and beautiful'),
                ],
            },
            'hindi': {
                'grammar': [
                    ('??? ??? ??? ??? ??? ??? ??? ???', ['???', '???', '???', '???'], '???'),
                    ('??? ??? ?? "????" ??? ??? ??? ???', ['????', '?????', '????', '????'], '?????'),
                    ('??? ??? ??? ??? ??? ??? ???', ['??', '???', '???', '???'], '???'),
                    ('??? ??? ??? ??? ??? ??? ??? ???', ['??', '?', '???', '???'], '??'),
                    ('??? ??? "????" ??? ??? ??? ???', ['??', '????', '?????', '???'], '?????'),
                    ('????? ??? ????? ??? ??? ??? ??? ???', ['????', '????', '????', '???'], '????'),
                    ('??? ??? ?? ??? ??? ??? ??? ???', ['????', '?????', '???', '????'], '?????'),
                    ('??? ?? ?? ???? ?? ??? ??? ????', [], '??? ?? ???? ?? ??? ??? ?????? ?? ????? ?? ???? ?? ??'),
                ],
            },
            'social_studies': {
                'indian_history': [
                    ('Who is known as the Father of the Indian Nation?', ['Nehru', 'Gandhi', 'Bose', 'Ambedkar'], 'Gandhi'),
                    ('When did India gain independence?', ['1945', '1946', '1947', '1948'], '1947'),
                    ('Who was the first Prime Minister of India?', ['Gandhi', 'Nehru', 'Patel', 'Ambedkar'], 'Nehru'),
                    ('What is the capital of India?', ['Mumbai', 'New Delhi', 'Kolkata', 'Chennai'], 'New Delhi'),
                    ('Who wrote the Indian Constitution?', ['Nehru', 'Ambedkar', 'Patel', 'Radhakrishnan'], 'Ambedkar'),
                    ('In which year was the Indian Constitution adopted?', ['1947', '1949', '1950', '1952'], '1950'),
                    ('What is the national animal of India?', ['Lion', 'Tiger', 'Elephant', 'Peacock'], 'Tiger'),
                    ('Explain the significance of 26th January 1950', [], 'The Constitution of India came into effect, making India a republic'),
                ],
                'geography': [
                    ('What is the largest continent?', ['Africa', 'Asia', 'Europe', 'North America'], 'Asia'),
                    ('Which is the longest river in the world?', ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], 'Nile'),
                    ('Which ocean is the largest?', ['Atlantic', 'Pacific', 'Indian', 'Arctic'], 'Pacific'),
                    ('What is the highest mountain in the world?', ['K2', 'Mount Everest', 'Kangchenjunga', 'Lhotse'], 'Mount Everest'),
                    ('Which is the largest desert in the world?', ['Sahara', 'Gobi', 'Mojave', 'Thar'], 'Sahara'),
                    ('What is the capital of Japan?', ['Tokyo', 'Seoul', 'Beijing', 'Bangkok'], 'Tokyo'),
                    ('What is the population of Earth approximately?', ['6 billion', '7 billion', '8 billion', '9 billion'], '8 billion'),
                    ('Explain the water cycle', [], 'Water evaporates from oceans, forms clouds, falls as rain, and returns to oceans'),
                ],
                'civics': [
                    ('What is democracy?', ['Rule by one person', 'Rule by people', 'Rule by military', 'No government'], 'Rule by people'),
                    ('How many fundamental rights does the Indian Constitution guarantee?', ['4', '5', '6', '7'], '6'),
                    ('What is the minimum voting age in India?', ['16', '18', '21', '25'], '18'),
                    ('What is the Parliament of India called?', ['Congress', 'Sansad', 'Vidhan Sabha', 'Rajya Sabha'], 'Sansad'),
                    ('Who is the head of state in India?', ['Prime Minister', 'President', 'Governor', 'Chief Justice'], 'President'),
                    ('How many houses does the Indian Parliament have?', ['1', '2', '3', '4'], '2'),
                    ('What is the Lok Sabha?', ['Upper house', 'Lower house', 'Supreme court', 'State assembly'], 'Lower house'),
                    ('Explain the three branches of Indian government', [], 'Legislative (makes laws), Executive (implements laws), Judiciary (interprets laws)'),
                ],
            },
            'computer_science': {
                'programming': [
                    ('What does CPU stand for?', ['Central Program Unit', 'Central Processing Unit', 'Computer Personal Unit', 'Core Process Unit'], 'Central Processing Unit'),
                    ('What is an algorithm?', ['A programming language', 'Step-by-step problem solving method', 'A type of computer', 'A software'], 'Step-by-step problem solving method'),
                    ('What is a variable in programming?', ['A constant value', 'A storage location with a name', 'A type of loop', 'A function'], 'A storage location with a name'),
                    ('What is HTML used for?', ['Styling web pages', 'Creating web page structure', 'Programming logic', 'Database management'], 'Creating web page structure'),
                    ('What is a loop in programming?', ['A decision statement', 'A repeating block of code', 'A variable type', 'A function call'], 'A repeating block of code'),
                    ('What does "debugging" mean?', ['Writing code', 'Finding and fixing errors', 'Running code', 'Compiling'], 'Finding and fixing errors'),
                    ('What is an IP address?', ['A website name', 'A unique device identifier on network', 'A type of protocol', 'A software version'], 'A unique device identifier on network'),
                    ('Explain the difference between hardware and software', [], 'Hardware is physical components; software is programs and instructions'),
                ],
                'ai_and_data': [
                    ('What does AI stand for?', ['Automated Input', 'Artificial Intelligence', 'Advanced Internet', 'Automated Interface'], 'Artificial Intelligence'),
                    ('What is Machine Learning?', ['Manual programming', 'AI that learns from data', 'Hardware design', 'Network setup'], 'AI that learns from data'),
                    ('What is data?', ['Random numbers', 'Information processed by computer', 'Only text', 'Only numbers'], 'Information processed by computer'),
                    ('What is cloud computing?', ['Computing on local machines', 'Computing services over internet', 'Using physical servers', 'Network cables'], 'Computing services over internet'),
                    ('What is a database?', ['A spreadsheet', 'Organized collection of data', 'A programming language', 'A web browser'], 'Organized collection of data'),
                    ('What does cybersecurity protect?', ['Only passwords', 'Systems and data from threats', 'Only networks', 'Only devices'], 'Systems and data from threats'),
                    ('What is a neural network?', ['A type of hardware', 'AI model inspired by brain', 'A network cable', 'A web server'], 'AI model inspired by brain'),
                    ('Explain the concept of big data', [], 'Big data refers to extremely large datasets analyzed computationally to reveal patterns and trends'),
                ],
            },
        }

        # --- Subject aliases for matching ---
        subject_aliases = {
            'math': 'mathematics', 'maths': 'mathematics', 'mathematics': 'mathematics',
            'science': 'science', 'general science': 'science',
            'physics': 'physics', 'chemistry': 'chemistry',
            'biology': 'biology', 'bio': 'biology', 'life science': 'biology',
            'english': 'english', 'eng': 'english',
            'hindi': 'hindi',
            'social studies': 'social_studies', 'social science': 'social_studies', 'sst': 'social_studies',
            'history': 'social_studies', 'geography': 'social_studies', 'geo': 'social_studies',
            'civics': 'social_studies', 'political science': 'social_studies',
            'computer': 'computer_science', 'computers': 'computer_science',
            'computer science': 'computer_science', 'cs': 'computer_science', 'it': 'computer_science',
            'sanskrit': 'hindi',
        }

        topic_aliases = {
            'algebra': 'algebra', 'linear equations': 'algebra', 'quadratic': 'algebra',
            'geometry': 'geometry', 'shapes': 'geometry', 'angles': 'geometry',
            'fraction': 'fractions', 'fractions': 'fractions', 'decimals': 'fractions',
            'ratio': 'ratio_and_proportions', 'ratios': 'ratio_and_proportions',
            'proportion': 'ratio_and_proportions', 'proportions': 'ratio_and_proportions',
            'unitary': 'ratio_and_proportions', 'unitary method': 'ratio_and_proportions',
            'percentage': 'percentage', 'percent': 'percentage', 'percentages': 'percentage',
            'trig': 'trigonometry', 'trigonometry': 'trigonometry',
            'stats': 'statistics', 'statistics': 'statistics', 'probability': 'statistics',
            'force': 'force_and_motion', 'motion': 'force_and_motion', 'newton': 'force_and_motion',
            'electricity': 'electricity', 'circuits': 'electricity', 'current': 'electricity',
            'light': 'light', 'optics': 'light', 'reflection': 'light', 'refraction': 'light',
            'atom': 'atoms_and_molecules', 'molecules': 'atoms_and_molecules', 'atomic': 'atoms_and_molecules',
            'chemical reaction': 'chemical_reactions', 'reactions': 'chemical_reactions',
            'cell': 'cell_structure', 'cells': 'cell_structure',
            'reproduction': 'reproduction', 'reproductive': 'reproduction',
            'photosynthesis': 'photosynthesis',
            'human body': 'human_body', 'body': 'human_body', 'organs': 'human_body',
            'grammar': 'grammar', 'vocabulary': 'vocabulary', 'vocab': 'vocabulary', 'word': 'vocabulary',
            'history': 'indian_history', 'indian history': 'indian_history', 'freedom': 'indian_history',
            'geography': 'geography', 'rivers': 'geography', 'mountains': 'geography', 'continents': 'geography',
            'civics': 'civics', 'democracy': 'civics', 'constitution': 'civics', 'government': 'civics',
            'programming': 'programming', 'coding': 'programming', 'code': 'programming',
            'ai': 'ai_and_data', 'machine learning': 'ai_and_data', 'data': 'ai_and_data',
        }

        # --- Resolve subject ---
        mapped_subject = subject_aliases.get(lower_subject, None)
        if not mapped_subject:
            for alias, mapped in subject_aliases.items():
                if alias in lower_subject:
                    mapped_subject = mapped
                    break
        if not mapped_subject:
            mapped_subject = 'mathematics'

        # --- Resolve topic ---
        mapped_topic = topic_aliases.get(lower_topic, None)
        if not mapped_topic:
            for alias, mapped in topic_aliases.items():
                if alias in lower_topic:
                    mapped_topic = mapped
                    break

        # --- Find the best matching question set ---
        selected_questions = None

        if mapped_subject in question_bank and mapped_topic and mapped_topic in question_bank[mapped_subject]:
            selected_questions = question_bank[mapped_subject][mapped_topic]

        if not selected_questions and mapped_subject in question_bank:
            for topic_key, questions in question_bank[mapped_subject].items():
                if lower_topic:
                    topic_words = topic_key.split('_')
                    topic_question_words = lower_topic.split()
                    if any(word in topic_words for word in topic_question_words):
                        selected_questions = questions
                        break

        if not selected_questions and mapped_subject in question_bank:
            first_key = list(question_bank[mapped_subject].keys())[0]
            selected_questions = question_bank[mapped_subject][first_key]

        if not selected_questions:
            first_subject_key = list(question_bank.keys())[0]
            first_topic_key = list(question_bank[first_subject_key].keys())[0]
            selected_questions = question_bank[first_subject_key][first_topic_key]

        marks_per_q = max(1.0, total_marks / max(num_questions, 1))

        mcq_short = [(q_text, opts, ans) for q_text, opts, ans in selected_questions if opts]
        descriptive = [(q_text, opts, ans) for q_text, opts, ans in selected_questions if not opts]

        random.shuffle(mcq_short)

        questions = []
        used_count = 0

        for q_text, opts, answer in mcq_short[:num_questions - 1]:
            if used_count >= num_questions - 1:
                break
            q_type = 'mcq' if opts else 'short'
            questions.append({
                'question_text': q_text,
                'question_type': q_type,
                'options': opts,
                'correct_answer': answer,
                'marks': round(marks_per_q, 1),
                'concept_tag': topic if topic else mapped_subject
            })
            used_count += 1

        if descriptive:
            q_text, opts, answer = descriptive[0]
            questions.append({
                'question_text': q_text,
                'question_type': 'descriptive',
                'options': opts,
                'correct_answer': answer,
                'marks': round(marks_per_q, 1),
                'concept_tag': topic if topic else mapped_subject
            })
        elif mcq_short and used_count < len(mcq_short):
            q_text, opts, answer = mcq_short[used_count]
            questions.append({
                'question_text': q_text,
                'question_type': 'short' if opts else 'descriptive',
                'options': opts,
                'correct_answer': answer,
                'marks': round(marks_per_q, 1),
                'concept_tag': topic if topic else mapped_subject
            })

        while len(questions) < num_questions:
            idx = len(questions)
            questions.append({
                'question_text': f'What is the main concept of {topic if topic else mapped_subject}?',
                'question_type': 'short',
                'options': [],
                'correct_answer': f'{topic if topic else mapped_subject} involves key principles and concepts',
                'marks': round(marks_per_q, 1),
                'concept_tag': topic if topic else mapped_subject
            })

        return questions

    # ------------------------------------------------------------------
    # Answer sheet analysis (Gemini Vision)
    # ------------------------------------------------------------------

    def analyze_answer_sheet(self, image_data, questions_data):
        self._ensure_init()
        if not self._client:
            return self._fallback_analysis(questions_data)

        prompt = f"""You are an AI exam grader. Analyze this student's answer sheet image.

The quiz questions and correct answers are:
{json.dumps(questions_data, indent=2)}

Please:
1. Read the handwritten/printed answers
2. Identify student name and roll number if visible
3. Compare each answer with the correct answer
4. Calculate marks for each question
5. Detect mistakes and provide feedback

Return JSON format:
{{
    "student_name": "...",
    "roll_number": "...",
    "answers": [
        {{
            "question_id": 1,
            "student_answer": "...",
            "marks_obtained": 5,
            "is_correct": true,
            "feedback": "..."
        }}
    ],
    "total_score": 0,
    "total_marks": 0,
    "confidence": 0.95,
    "strengths": ["..."],
    "weaknesses": ["..."],
    "overall_feedback": "..."
}}"""

        try:
            image_bytes = base64.b64decode(image_data) if isinstance(image_data, str) else image_data
            if not self._using_old_sdk:
                response = self._client.models.generate_content(
                    model=self._model_name,
                    contents=[prompt, image_bytes]
                )
                text = response.text
            else:
                model = self._client.GenerativeModel(self._model_name)
                response = model.generate_content([prompt, image_bytes])
                text = response.text
            if text:
                result = self._extract_json(text)
                if result:
                    return result
        except Exception as e:
            print(f"Gemini Vision analysis error: {e}")
        return self._fallback_analysis(questions_data)

    # ------------------------------------------------------------------
    # Report generation
    # ------------------------------------------------------------------

    def generate_report(self, student_data, report_type='student', language='english'):
        language_prompt = {
            'english': 'Generate in English',
            'hindi': 'Generate in Hindi (Devanagari script)',
            'telugu': 'Generate in Telugu',
            'tamil': 'Generate in Tamil',
            'kannada': 'Generate in Kannada',
            'malayalam': 'Generate in Malayalam',
            'marathi': 'Generate in Marathi',
            'bengali': 'Generate in Bengali',
            'gujarati': 'Generate in Gujarati',
            'punjabi': 'Generate in Punjabi',
            'urdu': 'Generate in Urdu'
        }
        lang_instruction = language_prompt.get(language, 'Generate in English')

        prompt = f"""{lang_instruction}

Generate a {report_type} report for the following student data:
{json.dumps(student_data, indent=2)}

The report should include:
1. Overall performance summary
2. Strengths (topics mastered)
3. Weaknesses (topics needing improvement)
4. Specific recommendations
5. Next steps for improvement

Return as valid JSON:
{{
    "summary": "...",
    "strengths": ["..."],
    "weaknesses": ["..."],
    "recommendations": ["..."],
    "next_steps": ["..."],
    "performance_score": 0-100
}}"""

        text = self._generate(prompt)
        if text:
            result = self._extract_json(text)
            if result:
                return result
        return self._fallback_report(student_data, report_type)

    def generate_feedback(self, student_name, score, total_marks, strengths, weaknesses):
        prompt = f"""Generate personalized feedback for student {student_name}.
Score: {score}/{total_marks}
Strengths: {json.dumps(strengths)}
Weaknesses: {json.dumps(weaknesses)}

Provide encouraging, constructive feedback that helps the student improve.
Return as JSON:
{{
    "feedback": "...",
    "encouragement": "...",
    "study_tips": ["..."],
    "focus_areas": ["..."]
}}"""

        text = self._generate(prompt)
        if text:
            result = self._extract_json(text)
            if result:
                return result
        return {
            "feedback": f"Good effort, {student_name}! Keep practicing to improve your scores.",
            "encouragement": "You have great potential!",
            "study_tips": ["Review weak concepts daily", "Practice more problems", "Take short notes"],
            "focus_areas": weaknesses
        }

    def translate_text(self, text_to_translate, target_language):
        prompt = f"""Translate the following educational text to {target_language}.
Keep the educational meaning intact.

Text: {text_to_translate}

Return only the translated text, no additional formatting."""
        text = self._generate(prompt)
        if text:
            return text.strip()
        return text_to_translate

    # ------------------------------------------------------------------
    # Fallbacks
    # ------------------------------------------------------------------

    def _fallback_analysis(self, questions_data):
        total = sum(q.get('marks', 0) for q in questions_data)
        return {
            'student_name': 'Unknown',
            'roll_number': 'Unknown',
            'answers': [{'question_id': q.get('id', i), 'student_answer': 'Sample answer',
                         'marks_obtained': q.get('marks', 0) * 0.7, 'is_correct': True,
                         'feedback': 'Good answer'}
                        for i, q in enumerate(questions_data)],
            'total_score': total * 0.7,
            'total_marks': total,
            'confidence': 0.8,
            'strengths': ['Shows good understanding'],
            'weaknesses': ['Needs more practice'],
            'overall_feedback': 'Good attempt! Keep practicing.'
        }

    def _fallback_report(self, student_data, report_type):
        return {
            'summary': f"Student has completed {student_data.get('quizzes_taken', 0)} quizzes with an average score of {student_data.get('average_score', 0)}%.",
            'strengths': ['Consistent performance', 'Good attendance'],
            'weaknesses': ['Needs improvement in problem-solving'],
            'recommendations': ['Practice daily', 'Review concepts regularly'],
            'next_steps': ['Focus on weak areas', 'Attempt more practice tests'],
            'performance_score': student_data.get('average_score', 70)
        }
