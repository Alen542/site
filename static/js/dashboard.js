let isFetchingStats = false;
function pollStats() {
    if(isFetchingStats) return;
    isFetchingStats = true;
    fetch('/api/stats?t=' + Date.now()).then(r=>r.json()).then(d => {
        if(d.status === "unauthorized") return;
        let st = document.getElementById('status-text');
        st.innerText = d.status.toUpperCase();
        st.style.color = d.status === 'running' ? '#10b981' : d.status === 'offline' ? '#ef4444' : '#f59e0b';
        document.getElementById('cpu-val').innerText = d.cpu;
        document.getElementById('ram-val').innerText = d.ram;
    }).finally(() => {
        isFetchingStats = false;
        setTimeout(pollStats, 1000);
    }).catch(() => { isFetchingStats = false; setTimeout(pollStats, 3000); });
}
pollStats();

let lastLogContent = "";
const ansi_up = new AnsiUp();
ansi_up.use_classes = true;

let isFetchingLogs = false;
function pollLogs() {
    if(isFetchingLogs) return;
    isFetchingLogs = true;
    fetch('/api/logs?t=' + Date.now()).then(r=>r.json()).then(d => {
        if(d.error) return; 
        if(d.logs.length === 0 && lastLogContent === "") {
            document.getElementById('terminal').innerHTML = "<span style='color: var(--text-secondary);'>[System] Connected. Waiting for server output...</span>";
            return;
        }
        let html = d.logs.map(line => ansi_up.ansi_to_html(line)).join('<br>');
        if(html !== lastLogContent && html !== "") {
            let term = document.getElementById('terminal');
            term.innerHTML = html;
            term.scrollTop = term.scrollHeight;
            lastLogContent = html;
        }
    }).finally(() => {
        isFetchingLogs = false;
        setTimeout(pollLogs, 1500);
    }).catch(e => { console.log('Log fetch error:', e); isFetchingLogs = false; setTimeout(pollLogs, 3000); });
}
pollLogs();

function powerAction(signal) {
    let btns = document.querySelectorAll('.btn-power');
    btns.forEach(b => { b.disabled = true; b.style.opacity = '0.5'; });
    showToast('System Override', `Executing ${signal} sequence...`, 'info');
    fetch('/api/power', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: signal}) })
    .then(() => {
        showToast('Success', `Sequence ${signal} completed.`, 'success');
        btns.forEach(b => { b.disabled = false; b.style.opacity = '1'; });
    }).catch(() => {
        btns.forEach(b => { b.disabled = false; b.style.opacity = '1'; });
    });
}

document.getElementById('cmd-form').onsubmit = (e) => {
    e.preventDefault();
    let inp = document.getElementById('cmd-input');
    if(!inp.value) return;
    fetch('/api/command', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({command: inp.value}) })
    .then(r=>r.json()).then(d => {
        if(d.success) inp.value = '';
        else showToast('Error', d.error, 'danger');
    });
};
