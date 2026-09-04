import os
from flask import Flask
from dotenv import load_dotenv

def create_app():
    load_dotenv()
    
    # Template ar static file gulo thik path theke load korar jonno
    app = Flask(__name__, template_folder='../templates', static_folder='../static')
    app.secret_key = os.getenv('FLASK_SECRET_KEY', os.urandom(24))
    
    # Secure session cookies
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    
    with app.app_context():
        # Blueprint ba routes import kora hocche
        from .routes.auth import auth_bp
        from .routes.views import views_bp
        from .routes.api import api_bp
        
        app.register_blueprint(auth_bp)
        app.register_blueprint(views_bp)
        app.register_blueprint(api_bp)
        
        # WebSocket thread ta ekhan theke start hobe
        from .ptero_api import start_ws_thread
        start_ws_thread()
        
    return app
