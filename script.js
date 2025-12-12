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
// FEATURE 1: Combined Check (OB/OG + Year)
// ==========================================

function normalizeName(str) {
    if (!str) return '';
    // Normalize: trim and remove spaces
    return str.replace(/\s+/g, '');
}

function convertEraToAD(yearStr) {
    if (!yearStr) return '';
    yearStr = yearStr.trim();
    // Full width -> half width
    yearStr = yearStr.replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));

    // Check various formats
    const match = yearStr.match(/^([SHRshr])(\d+)/i);
    if (match) {
        const era = match[1].toUpperCase();
        const num = parseInt(match[2], 10);
        let ad = num;
        if (era === 'S') ad += 1925;
        if (era === 'H') ad += 1988;
        if (era === 'R') ad += 2018;
        return ad.toString();
    }
    return yearStr;
}

function getCommonSuffixLength(str1, str2) {
    let i = 0;
    while (i < Math.min(str1.length, str2.length)) {
        if (str1[str1.length - 1 - i] !== str2[str2.length - 1 - i]) break;
        i++;
    }
    return i;
}

// Update counts on input
function updateCombinedCounts() {
    const m = document.getElementById('combined-master').value.split('\n').filter(l => l.trim()).length;
    const t = document.getElementById('combined-target').value.split('\n').filter(l => l.trim()).length;
    document.getElementById('combined-master-count').innerText = m + '件';
    document.getElementById('combined-target-count').innerText = t + '件';
}
document.getElementById('combined-master').addEventListener('input', updateCombinedCounts);
document.getElementById('combined-target').addEventListener('input', updateCombinedCounts);

function clearCombined() {
    if (confirm('入力内容をクリアしますか？')) {
        document.getElementById('combined-master').value = '';
        document.getElementById('combined-target').value = '';
        document.getElementById('combined-results').classList.remove('show');
        updateCombinedCounts();
    }
}

function parseMasterLine(line) {
    // Attempt to split by tab or space
    // We need to identify which part is Name and which is Year
    const parts = line.trim().split(/[\t\s]+/);
    if (parts.length < 2) {
        // Only one part - assume it's Name if generic, or Year if numeric?
        // Fallback: entire line is name, no year
        return { name: parts[0], year: '' };
    }

    // Heuristic: Check if part looks like Year (digits or S/H/R prefix)
    const isYear = (s) => /^\d{4}$/.test(s) || /^[SHRshr]\d+/.test(s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)));

    let year = '';
    let name = '';

    if (isYear(parts[0])) {
        year = parts[0];
        name = parts.slice(1).join('');
    } else if (isYear(parts[parts.length - 1])) {
        year = parts[parts.length - 1];
        name = parts.slice(0, parts.length - 1).join('');
    } else {
        // Default: First is name, rest (if any)
        name = parts[0];
        // Maybe second is year even if regex failed?
        if (parts[1]) year = parts[1];
    }

    return { name, year };
}

function runCombinedCheck() {
    const masterText = document.getElementById('combined-master').value;
    const targetText = document.getElementById('combined-target').value;
    const doConvert = document.getElementById('combined-convert-era').checked;
    const doFuzzy = document.getElementById('combined-fuzzy').checked;

    if (!masterText.trim() && !targetText.trim()) {
        alert('リストを入力してください');
        return;
    }

    // 1. Process Master List
    const masterMap = new Map(); // Key: NormalizedName -> { year, originalName }
    const masterList = []; // For fuzzy search

    masterText.split('\n').forEach(line => {
        if (!line.trim()) return;
        let { name, year } = parseMasterLine(line);

        if (doConvert) year = convertEraToAD(year);

        const norm = normalizeName(name);
        if (norm) {
            const data = { year, originalName: name, clean: norm };
            masterMap.set(norm, data);
            masterList.push(data);
        }
    });

    // 2. Process Target
    const uniqueTargets = new Set();
    const targetLines = targetText.split('\n');
    const tbody = document.getElementById('combined-table-body');
    tbody.innerHTML = '';

    let foundCount = 0;
    let checkedCount = 0;

    targetLines.forEach((line, idx) => {
        if (!line.trim()) return;
        checkedCount++;

        const normTarget = normalizeName(line);
        let statusHtml = '';
        let statusText = '';
        let resultYear = '';

        // Exact Match
        if (masterMap.has(normTarget)) {
            const mData = masterMap.get(normTarget);
            foundCount++;
            statusHtml = '<span class="badge badge-success">〇 一致</span>';
            statusText = '一致';
            resultYear = mData.year;
        }
        // Fuzzy Match
        else if (doFuzzy && normTarget.length >= 2) {
            const candidates = [];
            masterList.forEach(mItem => {
                if (getCommonSuffixLength(normTarget, mItem.clean) >= 2) {
                    candidates.push(`${mItem.originalName}(${mItem.year})`);
                }
            });

            if (candidates.length > 0) {
                const show = candidates.slice(0, 3).join(', ');
                statusHtml = `<span class="badge badge-warning">△ 候補: ${show}</span>`;
                statusText = `候補: ${show}`;
                // Can't determine single year
                resultYear = '---';
            } else {
                statusHtml = '<span class="badge badge-error">× 未登録</span>';
                statusText = '未登録';
            }
        } else {
            statusHtml = '<span class="badge badge-error">× 未登録</span>';
            statusText = '未登録';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${checkedCount}</td>
            <td>${line}</td>
            <td>${statusHtml}</td>
            <td>${resultYear}</td>
        `;
        tr.dataset.status = statusText;
        tbody.appendChild(tr);
    });

    document.getElementById('res-total').innerText = checkedCount;
    document.getElementById('res-found').innerText = foundCount;
    document.getElementById('combined-results').classList.add('show');
}

function copyCombinedTable() {
    const rows = document.querySelectorAll('#combined-table-body tr');
    let text = "No.\t氏名\t判定\t卒業年\n";
    rows.forEach(r => {
        const tds = r.querySelectorAll('td');
        text += `${tds[0].innerText}\t${tds[1].innerText}\t${r.dataset.status}\t${tds[3].innerText}\n`;
    });
    navigator.clipboard.writeText(text).then(() => alert('コピーしました'));
}

function dlCombinedCsv() {
    const rows = [];
    rows.push(['No.', '氏名', '判定', '卒業年']);
    document.querySelectorAll('#combined-table-body tr').forEach(r => {
        const tds = r.querySelectorAll('td');
        rows.push([tds[0].innerText, tds[1].innerText, r.dataset.status, tds[3].innerText]);
    });

    // BOM + CSV
    const csvContent = "\uFEFF" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = "combined_check_result.csv";
    link.click();
}


// ==========================================
// FEATURE 2: Roster Duplicate Logic
// ==========================================

function clearRoster() {
    document.getElementById('roster-input').value = '';
    document.getElementById('roster-clean').value = '';
    document.getElementById('roster-duplicates').value = '';
    document.getElementById('roster-results').classList.remove('show');
}

function runRosterCheck() {
    const text = document.getElementById('roster-input').value;
    if (!text.trim()) return;

    const lines = text.split('\n');
    const seen = new Set();
    const uniqueList = [];
    const duplicateList = [];
    let dupeCount = 0;

    lines.forEach(line => {
        const trim = line.trim();
        if (!trim) return;

        const key = trim.replace(/\s+/g, '');
        if (seen.has(key)) {
            dupeCount++;
            duplicateList.push(trim);
        } else {
            seen.add(key);
            uniqueList.push(trim);
        }
    });

    document.getElementById('roster-total').innerText = lines.filter(l => l.trim()).length;
    document.getElementById('roster-unique').innerText = uniqueList.length;
    document.getElementById('roster-dupe').innerText = dupeCount;

    document.getElementById('roster-duplicates').value = duplicateList.join('\n');
    document.getElementById('roster-clean').value = uniqueList.join('\n');
    document.getElementById('roster-results').classList.add('show');
}

function copyRosterClean() {
    const val = document.getElementById('roster-clean').value;
    navigator.clipboard.writeText(val).then(() => alert('コピーしました'));
}
