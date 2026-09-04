function showToast(title, message, type='success') {
    const tc = document.getElementById('toast-container');
    const color = type === 'success' ? '#10b981' : type === 'danger' ? '#ef4444' : '#a855f7';
    const toast = document.createElement('div');
    toast.style.cssText = `background: var(--bg-surface); border-left: 4px solid ${color}; padding: 16px 24px; border-radius: 12px; box-shadow: 0 15px 35px rgba(0,0,0,0.6); color: white; min-width: 280px; font-family: 'Outfit'; display: flex; flex-direction: column; animation: slideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; border: 1px solid var(--border-color); border-left-color: ${color};`;
    toast.innerHTML = `<strong style="font-size: 15px; color: ${color}; letter-spacing: 0.5px;">${escapeHTML(title)}</strong><span style="font-size: 14px; color: var(--text-secondary); margin-top: 6px;">${escapeHTML(message)}</span>`;
    tc.appendChild(toast);
    setTimeout(() => { toast.style.transition = 'all 0.3s'; toast.style.opacity = '0'; toast.style.transform = 'translateY(20px)'; setTimeout(()=>toast.remove(), 300); }, 3500);
}

// Global fetch patch for CSRF
const originalFetch = window.fetch;
window.fetch = function() {
    let config = arguments[1];
    if(config && config.method && ['POST', 'PUT', 'DELETE'].includes(config.method.toUpperCase())) {
        config.headers = config.headers || {};
        let token = document.querySelector('meta[name="csrf-token"]');
        if(token) config.headers['X-CSRFToken'] = token.content;
    }
    return originalFetch.apply(window, arguments);
};

// Global HTML Escaper for XSS Protection
window.escapeHTML = function(str) {
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
};
