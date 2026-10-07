/* identity.js — accountless anonymous identity, Archive access and cross-device recovery.

   - On first visit the browser generates a random access token and a recovery key.
   - Supabase stores only SHA-256 hashes of them (see the anonymous_identity migration).
   - Every Archive read and every public post goes through database functions that check
     the token, so changing localStorage values cannot open someone else's Archive.
   - No email, password, username, tracking or device fingerprinting is involved.

   Requires js/storage.js to have run first (it creates the Supabase client). */

(function () {
  'use strict';

  var K_ID = 'sd_anon_id';
  var K_TOKEN = 'sd_anon_token';
  var K_RECOVERY = 'sd_recovery_key';

  // Crockford base32: no I, L, O or U, so keys are easy to read out and retype.
  var ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  var KEY_LENGTH = 30; // 30 x 5 bits = 150 bits of randomness

  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var TOKEN_RE = /^[A-Za-z0-9_-]{32,128}$/;
  var KEY_RE = /^[0-9A-HJKMNP-TV-Z]{30}$/;

  var memoryIdentity = null; // only used if the browser blocks localStorage
  var pending = null;        // single in-flight "get or create identity" promise
  var wasReset = false;      // true when a stored identity was rejected and replaced

  /* ---------- random material ---------- */

  function randomBytes(n) {
    var a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return a;
  }

  function makeToken() {
    var b = randomBytes(32), s = '';
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); // 43 chars
  }

  function makeRecoveryKey() {
    var b = randomBytes(KEY_LENGTH), out = '';
    for (var i = 0; i < b.length; i++) out += ALPHABET.charAt(b[i] & 31); // 256 is divisible by 32: no bias
    return out;
  }

  function normalizeKey(input) {
    return String(input || '').toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  }

  function formatKey(key) {
    return key.match(/.{1,5}/g).join(' ');
  }

  /* ---------- local storage ---------- */

  function readLocal() {
    try {
      var id = localStorage.getItem(K_ID);
      var token = localStorage.getItem(K_TOKEN);
      var key = localStorage.getItem(K_RECOVERY);
      if (id && token && key && UUID_RE.test(id) && TOKEN_RE.test(token) && KEY_RE.test(key)) {
        return { id: id, token: token, recoveryKey: key };
      }
      return null;
    } catch (e) {
      return memoryIdentity;
    }
  }

  function writeLocal(ident) {
    try {
      localStorage.setItem(K_ID, ident.id);
      localStorage.setItem(K_TOKEN, ident.token);
      localStorage.setItem(K_RECOVERY, ident.recoveryKey);
    } catch (e) {
      memoryIdentity = ident;
    }
  }

  function clearLocal() {
    memoryIdentity = null;
    try {
      localStorage.removeItem(K_ID);
      localStorage.removeItem(K_TOKEN);
      localStorage.removeItem(K_RECOVERY);
    } catch (e) { /* nothing to clear */ }
  }

  /* ---------- identity lifecycle ---------- */

  function db() { return window.supabase; }

  // Stops two tabs opened at the same moment from each creating an identity.
  function withLock(fn) {
    if (typeof navigator !== 'undefined' && navigator.locks && navigator.locks.request) {
      return navigator.locks.request('sd_identity_init', fn);
    }
    return fn();
  }

  async function register() {
    var token = makeToken();
    var key = makeRecoveryKey();
    var res = await db().rpc('register_anonymous_identity', { p_token: token, p_recovery_key: key });
    if (res.error) throw res.error;
    var ident = { id: res.data, token: token, recoveryKey: key };
    writeLocal(ident);
    return ident;
  }

  function ensure() {
    if (!pending) {
      pending = withLock(function () {
        var local = readLocal();
        return local ? local : register();
      });
      pending.catch(function () { pending = null; }); // allow a retry after a network failure
    }
    return pending;
  }

  function isStaleIdentityError(err) {
    return !!err && /invalid_identity/.test(String(err.message || ''));
  }

  // Calls a database function with the current identity. If the server does not recognise the
  // stored identity (database reset, edited storage), start a fresh one once and retry.
  async function call(fn, args) {
    var res;
    for (var attempt = 0; attempt < 2; attempt++) {
      var ident = await ensure();
      res = await db().rpc(fn, Object.assign({ p_id: ident.id, p_token: ident.token }, args || {}));
      if (!res.error || !isStaleIdentityError(res.error)) return res;
      clearLocal();
      pending = null;
      wasReset = true;
    }
    return res;
  }

  /* ---------- public API ---------- */

  async function getMyPosts() {
    var res = await call('get_my_posts');
    if (res.error) throw res.error;
    return res.data || [];
  }

  async function createPost(post) {
    var res = await call('create_anonymous_post', {
      p_title: post.title,
      p_category: post.category,
      p_date: post.date,
      p_excerpt: post.excerpt,
      p_body: post.body,
      p_image: post.image || null
    });
    if (res.error) throw res.error;
    return res.data; // id of the new post
  }

  async function getRecoveryKey() {
    var ident = await ensure();
    return formatKey(ident.recoveryKey);
  }

  async function restore(input) {
    var key = normalizeKey(input);
    if (!KEY_RE.test(key)) {
      var bad = new Error('invalid_recovery_key');
      bad.code = 'invalid_recovery_key';
      throw bad;
    }
    var newToken = makeToken();
    var old = readLocal();
    var res = await db().rpc('restore_anonymous_identity', {
      p_recovery_key: key,
      p_new_token: newToken,
      p_old_id: old ? old.id : null,
      p_old_token: old ? old.token : null
    });
    if (res.error) throw res.error;
    var ident = { id: res.data, token: newToken, recoveryKey: key };
    writeLocal(ident);
    pending = Promise.resolve(ident);
    wasReset = false;
    return ident;
  }

  async function rotateRecoveryKey() {
    var key = makeRecoveryKey();
    var res = await call('rotate_recovery_key', { p_new_recovery_key: key });
    if (res.error) throw res.error;
    var ident = await ensure();
    ident = { id: ident.id, token: ident.token, recoveryKey: key };
    writeLocal(ident);
    pending = Promise.resolve(ident);
    return formatKey(key);
  }

  function consumeReset() {
    var v = wasReset;
    wasReset = false;
    return v;
  }

  window.SDIdentity = {
    ensure: ensure,
    getMyPosts: getMyPosts,
    createPost: createPost,
    getRecoveryKey: getRecoveryKey,
    restore: restore,
    rotateRecoveryKey: rotateRecoveryKey,
    consumeReset: consumeReset
  };

  // First visit: create the identity quietly in the background. Failures are retried on first use.
  ensure().catch(function (err) { console.warn('Anonymous identity not ready yet:', err && err.message); });
})();
