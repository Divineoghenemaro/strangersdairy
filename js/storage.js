/* storage.js — Supabase-backed data layer for Strangersdiary */
/* Guarded so it's safe even if this file ever gets loaded/run more than once on a page */

if (!window.__strangersdiaryStorageLoaded) {
  window.__strangersdiaryStorageLoaded = true;

  var SUPABASE_URL = 'https://mpvnhwixmjxoxrosfxdq.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wdm5od2l4bWp4b3hyb3NmeGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MzE3MzksImV4cCI6MjEwNDAwNzczOX0.i7m_U_HY8lp21-GG4au_6aXovmQ4NmeORgFUALfkH6I';

  var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  window.getCurrentUser = async function getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user || null;
  };

  window.signIn = async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  };

  window.signOut = async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  window.getAllPosts = async function getAllPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('getAllPosts:', error); return []; }
    return data;
  };

  window.getPostById = async function getPostById(id) {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) { console.error('getPostById:', error); return null; }
    return data;
  };

  window.getPostsByCategory = async function getPostsByCategory(category) {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .ilike('category', category)
      .order('date', { ascending: false });
    if (error) { console.error('getPostsByCategory:', error); return []; }
    return data;
  };

  window.getCategories = async function getCategories() {
    const { data, error } = await supabase.from('posts').select('category');
    if (error) { console.error('getCategories:', error); return []; }
    const set = new Set(data.map(p => p.category));
    return [...set].sort((a, b) => a.localeCompare(b));
  };

  // Public posting: the post is saved through a database function that checks the
  // visitor's anonymous identity (js/identity.js) and links the post to their Archive.
  window.addPost = async function addPost(post) {
    const id = await window.SDIdentity.createPost({
      title: post.title.trim(),
      category: post.category.trim(),
      date: post.date || new Date().toISOString().slice(0, 10),
      excerpt: post.excerpt.trim(),
      body: post.body,
      image: post.image || null
    });
    return { id: id, title: post.title.trim() };
  };

  window.updatePost = async function updatePost(id, updates) {
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) { console.error('updatePost:', error); throw error; }
    return data;
  };

  window.deletePost = async function deletePost(id) {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) { console.error('deletePost:', error); throw error; }
  };

  window.formatDate = function formatDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  window.formatDateShort = function formatDateShort(iso) {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  window.escapeHtml = function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
      }
