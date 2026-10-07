/* mydiary.js — the visitor's own Archive: their posts, recovery key and Restore Archive */

function diaryNote(message, isError) {
  const note = document.getElementById('diary-note');
  note.textContent = message || '';
  note.classList.toggle('is-error', !!isError);
}

async function renderMydiary() {
  const params = new URLSearchParams(location.search);
  const activeTag = params.get('tag');
  const tagLinks = document.getElementById('tag-links');
  const ledger = document.getElementById('ledger');
  const heading = document.getElementById('diary-heading');
  const sub = document.getElementById('diary-sub');

  let posts;
  try {
    posts = await SDIdentity.getMyPosts();
  } catch (err) {
    console.error('Archive could not be loaded:', err);
    tagLinks.innerHTML = '';
    ledger.innerHTML = '<li class="ledger-empty">Your archive could not be loaded right now. Please try again in a moment.</li>';
    return;
  }

  if (SDIdentity.consumeReset()) {
    diaryNote('This device\'s saved identity was not recognised, so a fresh archive was started. Use Restore archive with your recovery key to bring your earlier posts back.', true);
  }

  const categories = [...new Set(posts.map(p => p.category))].sort((a, b) => a.localeCompare(b));

  tagLinks.innerHTML = categories.map(cat => `
    <a class="tag-link${activeTag && activeTag.toLowerCase() === cat.toLowerCase() ? ' is-active' : ''}"
       href="mydiary.html?tag=${encodeURIComponent(cat)}">${escapeHtml(cat)}</a>
  `).join('');

  const shown = activeTag ? posts.filter(p => p.category.toLowerCase() === activeTag.toLowerCase()) : posts;

  if (activeTag) {
    heading.textContent = activeTag;
    sub.textContent = shown.length + (shown.length === 1 ? ' entry filed here.' : ' entries filed here.');
    document.title = activeTag;
  } else {
    heading.textContent = 'My diary';
    sub.textContent = "Every post you have shared, grouped by what it's about.";
    document.title = 'My diary';
  }

  if (shown.length === 0) {
    ledger.innerHTML = activeTag
      ? '<li class="ledger-empty">None of your entries are filed here.</li>'
      : '<li class="ledger-empty">You have not posted yet. <a href="newpost.html" style="color: var(--pine); border-bottom: 1px solid var(--pine);">Write your first one.</a></li>';
    return;
  }

  ledger.innerHTML = shown.map(post => `
    <li class="ledger-item">
      <div class="ledger-image"><img src="${escapeHtml(post.image || '')}" alt="${escapeHtml(post.title)}"/></div>
      <div class="ledger-inner">
      <div class="ledger-date">${formatDateShort(post.date)}</div>
      <div>
        <h2 class="ledger-title"><a href="post.html?id=${encodeURIComponent(post.id)}">${escapeHtml(post.title)}</a></h2>
        <a class="ledger-category" href="mydiary.html?tag=${encodeURIComponent(post.category)}">${escapeHtml(post.category)}</a>
        <p class="ledger-excerpt">${escapeHtml(post.excerpt)}</p>
      </div>
      </div>
    </li>
  `).join('');
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(area);
  if (!ok) throw new Error('copy_failed');
}

function initdiaryTools() {
  const copyBtn = document.getElementById('copy-key-btn');
  const saveBtn = document.getElementById('save-key-btn');
  const newKeyBtn = document.getElementById('new-key-btn');
  const toggle = document.getElementById('restore-toggle');
  const form = document.getElementById('restore-form');
  const input = document.getElementById('restore-key');
  const error = document.getElementById('restore-error');
  const restoreBtn = document.getElementById('restore-btn');
  const cancelBtn = document.getElementById('restore-cancel');

  copyBtn.addEventListener('click', async () => {
    try {
      const key = await SDIdentity.getRecoveryKey();
      await copyText(key);
      diaryNote('Recovery key copied. Keep it somewhere safe, anyone who has it can open your archive.');
    } catch (err) {
      console.error('Copy failed:', err);
      diaryNote('Could not copy the key. Try Save as file instead.', true);
    }
  });

  saveBtn.addEventListener('click', async () => {
    try {
      const key = await SDIdentity.getRecoveryKey();
      const text = 'Strangersdiary recovery key\n\n' + key +
        '\n\nKeep this somewhere safe. Anyone who has this key can open your archive and add to it.\n' +
        'To use it on another device, open My diary and choose Restore archive.\n';
      const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'strangersdiary_recovery_key.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      diaryNote('Recovery key saved to a file. Keep it somewhere safe.');
    } catch (err) {
      console.error('Save failed:', err);
      diaryNote('Could not save the key. Try Copy recovery key instead.', true);
    }
  });

  newKeyBtn.addEventListener('click', async () => {
    if (!confirm('Create a new recovery key? Your current key will stop working, so save the new one.')) return;
    try {
      const key = await SDIdentity.rotateRecoveryKey();
      await copyText(key).catch(() => {});
      diaryNote('New recovery key created and copied. Your old key no longer works. Use Save as file to keep it.');
    } catch (err) {
      console.error('Rotate failed:', err);
      diaryNote('Could not create a new key. Please try again.', true);
    }
  });

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    form.hidden = !form.hidden;
    if (!form.hidden) input.focus();
  });

  cancelBtn.addEventListener('click', () => {
    form.hidden = true;
    input.value = '';
    error.classList.remove('is-visible');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.classList.remove('is-visible');
    restoreBtn.disabled = true;
    restoreBtn.textContent = 'Restoring...';
    try {
      await SDIdentity.restore(input.value);
      form.hidden = true;
      input.value = '';
      diaryNote('Archive restored. New posts from this device will join it.');
      await renderMydiary();
    } catch (err) {
      const message = String(err && err.message || '');
      error.textContent = /invalid_recovery_key/.test(message)
        ? 'That recovery key was not recognised. Check it and try again.'
        : 'Could not restore right now. Please check your connection and try again.';
      error.classList.add('is-visible');
    } finally {
      restoreBtn.disabled = false;
      restoreBtn.textContent = 'Restore archive';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initdiaryTools();
  renderMydiary();
});
