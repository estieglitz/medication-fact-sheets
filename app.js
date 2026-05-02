const SOURCE_PDF = 'source.pdf';
const CONSENT_PDF = 'NOS_Consent.pdf';

let drugIndex = [];
let protocols = {};

const normalize = (s) => (s || '')
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[®™]/g, '')
  .replace(/\b(injection|tablet|tablets|capsule|capsules|iv|po|oral|intrathecal|intravenous)\b/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const compact = (s) => normalize(s).replace(/\s+/g, '');

function escapeHtml(s) {
  return String(s).replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[c]));
}

function uniqPreserveOrder(items) {
  const seen = new Set();
  const out = [];
  items.forEach(item => {
    const key = normalize(item);
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  });
  return out;
}

function parseMeds(text) {
  return uniqPreserveOrder(text.split(/[\n,;]+/).map(x => x.trim()).filter(Boolean));
}

function termsForDrug(d) {
  return [d.name, d.spanishName, ...(d.aliases || [])].filter(Boolean);
}

function levenshtein(a, b) {
  a = compact(a);
  b = compact(b);
  if (!a || !b) return 999;

  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function scoreTerm(query, term) {
  const q = normalize(query);
  const t = normalize(term);
  const qc = compact(query);
  const tc = compact(term);

  if (!q || !t) return 0;
  if (q === t || qc === tc) return 100;
  if (t.startsWith(q) || tc.startsWith(qc)) return 92;
  if (t.includes(q) || tc.includes(qc)) return 82;
  if (q.includes(t) || qc.includes(tc)) return 76;

  const dist = levenshtein(q, t);
  const maxLen = Math.max(qc.length, tc.length);
  if (maxLen <= 4 && dist <= 1) return 70;
  if (maxLen > 4 && dist / maxLen <= 0.22) return 68;
  return 0;
}

function bestDrugMatch(term) {
  return drugIndex.map(d => {
    const best = Math.max(...termsForDrug(d).map(t => scoreTerm(term, t)));
    return { drug: d, score: best };
  })
    .filter(x => x.score >= 68)
    .sort((a, b) => b.score - a.score || a.drug.name.localeCompare(b.drug.name));
}

function findDrug(term) {
  const hits = bestDrugMatch(term);
  return hits.length ? hits[0] : null;
}

function findProtocol(term) {
  const q = normalize(term);
  if (!q) return null;

  const hits = Object.values(protocols).map(p => {
    const score = Math.max(
      scoreTerm(q, p.name),
      ...(p.aliases || []).map(a => scoreTerm(q, a))
    );
    return { protocol: p, score };
  })
    .filter(x => x.score >= 68)
    .sort((a, b) => b.score - a.score || a.protocol.name.localeCompare(b.protocol.name));

  return hits.length ? hits[0].protocol : null;
}

function getMatches() {
  const meds = parseMeds(document.getElementById('medInput').value);
  return meds.map(input => {
    const hit = findDrug(input);
    return { input, drug: hit?.drug || null, score: hit?.score || 0 };
  });
}

function getLanguage() {
  return document.getElementById('language').value;
}

function getPages(drug, lang) {
  return lang === 'spanish' ? drug.spanishPages : drug.englishPages;
}

function getDisplayName(drug, lang) {
  return lang === 'spanish' ? (drug.spanishName || drug.name) : drug.name;
}

function renderMatches() {
  const lang = getLanguage();
  const matches = getMatches();
  const el = document.getElementById('results');
  const summary = document.getElementById('summary');

  if (!matches.length) {
    el.className = 'results muted';
    el.textContent = 'No medications selected yet.';
    summary.textContent = '';
    return;
  }

  const found = matches.filter(m => m.drug);
  const missing = matches.filter(m => !m.drug).map(m => m.input);

  summary.textContent = `${found.length} matched, ${missing.length} not found. Output language: ${lang === 'spanish' ? 'Spanish' : 'English'}.`;
  el.className = 'results';
  el.innerHTML = matches.map(m => {
    if (!m.drug) {
      const suggestions = bestDrugMatch(m.input).slice(0, 3).map(x => x.drug.name).join(', ');
      return `<div class="match badrow"><span class="bad">No match:</span> ${escapeHtml(m.input)}${suggestions ? `<br><small>Closest: ${escapeHtml(suggestions)}</small>` : ''}</div>`;
    }

    const pages = getPages(m.drug, lang) || [];
    const display = getDisplayName(m.drug, lang);
    const confidence = m.score >= 100 ? 'exact' : (m.score >= 82 ? 'strong' : 'fuzzy');
    return `<div class="match"><span class="good">Matched:</span> ${escapeHtml(m.input)} → <strong>${escapeHtml(display)}</strong><span class="pill">${confidence}</span><span class="pill">pages ${pages.join(', ')}</span></div>`;
  }).join('');
}

function loadProtocolMedications({ append = true } = {}) {
  const p = findProtocol(document.getElementById('protocolInput').value);
  if (!p) {
    alert('Protocol not found. Try the exact name or edit protocols.json to add your protocol.');
    return;
  }

  const current = append ? parseMeds(document.getElementById('medInput').value) : [];
  const merged = uniqPreserveOrder([...current, ...p.medications]);
  document.getElementById('medInput').value = merged.join('\n');
  renderMatches();
}

function pdfSafeText(s) {
  return String(s || '')
    .replace(/[•]/g, '-')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
}

function truncateForLine(s, maxChars) {
  const text = pdfSafeText(s).trim();
  return text.length > maxChars ? text.slice(0, maxChars - 1) + '…' : text;
}

function drawWrappedText(page, text, { x, y, maxChars = 76, lineHeight = 16, size = 11, font }) {
  const safe = pdfSafeText(text).trim();
  if (!safe) return y;

  const words = safe.split(/\s+/);
  let line = '';
  let currentY = y;

  words.forEach(word => {
    const test = line ? `${line} ${word}` : word;
    if (test.length > maxChars && line) {
      page.drawText(line, { x, y: currentY, size, font });
      currentY -= lineHeight;
      line = word;
    } else {
      line = test;
    }
  });

  if (line) page.drawText(line, { x, y: currentY, size, font });
  return currentY - lineHeight;
}

async function addNosConsentPages(outDoc, lang, matchedDrugs) {
  const consentBytes = await fetch(CONSENT_PDF).then(res => {
    if (!res.ok) throw new Error('Could not load NOS_Consent.pdf. Make sure it is in the same folder and run through http://localhost:8000.');
    return res.arrayBuffer();
  });

  const consentDoc = await PDFLib.PDFDocument.load(consentBytes);
  const [page1, page2] = await outDoc.copyPages(consentDoc, [0, 1]);

  outDoc.addPage(page1);
  outDoc.addPage(page2);

  const font = await outDoc.embedFont(PDFLib.StandardFonts.Helvetica);

  const providerName = document.getElementById('providerInput').value;
  const diseaseStage = document.getElementById('diseaseInput').value;
  const othersAttendance = document.getElementById('attendanceInput').value;

  // Page 1 overlays. Patient name is intentionally left blank.
  if (providerName.trim()) {
    page1.drawText(truncateForLine(providerName, 42), {
      x: 240,
      y: 635,
      size: 11,
      font
    });
  }

  if (diseaseStage.trim()) {
    page1.drawText(truncateForLine(diseaseStage, 38), {
      x: 224,
      y: 567,
      size: 11,
      font
    });
  }

  if (othersAttendance.trim()) {
    page1.drawText(truncateForLine(othersAttendance, 48), {
      x: 210,
      y: 531,
      size: 11,
      font
    });
  }

  // Page 2 medication list. Starts lower to preserve the NOS page heading.
  let y = 592;
  const meds = matchedDrugs.map(m => getDisplayName(m.drug, lang));
  meds.forEach((med, index) => {
    const label = `${index + 1}. ${med}`;
    y = drawWrappedText(page2, label, {
      x: 90,
      y,
      maxChars: 82,
      lineHeight: 16,
      size: 11,
      font
    });
  });
}

async function generatePdf() {
  renderMatches();

  const lang = getLanguage();
  const allMatches = getMatches();
  const matches = allMatches.filter(m => m.drug);
  const missing = allMatches.filter(m => !m.drug).map(m => m.input);

  if (missing.length > 0) {
    alert('These medications were not found and will not be included: ' + missing.join(', '));
  }

  if (!matches.length) {
    alert('No matched medications to export.');
    return;
  }

  const pageNums = [];
  const seen = new Set();
  matches.forEach(m => {
    const pages = getPages(m.drug, lang) || [];
    pages.forEach(p => {
      if (!seen.has(p)) {
        seen.add(p);
        pageNums.push(p);
      }
    });
  });

  const existingPdfBytes = await fetch(SOURCE_PDF).then(res => {
    if (!res.ok) throw new Error('Could not load source.pdf. Make sure it is in the same folder and run through http://localhost:8000.');
    return res.arrayBuffer();
  });

  const srcDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
  const outDoc = await PDFLib.PDFDocument.create();

  if (document.getElementById('coverPage').checked) {
    await addNosConsentPages(outDoc, lang, matches);
  }

  const copied = await outDoc.copyPages(srcDoc, pageNums.map(p => p - 1));
  copied.forEach(p => outDoc.addPage(p));

  const bytes = await outDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `individualized-consent-packet-${lang}-${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function init() {
  try {
    drugIndex = await fetch('drug-index.json').then(r => r.json());
    protocols = await fetch('protocols.json').then(r => r.json());

    const list = document.getElementById('protocolList');
    Object.values(protocols).sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.name;
      list.appendChild(opt);
    });

    renderMatches();
  } catch (e) {
    document.getElementById('results').innerHTML = `<span class="bad">Could not load app data.</span><br>${escapeHtml(e.message)}<br>Run locally with <code>python3 -m http.server 8000</code> and open <code>http://localhost:8000</code>.`;
  }
}

document.getElementById('loadProtocol').addEventListener('click', () => loadProtocolMedications({ append: true }));
document.getElementById('replaceWithProtocol').addEventListener('click', () => loadProtocolMedications({ append: false }));
document.getElementById('generate').addEventListener('click', generatePdf);
document.getElementById('clear').addEventListener('click', () => {
  document.getElementById('medInput').value = '';
  document.getElementById('protocolInput').value = '';
  document.getElementById('providerInput').value = '';
  document.getElementById('diseaseInput').value = '';
  document.getElementById('attendanceInput').value = '';
  renderMatches();
});
document.getElementById('language').addEventListener('change', renderMatches);
document.getElementById('medInput').addEventListener('input', renderMatches);
document.getElementById('protocolInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') loadProtocolMedications({ append: true });
});

init();
