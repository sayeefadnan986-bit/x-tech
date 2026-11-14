const NAV = [
  ['dashboard', '⌂', 'Overview'],
  ['websites', '↗', 'My websites'],
  ['reviews', '✧', 'Reviews'],
  ['notices', '◉', 'Notice board'],
  ['education', '⌘', 'Learning hub'],
  ['videos', '▷', 'Video library'],
  ['forms', '▤', 'Forms'],
  ['projects', '◈', 'Projects'],
  ['notes', '▧', 'Notes'],
  ['files', '▱', 'Files'],
  ['favorites', '♡', 'Favorites'],
  ['activity', '◷', 'Activity'],
  ['profile', '◎', 'Profile'],
  ['settings', '⚙', 'Settings'],
  ['about', '✦', 'About']
];

const CONFIG = {
  websites: {
    title: 'My websites', singular: 'website', icon: '↗',
    fields: [
      ['title', 'Title', 'text', true],
      ['url', 'Website URL', 'url', true],
      ['category', 'Category', 'text'],
      ['description', 'Description', 'textarea'],
      ['tags', 'Tags', 'text'],
      ['rating', 'Rating (1–5)', 'number'],
      ['favorite', 'Add to favorites', 'checkbox'],
      ['pinned', 'Pin this link', 'checkbox']
    ]
  },
  reviews: {
    title: 'Reviews', singular: 'review', icon: '✧',
    fields: [
      ['title', 'Review title', 'text', true],
      ['category', 'Category', 'text'],
      ['rating', 'Rating (1–5)', 'number'],
      ['pros', 'What worked well', 'textarea'],
      ['cons', 'What could be better', 'textarea'],
      ['observations', 'Personal observations', 'textarea']
    ]
  },
  notices: {
    title: 'Notice board', singular: 'notice', icon: '◉',
    fields: [
      ['title', 'Notice title', 'text', true],
      ['category', 'Category', 'select', false, ['General', 'Important update', 'Education', 'Examination', 'Admission', 'Scholarship', 'Website update', 'Reminder', 'Event', 'Project']],
      ['priority', 'Priority', 'select', false, ['Normal', 'High', 'Urgent']],
      ['expirationDate', 'Expiration date', 'date'],
      ['description', 'Description', 'textarea'],
      ['pinned', 'Pin notice', 'checkbox']
    ]
  },
  education: {
    title: 'Learning hub', singular: 'resource', icon: '⌘',
    fields: [
      ['title', 'Resource title', 'text', true],
      ['subject', 'Subject', 'select', false, ['Science', 'Physics', 'Chemistry', 'Biology', 'Mathematics', 'English', 'General Knowledge', 'Other']],
      ['type', 'Resource type', 'select', false, ['Notes', 'PDF', 'Study material', 'Reference link', 'Book']],
      ['url', 'Resource URL (optional)', 'url'],
      ['description', 'Description / learning notes', 'textarea'],
      ['tags', 'Tags', 'text']
    ]
  },
  videos: {
    title: 'Video library', singular: 'video', icon: '▷',
    fields: [
      ['title', 'Video title', 'text', true],
      ['url', 'YouTube URL', 'url', true],
      ['category', 'Category', 'text'],
      ['channel', 'Channel', 'text'],
      ['description', 'Description', 'textarea'],
      ['notes', 'Personal notes', 'textarea'],
      ['watched', 'Already watched', 'checkbox'],
      ['favorite', 'Add to favorites', 'checkbox']
    ]
  },
  forms: {
    title: 'Forms', singular: 'form', icon: '▤',
    fields: [
      ['title', 'Form title', 'text', true],
      ['description', 'Description', 'textarea'],
      ['fieldLabels', 'Fields (one label per line)', 'textarea', true],
      ['published', 'Publish immediately', 'checkbox']
    ]
  },
  projects: {
    title: 'Projects', singular: 'project', icon: '◈',
    fields: [
      ['name', 'Project name', 'text', true],
      ['category', 'Category', 'text'],
      ['description', 'Description', 'textarea'],
      ['technology', 'Technologies (comma separated)', 'text'],
      ['github', 'GitHub URL', 'url'],
      ['live', 'Live demo URL', 'url'],
      ['status', 'Status', 'select', false, ['Idea', 'Planning', 'In progress', 'Complete', 'On hold']],
      ['startDate', 'Start date', 'date'],
      ['completionDate', 'Completion date', 'date'],
      ['notes', 'Notes', 'textarea']
    ]
  },
  notes: {
    title: 'Notes & knowledge', singular: 'note', icon: '▧',
    fields: [
      ['title', 'Note title', 'text', true],
      ['category', 'Category', 'text'],
      ['content', 'Write your note', 'textarea', true],
      ['tags', 'Tags', 'text'],
      ['pinned', 'Pin this note', 'checkbox'],
      ['favorite', 'Add to favorites', 'checkbox']
    ]
  },
  files: {
    title: 'File library', singular: 'file record', icon: '▱',
    fields: [
      ['name', 'File name', 'text', true],
      ['url', 'File URL (optional)', 'url'],
      ['category', 'Category', 'text'],
      ['type', 'File type', 'text'],
      ['description', 'Description', 'textarea'],
      ['tags', 'Tags', 'text']
    ]
  }
};

const state = {
  data: null,
  page: 'dashboard',
  query: '',
  filter: 'all',
  editing: null,
  formId: null
};

const $ = (selector, root = document) => root.querySelector(selector);
const escapeHtml = (value = '') => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const safeUrl = (value) => {
  if (!value) return '';
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol) ? u.href : '';
  } catch {
    return '';
  }
};
const formatShortDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(d);
};

function toast(message, error = false) {
  const region = $('#toasts');
  const node = document.createElement('div');
  node.className = `toast${error ? ' error' : ''}`;
  node.textContent = message;
  region.appendChild(node);
  setTimeout(() => node.remove(), 3200);
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (!res.ok) {
    let detail = 'Request failed';
    try { detail = (await res.json()).error || detail; } catch {}
    throw new Error(detail);
  }
  return res.status === 204 ? null : res.json();
}

async function refresh() {
  try {
    state.data = await request('/api/data');
    render();
  } catch (error) {
    $('#page').innerHTML = `<div class="empty-state"><h3>Could not load your universe</h3><p>${escapeHtml(error.message)}. Check the server and refresh the page.</p><button class="button-secondary" onclick="location.reload()">Try again</button></div>`;
  }
}

function applyTheme(theme = 'dark', accent = '#7b69ff') {
  document.documentElement.setAttribute('data-theme', theme || 'dark');
  document.documentElement.style.setProperty('--accent', accent || '#7b69ff');
  localStorage.setItem('gx-theme', theme || 'dark');
}

function navMarkup() {
  return `<div class="nav-list">${NAV.map(([id, icon, label]) => `
    <button class="nav-item ${state.page === id ? 'active' : ''}" data-nav="${id}">
      <span class="nav-icon">${icon}</span>
      <span>${label}</span>
    </button>`).join('')}</div>`;
}

function currentSectionLabel() {
  return NAV.find(([id]) => id === state.page)?.[2] || 'Overview';
}

function getVisibleItems(list = []) {
  const query = state.query.trim().toLowerCase();
  const filtered = (list || []).filter((item) => {
    if (!query) return true;
    return JSON.stringify(item).toLowerCase().includes(query);
  });

  if (state.filter === 'favorites') return filtered.filter((item) => item.favorite || item.pinned);
  if (state.filter === 'pinned') return filtered.filter((item) => item.pinned);
  return filtered;
}

function statCard(title, value, icon, caption) {
  return `<article class="stat-card"><div class="stat-top"><span>${title}</span><span class="stat-icon">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-caption">${caption}</div></article>`;
}

function emptyState(title, description, buttonLabel = 'Add your first item') {
  return `<div class="empty-state"><div class="empty-orbit">✦</div><h3>${title}</h3><p>${description}</p><button class="button-secondary" data-add="${state.page}">${buttonLabel}</button></div>`;
}

function renderDashboard() {
  const d = state.data || {};
  const websites = d.websites || [];
  const projects = d.projects || [];
  const notes = d.notes || [];
  const notices = d.notices || [];
  const videos = d.videos || [];
  const education = d.education || [];
  const reviews = d.reviews || [];
  const forms = d.forms || [];
  const recent = [...websites, ...projects, ...notes, ...notices, ...education, ...videos]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 6);
  const activeNotices = notices.filter((n) => !n.expirationDate || new Date(n.expirationDate) >= new Date());
  const activity = (d.activity || []).slice(0, 5);
  const userName = d.profile?.name || 'Sayeef Adnan';

  return `
    <div class="hero">
      <span class="eyebrow">YOUR PERSONAL DIGITAL UNIVERSE</span>
      <div class="hero-bottom">
        <div>
          <h1>Make space for what matters, ${escapeHtml(userName)}.</h1>
          <p>Your links, learning, ideas, projects, and announcements—together in one evolving space.</p>
        </div>
        <div class="hero-time">
          <strong id="clock">--:--</strong>
          <span id="today">Date</span>
        </div>
      </div>
    </div>

    <div class="stats-grid">
      ${statCard('Websites', websites.length, '↗', 'Saved for later')}
      ${statCard('Projects', projects.length, '◈', 'Ideas in motion')}
      ${statCard('Learning resources', education.length, '⌘', 'Knowledge gathered')}
      ${statCard('Saved videos', videos.length, '▷', 'Watch and learn')}
      ${statCard('Active notices', activeNotices.length, '◉', 'On your notice board')}
      ${statCard('Notes', notes.length, '▧', 'Thoughts captured')}
      ${statCard('Reviews', reviews.length, '✧', 'Personal insights')}
      ${statCard('Forms', forms.length, '▤', 'Your created forms')}
    </div>

    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2 class="section-title">Recently added</h2>
            <div class="section-subtitle">Your universe, taking shape</div>
          </div>
          <button class="text-link" data-nav="websites">Explore collection →</button>
        </div>
        <div class="recent-list">
          ${recent.length
            ? recent.map((item) => `
              <div class="recent-row">
                <span class="activity-mark">✦</span>
                <div class="row-copy">
                  <strong>${escapeHtml(item.title || item.name || 'Untitled item')}</strong>
                  <small>${escapeHtml(item.category || item.subject || 'New addition')}</small>
                </div>
                <span class="row-time">${formatShortDate(item.createdAt)}</span>
              </div>`).join('')
            : '<p class="section-subtitle">Your additions will appear here. Start with a link, note, or project.</p>'}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2 class="section-title">Activity</h2>
            <div class="section-subtitle">A little history of your universe</div>
          </div>
          <button class="text-link" data-nav="activity">View all →</button>
        </div>
        <div class="activity-list">
          ${activity.length
            ? activity.map((entry) => `
              <div class="activity-row">
                <span class="activity-mark">◷</span>
                <div class="row-copy">
                  <strong>${escapeHtml(entry.title)}</strong>
                  <small>${escapeHtml(entry.detail || '')}</small>
                </div>
                <span class="row-time">${formatShortDate(entry.createdAt)}</span>
              </div>`).join('')
            : '<p class="section-subtitle">Activity will appear here as you add things.</p>'}
        </div>
      </section>
    </div>
  `;
}

function itemTags(item) {
  const tags = [];
  if (Array.isArray(item.tags)) tags.push(...item.tags);
  else if (typeof item.tags === 'string') tags.push(...item.tags.split(',').map((t) => t.trim()).filter(Boolean));
  if (item.category) tags.unshift(item.category);
  if (item.subject) tags.unshift(item.subject);
  return [...new Set(tags)].slice(0, 4).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
}

function cardForCollection(collection, item) {
  const title = item.title || item.name || 'Untitled';
  const description = item.description || item.content || item.notes || item.observations || 'No description added yet.';
  const external = safeUrl(item.url) || safeUrl(item.live) || safeUrl(item.github);
  const status = item.status || item.priority || collection.charAt(0).toUpperCase() + collection.slice(1);
  return `
    <article class="item-card ${collection === 'notices' && item.priority === 'Urgent' ? 'notice-urgent' : ''} ${collection === 'notices' && item.priority === 'High' ? 'notice-high' : ''}">
      <div class="item-card-top">
        <h3>${escapeHtml(title)}</h3>
        <span class="status-pill">${escapeHtml(status)}</span>
      </div>
      <p>${escapeHtml(description)}</p>
      <div class="item-meta">${itemTags(item)}${item.rating ? `<span class="tag">★ ${escapeHtml(String(item.rating))}</span>` : ''}${item.watched ? '<span class="tag">Watched</span>' : ''}</div>
      ${external ? `<a class="external-link" href="${escapeHtml(external)}" target="_blank" rel="noopener noreferrer">${escapeHtml(external)} ↗</a>` : ''}
      <div class="item-actions">
        <button class="small-action" data-edit="${collection}" data-id="${item.id}">Edit</button>
        ${collection === 'forms' ? `<button class="small-action" data-form-open="${item.id}">Open form</button><button class="small-action" data-submissions="${item.id}">Submissions</button>` : ''}
        <button class="small-action" data-favorite="${collection}" data-id="${item.id}">${item.favorite || item.pinned ? '★ Saved' : '☆ Favorite'}</button>
        <button class="delete-action" data-delete="${collection}" data-id="${item.id}">Delete</button>
      </div>
    </article>
  `;
}

function collectionPage(collection) {
  if (collection === 'activity') {
    const items = getVisibleItems(state.data?.activity || []);
    return `
      <div class="page-heading">
        <div>
          <span class="eyebrow">YOUR HISTORY</span>
          <h1>Activity</h1>
          <p>Recent changes and actions in your personal universe.</p>
        </div>
      </div>
      <div class="panel">
        ${items.length ? items.map((entry) => `
          <div class="activity-row">
            <span class="activity-mark">◷</span>
            <div class="row-copy">
              <strong>${escapeHtml(entry.title)}</strong>
              <small>${escapeHtml(entry.detail || '')}</small>
            </div>
            <span class="row-time">${formatShortDate(entry.createdAt)}</span>
          </div>`).join('') : `<div class="empty-state"><div class="empty-orbit">✦</div><h3>No activity yet</h3><p>Your recent actions will appear here as you create content.</p></div>`}
      </div>
    `;
  }

  if (collection === 'favorites') {
    const items = [];
    Object.entries(CONFIG).forEach(([key, value]) => {
      const list = state.data?.[key] || [];
      list.forEach((item) => {
        if (item.favorite || item.pinned) items.push({ ...item, _collection: key });
      });
    });
    const visible = getVisibleItems(items);
    return `
      <div class="page-heading">
        <div>
          <span class="eyebrow">QUICK ACCESS</span>
          <h1>Favorites</h1>
          <p>The things you marked to find again easily.</p>
        </div>
      </div>
      <div class="collection-grid">
        ${visible.length ? visible.map((item) => cardForCollection(item._collection, item)).join('') : emptyState('Nothing saved yet', 'Mark websites, videos, notes, or resources as favorites to see them here.')}
      </div>
    `;
  }

  const config = CONFIG[collection];
  if (!config) return '<div class="empty-state"><h3>Page unavailable</h3><p>This section is not available yet.</p></div>';

  const items = getVisibleItems(state.data?.[collection] || []);
  return `
    <div class="page-heading">
      <div>
        <span class="eyebrow">YOUR COLLECTION</span>
        <h1>${config.title}</h1>
        <p>${config.title === 'My websites' ? 'A considered collection of links worth keeping.' : collection === 'notices' ? 'Announcements, reminders, events, and updates.' : 'Add items and grow this section naturally.'}</p>
      </div>
      <button class="button-primary" data-add="${collection}">＋ Add ${config.singular}</button>
    </div>
    <div class="collection-toolbar">
      <span class="section-subtitle">${items.length} ${items.length === 1 ? config.singular : 'items'} in your collection</span>
      <select class="filter-select" id="filter-select">
        <option value="all" ${state.filter === 'all' ? 'selected' : ''}>All items</option>
        <option value="favorites" ${state.filter === 'favorites' ? 'selected' : ''}>Favorites</option>
        <option value="pinned" ${state.filter === 'pinned' ? 'selected' : ''}>Pinned</option>
      </select>
    </div>
    <div class="collection-grid">
      ${items.length ? items.map((item) => cardForCollection(collection, item)).join('') : emptyState(`No ${config.title.toLowerCase()} yet`, `Add the first ${config.singular} and build this part of your universe.`)}
    </div>
  `;
}

function renderProfile() {
  const profile = state.data?.profile || {};
  return `
    <div class="page-heading">
      <div>
        <span class="eyebrow">YOUR IDENTITY</span>
        <h1>Profile</h1>
        <p>Only fill in what you want to share. Leave anything else blank.</p>
      </div>
    </div>
    <div class="settings-card">
      <form id="profile-form" class="profile-form">
        ${[
          ['name', 'Display name'],
          ['title', 'Your title'],
          ['intro', 'Introduction'],
          ['location', 'Location'],
          ['email', 'Email'],
          ['website', 'Website']
        ].map(([key, label]) => `
          <div class="field">
            <label for="p-${key}">${label}</label>
            <input id="p-${key}" name="${key}" value="${escapeHtml(profile[key] || '')}" />
          </div>
        `).join('')}
        <button class="button-primary" type="submit">Save profile</button>
      </form>
    </div>
  `;
}

function renderSettings() {
  const settings = state.data?.settings || {};
  return `
    <div class="page-heading">
      <div>
        <span class="eyebrow">MAKE IT YOURS</span>
        <h1>Settings</h1>
        <p>Personalize your experience. Your collection data is stored by this app's server.</p>
      </div>
    </div>
    <div class="settings-card">
      <form id="settings-form" class="profile-form">
        <div class="field">
          <label for="theme-setting">Appearance</label>
          <select id="theme-setting" name="theme">
            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Midnight</option>
            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Daylight</option>
          </select>
        </div>
        <div class="field">
          <label for="accent-setting">Accent color</label>
          <input id="accent-setting" name="accent" type="color" value="${escapeHtml(settings.accent || '#7b69ff')}" />
        </div>
        <div class="field">
          <label for="language-setting">Language preference</label>
          <select id="language-setting" name="language">
            <option value="en" ${settings.language === 'en' ? 'selected' : ''}>English</option>
            <option value="bn" ${settings.language === 'bn' ? 'selected' : ''}>বাংলা (interface localization ready)</option>
          </select>
        </div>
        <button class="button-primary" type="submit">Save preferences</button>
      </form>
    </div>
    <div class="settings-card" style="margin-top: 14px;">
      <h3>Data & privacy</h3>
      <p class="section-subtitle">Download a JSON backup of your collection at any time. This initial version is intended for a single trusted user and does not include sign-in or multi-user access.</p>
      <a class="button-secondary" href="/api/export" download>Download full backup ↧</a>
    </div>
  `;
}

function renderAbout() {
  return `
    <div class="settings-card about-card">
      <span class="eyebrow">THE IDEA</span>
      <h2>One space. Many directions.</h2>
      <p>Generation X is a personal digital universe for organizing websites, learning resources, announcements, videos, forms, projects, notes, reviews, and file references. Each section starts simple and can grow as your needs change.</p>
      <p class="about-credit">Created by Sayeef Adnan.</p>
      <p>Personal information not provided yet has intentionally been left blank for you to complete.</p>
    </div>
  `;
}

function renderSubmissions(formId) {
  const form = (state.data?.forms || []).find((item) => item.id === formId);
  if (!form) return '<div class="empty-state"><h3>Form not found</h3><p>The requested form could not be found.</p></div>';
  const submissions = (state.data?.submissions || []).filter((item) => item.formId === formId);
  return `
    <div class="page-heading">
      <div>
        <span class="eyebrow">FORM RESPONSES</span>
        <h1>${escapeHtml(form.title)} submissions</h1>
        <p>${submissions.length} response${submissions.length === 1 ? '' : 's'} saved persistently.</p>
      </div>
      <button class="button-secondary" data-nav="forms">← Back to forms</button>
    </div>
    ${submissions.length ? submissions.map((item) => `
      <article class="form-submission">
        <span class="row-time">${formatShortDate(item.createdAt)}</span>
        <pre>${escapeHtml(JSON.stringify(item.values, null, 2))}</pre>
      </article>
    `).join('') : emptyState('No submissions yet', 'Responses submitted through the form will show up here.')}
  `;
}

function render() {
  if (!state.data) return;
  $('#navigation').innerHTML = navMarkup();
  $('#current-section').textContent = currentSectionLabel();
  $('#side-name').textContent = state.data.profile?.name || 'Sayeef Adnan';

  const page = $('#page');
  if (state.formId) {
    page.innerHTML = renderSubmissions(state.formId);
  } else if (state.page === 'dashboard') {
    page.innerHTML = renderDashboard();
  } else if (state.page === 'profile') {
    page.innerHTML = renderProfile();
  } else if (state.page === 'settings') {
    page.innerHTML = renderSettings();
  } else if (state.page === 'about') {
    page.innerHTML = renderAbout();
  } else if (state.page === 'favorites' || state.page === 'activity') {
    page.innerHTML = collectionPage(state.page);
  } else {
    page.innerHTML = collectionPage(state.page);
  }

  $('#search').value = state.query;
  bindPageEvents();
  updateClock();
}

function updateClock() {
  const clock = $('#clock');
  const today = $('#today');
  if (!clock || !today) return;
  const now = new Date();
  clock.textContent = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(now);
  today.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(now);
}

function fieldMarkup(fieldTuple) {
  const [name, label, type = 'text', required = false, options = []] = fieldTuple;

  if (type === 'checkbox') {
    return `<label class="checkbox-field field full"><input name="${name}" type="checkbox"> ${label}</label>`;
  }

  if (type === 'textarea') {
    return `<div class="field full"><label for="f-${name}">${label}${required ? ' *' : ''}</label><textarea id="f-${name}" name="${name}" ${required ? 'required' : ''}></textarea></div>`;
  }

  if (type === 'select') {
    return `<div class="field"><label for="f-${name}">${label}</label><select id="f-${name}" name="${name}">${options.map((option) => `<option>${escapeHtml(option)}</option>`).join('')}</select></div>`;
  }

  return `<div class="field ${type === 'url' ? 'full' : ''}"><label for="f-${name}">${label}${required ? ' *' : ''}</label><input id="f-${name}" name="${name}" type="${type}" ${required ? 'required' : ''} ${type === 'number' ? 'min="1" max="5"' : ''} /></div>`;
}

function openDialog(collection, item = null) {
  const config = CONFIG[collection];
  if (!config) return;
  state.editing = item ? { collection, id: item.id } : null;
  $('#dialog-eyebrow').textContent = item ? 'EDIT ENTRY' : `NEW ${config.singular.toUpperCase()}`;
  $('#dialog-title').textContent = item ? `Edit ${config.singular}` : `Add ${config.singular}`;
  $('#dialog-fields').innerHTML = config.fields.map(fieldMarkup).join('');

  if (item) {
    Object.entries(item).forEach(([key, value]) => {
      const input = $('#dialog-fields')?.querySelector(`[name="${key}"]`);
      if (!input) return;
      if (input.type === 'checkbox') input.checked = Boolean(value);
      else if (Array.isArray(value)) input.value = value.join(', ');
      else if (typeof value !== 'undefined') input.value = value;
    });
  }

  $('#entry-dialog').showModal();
}

function openPublicForm(formId) {
  const form = (state.data?.forms || []).find((item) => item.id === formId);
  if (!form) return;
  $('#dialog-eyebrow').textContent = 'PUBLIC FORM PREVIEW';
  $('#dialog-title').textContent = form.title;
  $('#dialog-fields').innerHTML = `${form.description ? `<div class="field full"><label>Form description</label><p class="section-subtitle">${escapeHtml(form.description)}</p></div>` : ''}${(form.fields || []).map((field, index) => fieldMarkup([`field_${index}`, field.label, field.type, field.required])).join('')}`;
  $('#dialog-save').textContent = 'Submit response ↗';
  $('#entry-dialog').showModal();

  const save = $('#dialog-save');
  save.onclick = async (event) => {
    event.preventDefault();
    const values = {};
    $('#dialog-fields').querySelectorAll('[name]').forEach((input) => {
      values[input.name] = input.type === 'checkbox' ? input.checked : input.value;
    });
    try {
      await request(`/api/forms/${formId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ values })
      });
      $('#entry-dialog').close();
      toast('Response saved successfully');
      await refresh();
    } catch (error) {
      toast(error.message, true);
    }
  };
}

function bindPageEvents() {
  document.querySelectorAll('[data-nav]').forEach((button) => {
    button.addEventListener('click', () => {
      const page = button.dataset.nav;
      state.page = page;
      state.formId = null;
      state.filter = 'all';
      render();
      $('#sidebar').classList.remove('open');
      $('#mobile-overlay').classList.remove('visible');
    });
  });

  document.querySelectorAll('[data-add]').forEach((button) => {
    button.addEventListener('click', () => openDialog(button.dataset.add));
  });

  document.querySelectorAll('[data-edit]').forEach((button) => {
    button.addEventListener('click', () => {
      const collection = button.dataset.edit;
      const item = (state.data[collection] || []).find((entry) => entry.id === button.dataset.id);
      if (item) openDialog(collection, item);
    });
  });

  document.querySelectorAll('[data-delete]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!confirm('Delete this item? This cannot be undone.')) return;
      try {
        await request(`/api/${button.dataset.delete}/${button.dataset.id}`, { method: 'DELETE' });
        toast('Entry deleted');
        await refresh();
      } catch (error) {
        toast(error.message, true);
      }
    });
  });

  document.querySelectorAll('[data-favorite]').forEach((button) => {
    button.addEventListener('click', async () => {
      const collection = button.dataset.favorite;
      const item = (state.data[collection] || []).find((entry) => entry.id === button.dataset.id);
      if (!item) return;
      try {
        await request(`/api/${collection}/${item.id}`, {
          method: 'PUT',
          body: JSON.stringify({ favorite: !item.favorite, pinned: item.pinned })
        });
        await refresh();
      } catch (error) {
        toast(error.message, true);
      }
    });
  });

  document.querySelectorAll('[data-form-open]').forEach((button) => {
    button.addEventListener('click', () => openPublicForm(button.dataset.formOpen));
  });

  document.querySelectorAll('[data-submissions]').forEach((button) => {
    button.addEventListener('click', () => {
      state.formId = button.dataset.submissions;
      render();
    });
  });

  const profileForm = $('#profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await request('/api/profile', {
          method: 'PUT',
          body: JSON.stringify(Object.fromEntries(new FormData(profileForm)))
        });
        toast('Profile saved');
        await refresh();
      } catch (error) {
        toast(error.message, true);
      }
    });
  }

  const settingsForm = $('#settings-form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const values = Object.fromEntries(new FormData(settingsForm));
        await request('/api/settings', { method: 'PUT', body: JSON.stringify(values) });
        applyTheme(values.theme, values.accent);
        toast('Preferences saved');
        await refresh();
      } catch (error) {
        toast(error.message, true);
      }
    });
  }

  const filterSelect = $('#filter-select');
  if (filterSelect) {
    filterSelect.addEventListener('change', () => {
      state.filter = filterSelect.value;
      render();
    });
  }
}

$('#entry-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const collection = state.editing?.collection || state.page;
  const config = CONFIG[collection];
  if (!config) return;

  const formData = new FormData(event.currentTarget);
  const payload = {};
  formData.forEach((value, key) => {
    payload[key] = value;
  });
  $('#dialog-fields').querySelectorAll('input[type=checkbox]').forEach((input) => {
    payload[input.name] = input.checked;
  });

  if (payload.tags) payload.tags = String(payload.tags).split(',').map((tag) => tag.trim()).filter(Boolean);
  if (payload.technology) payload.technology = String(payload.technology).split(',').map((item) => item.trim()).filter(Boolean);
  if (payload.fieldLabels) {
    payload.fields = String(payload.fieldLabels).split('\n').map((label) => label.trim()).filter(Boolean).map((label) => ({ label, type: 'text', required: false }));
    delete payload.fieldLabels;
  }
  if (payload.rating) payload.rating = Number(payload.rating);

  try {
    const edit = state.editing;
    const endpoint = edit ? `/api/${collection}/${edit.id}` : `/api/${collection}`;
    await request(endpoint, {
      method: edit ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
    $('#entry-dialog').close();
    state.editing = null;
    toast(edit ? 'Changes saved' : 'Added to your universe');
    await refresh();
  } catch (error) {
    toast(error.message, true);
  }
});

$('#global-add').addEventListener('click', () => {
  const collection = CONFIG[state.page] ? state.page : 'websites';
  openDialog(collection);
});

$('#search').addEventListener('input', (event) => {
  state.query = event.target.value;
  render();
});

$('#theme-toggle').addEventListener('click', async () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next, state.data?.settings?.accent || '#7b69ff');
  try { await request('/api/settings', { method: 'PUT', body: JSON.stringify({ theme: next }) }); } catch {}
});

$('#menu-toggle').addEventListener('click', () => {
  $('#sidebar').classList.toggle('open');
  $('#mobile-overlay').classList.toggle('visible');
});
$('#mobile-overlay').addEventListener('click', () => {
  $('#sidebar').classList.remove('open');
  $('#mobile-overlay').classList.remove('visible');
});

$('#entry-dialog').addEventListener('close', () => {
  state.editing = null;
  $('#dialog-save').textContent = 'Save entry ↗';
  $('#dialog-save').onclick = null;
});

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    $('#search').focus();
  }
  if (event.key === 'Escape') {
    $('#entry-dialog').close();
    state.editing = null;
  }
});

(async function init() {
  try {
    state.data = await request('/api/data');
    const settings = state.data.settings || {};
    applyTheme(localStorage.getItem('gx-theme') || settings.theme || 'dark', settings.accent || '#7b69ff');
    render();
    setInterval(updateClock, 30000);
  } catch (error) {
    $('#page').innerHTML = `<div class="empty-state"><h3>Generation X is starting up</h3><p>${escapeHtml(error.message)}</p><button class="button-secondary" onclick="location.reload()">Refresh</button></div>`;
  }
})();
