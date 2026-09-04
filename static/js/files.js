let currentDir = '/';
let currentEditFile = '';

function renderBreadcrumbs(dir) {
    let parts = dir.split('/').filter(p => p !== '');
    let isRoot = parts.length === 0;
    let html = `<div class="breadcrumb-item" onclick="loadFiles('/')" style="${isRoot ? 'color: white; font-weight: 600;' : ''}"><i class="fas fa-server" style="color: var(--purple-primary); margin-right: 8px;"></i> Home</div>`;
    let current = '/';
    parts.forEach((p, i) => {
        current += p + '/';
        html += `<span class="breadcrumb-separator" style="margin: 0 4px; font-size: 16px;">/</span>`;
        let isLast = i === parts.length - 1;
        html += `<div class="breadcrumb-item" onclick="loadFiles('${current}')" style="${isLast ? 'color: white; font-weight: 600;' : ''}">${escapeHTML(p)}</div>`;
    });
    document.getElementById('breadcrumb-container').innerHTML = html;
}

function getFileIcon(name, isDir) {
    if (isDir) return '<i class="fas fa-folder" style="color: #f59e0b; margin-right: 15px; font-size: 18px;"></i>';
    let ext = name.split('.').pop().toLowerCase();
    if (['zip', 'tar', 'gz', 'rar'].includes(ext)) return '<i class="fas fa-file-archive" style="color: #fca5a5; margin-right: 15px; font-size: 18px;"></i>';
    if (['py'].includes(ext)) return '<i class="fab fa-python" style="color: #60a5fa; margin-right: 15px; font-size: 18px;"></i>';
    if (['js'].includes(ext)) return '<i class="fab fa-js" style="color: #fde047; margin-right: 15px; font-size: 18px;"></i>';
    if (['json'].includes(ext)) return '<i class="fas fa-cogs" style="color: #a78bfa; margin-right: 15px; font-size: 18px;"></i>';
    if (['html', 'css'].includes(ext)) return '<i class="fab fa-html5" style="color: #f97316; margin-right: 15px; font-size: 18px;"></i>';
    return '<i class="fas fa-file-code" style="color: var(--text-secondary); margin-right: 15px; font-size: 18px;"></i>';
}

function filterFiles(query) {
    query = query.toLowerCase();
    document.querySelectorAll('.file-row').forEach(row => {
        let name = row.getAttribute('data-name').toLowerCase();
        row.style.display = name.includes(query) ? '' : 'none';
    });
}

function formatDate(isoString) {
    if(!isoString) return '-';
    let d = new Date(isoString);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function loadFiles(dir) {
    currentDir = dir;
    renderBreadcrumbs(dir);
    if(document.getElementById('file-search')) document.getElementById('file-search').value = '';
    
    let tbody = document.getElementById('file-tbody');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin" style="color: var(--purple-primary);"></i> Loading files...</td></tr>';
    
    fetch('/api/files/list?dir=' + encodeURIComponent(dir)).then(r=>r.json()).then(d => {
        let html = '';
        if (dir !== '/') {
            let parent = dir.split('/').slice(0, -2).join('/') + '/';
            if(parent === '') parent = '/';
            html += `<tr style="cursor: pointer;" onclick="loadFiles('${parent}')">
                <td style="color: var(--purple-primary); font-weight: 600; padding-left: 30px;"><i class="fas fa-level-up-alt" style="margin-right: 15px;"></i> Go Back</td>
                <td class="hide-mobile">-</td><td class="hide-mobile">-</td><td class="hide-mobile"></td>
            </tr>`;
        }
        
        // Sort folders first, then files
        if(d.data) {
            d.data.sort((a, b) => {
                let aDir = a.attributes.mimetype === 'inode/directory';
                let bDir = b.attributes.mimetype === 'inode/directory';
                if(aDir && !bDir) return -1;
                if(!aDir && bDir) return 1;
                return a.attributes.name.localeCompare(b.attributes.name);
            }).forEach((f, idx) => {
                let a = f.attributes;
                let isDir = a.mimetype === 'inode/directory';
                let icon = getFileIcon(a.name, isDir);
                let size = isDir ? '-' : (a.size / 1024).toFixed(2) + ' KB';
                let modDate = formatDate(a.modified_at);
                let path = dir === '/' ? `/${a.name}` : `${dir}${a.name}`;
                let pathF = dir === '/' ? `/${a.name}/` : `${dir}${a.name}/`;
                
                let safeName = escapeHTML(a.name);
                let safePath = escapeHTML(path);
                let safePathF = escapeHTML(pathF);
                
                // Add staggered animation delay
                let delay = Math.min(idx * 0.03, 0.5);
                
                html += `<tr class="file-row" data-name="${safeName}" style="animation-delay: ${delay}s" oncontextmenu="window.showContextMenu(event, '${safeName}', '${safePath}', '${safePathF}', ${isDir})">
                    <td style="font-weight: 500; cursor: pointer; padding-left: 30px;" onclick="${isDir ? `loadFiles('${safePathF}')` : `editFile('${safePath}')`}">${icon} ${safeName}</td>
                    <td class="hide-mobile" style="color: var(--text-secondary); font-size: 14px;">${size}</td>
                    <td class="hide-mobile" style="color: var(--text-secondary); font-size: 13px;">${modDate}</td>
                    <td style="text-align: right; padding-right: 30px;">
                        <button class="dot-menu-btn" onclick="window.showContextMenu(event, '${safeName}', '${safePath}', '${safePathF}', ${isDir})">
                            <i class="fas fa-ellipsis-h"></i>
                        </button>
                    </td>
                </tr>`;
            });
        }
        tbody.innerHTML = html;
    });
}

function showCustomPrompt(title, defaultValue = "", placeholder = "") {
    return new Promise((resolve) => {
        let modal = document.getElementById('custom-prompt-modal');
        let titleEl = document.getElementById('prompt-title');
        let inputEl = document.getElementById('prompt-input');
        let submitBtn = document.getElementById('prompt-submit');
        
        titleEl.innerText = title;
        inputEl.value = defaultValue;
        inputEl.placeholder = placeholder;
        modal.style.display = 'flex';
        inputEl.focus();
        
        let newSubmit = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(newSubmit, submitBtn);
        
        newSubmit.onclick = () => {
            modal.style.display = 'none';
            resolve(inputEl.value.trim());
        };
        
        let closeHandler = (e) => {
            if (e.key === 'Enter') newSubmit.click();
            if (e.key === 'Escape') {
                modal.style.display = 'none';
                resolve(null);
            }
        };
        inputEl.onkeyup = closeHandler;
    });
}

async function createNewFile() {
    let name = await showCustomPrompt("Create New File", "", "e.g. index.js");
    if(!name) return;
    let path = currentDir === '/' ? `/${name}` : `${currentDir}${name}`;
    currentEditFile = path;
    document.getElementById('editor-title').innerHTML = `<i class="fas fa-file-medical" style="color: var(--purple-primary); margin-right: 10px;"></i> ${escapeHTML(path)}`;
    
    if(!editor) {
        editor = CodeMirror.fromTextArea(document.getElementById('file-content'), {
            theme: 'dracula', lineNumbers: true, mode: 'javascript'
        });
        editor.setSize("100%", "100%");
    }
    editor.setValue('');
    document.getElementById('editor-overlay').style.display = 'flex';
}

async function createFolder() {
    let name = await showCustomPrompt("Create Directory", "", "Enter folder name");
    if(!name) return;
    fetch('/api/files/action', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'create-folder', root: currentDir, name: name}) })
    .then(()=> { showToast('Storage', 'Folder Created Successfully', 'success'); loadFiles(currentDir); });
}

async function deleteFile(name) {
    if(!confirm(`Are you sure you want to delete ${name}?`)) return;
    fetch('/api/files/action', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'delete', root: currentDir, files: [name]}) })
    .then(()=> { showToast('Storage', 'Item Deleted', 'success'); loadFiles(currentDir); });
}

let editor = null;

function editFile(path) {
    currentEditFile = path;
    document.getElementById('editor-title').innerHTML = `<i class="fas fa-edit" style="color: var(--purple-primary); margin-right: 10px;"></i> ${escapeHTML(path)}`;
    
    if(!editor) {
        editor = CodeMirror.fromTextArea(document.getElementById('file-content'), {
            lineNumbers: true,
            theme: 'material-darker',
            autocorrect: false,
            autocapitalize: false,
            spellcheck: false
        });
    }
    
    editor.setValue("Loading...");
    document.getElementById('editor-overlay').style.display = 'flex';
    setTimeout(() => editor.refresh(), 100);
    
    fetch('/api/files/content?file=' + encodeURIComponent(path)).then(r=>r.text()).then(t => { 
        editor.setValue(t); 
    });
}

function saveFile() {
    let text = editor ? editor.getValue() : document.getElementById('file-content').value;
    fetch('/api/files/content?file=' + encodeURIComponent(currentEditFile), { method: 'POST', body: text })
    .then(r=>r.json()).then(d => {
        if(d.success) { showToast('Storage', 'File Override Successful', 'success'); document.getElementById('editor-overlay').style.display = 'none'; }
    });
}

loadFiles('/');

// Context Menu Logic
let contextMenu = document.createElement('div');
contextMenu.id = 'file-context-menu';
contextMenu.className = 'context-menu';
document.body.appendChild(contextMenu);

document.addEventListener('click', (e) => {
    if(!contextMenu.contains(e.target)) {
        window.hideContextMenu();
    }
});
window.addEventListener('scroll', () => window.hideContextMenu());

window.hideContextMenu = function() {
    contextMenu.style.display = 'none';
};

window.showContextMenu = function(e, safeName, safePath, safePathF, isDir) {
    e.preventDefault();
    e.stopPropagation();

    let menuHtml = '';
    if(!isDir) {
        menuHtml += `<div class="context-menu-item" onclick="editFile('${safePath}'); hideContextMenu()"><i class="fas fa-pen" style="width:20px;text-align:center;"></i> Edit</div>`;
        menuHtml += `<div class="context-menu-item" onclick="copyItem('${safePath}'); hideContextMenu()"><i class="fas fa-copy" style="width:20px;text-align:center;"></i> Copy</div>`;
        menuHtml += `<div class="context-menu-item" onclick="downloadItem('${safePath}'); hideContextMenu()"><i class="fas fa-download" style="width:20px;text-align:center;"></i> Download</div>`;
    }
    
    menuHtml += `<div class="context-menu-item" onclick="renameItem('${safeName}'); hideContextMenu()"><i class="fas fa-edit" style="width:20px;text-align:center;"></i> Rename</div>`;
    menuHtml += `<div class="context-menu-item" onclick="moveItem('${safeName}'); hideContextMenu()"><i class="fas fa-expand-arrows-alt" style="width:20px;text-align:center;"></i> Move</div>`;
    menuHtml += `<div class="context-menu-item" onclick="chmodItem('${safeName}'); hideContextMenu()"><i class="fas fa-key" style="width:20px;text-align:center;"></i> Permissions</div>`;
    
    if (safeName.endsWith('.zip') || safeName.endsWith('.tar.gz') || safeName.endsWith('.rar')) {
        menuHtml += `<div class="context-menu-item" onclick="decompressItem('${safeName}'); hideContextMenu()"><i class="fas fa-box-open" style="width:20px;text-align:center;"></i> Decompress</div>`;
    } else {
        menuHtml += `<div class="context-menu-item" onclick="compressItem('${safeName}'); hideContextMenu()"><i class="fas fa-file-archive" style="width:20px;text-align:center;"></i> Archive</div>`;
    }

    menuHtml += `<div class="context-menu-item danger" onclick="deleteFile('${safeName}'); hideContextMenu()"><i class="fas fa-trash" style="width:20px;text-align:center;"></i> Delete</div>`;

    contextMenu.innerHTML = menuHtml;
    contextMenu.style.display = 'block';

    let x = e.clientX;
    let y = e.clientY;
    if (x + 180 > window.innerWidth) x = window.innerWidth - 180;
    if (y + 350 > window.innerHeight) y = window.innerHeight - 350;

    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
};

// --- New Action Functions ---

function apiCall(data, successMsg) {
    fetch('/api/files/action', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    }).then(r=>r.json()).then(d => {
        if(d.success) {
            if(d.url) { window.open(d.url, '_blank'); return; }
            showToast('Storage', successMsg, 'success');
            loadFiles(currentDir);
        } else {
            showToast('Error', d.error, 'danger');
        }
    });
}

async function renameItem(name) {
    let newName = await showCustomPrompt(`Rename ${name}`, name);
    if(newName && newName !== name) apiCall({action: 'rename', root: currentDir, from: name, to: newName}, 'Renamed Successfully');
}
async function moveItem(name) {
    let currentPath = currentDir === '/' ? `/${name}` : `${currentDir}${name}`;
    let newPath = await showCustomPrompt(`Move ${name} to:`, currentPath);
    if(newPath && newPath !== currentPath) apiCall({action: 'rename', root: currentDir, from: name, to: newPath}, 'Moved Successfully');
}
function copyItem(path) {
    apiCall({action: 'copy', location: path}, 'Copied Successfully');
}
function downloadItem(path) {
    apiCall({action: 'download', file: path}, 'Download Started');
}
function compressItem(name) {
    apiCall({action: 'compress', root: currentDir, files: [name]}, 'Archived Successfully');
}
function decompressItem(name) {
    apiCall({action: 'decompress', root: currentDir, file: name}, 'Decompressed Successfully');
}
async function chmodItem(name) {
    let mode = await showCustomPrompt(`Set Permissions for ${name}`, "0755");
    if(mode) apiCall({action: 'chmod', root: currentDir, file: name, mode: mode}, 'Permissions Updated');
}
