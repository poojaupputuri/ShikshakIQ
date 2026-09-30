"""
WSGI entry point for PythonAnywhere deployment.

PythonAnywhere loads this file to serve the Flask application.
It expects a variable named `application` (the WSGI callable).

How to use:
1. Clone your repo to PythonAnywhere
2. Create a virtualenv and install dependencies
3. Set up the web app with this file as the WSGI config
4. Configure static files and environment variables
"""
import os
import sys

# Add the backend directory to the Python path so imports work
# On PythonAnywhere, the project is typically at:
#   /home/yourusername/shikshak-iq/
# and this wsgi.py is at:
#   /home/yourusername/shikshak-iq/backend/wsgi.py
path = os.path.dirname(os.path.abspath(__file__))
if path not in sys.path:
    sys.path.insert(0, path)

# Import the Flask app factory
from app import create_app

# Create the Flask application
# PythonAnywhere calls this 'application' by convention
application = create_app()
