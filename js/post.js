/* post.js — renders a single public entry based on ?id= in the URL */

async function renderPost() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const container = document.getElementById('post-container');

  if (!container) return;

  const post = id ? await getPostById(id) : null;

  if (!post) {
    container.innerHTML = `
      <div class="not-found">
        <h1>Entry not found</h1>
        <p>This entry may have been deleted, or the link is off. <a href="index.html" style="color: var(--pine); border-bottom: 1px solid var(--pine);">Back to all entries.</a></p>
      </div>
    `;
    document.title = 'Entry not found';
    return;
  }

  document.title = post.title;
  const body = Array.isArray(post.body) ? post.body : [String(post.body || '')];

  container.innerHTML = `
    <header class="post-header">
      <div class="post-meta">
        ${formatDate(post.date)} &nbsp;·&nbsp;
        <a href="blog.html?tag=${encodeURIComponent(post.category)}">${escapeHtml(post.category)}</a>
      </div>
      <h1>${escapeHtml(post.title)}</h1>
    </header>
    ${post.image ? `<div class="post-image"><img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title)}"></div>` : ''}
    <div class="post-body">
      ${body.map(p => `<p>${escapeHtml(p)}</p>`).join('')}
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', renderPost);
