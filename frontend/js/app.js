(function () {
  'use strict';

  const form = document.getElementById('intakeForm');
  const submitBtn = document.getElementById('submitBtn');
  const errorMsg = document.getElementById('errorMsg');
  const resultsPanel = document.getElementById('resultsPanel');
  const resultsGrid = document.getElementById('resultsGrid');
  const textarea = document.getElementById('documentText');
  const clientInput = document.getElementById('clientName');

  const timelineSteps = {
    extract:  document.querySelector('[data-step="extract"]'),
    assess:   document.querySelector('[data-step="assess"]'),
    validate: document.querySelector('[data-step="validate"]'),
    route:    document.querySelector('[data-step="route"]')
  };

  function resetTimeline() {
    Object.values(timelineSteps).forEach(el => {
      el.classList.remove('active', 'done');
      el.querySelector('.timeline-step-icon').innerHTML = '&#9679;';
    });
    timelineSteps.extract.classList.add('done');
    timelineSteps.extract.querySelector('.timeline-step-icon').innerHTML = '&#10003;';
  }

  function advanceTimeline(stepKey) {
    const el = timelineSteps[stepKey];
    if (!el) return;
    const prevDone = el.previousElementSibling;
    if (prevDone && prevDone.classList.contains('timeline-step')) {
      prevDone.classList.add('done');
      prevDone.classList.remove('active');
      prevDone.querySelector('.timeline-step-icon').innerHTML = '&#10003;';
    }
    el.classList.add('active');
    el.querySelector('.timeline-step-icon').innerHTML = '&#9679;';
  }

  function finishAllTimelineSteps() {
    Object.values(timelineSteps).forEach(el => {
      el.classList.add('done');
      el.classList.remove('active');
      el.querySelector('.timeline-step-icon').innerHTML = '&#10003;';
    });
  }

  function setLoading(isLoading) {
    if (isLoading) {
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
      errorMsg.style.display = 'none';
    } else {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  }

  function getRiskIconClass(level) {
    if (!level) return 'risk-low';
    const l = level.toLowerCase();
    if (l === 'low' || l === 'none') return 'risk-low';
    if (l === 'medium') return 'risk-medium';
    return 'risk-high';
  }

  function getRiskIcon(level) {
    if (!level) return '&#128737;';
    const l = level.toLowerCase();
    if (l === 'low' || l === 'none') return '&#128737;';
    if (l === 'medium') return '&#9888;';
    return '&#9888;';
  }

  function getRiskBadgeClass(level) {
    if (!level) return 'badge-risk-low';
    const l = level.toLowerCase();
    if (l === 'low' || l === 'none') return 'badge-risk-low';
    if (l === 'medium') return 'badge-risk-medium';
    return 'badge-risk-high';
  }

  function buildResultsGrid(data) {
    const fields = [
      { label: 'Client Name',    key: 'client_name',    value: data.client_name    || '—' },
      { label: 'Document Type',  key: 'document_type',  value: data.document_type  || data.documentType  || '—' },
      { label: 'Document Date',  key: 'document_date',  value: data.document_date  || data.documentDate  || '—' },
      { label: 'Amount',         key: 'amount',         value: data.amount         || '—' },
      { label: 'Summary',        key: 'summary',        value: data.summary        || '—', fullWidth: true },
      { label: 'Risk Reason',    key: 'risk_reason',    value: data.risk_reason    || data.riskReason    || '—', fullWidth: true },
      { label: 'Timestamp',      key: 'timestamp',      value: data.timestamp      || '—' },
      { label: 'Requires Review',key: 'requires_review',value: data.requires_review || data.requiresReview || '—' },
    ];

    let html = '';

    // Risk level highlight row
    const riskLevel = data.risk_level || data.riskLevel || 'low';
    const riskIconClass = getRiskIconClass(riskLevel);
    const riskIcon = getRiskIcon(riskLevel);
    const riskBadgeClass = getRiskBadgeClass(riskLevel);
    const riskReason = data.risk_reason || data.riskReason || 'No specific risk factors identified.';

    html += '<div class="risk-highlight">';
    html += '<div class="risk-icon ' + riskIconClass + '">' + riskIcon + '</div>';
    html += '<div class="risk-detail">';
    html += '<span class="badge ' + riskBadgeClass + '">Risk: ' + escapeHtml(riskLevel.toUpperCase()) + '</span>';
    html += '<div class="risk-reason">' + escapeHtml(riskReason) + '</div>';
    html += '</div>';
    html += '</div>';

    // Validation status
    const valStatus = data.validation_status || data.validationStatus || 'PASS';
    const isPass = valStatus.toUpperCase() === 'PASS';
    html += '<div class="result-item">';
    html += '<div class="ri-label">Validation Status</div>';
    html += '<div class="ri-value">';
    html += '<span class="badge ' + (isPass ? 'badge-pass' : 'badge-fail') + '">';
    html += (isPass ? '&#10003; PASS' : '&#10007; FAIL');
    html += '</span>';
    html += '</div>';
    html += '</div>';

    // Standard fields
    fields.forEach(f => {
      const style = f.fullWidth ? ' style="grid-column: 1 / -1;"' : '';
      html += '<div class="result-item"' + style + '>';
      html += '<div class="ri-label">' + escapeHtml(f.label) + '</div>';
      html += '<div class="ri-value">' + escapeHtml(String(f.value)) + '</div>';
      html += '</div>';
    });

    // Error list
    const errors = data.errors || [];
    if (Array.isArray(errors) && errors.length > 0) {
      html += '<div class="errors-section">';
      html += '<div class="errors-title">Errors (' + errors.length + ')</div>';
      errors.forEach(e => {
        html += '<span class="error-tag">' + escapeHtml(String(e)) + '</span>';
      });
      html += '</div>';
    }

    // Requires review badge
    const requiresReview = data.requires_review || data.requiresReview;
    if (requiresReview !== undefined && requiresReview !== null) {
      const reviewStr = String(requiresReview).toLowerCase();
      const isYes = reviewStr === 'yes' || reviewStr === 'true' || reviewStr === '1';
      // Already rendered in fields, but add visual indicator if needed
    }

    resultsGrid.innerHTML = html;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '—';
    const s = String(str);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const docText = textarea.value.trim();
    if (!docText) {
      textarea.focus();
      return;
    }

    setLoading(true);
    resetTimeline();

    // Hide previous results & errors
    resultsPanel.classList.remove('visible');
    errorMsg.style.display = 'none';

    // Step 1: Extract (already done in timeline reset)
    // Step 2: Assess Risk
    setTimeout(() => advanceTimeline('assess'), 600);

    const payload = {
      document_text: docText,
      client_name: clientInput.value.trim() || ''
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('http://localhost:5678/webhook/document-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Step 3: Validate
      setTimeout(() => advanceTimeline('validate'), 400);

      if (!response.ok) {
        throw new Error('Server responded with status ' + response.status);
      }

      const data = await response.json();

      // Step 4: Route
      setTimeout(() => advanceTimeline('route'), 400);
      setTimeout(() => finishAllTimelineSteps(), 800);

      buildResultsGrid(data);

      // Show results panel
      requestAnimationFrame(() => {
        resultsPanel.classList.add('visible');
        resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });

    } catch (err) {
      finishAllTimelineSteps();
      errorMsg.style.display = 'flex';
      if (err.name === 'AbortError') {
        errorMsg.querySelector('span:last-child').textContent =
          'Request timed out. Could not connect to the automation workflow. Please ensure n8n is running.';
      } else {
        errorMsg.querySelector('span:last-child').textContent =
          'Could not connect to the automation workflow. Please ensure n8n is running.';
      }
    } finally {
      setLoading(false);
    }
  });

  // Initialize timeline
  resetTimeline();
})();
