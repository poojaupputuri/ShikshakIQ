import os
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, send_from_directory, jsonify
from config import Config
from extensions import db, jwt, cors
from routes.auth_routes import auth_bp
from routes.admin_routes import admin_bp
from routes.student_routes import student_bp
from routes.quiz_routes import quiz_bp
from routes.analytics_routes import analytics_bp
from routes.paper_routes import paper_bp
from routes.student_portal_routes import student_portal_bp
from routes.intervention_routes import intervention_bp
from routes.notification_routes import notification_bp
from routes.remediation_routes import remediation_bp
from seed import seed_data


def _warmup_gemini():
    """Pre-import google.generativeai in background to avoid 10s delay on first request"""
    import threading
    def _do_import():
        try:
            import google.generativeai
        except ImportError:
            try:
                import google.genai
            except ImportError:
                pass
        except Exception:
            pass
    t = threading.Thread(target=_do_import, daemon=True)
    t.start()


def create_app():
    app = Flask(__name__, static_folder='../dist')
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(quiz_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(paper_bp)
    app.register_blueprint(student_portal_bp)
    app.register_blueprint(intervention_bp)
    app.register_blueprint(notification_bp)
    app.register_blueprint(remediation_bp)

    # Create upload directory
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

    # Create tables and seed data
    with app.app_context():
        db.create_all()
        try:
            seed_data(app)
        except Exception as e:
            print(f"Seed warning: {e}")

    # Warm up Gemini import in background
    _warmup_gemini()

    # Serve React frontend
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react(path):
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')

    # Health check
    @app.route('/api/health')
    def health_check():
        return jsonify({'status': 'healthy', 'message': 'ShikshakIQ API is running'})

    # Error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Resource not found'}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': 'Internal server error'}), 500

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'error': 'Invalid or expired token'}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'error': 'Authorization token is missing'}), 401

    return app


if __name__ == '__main__':
    app = create_app()
    print("ShikshakIQ Backend Server Starting...")
    print(f"API: http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=Config.DEBUG)
