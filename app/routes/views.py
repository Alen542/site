from flask import Blueprint, render_template
from .auth import login_required

views_bp = Blueprint('views', __name__)

@views_bp.route('/')
@login_required
def dashboard():
    return render_template('dashboard.html')

@views_bp.route('/files')
@login_required
def files():
    return render_template('files.html')

@views_bp.route('/settings')
@login_required
def settings():
    return render_template('settings.html')
