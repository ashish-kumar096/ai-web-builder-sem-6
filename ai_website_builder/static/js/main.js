

let generatedCode = "";
let promptText    = "";
let isGenerating  = false;
let fakeProgress  = null;

/* ── TAG TOGGLES ── */
document.querySelectorAll('.tag').forEach(tag => {
  tag.addEventListener('click', () => {
    tag.classList.toggle('active');
  });
});

/* ── COLLECT FORM DATA ── */
function collectData() {
  const featureMap = {
    f1: "Responsive, mobile-first layout (375px / 768px / 1280px breakpoints)",
    f2: "Smooth CSS animations and purposeful transitions on key elements",
    f3: "SEO-optimized HTML structure with proper meta tags and Open Graph",
    f4: "Dark/light mode toggle with localStorage persistence",
    f5: "Functional contact / lead-gen form with client-side validation",
    f6: "Full accessibility: ARIA labels, keyboard navigation, WCAG AA contrast",
    f7: "CMS-ready semantic structure (easily connectable to Headless CMS)",
    f8: "Performance-optimized: lazy loading images, minimal blocking resources"
  };
  const features = Object.keys(featureMap)
    .filter(k => document.getElementById(k).checked)
    .map(k => featureMap[k]);

  const tags = [...document.querySelectorAll('.tag.active')].map(t => t.dataset.val);

  return {
    idea:    document.getElementById('ideaInput').value.trim(),
    stack:   document.getElementById('stack').value,
    style:   document.getElementById('style').value,
    color:   document.getElementById('color').value,
    detail:  document.getElementById('detail').value,
    codeOut: document.getElementById('codeOut').value,
    tags,
    features
  };
}

/* ── PREVIEW PROMPT ── */
async function generatePrompt() {
  const data = collectData();
  if (!data.idea) { showNotice("Please describe your website idea first."); return; }

  const res  = await fetch('/generate-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  promptText = json.prompt;
  document.getElementById('promptOutput').textContent = promptText;
  switchTab('prompt');
}

/* ── BUILD WEBSITE (SSE Stream) ── */
async function generateWebsite() {
  if (isGenerating) return;
  const data = collectData();
  if (!data.idea) { showNotice("Please describe your website idea first."); return; }

  isGenerating  = true;
  generatedCode = "";

  // Update UI
  setStatus('generating', '⏳ Generating…');
  document.getElementById('buildBtnText').textContent = '⏳ Generating…';
  document.getElementById('buildBtn').disabled = true;
  document.getElementById('refineBar').style.display = 'none';
  document.getElementById('codeOutput').textContent = '';
  document.getElementById('progressWrap').style.display = 'block';
  document.getElementById('progressBar').style.width = '5%';
  switchTab('code');

  // Also store the prompt
  const promptRes = await fetch('/generate-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const promptJson = await promptRes.json();
  promptText = promptJson.prompt;
  document.getElementById('promptOutput').textContent = promptText;

  // Start fake progress animation
  let prog = 5;
  fakeProgress = setInterval(() => {
    if (prog < 85) { prog += Math.random() * 3; document.getElementById('progressBar').style.width = prog + '%'; }
  }, 400);

  const failGeneration = (message) => {
    clearInterval(fakeProgress);
    fakeProgress = null;
    document.getElementById('progressWrap').style.display = 'none';
    setStatus('error', '✗ Error');
    showNotice(message);
    resetBtn();
    isGenerating = false;
  };

  try {
    const res = await fetch('/generate-website', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data)
    });

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    const output  = document.getElementById('codeOutput');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        const dataLine = event.split('\n').find(line => line.startsWith('data: '));
        if (!dataLine) continue;

        try {
          const json = JSON.parse(dataLine.slice(6));
          if (json.error) {
            failGeneration(json.error);
            return;
          }
          if (json.done)  { finishGeneration(); return; }
          if (json.text)  {
            generatedCode += json.text;
            output.textContent = generatedCode;
            output.scrollTop = output.scrollHeight;
          }
        } catch {}
      }
    }
  } catch (err) {
    failGeneration('Connection error: ' + err.message);
  }
}

function finishGeneration() {
  clearInterval(fakeProgress);
  document.getElementById('progressBar').style.width = '100%';
  setTimeout(() => { document.getElementById('progressWrap').style.display = 'none'; }, 600);
  setStatus('done', '✓ Complete');
  resetBtn();
  document.getElementById('refineBar').style.display = 'flex';
  refreshPreview();
  isGenerating = false;
}

function resetBtn() {
  document.getElementById('buildBtnText').textContent = '✦ Build Website';
  document.getElementById('buildBtn').disabled = false;
  isGenerating = false;
}

/* ── REFINE ── */
async function refineCode() {
  const instruction = document.getElementById('refineInput').value.trim();
  if (!instruction) { showNotice("Describe what you want to change."); return; }
  if (!generatedCode) { showNotice("Generate a website first."); return; }

  const previousCode = generatedCode;
  setStatus('generating', '⏳ Refining…');
  document.getElementById('codeOutput').textContent = '';
  generatedCode = '';

  try {
    const res    = await fetch('/refine', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ code: previousCode, instruction })
    });
    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    const output  = document.getElementById('codeOutput');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        const dataLine = event.split('\n').find(line => line.startsWith('data: '));
        if (!dataLine) continue;

        try {
          const json = JSON.parse(dataLine.slice(6));
          if (json.error) {
            setStatus('error', '✗ Refine failed');
            showNotice(json.error);
            return;
          }
          if (json.done) { finishGeneration(); return; }
          if (json.text) { generatedCode += json.text; output.textContent = generatedCode; output.scrollTop = output.scrollHeight; }
        } catch {}
      }
    }
  } catch (err) {
    setStatus('error', '✗ Refine failed');
  }
}

/* ── PREVIEW ── */
function refreshPreview() {
  if (!generatedCode) return;
  const iframe = document.getElementById('previewFrame');
  const code   = extractHTML(generatedCode);
  const blob   = new Blob([code], { type: 'text/html' });
  iframe.src   = URL.createObjectURL(blob);
}

function extractHTML(code) {
  // Strip markdown code fences if present
  const match = code.match(/```(?:html)?\n([\s\S]*?)```/);
  return match ? match[1] : code;
}

function setPreviewWidth(w, btn) {
  document.getElementById('previewFrame').style.width = w;
  document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

/* ── TABS ── */
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + name));
  if (name === 'preview') refreshPreview();
}

/* ── STATUS ── */
function setStatus(type, text) {
  const el = document.getElementById('statusBadge');
  el.textContent = text;
  el.className = 'status-badge status-' + type;
}

/* ── COPY / DOWNLOAD ── */
function copyCode() {
  if (!generatedCode) { showNotice("Nothing to copy yet."); return; }
  navigator.clipboard.writeText(generatedCode).then(() => showNotice("Code copied!", true));
}

function copyPromptText() {
  if (!promptText) { showNotice("Generate a prompt first."); return; }
  navigator.clipboard.writeText(promptText).then(() => showNotice("Prompt copied!", true));
}

function downloadCode() {
  if (!generatedCode) { showNotice("Generate a website first."); return; }
  const ext    = document.getElementById('stack').value.includes('React') ? 'jsx' : 'html';
  const clean  = extractHTML(generatedCode);
  const blob   = new Blob([clean], { type: 'text/plain' });
  const a      = document.createElement('a');
  a.href       = URL.createObjectURL(blob);
  a.download   = `webcraft-output.${ext}`;
  a.click();
}

/* ── TOAST NOTICE ── */
function showNotice(msg, success = false) {
  const el       = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:9999;
    background:${success ? 'rgba(61,220,132,0.12)' : 'rgba(255,95,87,0.12)'};
    color:${success ? '#3ddc84' : '#ff5f57'};
    border:1px solid ${success ? 'rgba(61,220,132,0.3)' : 'rgba(255,95,87,0.3)'};
    padding:10px 18px; border-radius:10px; font-size:13px;
    font-family:'DM Sans',sans-serif; animation:fadeIn .2s ease;
    backdrop-filter:blur(8px);
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}
