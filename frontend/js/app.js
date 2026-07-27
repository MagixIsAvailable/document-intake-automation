'use strict';

document.addEventListener('DOMContentLoaded', function () {

  // ==================== SETTINGS ====================
  const SETTINGS_KEY = 'dia_settings';
  const DEFAULT_SETTINGS = {
    lmStudioUrl: 'http://127.0.0.1:1234/v1/chat/completions',
    n8nWebhookUrl: 'http://localhost:5678/webhook/document-intake',
    modelName: 'qwen2.5-coder-7b-instruct'
  };

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          lmStudioUrl: parsed.lmStudioUrl || DEFAULT_SETTINGS.lmStudioUrl,
          n8nWebhookUrl: parsed.n8nWebhookUrl || DEFAULT_SETTINGS.n8nWebhookUrl,
          modelName: parsed.modelName || DEFAULT_SETTINGS.modelName
        };
      }
    } catch (e) {
      // ignore parse errors
    }
    return { ...DEFAULT_SETTINGS };
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  let currentSettings = loadSettings();

  // ==================== SETTINGS UI ====================
  const settingsGear = document.getElementById('settingsGear');
  const settingsPanel = document.getElementById('settingsPanel');
  const settingsOverlay = document.getElementById('settingsOverlay');
  const settingsClose = document.getElementById('settingsClose');
  const settingsSave = document.getElementById('settingsSave');
  const settingsLmStudioUrl = document.getElementById('settingsLmStudioUrl');
  const settingsN8nUrl = document.getElementById('settingsN8nUrl');
  const settingsModelName = document.getElementById('settingsModelName');

  function populateSettingsFields() {
    settingsLmStudioUrl.value = currentSettings.lmStudioUrl;
    settingsN8nUrl.value = currentSettings.n8nWebhookUrl;
    settingsModelName.value = currentSettings.modelName;
  }

  function openSettings() {
    populateSettingsFields();
    settingsPanel.classList.add('open');
    settingsOverlay.classList.add('open');
  }

  function closeSettings() {
    settingsPanel.classList.remove('open');
    settingsOverlay.classList.remove('open');
  }

  settingsGear.addEventListener('click', openSettings);
  settingsClose.addEventListener('click', closeSettings);
  settingsOverlay.addEventListener('click', closeSettings);

  settingsSave.addEventListener('click', function () {
    currentSettings = {
      lmStudioUrl: settingsLmStudioUrl.value.trim() || DEFAULT_SETTINGS.lmStudioUrl,
      n8nWebhookUrl: settingsN8nUrl.value.trim() || DEFAULT_SETTINGS.n8nWebhookUrl,
      modelName: settingsModelName.value.trim() || DEFAULT_SETTINGS.modelName
    };
    saveSettings(currentSettings);
    populateSettingsFields();
    closeSettings();
  });

  // Close settings on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && settingsPanel.classList.contains('open')) {
      closeSettings();
    }
  });

  // ==================== DOM REFS ====================
  const form = document.getElementById('intakeForm');
  const submitBtn = document.getElementById('submitBtn');
  const errorMsg = document.getElementById('errorMsg');
  const resultsPanel = document.getElementById('resultsPanel');
  const resultsGrid = document.getElementById('resultsGrid');
  const processingTime = document.getElementById('processingTime');
  const textarea = document.getElementById('documentText');
  const clientInput = document.getElementById('clientName');

  // ==================== SINGLE DOCUMENT SUBMIT ====================
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errorMsg.style.display = 'none';
    resultsPanel.classList.remove('visible');
    resultsGrid.innerHTML = '';
    processingTime.textContent = '';

    const documentText = textarea.value.trim();
    if (!documentText) return;

    const clientName = clientInput.value.trim();

    // Generate document ID
    const docId = 'DOC-' + Date.now();

    // Start timer
    const startTime = Date.now();

    // Disable button + show spinner
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    // Timeline: step 1 active
    setTimelineStep('extract');

    try {
      const webhookUrl = currentSettings.n8nWebhookUrl;
      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_text: documentText,
          client_name: clientName || undefined,
          document_id: docId,
          model_name: currentSettings.modelName,
          lm_studio_url: currentSettings.lmStudioUrl
        })
      });

      // Timeline: step 2
      setTimelineStep('assess');

      if (!resp.ok) {
        throw new Error('Server returned ' + resp.status + ' ' + resp.statusText);
      }

      const data = await resp.json();

      // Calculate elapsed time
      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

      // Timeline: step 3
      setTimelineStep('validate');

      // Build results
      renderResults(data, docId, elapsedSec);

      // Timeline: step 4
      setTimelineStep('route');

      // Show results
      resultsPanel.classList.add('visible');
      processingTime.textContent = 'Processed in ' + elapsedSec + 's';

      // Mark all steps done
      markAllDone();
    } catch (err) {
      console.error('Submission error:', err);
      errorMsg.style.display = 'flex';
      resetTimeline();
    } finally {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  });

  function renderResults(data, docId, elapsedSec) {
    resultsGrid.innerHTML = '';

    // Document ID
    resultsGrid.appendChild(makeResultItem('Document ID', docId));

    // Extraction fields
    const extracted = data;
    if (extracted.client_name) {
      resultsGrid.appendChild(makeResultItem('Client Name', extracted.client_name));
    }
    if (extracted.document_type) {
      resultsGrid.appendChild(makeResultItem('Document Type', extracted.document_type));
    }
    if (extracted.document_date) {
      resultsGrid.appendChild(makeResultItem('Date', extracted.document_date));
    }
    if (extracted.amount !== undefined && extracted.amount !== null) {
      resultsGrid.appendChild(makeResultItem('Amount', extracted.amount));
    }
    if (extracted.summary) {
      resultsGrid.appendChild(makeResultItem('Summary', extracted.summary));
    }

    // Status badge
    const status = data.validation_status || 'UNKNOWN';
    const statusBadge = document.createElement('div');
    statusBadge.className = 'result-item';
    statusBadge.style.gridColumn = '1 / -1';
    statusBadge.innerHTML = '<div class="ri-label">Validation Status</div>' +
      '<span class="badge ' + (status === 'PASS' ? 'badge-pass' : 'badge-fail') + '">' +
      (status === 'PASS' ? '&#10003; PASS' : '&#10007; FAIL') + '</span>';
    resultsGrid.appendChild(statusBadge);

    // Risk assessment
    const risk = { risk_level: data.risk_level, risk_reason: data.risk_reason, requires_review: data.requires_review === 'Yes' };
    if (risk.risk_level) {
      const riskDiv = document.createElement('div');
      riskDiv.className = 'risk-highlight';
      const riskLevel = risk.risk_level.toLowerCase();
      const riskIcons = { low: '&#128994;', medium: '&#128993;', high: '&#128308;' };
      const riskIconClass = 'risk-icon ' + (riskLevel === 'low' ? 'risk-low' : riskLevel === 'medium' ? 'risk-medium' : 'risk-high');
      riskDiv.innerHTML =
        '<div class="' + riskIconClass + '">' + (riskIcons[riskLevel] || '&#9888;') + '</div>' +
        '<div class="risk-detail">' +
          '<span class="badge badge-risk-' + riskLevel + '">' + risk.risk_level.toUpperCase() + ' RISK</span>' +
          (risk.risk_reason ? '<div class="risk-reason">' + risk.risk_reason + '</div>' : '') +
        '</div>' +
        (risk.requires_review !== undefined
          ? '<span class="badge ' + (risk.requires_review ? 'badge-review-yes' : 'badge-review-no') + '">' +
            (risk.requires_review ? '&#9888; Review Required' : '&#10003; No Review Needed') + '</span>'
          : '');
      resultsGrid.appendChild(riskDiv);
    }

    // Validation errors
    const errors = Array.isArray(data.errors) ? data.errors : [];
    if (errors.length > 0) {
      const errSection = document.createElement('div');
      errSection.className = 'errors-section';
      errSection.innerHTML = '<div class="errors-title">Validation Errors</div>' +
        errors.map(function (err) {
          return '<span class="error-tag">' + err + '</span>';
        }).join('');
      resultsGrid.appendChild(errSection);
    }
  }

  function makeResultItem(label, value) {
    const div = document.createElement('div');
    div.className = 'result-item';
    div.innerHTML = '<div class="ri-label">' + label + '</div><div class="ri-value">' + value + '</div>';
    return div;
  }

  // ==================== TIMELINE ====================
  const timelineSteps = document.querySelectorAll('.timeline-step');

  function setTimelineStep(name) {
    timelineSteps.forEach(function (step) {
      step.classList.remove('active', 'done');
    });
    const target = document.querySelector('.timeline-step[data-step="' + name + '"]');
    if (target) target.classList.add('active');
  }

  function markAllDone() {
    setTimeout(function () {
      timelineSteps.forEach(function (step) {
        step.classList.remove('active');
        step.classList.add('done');
      });
    }, 600);
  }

  function resetTimeline() {
    timelineSteps.forEach(function (step) {
      step.classList.remove('active', 'done');
    });
  }

  // ==================== BATCH CSV PROCESSING ====================
  const dropZone = document.getElementById('dropZone');
  const csvFileInput = document.getElementById('csvFileInput');
  const fileInfo = document.getElementById('fileInfo');
  const fileName = document.getElementById('fileName');
  const fileRemove = document.getElementById('fileRemove');
  const batchSubmitBtn = document.getElementById('batchSubmitBtn');
  const batchProgress = document.getElementById('batchProgress');
  const batchProgressFill = document.getElementById('batchProgressFill');
  const batchProgressText = document.getElementById('batchProgressText');
  const batchSummary = document.getElementById('batchSummary');
  const batchTableWrapper = document.getElementById('batchTableWrapper');
  const batchTableBody = document.getElementById('batchTableBody');
  const exportBtn = document.getElementById('exportBtn');

  const summaryTotal = document.getElementById('summaryTotal');
  const summaryPass = document.getElementById('summaryPass');
  const summaryFail = document.getElementById('summaryFail');
  const summaryLow = document.getElementById('summaryLow');
  const summaryMedium = document.getElementById('summaryMedium');
  const summaryHigh = document.getElementById('summaryHigh');

  let selectedFile = null;
  let batchResults = [];

  // Drag-and-drop
  dropZone.addEventListener('click', function () { csvFileInput.click(); });
  dropZone.addEventListener('dragover', function (e) { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('drag-over'); });
  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });
  csvFileInput.addEventListener('change', function () {
    if (csvFileInput.files.length > 0) {
      handleFile(csvFileInput.files[0]);
    }
  });

  function handleFile(file) {
    if (!file.name.endsWith('.csv')) {
      alert('Please select a .csv file.');
      return;
    }
    selectedFile = file;
    fileName.textContent = file.name;
    fileInfo.classList.add('visible');
    batchSubmitBtn.style.display = 'inline-flex';
  }

  fileRemove.addEventListener('click', function () {
    selectedFile = null;
    csvFileInput.value = '';
    fileInfo.classList.remove('visible');
    batchSubmitBtn.style.display = 'none';
    batchProgress.classList.remove('visible');
    batchSummary.classList.remove('visible');
    batchTableWrapper.classList.remove('visible');
    exportBtn.style.display = 'none';
    batchResults = [];
  });

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(function (h) { return h.trim().replace(/^"|"$/g, ''); });
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 3) continue;
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = (cols[j] || '').trim().replace(/^"|"$/g, '');
      }
      if (row.document_text) {
        rows.push(row);
      }
    }
    return rows;
  }

  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line.charAt(i);
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line.charAt(i + 1) === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current);
    return result;
  }

  async function processOneDocument(row, index) {
    const webhookUrl = currentSettings.n8nWebhookUrl;
    console.log('Row data:', row);
    console.log('Client name:', row.client_name, row['client_name']);
    console.log('Sending client_name:', row.client_name, '| Keys:', Object.keys(row));
    try {
      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_text: row.document_text || row['document_text'],
          client_name: row.client_name || row['client_name']
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        console.log('n8n response for doc', index, ':', JSON.stringify(data, null, 2));
        return {
          document_id: row.document_id || data.document_id || ('DOC-' + Date.now() + '-' + index),
          client_name: data.client_name || row.client_name || '',
          document_type: data.document_type || '',
          date: data.document_date || '',
          amount: data.amount || '',
          risk_level: data.risk_level || '',
          status: data.validation_status || 'UNKNOWN',
          errors: Array.isArray(data.errors) ? data.errors : []
        };
      } else {
        return {
          document_id: row.document_id || ('DOC-' + Date.now() + '-' + index),
          client_name: row.client_name || '',
          document_type: '',
          date: '',
          amount: '',
          risk_level: '',
          status: 'ERROR',
          errors: ['HTTP ' + resp.status]
        };
      }
    } catch (rowErr) {
      return {
        document_id: row.document_id || ('DOC-' + Date.now() + '-' + index),
        client_name: row.client_name || '',
        document_type: '',
        date: '',
        amount: '',
        risk_level: '',
        status: 'ERROR',
        errors: [rowErr.message]
      };
    }
  }

  let batchCancelled = false;

  batchSubmitBtn.addEventListener('click', async function () {
    if (!selectedFile) {
      alert('Please select a CSV file first.');
      return;
    }

    // If already running, treat as stop
    if (batchSubmitBtn.classList.contains('loading')) {
      batchCancelled = true;
      batchSubmitBtn.querySelector('.btn-text').textContent = 'Stopping...';
      batchSubmitBtn.disabled = true;
      return;
    }

    batchCancelled = false;
    batchSubmitBtn.classList.add('loading');
    batchSubmitBtn.disabled = false; // keep enabled so it can be clicked to stop
    batchSubmitBtn.querySelector('.btn-text').textContent = 'Stop Batch';

    // Swap to stop icon + red on hover while loading
    batchSubmitBtn.addEventListener('mouseenter', function () {
      if (batchSubmitBtn.classList.contains('loading')) {
        batchSubmitBtn.querySelector('.btn-text').textContent = '\u23F9 Stop Batch';
        batchSubmitBtn.style.background = 'var(--danger)';
      }
    });

    batchSubmitBtn.addEventListener('mouseleave', function () {
      if (batchSubmitBtn.classList.contains('loading') && !batchCancelled) {
        batchSubmitBtn.querySelector('.btn-text').textContent = 'Processing...';
        batchSubmitBtn.style.background = '';
      }
    });

    batchProgress.classList.add('visible');
    batchProgressFill.style.width = '0%';
    batchProgressText.textContent = 'Reading CSV file...';
    batchResults = [];
    batchSummary.classList.remove('visible');
    batchTableWrapper.classList.remove('visible');
    exportBtn.style.display = 'none';
    errorMsg.style.display = 'none';

    try {
      const text = await readFileAsText(selectedFile);
      const rows = parseCSV(text);

      if (rows.length === 0) {
        alert('No valid rows found in CSV. Ensure it has document_id, client_name, and document_text columns.');
        batchProgress.classList.remove('visible');
        batchSubmitBtn.classList.remove('loading');
        batchSubmitBtn.disabled = false;
        return;
      }

      batchProgressText.textContent = 'Processing 0 of ' + rows.length + ' documents...';
      const total = rows.length;
      const BATCH_SIZE = 4;
      const batchStartTime = Date.now();

      for (let i = 0; i < total; i += BATCH_SIZE) {
        const chunk = rows.slice(i, i + BATCH_SIZE);
        const chunkResults = await Promise.all(
          chunk.map(function (row, chunkIdx) {
            const globalIdx = i + chunkIdx;
            return processOneDocument(row, globalIdx);
          })
        );
        chunkResults.forEach(function (result) {
          batchResults.push(result);
        });

        if (batchCancelled) {
          batchProgressText.textContent = 'Batch stopped at ' + batchResults.length + ' of ' + total + ' documents.';
          break;
        }

        // Update progress with ETA
        const processed = Math.min(i + BATCH_SIZE, total);
        const elapsedMs = Date.now() - batchStartTime;
        const msPerDoc = elapsedMs / processed;
        const remaining = total - processed;
        const etaSeconds = Math.round((msPerDoc * remaining) / 1000);
        const etaText = etaSeconds > 60
          ? Math.round(etaSeconds / 60) + 'm ' + (etaSeconds % 60) + 's remaining'
          : etaSeconds + 's remaining';
        const pct = Math.round((processed / total) * 100);
        batchProgressFill.style.width = pct + '%';
        batchProgressText.textContent = 'Processing ' + processed + ' of ' + total + ' — ' + etaText;
      }

      // Done
      if (!batchCancelled) {
        batchProgressText.textContent = 'Processing complete — ' + batchResults.length + ' documents';
      }
      renderBatchResults();
      batchSubmitBtn.classList.remove('loading');
      batchSubmitBtn.disabled = false;
      batchSubmitBtn.querySelector('.btn-text').textContent = 'Process Batch';
    } catch (err) {
      console.error('Batch processing error:', err);
      errorMsg.style.display = 'flex';
      batchProgress.classList.remove('visible');
      batchSubmitBtn.classList.remove('loading');
      batchSubmitBtn.disabled = false;
      batchSubmitBtn.querySelector('.btn-text').textContent = 'Process Batch';
    }
  });

  function renderBatchResults() {
    // Summary
    let passCount = 0, failCount = 0, lowCount = 0, medCount = 0, highCount = 0;
    batchResults.forEach(function (r) {
      if (r.status === 'PASS') passCount++;
      else failCount++;
      if (r.risk_level) {
        const rl = r.risk_level.toLowerCase();
        if (rl === 'low') lowCount++;
        else if (rl === 'medium') medCount++;
        else if (rl === 'high') highCount++;
      }
    });

    summaryTotal.textContent = batchResults.length;
    summaryPass.textContent = passCount;
    summaryFail.textContent = failCount;
    summaryLow.textContent = lowCount;
    summaryMedium.textContent = medCount;
    summaryHigh.textContent = highCount;
    batchSummary.classList.add('visible');

    // Table rows
    batchTableBody.innerHTML = '';
    batchResults.forEach(function (r) {
      const tr = document.createElement('tr');
      const riskLevel = r.risk_level ? r.risk_level.toLowerCase() : '';
      tr.innerHTML =
        '<td>' + escapeHtml(r.document_id) + '</td>' +
        '<td>' + escapeHtml(r.client_name) + '</td>' +
        '<td>' + escapeHtml(r.document_type) + '</td>' +
        '<td>' + escapeHtml(r.date) + '</td>' +
        '<td>' + escapeHtml(String(r.amount)) + '</td>' +
        '<td>' + (riskLevel ? '<span class="badge-table badge-table-risk-' + riskLevel + '">' + r.risk_level.toUpperCase() + '</span>' : '—') + '</td>' +
        '<td>' + (r.status === 'PASS'
          ? '<span class="badge-table badge-table-pass">PASS</span>'
          : '<span class="badge-table badge-table-fail">' + r.status + '</span>') + '</td>' +
        '<td class="cell-errors">' + (r.errors && r.errors.length > 0
          ? r.errors.map(function (err) { return '<span class="cell-error-tag">' + escapeHtml(err) + '</span>'; }).join('')
          : '—') + '</td>';
      batchTableBody.appendChild(tr);
    });

    batchTableWrapper.classList.add('visible');
    exportBtn.style.display = 'inline-flex';
  }

  // CSV Export
  exportBtn.addEventListener('click', function () {
    if (batchResults.length === 0) return;
    const headers = ['document_id', 'client_name', 'document_type', 'date', 'amount', 'risk_level', 'status', 'errors'];
    let csv = headers.join(',') + '\n';
    batchResults.forEach(function (r) {
      csv += [
        csvEscape(r.document_id),
        csvEscape(r.client_name),
        csvEscape(r.document_type),
        csvEscape(r.date),
        csvEscape(String(r.amount)),
        csvEscape(r.risk_level),
        csvEscape(r.status),
        csvEscape((r.errors || []).join('; '))
      ].join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'batch-results-' + Date.now() + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  function csvEscape(val) {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Read file as UTF-8, stripping BOM if present
  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var text = reader.result;
        // Strip UTF-8 BOM if present
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
        resolve(text);
      };
      reader.onerror = reject;
      reader.readAsText(file, 'UTF-8');
    });
  }

});