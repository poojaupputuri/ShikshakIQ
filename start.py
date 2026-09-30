"""ShikshakIQ - Start both backend and frontend with a single command.

Usage:
    python start.py

Or just double-click the file on Windows.
Press Ctrl+C to stop both servers.
"""
import subprocess
import sys
import os
import time
import signal
import threading


def print_colored(text, color="cyan"):
    colors = {
        "cyan": "\033[96m",
        "green": "\033[92m",
        "yellow": "\033[93m",
        "red": "\033[91m",
        "purple": "\033[95m",
        "reset": "\033[0m",
    }
    c = colors.get(color, colors["reset"])
    print(f"{c}{text}{colors['reset']}")


def stream_output(process, prefix, color):
    """Read and print process output line by line."""
    for line in iter(process.stdout.readline, ""):
        if line:
            print_colored(f"[{prefix}] {line.rstrip()}", color)


# Resolve project paths
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(script_dir, "backend")
frontend_dir = os.path.join(script_dir, "shikshak-iq")

processes = []


def cleanup():
    print_colored("\nShutting down servers...", "yellow")
    for p in processes:
        if p.poll() is None:
            p.terminate()
    for p in processes:
        try:
            p.wait(timeout=3)
        except subprocess.TimeoutExpired:
            p.kill()
    print_colored("All servers stopped.", "green")


def signal_handler(signum, frame):
    cleanup()
    sys.exit(0)


signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

print_colored("=" * 60, "purple")
print_colored("  ShikshakIQ - Starting Application", "purple")
print_colored("=" * 60, "purple")
print()

# ---------------- Start Backend ----------------
print_colored("Starting Backend (Flask)...", "cyan")
backend = subprocess.Popen(
    [sys.executable, "app.py"],
    cwd=backend_dir,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1,
)
processes.append(backend)

backend_thread = threading.Thread(
    target=stream_output, args=(backend, "Backend", "cyan"), daemon=True
)
backend_thread.start()

# Wait for backend to be ready
time.sleep(1)
print_colored("  Backend starting on http://localhost:5000", "green")

# ---------------- Start Frontend ----------------
print_colored("Starting Frontend (Vite)...", "green")
# Use npx to run vite from the project directory
frontend_cmd = ["npx", "vite", "--host"]

frontend = subprocess.Popen(
    frontend_cmd,
    cwd=frontend_dir,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1,
)
processes.append(frontend)

frontend_thread = threading.Thread(
    target=stream_output, args=(frontend, "Frontend", "green"), daemon=True
)
frontend_thread.start()

time.sleep(1)
print_colored("  Frontend starting on http://localhost:5173", "green")

print()
print_colored("-" * 60, "purple")
print_colored("  ✅ Open your browser at: http://localhost:5173", "green")
print_colored("  📧 Teacher login: lakshmi@shikshakiq.com / Teacher@123", "yellow")
print_colored("  🎓 Student login: student.aarav / student123", "yellow")
print_colored("  🛑 Press Ctrl+C to stop both servers", "yellow")
print_colored("-" * 60, "purple")
print()

# Keep running
try:
    while True:
        time.sleep(1)
        # Check if processes are still running
        if backend.poll() is not None:
            print_colored("⚠️  Backend stopped unexpectedly!", "red")
            break
        if frontend.poll() is not None:
            print_colored("⚠️  Frontend stopped unexpectedly!", "red")
            break
except KeyboardInterrupt:
    pass
finally:
    cleanup()
