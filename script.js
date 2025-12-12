// --- Tab Management ---
function switchTab(tabId) {
    // Buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.onclick.toString().includes(tabId)) {
            btn.classList.add('active');
        }
    });
    
    // Content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById('tab-' + tabId).classList.add('active');
}

// ==========================================
// FEATURE 1: OB・OG Confirmation Logic
// ==========================================

function normalizeName(str, ignoreSpace, kanjiOnly) {
    if (!str) return '';
    let s = str.trim();
    if (kanjiOnly) {
        s = s.replace(/[^\u4E00-\u9FFF\u3005]/g, '');
    } else if (ignoreSpace) {
        s = s.replace(/\s+/g, '');
    }
    return s;
}

function getCommonSuffixLength(str1, str2) {
    let i = 0;
    const len1 = str1.length;
    const len2 = str2.length;
    const minLen = Math.min(len1, len2);

    while (i < minLen) {
        if (str1[len1 - 1 - i] !== str2[len2 - 1 - i]) break;
        i++;
    }
    return i;
}

function clearObOg() {
    if(confirm('入力をクリアしますか？')) {
        document.getElementById('obog-master').value = '';
        document.getElementById('obog-target').value = '';
        document.getElementById('obog-results').classList.remove('show');
        updateObOgCounts();
    }
}

function updateObOgCounts() {
    const mLines = document.getElementById('obog-master').value.split('\n').filter(l => l.trim()).length;
    const tLines = document.getElementById('obog-target').value.split('\n').filter(l => l.trim()).length;
    document.getElementById('obog-master-count').innerText = mLines + '件';
    document.getElementById('obog-target-count').innerText = tLines + '件';
}

document.getElementById('obog-master').addEventListener('input', updateObOgCounts);
document.getElementById('obog-target').addEventListener('input', updateObOgCounts);

function runObOgCheck() {
    const masterText = document.getElementById('obog-master').value;
    const targetText = document.getElementById('obog-target').value;
    
    if (!masterText.trim() && !targetText.trim()) {
        alert('リストを入力してください');
        return;
    }

    const normalizeSpace = document.getElementById('obog-normalize').checked;
    const kanjiOnly = document.getElementById('obog-kanji').checked;
    const detectFuzzy = document.getElementById('obog-fuzzy').checked;

    const masterLines = masterText.split('\n');
    const masterSet = new Set();
    const masterList = [];

    masterLines.forEach(line => {
        const clean = normalizeName(line, normalizeSpace, kanjiOnly);
        if (clean) {
            masterSet.add(clean);
            masterList.push({ original: line.trim(), clean: clean });
        }
    });

    const targetLines = targetText.split('\n');
    const tbody = document.getElementById('obog-table-body');
    tbody.innerHTML = '';

    let foundCount = 0;
    let checkedCount = 0;

    targetLines.forEach((line, index) => {
        if (!line.trim()) return;
        checkedCount++;
        
        const cleanTarget = normalizeName(line, normalizeSpace, kanjiOnly);
        let statusHtml = '';
        let statusText = '';
        
        const isFound = cleanTarget.length > 0 && masterSet.has(cleanTarget);
        
        if (isFound) {
            foundCount++;
            statusHtml = '<span class="badge badge-success">〇 一致</span>';
            statusText = '一致';
        } else if (detectFuzzy && cleanTarget.length >= 2) {
            // Fuzzy logic
            const candidates = [];
            masterList.forEach(mItem => {
                const suffixLen = getCommonSuffixLength(cleanTarget, mItem.clean);
                if (suffixLen >= 2) {
                    candidates.push(mItem.original);
                }
            });
            
            if (candidates.length > 0) {
                 const show = candidates.slice(0, 3).join(', ');
                 statusHtml = `<span class="badge badge-warning">△ 候補: ${show}</span>`;
                 statusText = `候補: ${show}`;
            } else {
                 statusHtml = '<span class="badge badge-error">× 未登録</span>';
                 statusText = '未登録';
            }
        } else {
            statusHtml = '<span class="badge badge-error">× 未登録</span>';
            statusText = '未登録';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${checkedCount}</td><td>${line}</td><td>${statusHtml}</td>`;
        tr.dataset.status = statusText;
        tbody.appendChild(tr);
    });

    document.getElementById('obog-res-total').innerText = checkedCount;
    document.getElementById('obog-res-found').innerText = foundCount;
    document.getElementById('obog-results').classList.add('show');
    
    // Scroll
    document.getElementById('obog-results').scrollIntoView({ behavior:'smooth' });
}

function copyObOgTable() {
    const rows = document.querySelectorAll('#obog-table-body tr');
    let text = "No.\t名前\t判定\n";
    rows.forEach(r => {
        const tds = r.querySelectorAll('td');
        text += `${tds[0].innerText}\t${tds[1].innerText}\t${r.dataset.status}\n`;
    });
    navigator.clipboard.writeText(text).then(() => alert('コピーしました'));
}

// ==========================================
// FEATURE 2: Graduation Year Logic
// ==========================================

function parseTSV(text) {
    return text.trim().split('\n').map(line => line.split('\t').map(cell => cell.trim()));
}

function convertEraToAD(yearStr) {
    yearStr = yearStr.trim();
    // Full width -> half width
    yearStr = yearStr.replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    
    const match = yearStr.match(/^([SHRshr])(\d+)/i);
    if (!match) return yearStr;
    
    const era = match[1].toUpperCase();
    const num = parseInt(match[2], 10);
    let ad = num;
    if (era === 'S') ad += 1925;
    if (era === 'H') ad += 1988;
    if (era === 'R') ad += 2018;
    
    return ad.toString();
}

function clearYear() {
    document.getElementById('year-source').value = '';
    document.getElementById('year-target').value = '';
    document.querySelector('#year-results table tbody').innerHTML = '';
    document.getElementById('year-results').classList.remove('show');
}

function runYearMatch() {
    const sourceText = document.getElementById('year-source').value;
    const targetText = document.getElementById('year-target').value;
    const doConvert = document.getElementById('year-convert').checked;

    if (!sourceText || !targetText) {
        alert('リストを入力してください');
        return;
    }

    const sourceData = parseTSV(sourceText);
    const targetData = parseTSV(targetText);
    
    // Auto-detect columns (simplified)
    // Assume Col 0 = Name, Col 1 = Year OR detect logic
    let sNameIdx = 0; 
    let sYearIdx = 1;
    
    // Try to be smarter if headers exist
    // Reusing the robust logic from previous tool but simplified for brevity in this combined file
    // Check first row for likely year pattern
    if (sourceData.length > 0) {
        const row = sourceData[0];
        // If col 0 looks like year, swap
        if (/^\d{4}$/.test(row[0]) || /^[SHR]\d+/.test(row[0])) {
             sNameIdx = 1; sYearIdx = 0;
        }
    }

    const yearMap = new Map();
    sourceData.forEach(row => {
        if (row.length <= Math.max(sNameIdx, sYearIdx)) return;
        const rawName = row[sNameIdx];
        let rawYear = row[sYearIdx];
        if(!rawYear) return;
        
        if (doConvert) rawYear = convertEraToAD(rawYear);
        
        // Key is normalized name (no space)
        yearMap.set(rawName.replace(/\s+/g,''), rawYear);
    });

    const tbody = document.querySelector('#year-table tbody');
    tbody.innerHTML = '';
    
    targetData.forEach(row => {
        if (row.length === 0) return;
        const name = row[0]; // Assume target is list of names mostly
        if (!name) return;
        
        const key = name.replace(/\s+/g,'');
        const year = yearMap.get(key) || '';
        
        const tr = document.createElement('tr');
        const status = year ? '<span class="badge badge-success">OK</span>' : '<span class="badge badge-error">なし</span>';
        
        tr.innerHTML = `<td>${name}</td><td>${year}</td><td>${status}</td>`;
        tbody.appendChild(tr);
    });
    
    document.getElementById('year-results').classList.add('show');
}

function copyYearTable() {
    const rows = document.querySelectorAll('#year-table tbody tr');
    let text = "氏名\t卒業年\n";
    rows.forEach(r => {
        const tds = r.querySelectorAll('td');
        text += `${tds[0].innerText}\t${tds[1].innerText}\n`;
    });
    navigator.clipboard.writeText(text).then(() => alert('コピーしました'));
}

// ==========================================
// FEATURE 3: Roster Duplicate Logic
// ==========================================

function clearRoster() {
    document.getElementById('roster-input').value = '';
    document.getElementById('roster-clean').value = '';
    document.getElementById('roster-results').classList.remove('show');
}

function runRosterCheck() {
    const text = document.getElementById('roster-input').value;
    if (!text.trim()) return;

    const lines = text.split('\n');
    const seen = new Set();
    const uniqueList = [];
    let dupeCount = 0;

    lines.forEach(line => {
        const trim = line.trim();
        if(!trim) return;
        
        // Simple duplicate check (exact match)
        // Could enhance with space normalization if needed
        const key = trim.replace(/\s+/g, ''); 
        
        if (seen.has(key)) {
            dupeCount++;
        } else {
            seen.add(key);
            uniqueList.push(trim);
        }
    });

    document.getElementById('roster-total').innerText = lines.filter(l=>l.trim()).length;
    document.getElementById('roster-unique').innerText = uniqueList.length;
    document.getElementById('roster-dupe').innerText = dupeCount;
    
    document.getElementById('roster-clean').value = uniqueList.join('\n');
    document.getElementById('roster-results').classList.add('show');
}

function copyRosterClean() {
    const val = document.getElementById('roster-clean').value;
    navigator.clipboard.writeText(val).then(() => alert('コピーしました'));
}
