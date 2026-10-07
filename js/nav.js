/* nav.js — active link state + live search, shared across all pages */

function initNav() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    if (href.split('?')[0] === path) link.classList.add('is-current');
  });

  const toggle = document.getElementById('search-toggle');
  const wrap = document.getElementById('search-wrap');
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');

  if (!toggle || !wrap || !input || !results) return;

  toggle.addEventListener('click', () => {
    const isOpen = wrap.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) input.focus();
    else {
      input.value = '';
      results.innerHTML = '';
      results.classList.remove('is-open');
    }
  });

  input.addEventListener('input', async () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      results.innerHTML = '';
      results.classList.remove('is-open');
      return;
    }
    const posts = await getAllPosts();
    const matches = posts.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.excerpt.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.body.join(' ').toLowerCase().includes(q)
    ).slice(0, 6);

    const isAdmin = location.pathname.split('/').pop().startsWith('evermore');
    const postPage = isAdmin ? 'evermorep.html' : 'post.html';

    if (matches.length === 0) {
      results.innerHTML = '<p class="search-empty">No entries match “' + escapeHtml(input.value.trim()) + '”.</p>';
    } else {
      results.innerHTML = matches.map(p => `
        <a class="search-result" href="${postPage}?id=${encodeURIComponent(p.id)}">
          <span class="search-result-title">${escapeHtml(p.title)}</span>
          <span class="search-result-meta">${formatDateShort(p.date)} · ${escapeHtml(p.category)}</span>
        </a>
      `).join('');
    }
    results.classList.add('is-open');
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target) && !toggle.contains(e.target)) {
      wrap.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      input.value = '';
      results.innerHTML = '';
      results.classList.remove('is-open');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && wrap.classList.contains('is-open')) {
      toggle.click();
    }
  });
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

document.addEventListener('DOMContentLoaded', initNav);

