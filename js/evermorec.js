/* evermorec.js — tag index + filtered post ledger (admin side) */

async function renderCategoryPage() {
  const params = new URLSearchParams(location.search);
  const activeTag = params.get('tag');
  const tagLinks = document.getElementById('tag-links');
  const ledger = document.getElementById('ledger');
  const heading = document.getElementById('category-heading');
  const sub = document.getElementById('category-sub');

  const categories = await getCategories(); 
  
  tagLinks.innerHTML = categories.map(cat => `
    <a class="tag-link${activeTag && activeTag.toLowerCase() === cat.toLowerCase() ? ' is-active' : ''}"
       href="evermorec.html?tag=${encodeURIComponent(cat)}">${escapeHtml(cat)}</a>
  `).join('');

  const posts = activeTag ? await getPostsByCategory(activeTag) : await getAllPosts();

  if (activeTag) {
    heading.textContent = activeTag;
    sub.textContent = posts.length + (posts.length === 1 ? ' entry filed here.' : ' entries filed here.');
    document.title = activeTag;
  } else {
    heading.textContent = 'Categories';
    sub.textContent = "Every entry, grouped by what it's about.";
    document.title = 'Categories';
  }

  if (posts.length === 0) {
    ledger.innerHTML = '<li class="ledger-empty">No entries in this category yet.</li>';
    return;
  }

    ledger.innerHTML = posts.map(post => `
    <li class="ledger-item">
      <div class="ledger-image"><img src="${post.image}" alt="${post.title}"/></div>
      <div class="ledger-inner">
      <div class="ledger-date">${formatDateShort(post.date)}</div>
      <div>
        <h2 class="ledger-title"><a href="evermorep.html?id=${encodeURIComponent(post.id)}">${escapeHtml(post.title)}</a></h2>
        <a class="ledger-category" href="evermorec.html?tag=${encodeURIComponent(post.category)}">${escapeHtml(post.category)}</a>
        <p class="ledger-excerpt">${escapeHtml(post.excerpt)}</p>
      </div>
      </div>
    </li>
  `).join('');
}

document.addEventListener('DOMContentLoaded', renderCategoryPage);
