/* newpost.js — create or edit an entry */

function readAndResizeImage(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function initEntryForm() {
  const params = new URLSearchParams(location.search);
  const editId = params.get('id');
  const existing = editId ? await getPostById(editId) : null;

  const form = document.getElementById('entry-form');
  const heading = document.getElementById('form-heading');
  const titleInput = document.getElementById('title');
  const categoryInput = document.getElementById('category');
  const dateInput = document.getElementById('date');
  const excerptInput = document.getElementById('excerpt');
  const bodyInput = document.getElementById('body');
  const imageInput = document.getElementById('image');
  const imageDataInput = document.getElementById('image-data');
  const imagePreview = document.getElementById('image-preview');
  const removeImageBtn = document.getElementById('remove-image-btn');
  const errorMsg = document.getElementById('form-error');
  const categoryOptions = document.getElementById('category-options');
  const cancelBtn = document.getElementById('cancel-btn');
  const saveBtn = document.getElementById('save-btn');

  const categories = await getCategories();
  categoryOptions.innerHTML = categories.map(cat => `<option value="${escapeHtml(cat)}">`).join('');

  if (existing) {
    heading.textContent = 'Edit entry';
    document.title = 'Edit entry';
    saveBtn.textContent = 'Save changes';
    titleInput.value = existing.title;
    categoryInput.value = existing.category;
    dateInput.value = existing.date;
    excerptInput.value = existing.excerpt;
    bodyInput.value = (Array.isArray(existing.body) ? existing.body : [String(existing.body || '')]).join('\n\n');

    if (existing.image) {
      imageDataInput.value = existing.image;
      imagePreview.src = existing.image;
      imagePreview.style.display = 'block';
      removeImageBtn.style.display = 'inline';
      imageInput.required = false;
    }
  } else {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }

  imageInput.addEventListener('change', async () => {
    const file = imageInput.files[0];
    if (!file) return;
    const dataUrl = await readAndResizeImage(file, 900, 0.75);
    imageDataInput.value = dataUrl;
    imagePreview.src = dataUrl;
    imagePreview.style.display = 'block';
    removeImageBtn.style.display = 'inline';
  });

  removeImageBtn.addEventListener('click', () => {
    imageDataInput.value = '';
    imagePreview.src = '';
    imagePreview.style.display = 'none';
    removeImageBtn.style.display = 'none';
    imageInput.value = '';
    imageInput.required = true;
  });

  cancelBtn.addEventListener('click', () => {
    location.href = existing ? 'evermorep.html?id=' + encodeURIComponent(existing.id) : 'index.html';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = titleInput.value.trim();
    const category = categoryInput.value.trim();
    const date = dateInput.value;
    const excerpt = excerptInput.value.trim();
    const bodyRaw = bodyInput.value.trim();

    if (!title || !category || !date || !excerpt || !bodyRaw) {
      errorMsg.classList.add('is-visible');
      return;
    }
    errorMsg.classList.remove('is-visible');

    const body = bodyRaw.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const image = imageDataInput.value || null;

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      let saved;
      if (existing) {
        saved = await updatePost(existing.id, { title, category, date, excerpt, body, image });
      } else {
        saved = await addPost({ title, category, date, excerpt, body, image });
      }
      location.href = 'post.html?id=' + encodeURIComponent(saved.id);
    } catch (err) {
      errorMsg.textContent = 'DEBUG: ' + (err.message || JSON.stringify(err));
      errorMsg.classList.add('is-visible');
      saveBtn.disabled = false;
      saveBtn.textContent = existing ? 'Save changes' : 'Save entry';
    }
  });
}

document.addEventListener('DOMContentLoaded', initEntryForm);
