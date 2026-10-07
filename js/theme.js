/* theme.js — light/dark toggle. Loaded in <head> so the saved choice applies before first paint.
   The site stays light until the visitor picks dark. */

(function () {
  var KEY = 'sd_theme';
  var root = document.documentElement;

  function saved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  var initial = saved();
  if (initial === 'dark' || initial === 'light') root.setAttribute('data-theme', initial);

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;

    function sync() {
      var dark = root.getAttribute('data-theme') === 'dark';
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    }

    sync();

    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(KEY, next); } catch (e) { /* storage blocked: choice lasts for this page only */ }
      sync();
    });
  });
})();
