"""
Vercel serverless entry point for ShikshakIQ Flask API.
"""
import os
import sys

# ── Override paths for Vercel's read-only filesystem ──
# SQLite database must be in /tmp (the only writable directory on Vercel)
os.environ.setdefault('DATABASE_URL', 'sqlite:////tmp/shikshakiq.db')
os.environ.setdefault('UPLOAD_FOLDER', '/tmp/uploads')

# Ensure backend/ is in the Python import path
backend_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'backend'
)
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Create writable directories under /tmp
os.makedirs('/tmp/uploads', exist_ok=True)
os.makedirs('/tmp/dist', exist_ok=True)

from app import create_app

flask_app = create_app()

# Override static folder to /tmp/dist so the catch-all SPA route
# doesn't crash when ../dist doesn't exist alongside the function.
flask_app.static_folder = '/tmp/dist'

# Vercel expects `app` as the WSGI callable
app = flask_app
