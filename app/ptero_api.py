import requests, os, json, re, websocket, threading, time
from dotenv import load_dotenv

load_dotenv()
PANEL_URL = os.getenv('PANEL_URL')
SERVER_ID = os.getenv('SERVER_ID')
API_KEY = os.getenv('CLIENT_API_KEY')

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

console_logs = []
current_stats = {"status": "connecting", "cpu": 0, "ram": 0}

def connect_to_pterodactyl_ws():
    global current_stats, console_logs
    while True:
        try:
            url = f"{PANEL_URL}/api/client/servers/{SERVER_ID}/websocket"
            res = requests.get(url, headers=headers)
            
            if res.status_code != 200:
                print(f"WS_LOG: Failed to get socket: {res.status_code}")
                time.sleep(5)
                continue
                
            data = res.json()['data']
            token = data['token']
            socket_url = data['socket']
            
            def on_open(ws):
                print('WS_LOG: Connected to server console!')
                ws.send(json.dumps({"event": "auth", "args": [token]}))
                
            def on_message(ws, message):
                global current_stats, console_logs
                try:
                    msg = json.loads(message)
                except: return
                event = msg.get("event")
                
                if event == "auth success":
                    print('WS_LOG: Auth success, requesting stats and logs...')
                    ws.send(json.dumps({"event": "send stats", "args": []}))
                    ws.send(json.dumps({"event": "send logs", "args": []}))
                elif event in ["console output", "daemon message", "daemon error"]:
                    args = msg.get("args") or []
                    for line in args:
                        console_logs.append(str(line))
                    
                    while len(console_logs) > 300:
                        console_logs.pop(0)
                elif event == "stats":
                    try:
                        args = msg.get("args")
                        if args and len(args) > 0:
                            st = json.loads(args[0])
                            current_stats["cpu"] = round(st.get("cpu_absolute", 0), 2)
                            current_stats["ram"] = round(st.get("memory_bytes", 0) / (1024*1024), 2)
                            current_stats["status"] = st.get("state", current_stats.get("status", "running"))
                    except Exception as e:
                        print(f"Stats parse error: {e}")
                elif event == "status":
                    args = msg.get("args")
                    if args and len(args) > 0:
                        current_stats["status"] = args[0]
                elif event == "token expiring":
                    print('WS_LOG: Token expiring soon... Fetching new token seamlessly.')
                    try:
                        refresh_url = f"{PANEL_URL}/api/client/servers/{SERVER_ID}/websocket"
                        refresh_res = requests.get(refresh_url, headers=headers)
                        if refresh_res.status_code == 200:
                            new_token = refresh_res.json()['data']['token']
                            ws.send(json.dumps({"event": "auth", "args": [new_token]}))
                            print('WS_LOG: Token refreshed and authenticated seamlessly.')
                        else:
                            print('WS_LOG: Failed to refresh token. Forcing reconnect.')
                            ws.close()
                    except Exception as e:
                        print(f"WS_LOG: Error refreshing token: {e}")
                        ws.close()
                elif event == "jwt error":
                    print('WS_LOG: JWT Error received from panel. Forcing reconnect.')
                    ws.close()

            def on_error(ws, error):
                print(f"WS_LOG: Error: {error}")
                
            def on_close(ws, close_status_code, close_msg):
                print("WS_LOG: Connection lost. Reconnecting...")

            ws = websocket.WebSocketApp(
                socket_url,
                on_open=on_open,
                on_message=on_message,
                on_error=on_error,
                on_close=on_close
            )
            ws.run_forever(origin=PANEL_URL, ping_interval=30, ping_timeout=10)
        except Exception as e:
            print(f"WS_LOG: Task Error: {e}")
        
        time.sleep(3)

# Use a persistent session to drastically improve speed via connection pooling
api_session = requests.Session()
api_session.headers.update(headers)

def api_req(method, endpoint, json_data=None, params=None):
    url = f"{PANEL_URL}/api/client/servers/{SERVER_ID}{endpoint}"
    try:
        if method == 'GET':
            return api_session.get(url, params=params, timeout=10)
        elif method == 'POST':
            return api_session.post(url, json=json_data, timeout=15)
        elif method == 'PUT':
            return api_session.put(url, json=json_data, timeout=15)
        elif method == 'DELETE':
            return api_session.delete(url, json=json_data, timeout=15)
    except requests.exceptions.RequestException as e:
        print(f"API Error ({endpoint}): {e}")
        # Return a dummy response object on crash
        class DummyRes:
            status_code = 500
            text = str(e)
            def json(self): return {"errors": [{"detail": "Panel connection timed out or failed"}]}
        return DummyRes()

def start_ws_thread():
    ws_thread = threading.Thread(target=connect_to_pterodactyl_ws, daemon=True)
    ws_thread.start()


