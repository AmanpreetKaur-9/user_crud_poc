const fs = require('fs');
const path = require('path');
const os = require('os');

const TRACE_DIR = path.join(os.tmpdir(), 'jest-api-traces');

class CustomHtmlReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options || {};
  }

  onRunStart() {
    // Clean up old trace files at the start of the run
    if (fs.existsSync(TRACE_DIR)) {
      try {
        const files = fs.readdirSync(TRACE_DIR);
        for (const f of files) {
          fs.unlinkSync(path.join(TRACE_DIR, f));
        }
      } catch (e) { }
    }
  }

  onRunComplete(contexts, results) {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const timestamp = `${dateStr}_${timeStr}`;
    const generatedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const publicPath = this._options.publicPath || `integration-tests/reports/${dateStr}`;
    const filename = this._options.filename || `report_${timestamp}.html`;
    const pageTitle = this._options.pageTitle || 'Integration Test Report';

    // ─── Load API Traces ───
    const apiTraces = {}; // keyed by "testFile::testName" => [{method, url, ...}]
    if (fs.existsSync(TRACE_DIR)) {
      try {
        const files = fs.readdirSync(TRACE_DIR).filter(f => f.endsWith('.json'));
        for (const f of files) {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(TRACE_DIR, f), 'utf8'));
            const key = `${data.testFile}::${data.testName}`;
            if (!apiTraces[key]) apiTraces[key] = [];
            apiTraces[key].push({
              method: data.method,
              url: data.url,
              requestBody: data.requestBody,
              responseStatus: data.responseStatus,
              responseBody: data.responseBody,
            });
          } catch (e) { }
        }
      } catch (e) { }
    }

    // ─── Compute Stats ───
    const totalTests = results.numTotalTests;
    const passed = results.numPassedTests;
    const failed = results.numFailedTests;
    const passRate = totalTests > 0 ? ((passed / totalTests) * 100).toFixed(1) : '0.0';
    const durationMs = Date.now() - results.startTime;
    const durationStr = (durationMs / 1000).toFixed(2);
    const totalFiles = results.numTotalTestSuites;

    // ─── Build Test Data ───
    const testFiles = results.testResults.map((suite) => {
      const fileName = path.basename(suite.testFilePath);
      const suitePassed = suite.testResults.filter(t => t.status === 'passed').length;
      const suiteFailed = suite.testResults.filter(t => t.status === 'failed').length;
      const suiteStatus = suiteFailed > 0 ? 'failed' : 'passed';
      const suiteDuration = (suite.testResults.reduce((sum, t) => sum + (t.duration || 0), 0) / 1000).toFixed(2);

      const tests = suite.testResults
        .filter(t => t.status !== 'pending' && t.status !== 'skipped')
        .map(t => {
          const traceKey = `${suite.testFilePath}::${t.fullName}`;
          return {
            title: t.title,
            fullName: t.fullName,
            status: t.status,
            duration: ((t.duration || 0) / 1000).toFixed(2),
            failureMessages: t.failureMessages || [],
            apiCalls: apiTraces[traceKey] || [],
          };
        });

      return {
        fileName,
        status: suiteStatus,
        passed: suitePassed,
        failed: suiteFailed,
        total: tests.length,
        duration: suiteDuration,
        tests,
      };
    });

    const testDataJson = JSON.stringify(testFiles)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');

    const html = this._generateHtml(pageTitle, generatedAt, totalFiles, totalTests, passed, failed, passRate, durationStr, testDataJson);

    // ─── Write Report ───
    const reportDir = path.resolve(process.cwd(), publicPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    const reportPath = path.join(reportDir, filename);
    fs.writeFileSync(reportPath, html, 'utf8');
    console.log(`📦 report is created on: ${reportPath}`);

    // Cleanup trace files
    try {
      if (fs.existsSync(TRACE_DIR)) {
        const files = fs.readdirSync(TRACE_DIR);
        for (const f of files) fs.unlinkSync(path.join(TRACE_DIR, f));
      }
    } catch (e) { }
  }

  _generateHtml(pageTitle, generatedAt, totalFiles, totalTests, passed, failed, passRate, durationStr, testDataJson) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${pageTitle}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #f3f4f8; color: #333; min-height: 100vh;
  }

  /* ─── Header ─── */
  .header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 28px 40px; border-radius: 0 0 16px 16px; color: #fff;
  }
  .header h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  .header .meta { font-size: 13px; opacity: 0.85; }

  .container { max-width: 1100px; margin: 0 auto; padding: 24px 20px; }

  /* ─── Summary Cards ─── */
  .summary-cards { display: flex; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; }
  .card {
    flex: 1; min-width: 150px; background: #fff; border-radius: 12px;
    padding: 20px 16px; text-align: center;
    box-shadow: 0 1px 4px rgba(0,0,0,0.07);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
  .card .value { font-size: 32px; font-weight: 700; }
  .card .label { font-size: 12px; color: #888; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .card.total .value   { color: #4f5ee4; }
  .card.passed .value  { color: #22c55e; }
  .card.failed .value  { color: #ef4444; }
  .card.rate .value    { color: #333; }
  .card.duration .value{ color: #333; }

  /* ─── Filter Bar ─── */
  .filter-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
  .filter-buttons { display: flex; gap: 6px; }
  .fbtn {
    padding: 6px 18px; border-radius: 6px; border: 1px solid #ddd;
    background: #fff; color: #555; font-size: 13px; font-weight: 500;
    cursor: pointer; transition: all 0.15s;
  }
  .fbtn:hover { border-color: #667eea; color: #667eea; }
  .fbtn.active { background: #667eea; color: #fff; border-color: #667eea; }

  /* ─── Table ─── */
  .test-table { width: 100%; border-collapse: separate; border-spacing: 0; }
  .test-table th {
    text-align: left; padding: 10px 14px; font-size: 12px; color: #888;
    text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #eee;
  }
  .test-table th:last-child { text-align: right; }

  /* Suite row */
  .suite-row { cursor: pointer; transition: background 0.12s; }
  .suite-row td { padding: 12px 14px; border-bottom: 1px solid #f0f0f0; background: #fff; vertical-align: middle; }
  .suite-row:hover td { background: #f7f8fc; }
  .suite-row td:last-child { text-align: right; color: #888; font-size: 13px; }

  /* Test row */
  .test-row td { padding: 10px 14px 10px 44px; border-bottom: 1px solid #f2f2f5; background: #fafbfe; font-size: 13px; vertical-align: top; }
  .test-row:hover td { background: #f0f1fa; }
  .test-row td:last-child { text-align: right; color: #999; vertical-align: middle; }
  .test-row.hidden { display: none; }

  /* ─── Status Badge ─── */
  .badge {
    display: inline-block; padding: 3px 10px; border-radius: 4px;
    font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;
  }
  .badge.passed  { background: #dcfce7; color: #16a34a; }
  .badge.failed  { background: #fee2e2; color: #dc2626; }

  /* ─── Method Badge ─── */
  .method-badge {
    display: inline-block; padding: 2px 8px; border-radius: 4px;
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; margin-right: 8px;
  }
  .method-badge.GET    { color: #16a34a; }
  .method-badge.POST   { color: #2563eb; }
  .method-badge.PUT    { color: #d97706; }
  .method-badge.PATCH  { color: #d97706; }
  .method-badge.DELETE { color: #dc2626; }

  /* ─── Status Code Badge ─── */
  .status-code {
    display: inline-block; padding: 1px 8px; border-radius: 4px;
    font-size: 11px; font-weight: 700; float: right;
  }
  .status-code.s2xx { background: #dcfce7; color: #16a34a; }
  .status-code.s3xx { background: #e0e7ff; color: #4338ca; }
  .status-code.s4xx { background: #fee2e2; color: #dc2626; }
  .status-code.s5xx { background: #fef3c7; color: #92400e; }

  /* ─── API Call Block ─── */
  .api-calls { margin-top: 8px; }
  .api-call { margin-bottom: 8px; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
  .api-call-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; background: #f9fafb; cursor: pointer;
    font-size: 13px; border-bottom: 1px solid #e5e7eb;
  }
  .api-call-header:hover { background: #f0f1f5; }
  .api-call-header .endpoint-info { display: flex; align-items: center; gap: 6px; flex: 1; }
  .api-call-header .endpoint-url { font-family: 'SF Mono', Consolas, monospace; font-size: 12px; color: #374151; }
  .api-call-chevron { font-size: 10px; color: #aaa; transition: transform 0.2s; margin-right: 8px; }
  .api-call-chevron.open { transform: rotate(90deg); }
  .api-call-body { display: none; }
  .api-call-body.show { display: block; }

  .body-section { padding: 8px 12px; }
  .body-label {
    font-size: 11px; font-weight: 600; text-transform: uppercase; color: #6b7280;
    margin-bottom: 4px; display: flex; align-items: center; gap: 6px;
  }
  .body-label .status-code { font-size: 10px; }
  .code-block {
    background: #1e293b; color: #e2e8f0; padding: 12px 14px;
    border-radius: 6px; font-family: 'SF Mono', Consolas, 'Courier New', monospace;
    font-size: 12px; line-height: 1.5; overflow-x: auto; white-space: pre-wrap;
    word-wrap: break-word;
  }

  /* Chevron */
  .chevron { display: inline-block; margin-right: 8px; font-size: 10px; transition: transform 0.2s; color: #aaa; }
  .chevron.open { transform: rotate(90deg); }
  .suite-info { font-weight: 500; font-size: 14px; }
  .suite-count { font-size: 12px; color: #999; margin-left: 6px; }

  /* Failure message */
  .failure-msg {
    background: #fef2f2; border-left: 3px solid #ef4444;
    padding: 8px 12px; margin-top: 6px; font-size: 12px; color: #991b1b;
    border-radius: 0 6px 6px 0; white-space: pre-wrap; font-family: monospace;
  }

  .suite-hidden { display: none; }
</style>
</head>
<body>

<div class="header">
  <h1>${pageTitle}</h1>
  <div class="meta">Generated: ${generatedAt} | ${totalFiles} files</div>
</div>

<div class="container">
  <div class="summary-cards">
    <div class="card total"><div class="value">${totalTests}</div><div class="label">Total Tests</div></div>
    <div class="card passed"><div class="value">${passed}</div><div class="label">Passed</div></div>
    <div class="card failed"><div class="value">${failed}</div><div class="label">Failed</div></div>
    <div class="card rate"><div class="value">${passRate}%</div><div class="label">Pass Rate</div></div>
    <div class="card duration"><div class="value">${durationStr}s</div><div class="label">Duration</div></div>
  </div>

  <div class="filter-bar">
    <div class="filter-buttons">
      <button class="fbtn active" data-filter="all">All</button>
      <button class="fbtn" data-filter="passed">Passed</button>
      <button class="fbtn" data-filter="failed">Failed</button>
    </div>
    <button class="fbtn" id="expandFailedBtn">Expand Failed</button>
  </div>

  <table class="test-table">
    <thead><tr>
      <th style="width:100px">Status</th>
      <th>Test</th>
      <th style="width:100px">Duration</th>
    </tr></thead>
    <tbody id="testBody"></tbody>
  </table>
</div>

<script>
(function() {
  var testFiles = ${testDataJson};
  var tbody = document.getElementById('testBody');

  function escapeHtml(s) {
    if (typeof s !== 'string') s = JSON.stringify(s, null, 2);
    var d = document.createElement('div'); d.textContent = s; return d.innerHTML;
  }

  function statusCodeClass(code) {
    if (code >= 200 && code < 300) return 's2xx';
    if (code >= 300 && code < 400) return 's3xx';
    if (code >= 400 && code < 500) return 's4xx';
    return 's5xx';
  }

  function formatBody(body) {
    if (body === null || body === undefined) return 'No body';
    if (typeof body === 'object') return JSON.stringify(body, null, 2);
    return String(body);
  }

  testFiles.forEach(function(suite, sIdx) {
    // ─── Suite Row ───
    var tr = document.createElement('tr');
    tr.className = 'suite-row';
    tr.setAttribute('data-status', suite.status);
    tr.setAttribute('data-idx', sIdx);
    var parts = [];
    if (suite.passed > 0) parts.push(suite.passed + ' passed');
    if (suite.failed > 0) parts.push(suite.failed + ' failed');

    tr.innerHTML =
      '<td><span class="badge ' + suite.status + '">' + suite.status.toUpperCase() + '</span></td>' +
      '<td><span class="chevron" id="chev-' + sIdx + '">&#9654;</span>' +
      '<span class="suite-info">' + escapeHtml(suite.fileName) + '</span>' +
      '<span class="suite-count">(' + parts.join(', ') + ')</span></td>' +
      '<td>' + suite.duration + 's</td>';
    tr.addEventListener('click', function() { toggleSuite(sIdx); });
    tbody.appendChild(tr);

    // ─── Test Rows ───
    suite.tests.forEach(function(test, tIdx) {
      var testTr = document.createElement('tr');
      testTr.className = 'test-row hidden';
      testTr.setAttribute('data-suite', sIdx);
      testTr.setAttribute('data-status', test.status);

      var testContentHtml = '<span class="badge ' + test.status + '">' + test.status.toUpperCase() + '</span>';

      var testNameHtml = escapeHtml(test.title);

      // ─── API Calls ───
      var apiHtml = '';
      if (test.apiCalls && test.apiCalls.length > 0) {
        apiHtml = '<div class="api-calls">';
        test.apiCalls.forEach(function(call, cIdx) {
          var callId = 'api-' + sIdx + '-' + tIdx + '-' + cIdx;
          var scClass = statusCodeClass(call.responseStatus);
          apiHtml += '<div class="api-call">';
          apiHtml += '<div class="api-call-header" onclick="toggleApiCall(\\'' + callId + '\\')">';
          apiHtml += '<div class="endpoint-info">';
          apiHtml += '<span class="api-call-chevron" id="apichev-' + callId + '">&#9654;</span>';
          apiHtml += '<span class="method-badge ' + call.method + '">' + call.method + '</span>';
          apiHtml += '<span class="endpoint-url">' + escapeHtml(call.url) + '</span>';
          apiHtml += '</div>';
          apiHtml += '<span class="status-code ' + scClass + '">' + call.responseStatus + '</span>';
          apiHtml += '</div>';

          apiHtml += '<div class="api-call-body" id="apibody-' + callId + '">';
          if (call.requestBody) {
            apiHtml += '<div class="body-section">';
            apiHtml += '<div class="body-label">REQUEST BODY</div>';
            apiHtml += '<div class="code-block">' + escapeHtml(formatBody(call.requestBody)) + '</div>';
            apiHtml += '</div>';
          }
          apiHtml += '<div class="body-section">';
          apiHtml += '<div class="body-label">RESPONSE BODY <span class="status-code ' + scClass + '">' + call.responseStatus + '</span></div>';
          apiHtml += '<div class="code-block">' + escapeHtml(formatBody(call.responseBody)) + '</div>';
          apiHtml += '</div>';
          apiHtml += '</div>';

          apiHtml += '</div>';
        });
        apiHtml += '</div>';
      }

      // Failure messages
      var failHtml = '';
      if (test.failureMessages && test.failureMessages.length > 0) {
        test.failureMessages.forEach(function(msg) {
          failHtml += '<div class="failure-msg">' + escapeHtml(msg) + '</div>';
        });
      }

      testTr.innerHTML =
        '<td>' + testContentHtml + '</td>' +
        '<td>' + testNameHtml + apiHtml + failHtml + '</td>' +
        '<td>' + test.duration + 's</td>';
      tbody.appendChild(testTr);
    });
  });

  // ─── Toggle Suite ───
  function toggleSuite(idx) {
    var rows = document.querySelectorAll('.test-row[data-suite="' + idx + '"]');
    var chev = document.getElementById('chev-' + idx);
    var isOpen = chev.classList.contains('open');
    rows.forEach(function(r) { r.classList.toggle('hidden', isOpen); });
    chev.classList.toggle('open', !isOpen);
  }

  // ─── Toggle API Call Body ───
  window.toggleApiCall = function(callId) {
    var body = document.getElementById('apibody-' + callId);
    var chev = document.getElementById('apichev-' + callId);
    body.classList.toggle('show');
    chev.classList.toggle('open');
  };

  // ─── Filter Buttons ───
  var filterBtns = document.querySelectorAll('.fbtn[data-filter]');
  filterBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      filterBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var filter = btn.getAttribute('data-filter');
      document.querySelectorAll('.suite-row').forEach(function(row) {
        var status = row.getAttribute('data-status');
        var idx = row.getAttribute('data-idx');
        var show = (filter === 'all' || status === filter);
        row.classList.toggle('suite-hidden', !show);
        if (!show) {
          document.querySelectorAll('.test-row[data-suite="' + idx + '"]').forEach(function(r) { r.classList.add('hidden'); });
          var chev = document.getElementById('chev-' + idx);
          if (chev) chev.classList.remove('open');
        }
      });
    });
  });

  // ─── Expand Failed ───
  document.getElementById('expandFailedBtn').addEventListener('click', function() {
    document.querySelectorAll('.suite-row').forEach(function(row) {
      if (row.getAttribute('data-status') === 'failed') {
        var idx = row.getAttribute('data-idx');
        document.querySelectorAll('.test-row[data-suite="' + idx + '"]').forEach(function(r) { r.classList.remove('hidden'); });
        var chev = document.getElementById('chev-' + idx);
        if (chev) chev.classList.add('open');
      }
    });
  });
})();
</script>
</body>
</html>`;
  }
}

module.exports = CustomHtmlReporter;
