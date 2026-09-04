# Pterodactyl Panel API Reference (Banglish)

Ei file e amader Hosting API/Panel er backend logic ar Pterodactyl er sathe kivabe connection kora hoyeche tar purno biboron deya roilo, jate vobisshote kono confusion na hoy.

## 1. Core Structure
Amader app ti Flask Framework diye banano ar eta ekta proper app factory method follow kore:
- **un.py**: Ekhan theke server chalu hoy (python run.py).
- **pp/ Folder**: Ekhane asol code gulo thake.
  - **__init__.py**: Flask App initialize kore ar WebSocket Thread chalu kore.
  - **outes.py**: Frontend theke asa sob web request (API, page load) handle kore.
  - **ptero_api.py**: Pterodactyl er sathe joto REST API ar WebSocket connection ache sob ekhane logic lekha.

*(Alert: Vobisshote root folder e kokhono pp.py banale jhamela hobe, asol kaj pp folder e korte hobe!)*

## 2. Real-Time Data (WebSocket Masterplan)
Amader Console ar CPU/RAM er live data pura 100% real-time e kaj kore **WebSocket** er maddhome. 

### Kivabe kaj kore:
1. **Token Collect:** Prothome REST API diye /api/client/servers/{SERVER_ID}/websocket endpoint e GET request kore socket url ar temporary token ana hoy.
2. **Auth Request:** WebSocket connect howar sathe sathei {"event": "auth", "args": ["token..."]} pathate hoy.
3. **Send Stats Request:** Jokhon server theke "auth success" message fire ase, thik tarpor amra {"event": "send stats", "args": [None]} pathai. Eta na pathale server CPU/RAM er data live dibe na.
4. **Data Catching:** 
   - event == "console output": Terminal er joto output asche sob ekhane dhore console_logs list e append kora hoy.
   - event == "stats": Pterodactyl theke asa Memory, CPU er array theke value ber kore instantly current_stats global variable e update kora hoy.
   - event == "status": Server Running naki Offline ota ekhane catch kora hoy.

Ei puro system ta ekta alada Daemon Thread e cholte thake, jar fole main web server bindu matro slow hoy na.

## 3. Frontend Data Fetching (Cache-Busting)
Frontend e (jemon dashboard.html) proti 1 second e amra amader nijeder backend theke data niye ashi (/api/stats). 
Jate mobile browser over-smartness kore purono cache data na dekhay, tar jonno amra protyek request er sathe ekta auto-changing timestamp jure di:
`javascript
fetch('/api/stats?t=' + Date.now())
`

## 4. Server Actions (Power Management)
Server Start, Restart, ba Stop korar jonno amra normal Pterodactyl REST API use kori:
- **Endpoint:** POST /api/client/servers/{SERVER_ID}/power
- **Body:** {"signal": "start"} (starts/stop/restart)
- Eta outes.py er /api/power endpoint theke trigger kora hoy.

## 5. File Manager API
File management er jonno Pterodactyl er nicher API gulo use kora hoyeche:
- **List Files:** GET /api/client/servers/{SERVER_ID}/files/list?directory=/
- **Read File:** GET /api/client/servers/{SERVER_ID}/files/contents?file=...
- **Save File:** POST /api/client/servers/{SERVER_ID}/files/write?file=... (Raw content body te)
- **Create Folder:** POST /api/client/servers/{SERVER_ID}/files/create-folder
- **Delete File:** POST /api/client/servers/{SERVER_ID}/files/delete (JSON array te file list)

Vobisshote kono feature add korte hole ei WebSocket ba REST format follow korei egiye jete hobe!
