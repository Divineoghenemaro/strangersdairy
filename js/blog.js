/* blog.js — tag index + filtered post ledger */

async function renderBlogPage() {
  const params = new URLSearchParams(location.search);
  const activeTag = params.get('tag');
  const tagLinks = document.getElementById('tag-links');
  const ledger = document.getElementById('ledger');
  const heading = document.getElementById('blog-heading');
  const sub = document.getElementById('blog-sub');

  const categories = await getCategories();

  tagLinks.innerHTML = categories.map(cat => `
    <a class="tag-link${activeTag && activeTag.toLowerCase() === cat.toLowerCase() ? ' is-active' : ''}"
       href="blog.html?tag=${encodeURIComponent(cat)}">${escapeHtml(cat)}</a>
  `).join('');

  const posts = activeTag ? await getPostsByCategory(activeTag) : await getAllPosts();

  if (activeTag) {
    heading.textContent = activeTag;
    sub.textContent = posts.length + (posts.length === 1 ? ' entry filed here.' : ' entries filed here.');
    document.title = activeTag;
  } else {
    heading.textContent = 'Blog';
    sub.textContent = "Every entry, grouped by what it's about.";
    document.title = 'Blog';
  }

  if (posts.length === 0) {
    ledger.innerHTML = '<li class="ledger-empty">No entries in this category yet.</li>';
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

document.addEventListener('DOMContentLoaded', renderBlogPage);
