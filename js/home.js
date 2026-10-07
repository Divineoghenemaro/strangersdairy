/* home.js — renders the ledger of all posts on the homepage */

async function renderLedger() {
  const posts = await getAllPosts();
  const ledger = document.getElementById('ledger');

  if (posts.length === 0) {
    ledger.innerHTML = '<li class="ledger-empty">No entries yet. <a href="newpost.html" style="color: var(--pine); border-bottom: 1px solid var(--pine);">Write the first one.</a></li>';
    return;
  }

  ledger.innerHTML = posts.map(post => `
    <li class="ledger-item">
      <div class="ledger-image"><img src="${escapeHtml(post.image || '')}" alt="${escapeHtml(post.title)}"/></div>
      <div class="ledger-inner">
      <div class="ledger-date">${formatDateShort(post.date)}</div>
      <div>
        <h2 class="ledger-title"><a href="post.html?id=${encodeURIComponent(post.id)}">${escapeHtml(post.title)}</a></h2>
        <a class="ledger-category" href="blog.html?tag=${encodeURIComponent(post.category)}">${escapeHtml(post.category)}</a>
        <p class="ledger-excerpt">${escapeHtml(post.excerpt)}</p>
      </div>
      </div>
    </li>
  `).join('');
}

document.addEventListener('DOMContentLoaded', renderLedger);
