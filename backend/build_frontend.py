#!/usr/bin/env python3
"""Build the frontend on PythonAnywhere - all output goes to build.log"""
import subprocess, os, sys

os.chdir('/home/shikshakiq/shikshakIQ')
logfile = '/home/shikshakiq/shikshakIQ/build.log'

def log(msg):
    with open(logfile, 'a') as f:
        f.write(str(msg) + '\n')
    print(msg)

log("=== Frontend Build Script ===")

# 1. Find npm
log("\n--- Finding npm ---")
for cmd in ['which npm', 'command -v npm', 'find /usr -name npm -type f 2>/dev/null | head -3', 'ls -la /opt/nvm/versions/node/*/bin/npm 2>/dev/null || true', 'ls -la /usr/local/nvm/versions/node/*/bin/npm 2>/dev/null || true']:
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
    log(f"$ {cmd}")
    if r.stdout.strip():
        log(f"  FOUND: {r.stdout.strip()}")
    if r.stderr:
        log(f"  err: {r.stderr.strip()[:200]}")

# 2. Try common npm paths
npm_paths = [
    '/usr/bin/npm',
    '/usr/local/bin/npm',
    '/opt/bin/npm',
    '/usr/share/nodejs/bin/npm',
]
for p in npm_paths:
    if os.path.exists(p):
        log(f"npm found at: {p}")

# 3. Also check nvm (Node Version Manager)
nvm_result = subprocess.run('ls /home/shikshakiq/.nvm/versions/node/*/bin/npm 2>/dev/null || echo "no nvm"', shell=True, capture_output=True, text=True, timeout=10)
log(f"NVM check: {nvm_result.stdout.strip()}")

# 4. See what Node.js related packages are available
r = subprocess.run('dpkg -l 2>/dev/null | grep -i node | head -10 || echo "no dpkg"', shell=True, capture_output=True, text=True, timeout=10)
log(f"Node packages: {r.stdout.strip()[:500]}")

log("\n=== Build started at: " + subprocess.run(['date'], capture_output=True, text=True).stdout.strip() + " ===")

# 5. Try to build
for build_cmd in [
    'cd /home/shikshakiq/shikshakIQ/shikshak-iq && npm install 2>&1',
    'cd /home/shikshakiq/shikshakIQ/shikshak-iq && node --version 2>&1',
    'cd /home/shikshakiq/shikshakIQ/shikshak-iq && npm --version 2>&1',
]:
    log(f"\n$ {build_cmd}")
    r = subprocess.run(build_cmd, shell=True, capture_output=True, text=True, timeout=120)
    log(r.stdout[-2000:] if len(r.stdout) > 2000 else r.stdout)
    if r.stderr:
        log(f"ERR: {r.stderr[-1000:] if len(r.stderr) > 1000 else r.stderr}")

log("\n=== Script finished ===")
