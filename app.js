const $ = (selector) => document.querySelector(selector);
const searchInput = $('#searchInput');
const searchForm = $('#searchForm');
const mainContent = $('#mainContent');
const platformMenu = $('#platformMenu');
const platformById = new Map(window.MINERVA_PLATFORM_GROUPS.flatMap((group) => group.platforms).map((platform) => [platform.id, platform]));
let activeController;
let downloads = [];
let downloadsViewOpen = false;
let selectedPlatform = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** index);
  return `${value.toLocaleString('es-ES', { maximumFractionDigits: value < 10 ? 1 : 0 })} ${units[index]}`;
}

function renderPlatformMenu() {
  platformMenu.innerHTML = `<button class="platform-all" type="button" data-platform-reset>Todas</button>${window.MINERVA_PLATFORM_GROUPS.map((group) => `
    <details class="platform-group"><summary>${escapeHtml(group.name)}</summary><div class="platform-list" role="menu" aria-label="${escapeHtml(group.name)}">
      ${group.platforms.map((platform) => `<button class="platform-option ${selectedPlatform?.id === platform.id ? 'selected' : ''}" type="button" role="menuitem" data-platform="${escapeHtml(platform.id)}">${escapeHtml(platform.name)}</button>`).join('')}
    </div></details>`).join('')}`;
}

function renderSelectedPlatform() {
  const element = $('#selectedPlatform');
  element.hidden = !selectedPlatform;
  element.innerHTML = selectedPlatform ? `<span>Plataforma: <strong>${escapeHtml(selectedPlatform.name)}</strong></span><button type="button" data-platform-reset>Quitar filtro</button>` : '';
  renderPlatformMenu();
}

function downloadButton(result) {
  const existing = downloads.find((job) => job.torrent === result.torrent && job.path === result.path && job.name === result.name && !['cancelled', 'error'].includes(job.status));
  const label = existing ? (existing.status === 'completed' ? 'COMPLETADO' : 'EN DESCARGA') : 'DESCARGAR';
  return `<button class="download-link" ${existing ? 'disabled' : ''} data-download-name="${escapeHtml(result.name)}" data-download-path="${escapeHtml(result.path)}" data-download-torrent="${escapeHtml(result.torrent)}" title="Descargar solo este archivo"><span>${existing?.status === 'completed' ? '✓' : '↓'}</span>${label}</button>`;
}

function renderResultGroups(results) {
  const sections = [
    { tier: 0, title: 'Nintendo, Sony, Xbox y SEGA', note: '' },
    { tier: 1, title: 'Atari y otras plataformas de la lista', note: '' },
    { tier: 2, title: 'DLC y contenido adicional', note: 'Vídeos, actualizaciones y extras' },
  ];
  return sections.map((section) => {
    const entries = results.filter((result) => result.tier === section.tier);
    if (!entries.length) return '';
    return `<section class="result-group"><div class="result-group-heading"><h2>${section.title}</h2><span>${entries.length}</span>${section.note ? `<small>${section.note}</small>` : ''}</div><div class="result-list">${entries.map((result) => `
      <article class="result-card">
        <div class="result-main"><div class="result-title">${escapeHtml(result.name)}</div><div class="result-path">${escapeHtml(result.path)}</div></div>
        <div class="result-side"><span class="system-pill" title="${escapeHtml(result.platform)}">${escapeHtml(result.platform)}</span><span class="result-size">${escapeHtml(result.size)}</span>${downloadButton(result)}</div>
      </article>`).join('')}</div></section>`;
  }).join('');
}

async function runSearch(query = searchInput.value.trim(), updateUrl = true) {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2 && !selectedPlatform) {
    searchInput.focus();
    return;
  }
  if (activeController) activeController.abort();
  activeController = new AbortController();
  const controller = activeController;
  const queryParams = new URLSearchParams();
  if (cleanQuery) queryParams.set('q', cleanQuery);
  if (selectedPlatform) queryParams.set('platform', selectedPlatform.id);
  if (updateUrl) history.pushState({ query: cleanQuery, platform: selectedPlatform?.id || '' }, '', queryParams.size ? `/?${queryParams}` : '/');
  mainContent.classList.add('has-results');
  $('#resultsSection').hidden = false;
  $('#empty').hidden = true;
  $('#resultList').innerHTML = '';
  $('#moreResults').hidden = true;
  $('#loading').hidden = false;
  $('#resultsHeading').textContent = cleanQuery
    ? `Resultados para “${cleanQuery}”${selectedPlatform ? ` · ${selectedPlatform.name}` : ''}`
    : selectedPlatform.name;
  $('#resultsMeta').textContent = '';

  try {
    const params = new URLSearchParams({ limit: '300' });
    if (cleanQuery) params.set('q', cleanQuery);
    if (selectedPlatform) params.set('platform', selectedPlatform.id);
    const response = await fetch(`/api/search?${params}`, { signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo completar la búsqueda.');
    if (controller !== activeController) return;
    $('#loading').hidden = true;
    $('#resultsMeta').textContent = `${data.total.toLocaleString('es-ES')} ${data.total === 1 ? 'resultado' : 'resultados'}`;
    if (!data.total) {
      $('#empty').hidden = false;
      return;
    }
    $('#resultList').innerHTML = renderResultGroups(data.results);
    if (data.total > data.results.length) {
      $('#moreResults').textContent = `Mostrando ${data.results.length.toLocaleString('es-ES')} de ${data.total.toLocaleString('es-ES')}. Refina la búsqueda para ver menos resultados.`;
      $('#moreResults').hidden = false;
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
    $('#loading').hidden = true;
    $('#empty').hidden = false;
    $('#empty h2').textContent = 'No se pudo completar la búsqueda';
    $('#empty p').textContent = error.message;
  }
}

function renderDownloads() {
  const section = $('#downloadSection');
  const active = downloads.filter((job) => !['completed', 'cancelled', 'error'].includes(job.status)).length;
  section.hidden = downloads.length === 0 && !downloadsViewOpen;
  $('#downloadBadge').hidden = active === 0;
  $('#downloadBadge').textContent = active;
  $('#downloadSummary').textContent = active ? `${active} activa${active === 1 ? '' : 's'}` : `${downloads.length} archivo${downloads.length === 1 ? '' : 's'}`;
  if (!downloads.length) {
    $('#downloadList').innerHTML = '<div class="downloads-empty">Todavía no hay descargas.</div>';
    return;
  }
  $('#downloadList').innerHTML = downloads.map((job) => {
    const status = ({ preparing: 'Preparando torrent', waiting: 'Esperando fuentes', downloading: 'Descargando', completed: 'Completado', cancelled: 'Cancelado', error: 'Error' })[job.status] || job.status;
    const progress = Math.round((job.progress || 0) * 100);
    const speed = job.speed > 0 ? `${formatBytes(job.speed)}/s` : '';
    const peers = job.peers ? `${job.peers} fuentes` : '';
    const canCancel = !['completed', 'cancelled', 'error'].includes(job.status);
    return `<article class="download-card"><div class="download-card-head"><div class="download-card-title"><strong>${escapeHtml(job.name)}</strong><span>${escapeHtml(job.system)} · ${escapeHtml(job.path)}</span></div><div class="download-card-state"><span class="state-dot ${escapeHtml(job.status)}"></span>${escapeHtml(status)}${canCancel ? `<button class="cancel-download" data-cancel="${escapeHtml(job.id)}" title="Cancelar descarga">×</button>` : ''}</div></div><div class="progress-track"><div class="progress-value ${job.status === 'error' ? 'error' : ''}" style="width:${progress}%"></div></div><div class="download-card-meta"><span>${progress}% · ${formatBytes(job.downloaded || 0)} / ${formatBytes(job.size || 0)}</span><span>${escapeHtml([speed, peers].filter(Boolean).join(' · '))}</span></div>${job.error ? `<div class="download-error">${escapeHtml(job.error)}</div>` : ''}</article>`;
  }).join('');
}

async function loadDownloads() {
  try {
    const response = await fetch('/api/downloads');
    if (!response.ok) return;
    const previousState = downloads.map((job) => `${job.id}:${job.status}`).join('|');
    downloads = (await response.json()).downloads || [];
    renderDownloads();
    const nextState = downloads.map((job) => `${job.id}:${job.status}`).join('|');
    if (previousState !== nextState && searchInput.value.trim().length >= 2 && !$('#resultsSection').hidden) {
      runSearch(searchInput.value, false);
    }
  } catch { /* se vuelve a sincronizar en el siguiente ciclo */ }
}

async function startDownload(button) {
  if (button.disabled) return;
  button.disabled = true;
  button.textContent = 'PREPARANDO';
  try {
    const response = await fetch('/api/downloads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: button.dataset.downloadName, path: button.dataset.downloadPath, torrent: button.dataset.downloadTorrent }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo iniciar la descarga.');
    downloadsViewOpen = true;
    await loadDownloads();
    $('#downloadSection').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    button.disabled = false;
    button.innerHTML = '<span>↓</span>DESCARGAR';
    window.alert(error.message);
  }
}

async function cancelDownload(id) {
  await fetch(`/api/downloads/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
  await loadDownloads();
}

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  runSearch();
});

window.addEventListener('popstate', () => {
  const params = new URLSearchParams(location.search);
  const query = params.get('q') || '';
  selectedPlatform = platformById.get(params.get('platform')) || null;
  searchInput.value = query;
  renderSelectedPlatform();
  if (query.length >= 2 || selectedPlatform) runSearch(query, false);
  else {
    if (activeController) activeController.abort();
    mainContent.classList.remove('has-results');
    $('#resultsSection').hidden = true;
  }
});

document.addEventListener('click', (event) => {
  const platformButton = event.target.closest('[data-platform]');
  if (platformButton) {
    selectedPlatform = platformById.get(platformButton.dataset.platform) || null;
    renderSelectedPlatform();
    platformMenu.querySelectorAll('.platform-group').forEach((group) => { group.open = false; });
    runSearch();
    return;
  }
  if (event.target.closest('[data-platform-reset]')) {
    selectedPlatform = null;
    renderSelectedPlatform();
    if (searchInput.value.trim().length >= 2) runSearch(searchInput.value);
    else {
      if (activeController) activeController.abort();
      history.pushState({}, '', '/');
      mainContent.classList.remove('has-results');
      $('#resultsSection').hidden = true;
    }
    return;
  }
  const downloadButton = event.target.closest('[data-download-torrent]');
  if (downloadButton) { startDownload(downloadButton); return; }
  const cancelButton = event.target.closest('[data-cancel]');
  if (cancelButton) { cancelDownload(cancelButton.dataset.cancel); return; }
  if (event.target.closest('[data-view="downloads"]')) {
    downloadsViewOpen = true;
    renderDownloads();
    $('#downloadSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

const initialParams = new URLSearchParams(location.search);
const initialQuery = initialParams.get('q') || '';
selectedPlatform = platformById.get(initialParams.get('platform')) || null;
renderSelectedPlatform();
if (initialQuery.length >= 2 || selectedPlatform) {
  searchInput.value = initialQuery;
  runSearch(initialQuery, false);
} else {
  searchInput.focus();
}
loadDownloads();
setInterval(loadDownloads, 1400);
