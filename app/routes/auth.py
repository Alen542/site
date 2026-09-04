import os
import time
import secrets
from flask import Blueprint, render_template, redirect, url_for, request, session, jsonify
from functools import wraps

auth_bp = Blueprint('auth', __name__)
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', '1234')

# Simple in-memory rate limiter for login
login_attempts = {}

@auth_bp.before_app_request
def ensure_csrf():
    if 'csrf_token' not in session:
        session['csrf_token'] = secrets.token_hex(16)

@auth_bp.before_app_request
def csrf_protect():
    if request.method in ["POST", "PUT", "DELETE"]:
        token = session.get('csrf_token')
        req_token = request.headers.get('X-CSRFToken') or request.form.get('csrf_token')
        if not req_token or req_token != token:
            return jsonify({"error": "CSRF verification failed!"}), 403

@auth_bp.app_context_processor
def inject_csrf():
    return dict(csrf_token=session.get('csrf_token', ''))

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            if request.path.startswith('/api/'):
                return jsonify({"error": "Unauthorized"}), 401
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    ip = request.remote_addr
    now = time.time()
    
    # Rate Limiting check
    if ip in login_attempts:
        login_attempts[ip] = [t for t in login_attempts[ip] if now - t < 300]
        if len(login_attempts[ip]) >= 5:
            return render_template('login.html', error="Too many attempts! Please try again in 5 minutes.")
            
    if request.method == 'POST':
        if request.form.get('password') == ADMIN_PASSWORD:
            session['logged_in'] = True
            if ip in login_attempts: del login_attempts[ip]
            return redirect(url_for('views.dashboard'))
            
        login_attempts.setdefault(ip, []).append(now)
        return render_template('login.html', error="Invalid Password!")
        
    return render_template('login.html', error=None)

@auth_bp.route('/logout')
def logout():
    session.pop('logged_in', None)
    return redirect(url_for('auth.login'))
