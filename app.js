const $ = id => document.getElementById(id);
const agents = [
  { id: 'decision', mark: 'DA', name: 'Decision Analyst', description: 'Bandingkan opsi dan siapkan rekomendasi.' },
  { id: 'people', mark: 'PO', name: 'People Operations', description: 'Atur PIC, tenggat, dan beban kerja.' },
  { id: 'partnership', mark: 'PP', name: 'Partnership & Proposal', description: 'Susun penawaran dan proposal kerja sama.' }
];
const statusLabels = { running: 'Sedang bekerja', done: 'Selesai', failed: 'Gagal' };
const dateFormat = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
const briefDialog = $('brief-dialog');
const resultDialog = $('result-dialog');
let jobs = [];
let requestVersion = 0;
let activeRequest = false;
let pdfRequest;
const historyPageSize = 10;
let historyLimit = historyPageSize;

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function button(label, onClick) {
  const node = element('button', 'secondary', label);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

function updateQuotationField() {
  const enabled = $('agent').value === 'partnership';
  $('quotation-fields').hidden = !enabled;
  $('quotation').disabled = !enabled;
  if (!enabled) pdfRequest?.abort();
}

function openBrief(agent, title = '', brief = '', quotation = '') {
  $('agent').value = agent || '';
  $('task-title').value = title;
  $('brief').value = brief;
  $('quotation').value = quotation;
  $('quotation-pdf').value = '';
  $('quotation-pdf-status').textContent = '';
  updateQuotationField();
  $('form-error').hidden = true;
  briefDialog.showModal();
  $(agent ? 'task-title' : 'agent').focus();
}

function openResult(job) {
  $('result-title').textContent = job.title;
  $('result').textContent = job.result;
  $('copy').textContent = 'Salin Hasil';
  resultDialog.showModal();
}

function jobAction(label, job, action) {
  return button(label, async event => {
    const control = event.currentTarget;
    control.disabled = true;
    $('activity-error').hidden = true;
    try {
      const response = await fetch('/api/jobs/' + job.id, { signal: AbortSignal.timeout(3500) });
      if (!response.ok) throw new Error();
      action(await response.json());
    } catch {
      $('activity-error').textContent = 'Detail tugas belum dapat dibuka. Coba lagi setelah koneksi pulih.';
      $('activity-error').hidden = false;
    } finally {
      control.disabled = false;
    }
  });
}

function updateClocks() {
  for (const node of document.querySelectorAll('.duration')) {
    const seconds = Math.max(0, Math.floor((Date.now() - Number(node.dataset.started)) / 1000));
    const minutes = Math.floor(seconds / 60);
    node.textContent = minutes + ':' + String(seconds % 60).padStart(2, '0');
  }
}

function render() {
  const running = jobs.filter(job => job.status === 'running');
  const summary = running.length ? running.length + ' agent sedang bekerja' : 'Siap menerima tugas';
  if ($('summary').textContent !== summary) $('summary').textContent = summary;

  for (const agent of agents) {
    const busy = running.some(job => job.agent === agent.id);
    const control = $('select-' + agent.id);
    control.disabled = busy;
    control.textContent = busy ? 'Sedang bekerja' : 'Pilih Agent';
    $('option-' + agent.id).disabled = busy;
  }

  const activity = $('activity');
  const query = $('history-search').value.trim().toLocaleLowerCase('id');
  const status = $('history-status').value;
  const history = jobs.filter(job => {
    if (job.status === 'running' || (status && job.status !== status)) return false;
    const agent = agents.find(candidate => candidate.id === job.agent);
    return (job.title + ' ' + agent.name).toLocaleLowerCase('id').includes(query);
  });
  const shown = history.slice(0, historyLimit);
  const count = 'Menampilkan ' + shown.length + ' dari ' + history.length + ' tugas riwayat';
  if ($('history-count').textContent !== count) $('history-count').textContent = count;
  $('more-history').hidden = shown.length >= history.length;
  const displayed = [...running, ...shown];
  const visible = new Set();
  for (const [index, job] of displayed.entries()) {
    const id = 'job-' + job.id;
    visible.add(id);
    let card = $(id);
    if (!card) {
      card = element('article', 'job');
      card.id = id;
    }
    const signature = job.status + '/' + job.stage + '/' + (job.storageWarning || '');
    if (card.dataset.signature !== signature) {
      const row = element('div', 'job-top');
      const badge = element('span', 'badge', statusLabels[job.status]);
      if (job.status === 'running') {
        const dot = element('span', 'dot');
        dot.setAttribute('aria-hidden', 'true');
        badge.prepend(dot);
      }
      row.append(element('h3', '', job.title), badge);
      const agentName = agents.find(agent => agent.id === job.agent).name;
      const detail = element('p', '', agentName + ' · ' + dateFormat.format(job.startedAt));
      card.replaceChildren(row, detail);
      card.dataset.signature = signature;
      card.dataset.status = job.status;
      if (job.status === 'running') {
        const duration = element('span', 'duration');
        duration.dataset.started = job.startedAt;
        detail.append(' · ' + job.stage + ' · ', duration);
      } else if (job.status === 'done') {
        card.append(jobAction('Lihat Hasil →', job, openResult));
      } else {
        card.append(element('p', '', job.error), jobAction('Coba Lagi', job, record => {
          openBrief(record.agent, record.title, record.brief || '', record.quotation || '');
        }));
      }
      if (job.storageWarning) card.append(element('p', 'storage-warning', job.storageWarning));
    }
    if (activity.children[index] !== card) activity.insertBefore(card, activity.children[index] || null);
  }
  for (const card of [...activity.children]) {
    if (!visible.has(card.id)) card.remove();
  }
  if (!displayed.length) {
    activity.append(element('p', 'empty', jobs.length ? 'Tidak ada tugas yang cocok.' :
      'Tugas akan muncul di sini setelah agent dijalankan.'));
  }
  updateClocks();
}

async function refresh() {
  if (activeRequest) return;
  activeRequest = true;
  const version = requestVersion;
  try {
    const response = await fetch('/api/jobs', { signal: AbortSignal.timeout(3500) });
    if (!response.ok) throw new Error();
    const current = await response.json();
    if (version !== requestVersion) return;
    jobs = current;
    $('connection').hidden = true;
    render();
  } catch {
    $('connection').textContent = 'Koneksi ke aplikasi terputus. Status akan diperbarui saat tersambung kembali.';
    $('connection').hidden = false;
  } finally {
    activeRequest = false;
  }
}

$('agent').append(new Option('Pilih agent…', ''));
for (const agent of agents) {
  const option = new Option(agent.name, agent.id);
  option.id = 'option-' + agent.id;
  $('agent').append(option);
  const card = element('article', 'agent');
  const mark = element('span', 'agent-mark', agent.mark);
  mark.setAttribute('aria-hidden', 'true');
  const description = element('div');
  description.append(element('h3', '', agent.name), element('p', '', agent.description));
  const choose = button('Pilih Agent', () => openBrief(agent.id));
  choose.id = 'select-' + agent.id;
  choose.setAttribute('aria-label', 'Pilih ' + agent.name);
  card.append(mark, description, choose);
  $('agents').append(card);
}
$('new-task').addEventListener('click', () => openBrief());
$('agent').addEventListener('change', updateQuotationField);
briefDialog.addEventListener('close', () => pdfRequest?.abort());
$('quotation-pdf').addEventListener('change', async event => {
  const control = event.currentTarget;
  const file = control.files[0];
  if (!file) return;
  const status = $('quotation-pdf-status');
  status.removeAttribute('data-error');
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error('Ukuran PDF maksimal 10 MB.');
    pdfRequest = new AbortController();
    control.disabled = true;
    $('quotation').readOnly = true;
    $('run').disabled = true;
    status.textContent = 'Membaca ' + file.name + '…';
    const response = await fetch('/api/quotation-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: file,
      signal: AbortSignal.any([pdfRequest.signal, AbortSignal.timeout(25000)])
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    if (pdfRequest.signal.aborted) return;
    const limit = $('quotation').maxLength;
    $('quotation').value = result.text.slice(0, limit).trimEnd();
    status.textContent = result.truncated || result.text.length > limit ?
      'Teks diimpor hingga 12.000 karakter. Tinjau bagian yang akan dipakai.' :
      'Teks dari ' + file.name + ' sudah diimpor. Tinjau kolom Contoh Quotation sebelum menjalankan agent.';
  } catch (error) {
    if (error.name === 'AbortError') {
      status.textContent = '';
    } else {
      status.setAttribute('data-error', '');
      status.textContent = error.name === 'TimeoutError' ? 'Pembacaan PDF terlalu lama. Coba file yang lebih kecil.' :
        error.message || 'PDF belum bisa dibaca.';
    }
  } finally {
    pdfRequest = undefined;
    control.value = '';
    control.disabled = false;
    $('quotation').readOnly = false;
    $('run').disabled = false;
  }
});
function updateHistoryFilter() {
  historyLimit = historyPageSize;
  render();
}
$('history-search').addEventListener('input', updateHistoryFilter);
$('history-status').addEventListener('change', updateHistoryFilter);
$('more-history').addEventListener('click', () => {
  historyLimit += historyPageSize;
  render();
});
$('cancel').addEventListener('click', () => briefDialog.close());
$('close-result').addEventListener('click', () => resultDialog.close());
$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('result').textContent);
    $('copy').textContent = 'Tersalin ✓';
  } catch {
    $('copy').textContent = 'Gagal menyalin';
  }
});

$('brief-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (pdfRequest || $('run').disabled) return;
  const payload = { agent: $('agent').value, title: $('task-title').value, brief: $('brief').value };
  if (payload.agent === 'partnership') payload.quotation = $('quotation').value.trim();
  const submit = $('run');
  submit.disabled = true;
  $('quotation-pdf').disabled = true;
  submit.textContent = 'Memulai…';
  $('form-error').hidden = true;
  try {
    const response = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const job = await response.json();
    if (!response.ok) throw new Error(job.error);
    requestVersion++;
    jobs = [job, ...jobs.filter(previous => previous.id !== job.id)];
    briefDialog.close();
    render();
    $('activity-title').scrollIntoView({ block: 'nearest' });
  } catch (error) {
    $('form-error').textContent = error.message || 'Tugas gagal dimulai.';
    $('form-error').hidden = false;
  } finally {
    submit.disabled = false;
    $('quotation-pdf').disabled = false;
    submit.textContent = 'Jalankan Agent →';
  }
});
refresh();
setInterval(refresh, 1000);
setInterval(updateClocks, 250);
