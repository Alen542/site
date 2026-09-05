import os
import requests
from flask import Blueprint, jsonify, request
from .auth import login_required
from ..ptero_api import api_req, console_logs, current_stats, start_ws_thread

api_bp = Blueprint('api', __name__, url_prefix='/api')

@api_bp.route('/stats')
@login_required
def stats():
    start_ws_thread()
    return jsonify(current_stats)

@api_bp.route('/logs')
@login_required
def logs():
    start_ws_thread()
    return jsonify({"logs": console_logs})

@api_bp.route('/power', methods=['POST'])
@login_required
def power():
    action = request.json.get('action')
    api_req('POST', '/power', {"signal": action})
    return jsonify({"success": True})

def safe_error(res):
    try:
        err = res.json()
        if "errors" in err and len(err["errors"]) > 0:
            return err["errors"][0].get("detail", "Server error")
    except:
        pass
    return f"Pterodactyl API Error ({res.status_code})"

@api_bp.route('/command', methods=['POST'])
@login_required
def send_cmd():
    cmd = request.json.get('command')
    res = api_req('POST', '/command', {"command": cmd})
    if res.status_code == 204: return jsonify({"success": True})
    return jsonify({"error": safe_error(res)}), 400

@api_bp.route('/files/list')
@login_required
def list_files():
    d = request.args.get('dir', '/')
    res = api_req('GET', '/files/list', params={'directory': d})
    return jsonify(res.json() if res.status_code == 200 else {"error": safe_error(res)})

@api_bp.route('/files/content', methods=['GET', 'POST'])
@login_required
def file_content():
    file_path = request.args.get('file')
    if request.method == 'GET':
        res = api_req('GET', '/files/contents', params={'file': file_path})
        return res.text if res.status_code == 200 else "Error loading file"
    else:
        content = request.data.decode('utf-8')
        from ..ptero_api import api_session
        res = api_session.post(
            f"{os.getenv('PANEL_URL')}/api/client/servers/{os.getenv('SERVER_ID')}/files/write", 
            headers={"Content-Type": "text/plain"},
            params={"file": file_path}, 
            data=content.encode('utf-8'),
            timeout=15
        )
        return jsonify({"success": res.status_code in [200, 204]})

@api_bp.route('/files/action', methods=['POST'])
@login_required
def file_action():
    data = request.json
    action = data.get('action')
    root = data.get('root', '/')
    res = None
    
    if action == 'create-folder':
        res = api_req('POST', '/files/create-folder', {"root": root, "name": data.get('name')})
    elif action == 'delete':
        res = api_req('POST', '/files/delete', {"root": root, "files": data.get('files')})
    elif action == 'rename':
        res = api_req('POST', '/files/rename', {"root": root, "files": [{"from": data.get('from'), "to": data.get('to')}]})
    elif action == 'copy':
        res = api_req('POST', '/files/copy', {"location": data.get('location')})
    elif action == 'compress':
        res = api_req('POST', '/files/compress', {"root": root, "files": data.get('files')})
    elif action == 'decompress':
        res = api_req('POST', '/files/decompress', {"root": root, "file": data.get('file')})
    elif action == 'chmod':
        res = api_req('POST', '/files/chmod', {"root": root, "files": [{"file": data.get('file'), "mode": data.get('mode')}]})
    elif action == 'download':
        dl_res = api_req('GET', '/files/download', params={'file': data.get('file')})
        if dl_res.status_code == 200:
            return jsonify({"success": True, "url": dl_res.json()['attributes']['url']})
        return jsonify({"success": False, "error": safe_error(dl_res)})
    
    if res:
        return jsonify({"success": res.status_code in [200, 204, 202], "error": safe_error(res) if res.status_code not in [200, 204, 202] else None})
    return jsonify({"error": "Invalid action"}), 400
    
@api_bp.route('/activity')
@login_required
def activity():
    res = api_req('GET', '/activity')
    return jsonify(res.json() if res.status_code == 200 else {"error": safe_error(res)})
    
@api_bp.route('/startup', methods=['GET', 'PUT'])
@login_required
def handle_startup():
    if request.method == 'GET':
        res = api_req('GET', '/startup')
        return jsonify(res.json() if res.status_code == 200 else {"error": safe_error(res)})
    else:
        data = request.json
        res = api_req('PUT', '/startup/variable', {"key": data['key'], "value": data['value']})
        return jsonify({"success": res.status_code == 200, "error": safe_error(res) if res.status_code != 200 else None})
