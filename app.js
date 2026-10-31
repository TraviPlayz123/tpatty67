const STORAGE_KEYS = {
  FAVORITES: 'breakroom_favorites_v1',
  RECENT: 'breakroom_recent_v1',
  CUSTOM_GAMES: 'breakroom_custom_games_v1',
  CLOAK: 'breakroom_cloak_v1',
};

const CLOAK_PRESETS = {
  default: {
    title: 'Breakroom Arcade',
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23f97316'/%3E%3Cpath d='M11 9l12 7-12 7V9z' fill='%23ffffff'/%3E%3C/svg%3E",
  },
  docs: {
    title: 'Unit 4: Rotational Kinematics - Docs',
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect x='5' y='3' width='22' height='26' rx='3' fill='%233b82f6'/%3E%3Cpath d='M10 11h12M10 16h12M10 21h8' stroke='%23fff' stroke-width='2.2' stroke-linecap='round'/%3E%3C/svg%3E",
  },
  lms: {
    title: 'Dashboard · Assignments & Modules',
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='13' fill='%23e11d48'/%3E%3Ccircle cx='16' cy='16' r='5' fill='%23fff'/%3E%3C/svg%3E",
  },
  calc: {
    title: 'Scientific Graphing Calculator',
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%2310b981'/%3E%3Cpath d='M6 22Q13 6 18 16T26 10' stroke='%23fff' stroke-width='2.5' fill='none'/%3E%3C/svg%3E",
  },
};

const state = {
  baseGames: [],
  customGames: [],
  favorites: new Set(),
  recentIds: [],
  activeCategory: 'All',
  searchQuery: '',
  activeGameId: null,
  wideTheater: false,
  decoyActive: false,
};

// DOM References
const catalogView = document.getElementById('catalogView');
const playerView = document.getElementById('playerView');
const gamesGrid = document.getElementById('gamesGrid');
const upNextGrid = document.getElementById('upNextGrid');
const resultsCount = document.getElementById('resultsCount');
const gridHeading = document.getElementById('gridHeading');
const favCountNum = document.getElementById('favCountNum');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');

// Hero Spotlight DOM
const heroSpotlight = document.getElementById('heroSpotlight');
const heroMeta = document.getElementById('heroMeta');
const heroTitle = document.getElementById('heroTitle');
const heroDesc = document.getElementById('heroDesc');
const heroImage = document.getElementById('heroImage');
const heroPlayBtn = document.getElementById('heroPlayBtn');
const heroMediaCard = document.getElementById('heroMediaCard');

// Recent DOM
const recentSection = document.getElementById('recentSection');
const recentList = document.getElementById('recentList');

// Player DOM
const iframeStageWrapper = document.getElementById('iframeStageWrapper');
const iframeMount = document.getElementById('iframeMount');
const playerMeta = document.getElementById('playerMeta');
const playerTitle = document.getElementById('playerTitle');
const playerDesc = document.getElementById('playerDesc');
const playerControls = document.getElementById('playerControls');
const playerIframeCode = document.getElementById('playerIframeCode');
const favStageBtn = document.getElementById('favStageBtn');
const wideModeBtn = document.getElementById('wideModeBtn');
const deleteCustomBtn = document.getElementById('deleteCustomBtn');

// Modals & Decoy
const jsonModal = document.getElementById('jsonModal');
const cloakModal = document.getElementById('cloakModal');
const fullJsonPreview = document.getElementById('fullJsonPreview');
const studyDecoyOverlay = document.getElementById('studyDecoyOverlay');

function readStorageJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorageJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota issues
  }
}

function getAllGames() {
  return [...state.customGames, ...state.baseGames];
}

function findGame(id) {
  return getAllGames().find((g) => g.id === id) || null;
}

/**
 * Normalizes any user input or JSON entry into a clean `<iframe>` HTML snippet
 * and extracts its safe attributes for mounting.
 */
function buildIframeMarkup(iframeInput, titleFallback) {
  const trimmed = String(iframeInput || '').trim();
  if (trimmed.toLowerCase().startsWith('<iframe')) {
    return trimmed;
  }
  const safeSrc = trimmed.replace(/"/g, '&quot;');
  const safeTitle = String(titleFallback || 'Game').replace(/"/g, '&quot;');
  return `<iframe src="${safeSrc}" title="${safeTitle}" allow="fullscreen; autoplay; gamepad" allowfullscreen></iframe>`;
}

function mountGameIframe(game) {
  iframeMount.innerHTML = '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(game.iframe || '', 'text/html');
  const parsedIframe = doc.querySelector('iframe');

  const iframeEl = document.createElement('iframe');
  if (parsedIframe) {
    const allowedAttrs = ['id', 'class', 'title', 'allow', 'allowfullscreen', 'sandbox', 'referrerpolicy', 'loading'];
    allowedAttrs.forEach((attr) => {
      if (parsedIframe.hasAttribute(attr)) {
        iframeEl.setAttribute(attr, parsedIframe.getAttribute(attr) || '');
      }
    });
    iframeEl.src = parsedIframe.getAttribute('src') || 'about:blank';
  } else {
    iframeEl.src = game.url || 'about:blank';
  }

  if (!iframeEl.getAttribute('title')) {
    iframeEl.title = game.title || 'Arcade Game';
  }
  if (!iframeEl.hasAttribute('allow')) {
    iframeEl.setAttribute('allow', 'fullscreen; autoplay; gamepad');
  }
  if (!iframeEl.hasAttribute('allowfullscreen')) {
    iframeEl.setAttribute('allowfullscreen', '');
  }

  iframeEl.addEventListener('load', () => {
    try {
      iframeEl.focus();
    } catch {
      // Cross-origin focus guard
    }
  });

  iframeMount.appendChild(iframeEl);
}

function attachResilientImage(imgEl, titleText) {
  imgEl.addEventListener(
    'error',
    () => {
      const fallback = document.createElement('div');
      fallback.className = 'img-fallback';
      fallback.textContent = titleText;
      if (imgEl.parentNode) {
        imgEl.replaceWith(fallback);
      }
    },
    { once: true }
  );
}

function renderSpotlight() {
  const all = getAllGames();
  const featured = all.find((g) => g.featured) || all[0];
  if (!featured) {
    heroSpotlight.classList.add('hidden');
    return;
  }

  // Hide spotlight when searching or filtering a specific sub-category so results lead immediately
  if (state.activeCategory !== 'All' || state.searchQuery.trim() !== '') {
    heroSpotlight.classList.add('hidden');
    return;
  }

  heroSpotlight.classList.remove('hidden');
  heroMeta.textContent = `Featured Game · ${featured.category} · ${featured.players || '1 Player'}`;
  heroTitle.textContent = featured.title;
  heroDesc.textContent = featured.description;
  heroImage.src = featured.thumbnail || '/images/cover_idle_mining.jpg';
  heroImage.alt = `${featured.title} preview artwork`;
  heroPlayBtn.onclick = () => launchGame(featured.id);
  heroMediaCard.onclick = () => launchGame(featured.id);
  heroMediaCard.onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      launchGame(featured.id);
    }
  };
}

function renderRecent() {
  const validRecent = state.recentIds.map((id) => findGame(id)).filter(Boolean);
  if (!validRecent.length || state.activeCategory !== 'All' || state.searchQuery.trim() !== '') {
    recentSection.classList.add('hidden');
    return;
  }

  recentSection.classList.remove('hidden');
  recentList.innerHTML = '';

  validRecent.slice(0, 4).forEach((game) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'recent-item';
    btn.addEventListener('click', () => launchGame(game.id));

    const img = document.createElement('img');
    img.className = 'recent-thumb';
    img.src = game.thumbnail || '/images/cover_idle_mining.jpg';
    img.alt = `${game.title} thumbnail`;
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => {
      img.style.display = 'none';
    });

    const textWrap = document.createElement('div');
    textWrap.className = 'recent-text';
    const strong = document.createElement('strong');
    strong.textContent = game.title;
    const span = document.createElement('span');
    span.textContent = `${game.category} · Instant Resume`;

    textWrap.append(strong, span);
    btn.append(img, textWrap);
    recentList.appendChild(btn);
  });
}

function createGameCard(game) {
  const article = document.createElement('article');
  article.className = 'game-card';

  const thumbWrap = document.createElement('div');
  thumbWrap.className = 'card-thumb-wrap';
  thumbWrap.addEventListener('click', () => launchGame(game.id));

  const img = document.createElement('img');
  img.src = game.thumbnail || '/images/cover_idle_mining.jpg';
  img.alt = `${game.title} cover illustration`;
  img.loading = 'lazy';
  img.referrerPolicy = 'no-referrer';
  attachResilientImage(img, game.title);
  thumbWrap.appendChild(img);

  const favBtn = document.createElement('button');
  favBtn.type = 'button';
  const isFav = state.favorites.has(game.id);
  favBtn.className = `fav-icon-btn ${isFav ? 'saved' : ''}`;
  favBtn.setAttribute('aria-label', isFav ? `Remove ${game.title} from saved games` : `Save ${game.title}`);
  favBtn.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
  favBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(game.id);
  });
  thumbWrap.appendChild(favBtn);

  const body = document.createElement('div');
  body.className = 'card-body';

  const meta = document.createElement('p');
  meta.className = 'card-meta';
  meta.textContent = `${game.category} · ${game.players || '1 Player'}${game.isCustom ? ' · Custom JSON' : ''}`;

  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = game.title;
  title.addEventListener('click', () => launchGame(game.id));

  const desc = document.createElement('p');
  desc.className = 'card-desc';
  desc.textContent = game.description;

  const footer = document.createElement('div');
  footer.className = 'card-footer';

  const controlsNote = document.createElement('span');
  controlsNote.className = 'card-controls-note';
  controlsNote.textContent = game.controls || 'Keyboard / Mouse';

  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.className = 'btn-primary';
  playBtn.textContent = 'Play';
  playBtn.addEventListener('click', () => launchGame(game.id));

  footer.append(controlsNote, playBtn);
  body.append(meta, title, desc, footer);
  article.append(thumbWrap, body);

  return article;
}

function getFilteredGames() {
  const q = state.searchQuery.trim().toLowerCase();
  return getAllGames().filter((game) => {
    if (state.activeCategory === 'Favorites' && !state.favorites.has(game.id)) {
      return false;
    }
    if (
      state.activeCategory !== 'All' &&
      state.activeCategory !== 'Favorites' &&
      game.category.toLowerCase() !== state.activeCategory.toLowerCase()
    ) {
      return false;
    }
    if (!q) return true;
    const haystack = `${game.title} ${game.category} ${game.description} ${game.controls}`.toLowerCase();
    return haystack.includes(q);
  });
}

function syncFilterControls() {
  favCountNum.textContent = String(state.favorites.size);

  document.querySelectorAll('#categoryTabs .seg-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.cat === state.activeCategory);
  });

  document.querySelectorAll('.primary-nav [data-nav-cat]').forEach((link) => {
    link.classList.toggle('active', !state.activeGameId && link.dataset.navCat === state.activeCategory);
  });
}

function renderCatalog() {
  syncFilterControls();
  renderSpotlight();
  renderRecent();

  const filtered = getFilteredGames();
  resultsCount.textContent = String(filtered.length);

  if (state.searchQuery.trim()) {
    gridHeading.textContent = `Search Results for "${state.searchQuery.trim()}"`;
  } else if (state.activeCategory === 'Favorites') {
    gridHeading.textContent = 'Saved Favorites';
  } else if (state.activeCategory === 'All') {
    gridHeading.textContent = 'All Games';
  } else {
    gridHeading.textContent = `${state.activeCategory} Games`;
  }

  gamesGrid.innerHTML = '';
  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    filtered.forEach((game) => {
      gamesGrid.appendChild(createGameCard(game));
    });
  }
}

function launchGame(gameId, pushHash = true) {
  const game = findGame(gameId);
  if (!game) return;

  state.activeGameId = game.id;

  // Record in Recently Played
  state.recentIds = [game.id, ...state.recentIds.filter((id) => id !== game.id)].slice(0, 8);
  saveStorageJson(STORAGE_KEYS.RECENT, state.recentIds);

  catalogView.classList.add('hidden');
  playerView.classList.remove('hidden');
  syncFilterControls();

  mountGameIframe(game);

  playerMeta.textContent = `${game.category} · ${game.players || '1 Player'}`;
  playerTitle.textContent = game.title;
  playerDesc.textContent = game.description;
  playerControls.textContent = game.controls || 'Keyboard or Mouse';

  const cleanEntry = {
    id: game.id,
    title: game.title,
    category: game.category,
    controls: game.controls,
    players: game.players,
    description: game.description,
    thumbnail: game.thumbnail,
    iframe: game.iframe,
  };
  playerIframeCode.textContent = JSON.stringify(cleanEntry, null, 2);

  updateStageFavoriteButton();
  deleteCustomBtn.classList.toggle('hidden', !game.isCustom);

  // Render up to 3 "Up Next" suggestions if additional games exist
  const moreGamesSection = document.getElementById('moreGamesSection');
  const otherGames = getAllGames().filter((g) => g.id !== game.id).slice(0, 3);
  upNextGrid.innerHTML = '';
  if (otherGames.length === 0) {
    if (moreGamesSection) moreGamesSection.classList.add('hidden');
  } else {
    if (moreGamesSection) moreGamesSection.classList.remove('hidden');
    otherGames.forEach((other) => upNextGrid.appendChild(createGameCard(other)));
  }

  if (pushHash) {
    window.history.replaceState(null, '', `#play/${encodeURIComponent(game.id)}`);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closePlayer(pushHash = true) {
  state.activeGameId = null;
  iframeMount.innerHTML = ''; // Cleanly stops game audio/timers inside iframe
  playerView.classList.add('hidden');
  catalogView.classList.remove('hidden');
  renderCatalog();
  if (pushHash) {
    window.history.replaceState(null, '', '#all');
  }
}

function updateStageFavoriteButton() {
  if (!state.activeGameId) return;
  const saved = state.favorites.has(state.activeGameId);
  favStageBtn.textContent = saved ? 'Saved in Favorites' : 'Save Favorite';
}

function toggleFavorite(gameId) {
  if (state.favorites.has(gameId)) {
    state.favorites.delete(gameId);
  } else {
    state.favorites.add(gameId);
  }
  saveStorageJson(STORAGE_KEYS.FAVORITES, Array.from(state.favorites));
  updateStageFavoriteButton();
  renderCatalog();
}

function applyCloak(presetKey) {
  const preset = CLOAK_PRESETS[presetKey] || CLOAK_PRESETS.default;
  document.title = preset.title;
  const fav = document.getElementById('dynamicFavicon');
  if (fav) fav.setAttribute('href', preset.icon);
  saveStorageJson(STORAGE_KEYS.CLOAK, presetKey);

  document.querySelectorAll('.cloak-preset-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.cloak === presetKey);
  });
}

function toggleStudyDecoy(forceState) {
  state.decoyActive = typeof forceState === 'boolean' ? forceState : !state.decoyActive;
  studyDecoyOverlay.classList.toggle('hidden', !state.decoyActive);
  studyDecoyOverlay.setAttribute('aria-hidden', String(!state.decoyActive));
  if (state.decoyActive) {
    applyCloak('docs');
  } else {
    const savedCloak = readStorageJson(STORAGE_KEYS.CLOAK, 'default');
    applyCloak(savedCloak);
  }
}

function openJsonModal(defaultTab = 'addTab') {
  const exportPayload = getAllGames().map(({ isCustom, ...rest }) => rest);
  fullJsonPreview.textContent = JSON.stringify(exportPayload, null, 2);
  switchModalTab(defaultTab);
  jsonModal.classList.remove('hidden');
}

function switchModalTab(tabId) {
  document.querySelectorAll('[data-modal-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.modalTab === tabId);
  });
  document.getElementById('addTab').classList.toggle('hidden', tabId !== 'addTab');
  document.getElementById('exportTab').classList.toggle('hidden', tabId !== 'exportTab');
}

async function copyTextWithFeedback(text, buttonEl, defaultLabel) {
  try {
    await navigator.clipboard.writeText(text);
    buttonEl.textContent = 'Copied!';
    setTimeout(() => {
      buttonEl.textContent = defaultLabel;
    }, 1500);
  } catch {
    buttonEl.textContent = 'Copy Ready';
  }
}

function wireEvents() {
  // Brand & Top Navigation
  document.getElementById('brandHomeLink').addEventListener('click', (e) => {
    e.preventDefault();
    state.activeCategory = 'All';
    state.searchQuery = '';
    searchInput.value = '';
    closePlayer();
  });

  document.querySelectorAll('.primary-nav [data-nav-cat]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      state.activeCategory = link.dataset.navCat;
      closePlayer();
    });
  });

  document.getElementById('openJsonModalNav').addEventListener('click', (e) => {
    e.preventDefault();
    openJsonModal('exportTab');
  });

  // Category Segmented Buttons
  document.querySelectorAll('#categoryTabs .seg-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeCategory = btn.dataset.cat;
      renderCatalog();
    });
  });

  // Search Input
  searchInput.addEventListener('input', () => {
    state.searchQuery = searchInput.value;
    renderCatalog();
  });

  document.getElementById('resetFiltersBtn').addEventListener('click', () => {
    state.activeCategory = 'All';
    state.searchQuery = '';
    searchInput.value = '';
    renderCatalog();
  });

  // Clear Recent
  document.getElementById('clearRecentBtn').addEventListener('click', () => {
    state.recentIds = [];
    saveStorageJson(STORAGE_KEYS.RECENT, []);
    renderRecent();
  });

  // Random Game
  document.getElementById('randomGameBtn').addEventListener('click', () => {
    const all = getAllGames();
    if (!all.length) return;
    const pool = all.length > 1 ? all.filter((g) => g.id !== state.activeGameId) : all;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    launchGame(pick.id);
  });

  // Player Toolbar Controls
  document.getElementById('backToLibraryBtn').addEventListener('click', () => closePlayer());

  favStageBtn.addEventListener('click', () => {
    if (state.activeGameId) toggleFavorite(state.activeGameId);
  });

  wideModeBtn.addEventListener('click', () => {
    state.wideTheater = !state.wideTheater;
    iframeStageWrapper.classList.toggle('wide-theater', state.wideTheater);
    wideModeBtn.textContent = state.wideTheater ? 'Standard Width' : 'Theater Width';
  });

  document.getElementById('reloadGameBtn').addEventListener('click', () => {
    const game = findGame(state.activeGameId);
    if (game) mountGameIframe(game);
  });

  document.getElementById('fullscreenBtn').addEventListener('click', () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (iframeStageWrapper.requestFullscreen) {
      iframeStageWrapper.requestFullscreen().catch(() => {});
    }
  });

  document.getElementById('copyIframeBtn').addEventListener('click', (e) => {
    copyTextWithFeedback(playerIframeCode.textContent, e.currentTarget, 'Copy JSON Entry');
  });

  deleteCustomBtn.addEventListener('click', () => {
    if (!state.activeGameId) return;
    state.customGames = state.customGames.filter((g) => g.id !== state.activeGameId);
    saveStorageJson(STORAGE_KEYS.CUSTOM_GAMES, state.customGames);
    closePlayer();
  });

  // Modals Open / Close
  document.getElementById('addCustomGameBtn').addEventListener('click', () => openJsonModal('addTab'));
  document.getElementById('footerJsonBtn').addEventListener('click', () => openJsonModal('exportTab'));
  document.getElementById('openCloakBtn').addEventListener('click', () => cloakModal.classList.remove('hidden'));
  document.getElementById('footerCloakBtn').addEventListener('click', () => cloakModal.classList.remove('hidden'));

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.closeModal).classList.add('hidden');
    });
  });

  [jsonModal, cloakModal].forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.classList.add('hidden');
    });
  });

  document.querySelectorAll('[data-modal-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchModalTab(btn.dataset.modalTab));
  });

  // Add Custom Iframe Game Form
  document.getElementById('addGameForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('customTitle').value.trim();
    const category = document.getElementById('customCategory').value;
    const controls = document.getElementById('customControls').value.trim() || 'Keyboard / Mouse';
    const thumbnail = document.getElementById('customThumbnail').value.trim() || '/images/cover_idle_mining.jpg';
    const rawIframe = document.getElementById('customIframe').value.trim();
    const description =
      document.getElementById('customDesc').value.trim() ||
      'Custom unblocked HTML5 game embedded via iframe JSON.';

    if (!title || !rawIframe) return;

    const slug =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Date.now().toString(36).slice(-4);

    const newEntry = {
      id: slug,
      title,
      category,
      controls,
      players: '1 Player',
      featured: false,
      description,
      thumbnail,
      iframe: buildIframeMarkup(rawIframe, title),
      isCustom: true,
    };

    state.customGames.unshift(newEntry);
    saveStorageJson(STORAGE_KEYS.CUSTOM_GAMES, state.customGames);
    e.target.reset();
    jsonModal.classList.add('hidden');
    renderCatalog();
    launchGame(newEntry.id);
  });

  // Copy & Download Full JSON
  document.getElementById('copyFullJsonBtn').addEventListener('click', (e) => {
    copyTextWithFeedback(fullJsonPreview.textContent, e.currentTarget, 'Copy Full JSON');
  });

  document.getElementById('downloadJsonBtn').addEventListener('click', () => {
    const exportPayload = getAllGames().map(({ isCustom, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'games.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // Cloak Presets & Study Decoy
  document.querySelectorAll('.cloak-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => applyCloak(btn.dataset.cloak));
  });

  document.getElementById('triggerDecoyNowBtn').addEventListener('click', () => {
    cloakModal.classList.add('hidden');
    toggleStudyDecoy(true);
  });

  document.getElementById('exitDecoyBtn').addEventListener('click', () => toggleStudyDecoy(false));

  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement ? document.activeElement.tagName : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      if (e.key === 'Escape') {
        jsonModal.classList.add('hidden');
        cloakModal.classList.add('hidden');
      }
      return;
    }
    if (e.key === '[') {
      e.preventDefault();
      toggleStudyDecoy();
    } else if (e.key === 'Escape') {
      jsonModal.classList.add('hidden');
      cloakModal.classList.add('hidden');
    }
  });
}

async function init() {
  state.favorites = new Set(readStorageJson(STORAGE_KEYS.FAVORITES, []));
  state.recentIds = readStorageJson(STORAGE_KEYS.RECENT, []);
  state.customGames = readStorageJson(STORAGE_KEYS.CUSTOM_GAMES, []);
  const savedCloak = readStorageJson(STORAGE_KEYS.CLOAK, 'default');
  applyCloak(savedCloak);

  wireEvents();

  loadingState.classList.remove('hidden');
  try {
    const response = await fetch('./games.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.baseGames = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Failed to load games.json:', err);
    state.baseGames = [];
  } finally {
    loadingState.classList.add('hidden');
  }

  renderCatalog();

  // Deep-link hash support (#play/<id>)
  if (window.location.hash.startsWith('#play/')) {
    const targetId = decodeURIComponent(window.location.hash.replace('#play/', ''));
    if (findGame(targetId)) {
      launchGame(targetId, false);
    }
  }
}

init();
