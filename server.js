const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const {
  MINERVA_PLATFORM_GROUPS,
  MINERVA_SYSTEM_RULES,
  MINERVA_PLATFORM_BY_ID,
  MINERVA_PLATFORM_LABEL_BY_KEY,
} = require('./platforms.js');

const ROOT = __dirname;
const DATA_ROOT = process.env.VGARCHIVE_DATA_DIR || ROOT;
const TORRENT_DIR = path.join(DATA_ROOT, 'minerva_torrents');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
let catalogue = [];
let buildError = null;
let torrentClientPromise;
const torrentDownloads = path.join(DATA_ROOT, 'downloads');
const downloadJobs = new Map();
const activeTorrents = new Map();
const metadataCache = new Map();
const metadataPending = new Map();
let metadataQueue = Promise.resolve();

function normalizeMetadataTitle(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .toLocaleLowerCase('en')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function titleSimilarity(left, right) {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const leftWords = new Set(left.split(' '));
  const rightWords = new Set(right.split(' '));
  const overlap = [...leftWords].filter((word) => rightWords.has(word)).length;
  return overlap / Math.max(leftWords.size, rightWords.size);
}

async function requestWikipediaMetadata(gameName) {
  const query = gameName.replace(/[()[\]{}"']/g, ' ').replace(/\s+/g, ' ').trim();
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '0',
    gsrlimit: '6',
    prop: 'pageimages|info|extracts',
    inprop: 'url',
    exintro: '1',
    explaintext: '1',
    exchars: '260',
    piprop: 'thumbnail',
    pithumbsize: '480',
    pilicense: 'any',
    redirects: '1',
  });
  const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': 'VGArchive/1.0 (https://github.com/Santiagofamo18/VGArchive; local metadata lookup)', Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const data = await response.json();
  const targetTitle = normalizeMetadataTitle(gameName);
  const pages = Array.isArray(data.query?.pages) ? data.query.pages : [];
  const candidates = pages
    .map((page) => ({ page, similarity: titleSimilarity(targetTitle, normalizeMetadataTitle(page.title)) }))
    .filter(({ page, similarity }) => similarity >= 0.8 && (page.thumbnail?.source || page.extract))
    .sort((a, b) => b.similarity - a.similarity);
  const page = candidates[0]?.page;
  if (!page) return null;
  return {
    title: page.title,
    image: page.thumbnail?.source || '',
    description: String(page.extract || '').replace(/\s+/g, ' ').trim(),
    sourceUrl: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    sourceName: 'Wikipedia',
  };
}

function getGameMetadata(gameName) {
  const key = normalizeMetadataTitle(gameName);
  const cached = metadataCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.data);
  if (metadataPending.has(key)) return metadataPending.get(key);

  const task = metadataQueue.then(() => requestWikipediaMetadata(gameName)).catch(() => null);
  metadataQueue = task.then(() => undefined, () => undefined);
  metadataPending.set(key, task);
  return task.then((metadata) => {
    metadataCache.set(key, { data: metadata, expiresAt: Date.now() + (metadata ? 7 : 1) * 24 * 60 * 60 * 1000 });
    if (metadataCache.size > 1200) metadataCache.delete(metadataCache.keys().next().value);
    return metadata;
  }).finally(() => metadataPending.delete(key));
}

function decodeBencode(buffer) {
  let offset = 0;
  const decoder = new TextDecoder('utf-8');
  function parse() {
    const marker = buffer[offset++];
    if (marker === 105) {
      const end = buffer.indexOf(101, offset);
      if (end < 0) throw new Error('Número bencode incompleto');
      const value = Number(buffer.toString('ascii', offset, end));
      offset = end + 1;
      return value;
    }
    if (marker === 108) {
      const values = [];
      while (buffer[offset] !== 101) values.push(parse());
      offset++;
      return values;
    }
    if (marker === 100) {
      const value = {};
      while (buffer[offset] !== 101) {
        const key = parse();
        value[Buffer.isBuffer(key) ? decoder.decode(key) : String(key)] = parse();
      }
      offset++;
      return value;
    }
    if (marker >= 48 && marker <= 57) {
      const colon = buffer.indexOf(58, offset - 1);
      if (colon < 0) throw new Error('Cadena bencode incompleta');
      const length = Number(buffer.toString('ascii', offset - 1, colon));
      const start = colon + 1;
      offset = start + length;
      return buffer.subarray(start, offset);
    }
    throw new Error(`Marcador bencode inesperado en ${offset - 1}`);
  }
  return parse();
}

function stringValue(value) {
  return Buffer.isBuffer(value) ? new TextDecoder('utf-8').decode(value) : String(value ?? '');
}

function torrentSystem(filename) {
  return filename
    .replace(/\.torrent$/i, '')
    .replace(/^Minerva_Myrient\s*-\s*/i, '')
    .replace(/^(?:(?:No-Intro|Non-Redump|Redump|RetroAchievements|TOSEC|MAME)\s*-\s*)+/i, '')
    .replace(/\s*\([^()]*\)\s*/g, ' ')
    .replace(/\s+-\s+[A-Z0-9]$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function systemGroup(system) {
  if (/(?:SDK|source code|development kit|dev kit|development system)/i.test(system)) return 'Kits de desarrollo';
  if (/^Nintendo\b/i.test(system)) return 'Nintendo';
  if (/^Sega\b/i.test(system)) return 'Sega';
  if (/^Sony\b/i.test(system)) return 'Sony';
  if (/^(?:Microsoft|Xbox)\b/i.test(system)) return 'Microsoft / Xbox';
  if (/^Atari\b/i.test(system)) return 'Atari';
  if (/^Arcade\b/i.test(system)) return 'Arcade';
  if (/^IBM\b/i.test(system)) return 'PC';
  if (/^(?:Mobile|Palm|Pocket PC)\b/i.test(system)) return 'Móviles y PDA';
  return system.split(' - ')[0] || 'Otros';
}

function platformKeyForSystem(system) {
  if (/^(?:Source Code|SDKs?)(?:\s+-|\b)/i.test(system)) return null;
  return MINERVA_SYSTEM_RULES.find(([pattern]) => pattern.test(system))?.[1] || null;
}

function normalizedTorrentPath(filePath, torrentName = '') {
  const parts = String(filePath || '').split(/[\\/]+/).filter(Boolean);
  const torrentRoot = String(torrentName || '').split(/[\\/]+/).filter(Boolean).at(-1);
  if (torrentRoot && parts[0]?.normalize('NFC').toLocaleLowerCase('es') === torrentRoot.normalize('NFC').toLocaleLowerCase('es')) parts.shift();
  return parts
    .filter((part) => !/^Non-Redump$/i.test(part))
    .map((part) => part.normalize('NFC').toLocaleLowerCase('es'))
    .join('/');
}

function searchTier(entry) {
  const descriptiveText = `${entry.system} ${entry.name} ${entry.path}`;
  if (entry.group === 'Kits de desarrollo' || /(?:\bSDK\b|dev(?:elopment)?[\s_-]*(?:kit|rom|system)|source[\s_-]*code|development kit hard drives|prototype|prototipo|unreleased|never released|cancelled|not for retail|unofficial|homebrew|fan[\s_-]*made|\b(?:kiosk|demo)\b|\b(?:beta|alpha)\b|\btest(?:ing)?\b|soundtrack|\bOST\b|\bvideo\b|\btrailer\b|\bfirmware\b|system update|\bpatch\b|\bDLC\b|\bmanual\b|\bE3\s?20\d{2}\b)/i.test(descriptiveText)) return 2;
  if (['Nintendo', 'Sony', 'Microsoft', 'SEGA'].includes(entry.group)) return 0;
  return 1;
}

function searchRelevance(entry, query) {
  const name = entry.name.toLocaleLowerCase('es');
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (name.includes(query)) return 2;
  return 3;
}

function getFiles(info) {
  if (Array.isArray(info.files)) {
    return info.files.map((file) => {
      const parts = (file.path || []).map(stringValue);
      return { name: parts.at(-1) || stringValue(info.name), path: parts.join('/'), bytes: Number(file.length || 0) };
    });
  }
  if (info['file tree']) {
    const result = [];
    function walk(node, parts) {
      for (const [key, value] of Object.entries(node || {})) {
        if (key === '') result.push({ name: parts.at(-1) || stringValue(info.name), path: parts.join('/'), bytes: Number(value.length || 0) });
        else walk(value, [...parts, key]);
      }
    }
    walk(info['file tree'], []);
    return result;
  }
  return [{ name: stringValue(info.name), path: stringValue(info.name), bytes: Number(info.length || 0) }];
}

function formatBytes(bytes) {
  if (bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const amount = bytes / (1024 ** index);
  return `${amount.toLocaleString('es-ES', { maximumFractionDigits: amount < 10 ? 1 : 0 })} ${units[index]}`;
}

function buildCatalogue() {
  fs.mkdirSync(TORRENT_DIR, { recursive: true });
  const torrents = fs.readdirSync(TORRENT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.torrent'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'es'));
  const entries = [];
  for (const torrent of torrents) {
    try {
      const metainfo = decodeBencode(fs.readFileSync(path.join(TORRENT_DIR, torrent)));
      const info = metainfo.info;
      if (!info) continue;
      const system = torrentSystem(torrent);
      const platformKey = platformKeyForSystem(system);
      const platformInfo = platformKey && MINERVA_PLATFORM_LABEL_BY_KEY.get(platformKey);
      if (!platformInfo) continue;
      for (const file of getFiles(info)) {
        if (/(?:development kit|dev rom|\bSDKs?\b|source code|BIOS Images|Disc Keys|SBI Subchannels|GameShark Updates)/i.test(file.path)) continue;
        const visiblePath = file.path.split('/').filter((part) => !/^Non-Redump$/i.test(part)).join('/');
        entries.push({
          name: file.name,
          path: visiblePath,
          bytes: file.bytes,
          size: formatBytes(file.bytes),
          system,
          platform: platformInfo.name,
          platformKey,
          group: platformInfo.group,
          torrent,
        });
      }
    } catch (error) {
      console.warn(`No se pudo leer ${torrent}: ${error.message}`);
    }
  }
  catalogue = entries;
  console.log(`Catálogo listo: ${torrents.length} torrents, ${entries.length.toLocaleString('es-ES')} archivos.`);
}

function sendJson(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(data));
}

function publicJob(job) {
  return {
    id: job.id,
    name: job.name,
    system: job.system,
    path: job.path,
    torrent: job.torrentName,
    size: job.size,
    downloaded: job.file ? job.file.downloaded : 0,
    progress: job.status === 'completed' ? 1 : job.file ? Math.min(job.file.progress || 0, 1) : 0,
    speed: job.speed || 0,
    peers: job.torrent ? job.torrent.numPeers : 0,
    status: job.status,
    error: job.error || '',
  };
}

async function getTorrentClient() {
  if (!torrentClientPromise) {
    torrentClientPromise = import('webtorrent').then((module) => {
      const WebTorrent = module.default || module.WebTorrent;
      const client = new WebTorrent();
      client.on('error', (error) => console.error(`WebTorrent: ${error.message}`));
      return client;
    }).catch(() => {
      torrentClientPromise = null;
      throw new Error('WebTorrent no está disponible. Ejecuta pnpm install y reinicia VGArchive.');
    });
  }
  return torrentClientPromise;
}

async function getActiveTorrent(filename) {
  const current = activeTorrents.get(filename);
  if (current) return current;
  const promise = (async () => {
    const client = await getTorrentClient();
    fs.mkdirSync(torrentDownloads, { recursive: true });
    return new Promise((resolve, reject) => {
      let settled = false;
      const torrent = client.add(path.join(TORRENT_DIR, filename), {
        path: torrentDownloads,
        deselect: true,
        strategy: 'sequential',
      }, (readyTorrent) => {
        settled = true;
        resolve({ torrent: readyTorrent, client });
      });
      torrent.on('error', (error) => {
        if (!settled) reject(error);
        settled = true;
      });
    });
  })();
  activeTorrents.set(filename, promise);
  try {
    return await promise;
  } catch (error) {
    activeTorrents.delete(filename);
    throw error;
  }
}

async function stopTorrentWhenIdle(torrentName, torrent, client) {
  const hasActiveFile = [...downloadJobs.values()].some((job) => job.torrentName === torrentName && job.torrent === torrent && !['completed', 'cancelled', 'error'].includes(job.status));
  if (hasActiveFile) return;
  activeTorrents.delete(torrentName);
  try {
    await client.remove(torrent.infoHash, { destroyStore: false });
  } catch (error) {
    console.warn(`No se pudo detener el torrent ${torrentName}: ${error.message}`);
  }
}

async function startSelectedFile(entry) {
  const job = {
    id: randomUUID(), name: entry.name, system: entry.platform, path: entry.path,
    size: entry.bytes, status: 'preparing', speed: 0, file: null, torrent: null,
    lastBytes: 0, lastTime: Date.now(), torrentName: entry.torrent,
  };
  downloadJobs.set(job.id, job);
  try {
    const { torrent, client } = await getActiveTorrent(entry.torrent);
    const normalizedPath = normalizedTorrentPath(entry.path);
    const candidates = torrent.files.filter((file) => normalizedTorrentPath(file.path, torrent.name) === normalizedPath
      && file.name.normalize('NFC').toLocaleLowerCase('es') === entry.name.normalize('NFC').toLocaleLowerCase('es')
      && file.length === entry.bytes);
    if (candidates.length !== 1) {
      throw new Error(candidates.length ? 'Hay varias rutas iguales dentro del torrent; no se inició la descarga.' : 'No se encontró el archivo seleccionado dentro del torrent.');
    }
    const target = candidates[0];
    job.file = target;
    job.torrent = torrent;
    job.client = client;
    target.select();
    job.status = torrent.numPeers ? 'downloading' : 'waiting';
    const refresh = () => {
      if (!job.file || ['completed', 'cancelled', 'error'].includes(job.status)) return;
      const now = Date.now();
      const elapsed = Math.max((now - job.lastTime) / 1000, 0.1);
      const currentBytes = job.file.downloaded;
      job.speed = Math.max(0, (currentBytes - job.lastBytes) / elapsed);
      job.lastBytes = currentBytes;
      job.lastTime = now;
      if (job.file.progress >= 1) job.status = 'completed';
      else job.status = torrent.numPeers ? 'downloading' : 'waiting';
    };
    torrent.on('download', refresh);
    job.timer = setInterval(() => {
      refresh();
      if (job.status === 'completed') {
        clearInterval(job.timer);
        stopTorrentWhenIdle(job.torrentName, torrent, client);
      }
    }, 1000);
    refresh();
  } catch (error) {
    job.status = 'error';
    job.error = error.message;
  }
  return job;
}

async function readJson(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 64 * 1024) throw new Error('Solicitud demasiado grande.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function safeTorrentPath(name) {
  if (!name || path.basename(name) !== name || !name.toLowerCase().endsWith('.torrent')) return null;
  const full = path.join(TORRENT_DIR, name);
  return full.startsWith(TORRENT_DIR + path.sep) ? full : null;
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const capacitorOrigins = new Set(['http://localhost', 'https://localhost', 'capacitor://localhost']);
  const origin = request.headers.origin;
  if (url.pathname.startsWith('/api/') && capacitorOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Access-Control-Max-Age', '600');
  }
  if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
    response.writeHead(204);
    return response.end();
  }
  if (url.pathname.startsWith('/api/') && buildError) return sendJson(response, 500, { error: buildError });
  if (url.pathname === '/api/summary') {
    const groups = MINERVA_PLATFORM_GROUPS.map((group) => ({
      name: group.name,
      platforms: group.platforms.map(({ id, name }) => ({ id, name })),
    }));
    return sendJson(response, 200, { groups, torrentCount: new Set(catalogue.map((entry) => entry.torrent)).size, fileCount: catalogue.length });
  }
  if (url.pathname === '/api/search') {
    const query = (url.searchParams.get('q') || '').trim().toLocaleLowerCase('es');
    const platformId = url.searchParams.get('platform') || '';
    const selectedPlatform = platformId ? MINERVA_PLATFORM_BY_ID.get(platformId) : null;
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 150), 1), 300);
    if (platformId && !selectedPlatform) return sendJson(response, 400, { error: 'Plataforma no reconocida.' });
    if (query.length < 2 && !selectedPlatform) return sendJson(response, 200, { results: [], total: 0 });
    const matches = [];
    for (const entry of catalogue) {
      if (selectedPlatform && (!selectedPlatform.catalogKey || entry.platformKey !== selectedPlatform.catalogKey)) continue;
      if (query && !entry.name.toLocaleLowerCase('es').includes(query) && !entry.path.toLocaleLowerCase('es').includes(query)) continue;
      matches.push({ ...entry, tier: searchTier(entry) });
    }
    matches.sort((a, b) => a.tier - b.tier
      || searchRelevance(a, query) - searchRelevance(b, query)
      || a.name.localeCompare(b.name, 'es')
      || a.platform.localeCompare(b.platform, 'es'));
    return sendJson(response, 200, { results: matches.slice(0, limit), total: matches.length, limit });
  }
  if (url.pathname === '/api/metadata') {
    const name = (url.searchParams.get('name') || '').trim().slice(0, 180);
    if (name.length < 2) return sendJson(response, 400, { error: 'Indica el título del juego.' });
    return sendJson(response, 200, { metadata: await getGameMetadata(name) });
  }
  if (url.pathname === '/api/downloads' && request.method === 'GET') {
    return sendJson(response, 200, { downloads: [...downloadJobs.values()].map(publicJob) });
  }
  if (url.pathname === '/api/downloads' && request.method === 'POST') {
    try {
      const body = await readJson(request);
      const entry = catalogue.find((item) => item.torrent === body.torrent && item.path === body.path && item.name === body.name);
      if (!entry) return sendJson(response, 404, { error: 'El archivo seleccionado no existe en el catálogo.' });
      const existing = [...downloadJobs.values()].find((job) => job.torrentName === entry.torrent && job.path === entry.path && !['error', 'cancelled'].includes(job.status));
      if (existing) return sendJson(response, 200, { download: publicJob(existing) });
      const job = await startSelectedFile(entry);
      return sendJson(response, job.status === 'error' ? 503 : 201, { download: publicJob(job) });
    } catch (error) {
      return sendJson(response, 400, { error: error.message });
    }
  }
  const cancelMatch = url.pathname.match(/^\/api\/downloads\/([\w-]+)\/cancel$/);
  if (cancelMatch && request.method === 'POST') {
    const job = downloadJobs.get(cancelMatch[1]);
    if (!job) return sendJson(response, 404, { error: 'Descarga no encontrada.' });
    if (job.timer) clearInterval(job.timer);
    if (job.file && job.status !== 'completed') job.file.deselect();
    job.status = 'cancelled';
    job.speed = 0;
    if (job.torrent && job.client) stopTorrentWhenIdle(job.torrentName, job.torrent, job.client);
    return sendJson(response, 200, { download: publicJob(job) });
  }
  if (url.pathname === '/api/torrent') {
    const filename = url.searchParams.get('name');
    const fullPath = safeTorrentPath(filename);
    if (!fullPath || !fs.existsSync(fullPath)) return sendJson(response, 404, { error: 'Torrent no encontrado.' });
    response.writeHead(200, {
      'Content-Type': 'application/x-bittorrent',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': fs.statSync(fullPath).size,
    });
    return fs.createReadStream(fullPath).pipe(response);
  }
  const filename = url.pathname === '/' ? 'index.html' : path.basename(decodeURIComponent(url.pathname));
  const fullPath = path.join(ROOT, filename);
  if (!['index.html', 'styles.css', 'extra.css', 'app.js', 'platforms.js', 'manifest.json', 'service-worker.js', 'icon.svg'].includes(filename) || !fs.existsSync(fullPath)) {
    response.writeHead(404);
    return response.end('No encontrado');
  }
  const type = filename.endsWith('.css') ? 'text/css; charset=utf-8'
    : filename.endsWith('.js') ? 'text/javascript; charset=utf-8'
      : filename.endsWith('.json') ? 'application/manifest+json; charset=utf-8'
        : filename.endsWith('.svg') ? 'image/svg+xml'
          : 'text/html; charset=utf-8';
  response.writeHead(200, { 'Content-Type': type });
  fs.createReadStream(fullPath).pipe(response);
});

try {
  buildCatalogue();
} catch (error) {
  buildError = error.message;
  console.error(`Error al construir el catálogo: ${buildError}`);
}

if (require.main === module) {
  server.listen(PORT, HOST, () => console.log(`VGArchive disponible en http://localhost:${server.address().port}`));
}

module.exports = { server };
