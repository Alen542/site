import os
from app import create_app

app = create_app()

if __name__ == '__main__':
    # use_reloader=False kora hoyeche jate websocket thread duibar start na hoy
    # host='0.0.0.0' adds LAN access (mobile on same router)
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=5000, debug=debug_mode, use_reloader=False)
