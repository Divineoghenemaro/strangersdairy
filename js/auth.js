/* auth.js — protects admin pages with Supabase Auth */

const ADMIN_LOGIN_PAGE = 'admin-login.html';

async function requireAdminAuth() {
  const user = await getCurrentUser();
  if (!user) {
    const next = location.pathname.split('/').pop() + location.search;
    location.replace(`${ADMIN_LOGIN_PAGE}?next=${encodeURIComponent(next)}`);
    return null;
  }
  return user;
}

function getSafeNextPage() {
  const next = new URLSearchParams(location.search).get('next');
  if (!next || next.includes('://') || next.startsWith('//')) return 'evermorec.html';
  const allowed = ['evermorec.html', 'evermorenp.html', 'evermorep.html'];
  const path = next.split('?')[0];
  return allowed.includes(path) ? next : 'evermorec.html';
}

async function initAdminAuth() {
  const user = await requireAdminAuth();
  if (!user) return;

  document.querySelectorAll('[data-auth-email]').forEach(el => {
    el.textContent = user.email || 'Signed in';
  });

  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await signOut();
        location.replace(ADMIN_LOGIN_PAGE);
      } catch (err) {
        console.error('Sign out failed:', err);
        btn.disabled = false;
        alert('Could not sign out. Please try again.');
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', initAdminAuth);
