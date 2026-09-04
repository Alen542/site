// Startup
fetch('/api/startup').then(r=>r.json()).then(d => {
    let html = '';
    if(d.data) {
        d.data.forEach(v => {
            let a = v.attributes;
            let safeName = escapeHTML(a.name);
            let safeDesc = escapeHTML(a.description);
            let safeEnv = escapeHTML(a.env_variable);
            let safeVal = escapeHTML(a.server_value);
            html += `
            <div style="background: #111; border: 1px solid #222; padding: 20px; border-radius: 16px; margin-bottom: 20px;">
                <div style="font-weight: 600; color: white; margin-bottom: 5px;">${safeName}</div>
                <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 15px; word-wrap: break-word; overflow-wrap: break-word; word-break: break-all;">${safeDesc}</div>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="var-${safeEnv}" value="${safeVal}" style="flex: 1; background: #000; border: 1px solid #333; padding: 10px 15px; border-radius: 10px; color: white; font-family: 'JetBrains Mono'; font-size: 14px; outline: none;">
                    <button class="btn-action" style="background: var(--purple-primary); color: white; border: none; width: auto; padding: 0 20px;" onclick="updateVar('${safeEnv}')">Save</button>
                </div>
            </div>`;
        });
    }
    document.getElementById('startup-vars').innerHTML = html;
});

function updateVar(key) {
    let val = document.getElementById('var-'+key).value;
    fetch('/api/startup', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({key, value: val}) })
    .then(r=>r.json()).then(d => {
        if(d.success) showToast('Configuration', 'Parameter Updated', 'success');
        else showToast('Error', d.error, 'danger');
    });
}

// Activity
fetch('/api/activity').then(r=>r.json()).then(d => {
    let html = '';
    if(d.data) {
        d.data.slice(0, 30).forEach(log => {
            let a = log.attributes;
            let dt = new Date(a.timestamp).toLocaleString();
            html += `<tr>
                <td style="color: var(--text-secondary); font-size: 13px; padding-left: 20px;">${escapeHTML(dt)}</td>
                <td style="color: white; font-weight: 500; font-size: 14px;">${escapeHTML(a.event)}</td>
                <td class="hide-mobile" style="text-align: right; font-family: 'JetBrains Mono'; font-size: 13px; color: var(--purple-primary); padding-right: 20px;">${escapeHTML(a.ip)}</td>
            </tr>`;
        });
    }
    document.getElementById('activity-tbody').innerHTML = html;
});
