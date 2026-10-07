/* evermorep.js — renders one entry for the admin side */

async function renderAdminPost() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const container = document.getElementById('post-container');

  if (!container) return;

  const post = id ? await getPostById(id) : null;

  if (!post) {
    container.innerHTML = `
      <div class="not-found">
        <h1>Entry not found</h1>
        <p>This entry may have been deleted, or the link is off. <a href="evermorec.html" style="color: var(--pine); border-bottom: 1px solid var(--pine);">Back to all entries.</a></p>
      </div>
    `;
    document.title = 'Entry not found';
    return;
  }

  document.title = post.title;

  const body = Array.isArray(post.body) ? post.body : [String(post.body || '')];

  container.innerHTML = `
    <div class="post-actions">
      <a href="newpost.html?id=${encodeURIComponent(post.id)}">Edit entry</a>
      <button type="button" id="delete-btn" class="danger">Delete entry</button>
      <a href="evermorec.html">All entries</a>
    </div>
    <header class="post-header">
      <div class="post-meta">
        ${formatDate(post.date)} &nbsp;·&nbsp;
        <a href="evermorec.html?tag=${encodeURIComponent(post.category)}">${escapeHtml(post.category)}</a>
      </div>
      <h1>${escapeHtml(post.title)}</h1>
    </header>
    ${post.image ? `<div class="post-image"><img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title)}"></div>` : ''}
    <div class="post-body">
      ${body.map(p => `<p>${escapeHtml(p)}</p>`).join('')}
    </div>
  `;

  document.getElementById('delete-btn').addEventListener('click', async () => {
    if (!confirm('Delete “' + post.title + '”? This can\'t be undone.')) return;

    try {
      await deletePost(post.id);
      location.href = 'evermorec.html';
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Could not delete this entry. Please try again.');
    }
  });
}

document.addEventListener('DOMContentLoaded', renderAdminPost);
