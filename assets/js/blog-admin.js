// Blog Admin JS
const API_URL = '../php/blog-api.php';
let currentBlogId = null;
let selectedImage = null;
let isSourceMode = false;

document.addEventListener('DOMContentLoaded', () => {
  checkLogin();
  setupEditor();
  setupEvents();
  setupImageResizing();
});

function checkLogin() {
  const pwd = sessionStorage.getItem('blogAdminPassword');
  if (pwd) {
    verifyPassword(pwd, true);
  }
}

document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const pwd = document.getElementById('adminPassword').value;
  verifyPassword(pwd);
});

async function verifyPassword(pwd, silent = false) {
  try {
    const res = await fetch(`${API_URL}?action=verify-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd })
    });

    if (!res.ok) throw new Error('Request failed');
    const data = await res.json();

    if (!data.valid) {
      // Wrong password — never store it, never open the admin panel.
      sessionStorage.removeItem('blogAdminPassword');
      if (!silent) {
        document.getElementById('loginError').classList.remove('hidden');
      }
      return;
    }

    sessionStorage.setItem('blogAdminPassword', pwd);
    document.getElementById('loginError').classList.add('hidden');
    document.getElementById('loginScreen').style.opacity = '0';
    setTimeout(() => {
      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('adminApp').classList.remove('hidden');
      loadBlogList();
    }, 300);
  } catch (err) {
    sessionStorage.removeItem('blogAdminPassword');
    if (!silent) {
      document.getElementById('loginError').classList.remove('hidden');
    }
  }
}

function getAuthHeaders() {
  return {
    'X-Admin-Password': sessionStorage.getItem('blogAdminPassword') || ''
  };
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const msg = document.getElementById('toastMessage');
  const icon = document.getElementById('toastIcon');
  
  msg.textContent = message;
  toast.className = `fixed top-5 right-5 transform transition-transform duration-300 text-white px-4 py-3 rounded shadow-lg z-50 flex items-center gap-3 ${type === 'error' ? 'bg-red-600' : 'bg-gray-800'}`;
  
  icon.className = type === 'error' ? 'fas fa-exclamation-circle text-white' : 'fas fa-check-circle text-green-400';
  
  toast.classList.remove('translate-x-full');
  
  setTimeout(() => {
    toast.classList.add('translate-x-full');
  }, 3000);
}

// --- API Calls ---

async function loadBlogList() {
  const container = document.getElementById('blogListContainer');
  try {
    const res = await fetch(`${API_URL}?action=list`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch blogs');
    const blogs = await res.json();
    
    container.innerHTML = '';
    if (blogs.length === 0) {
      container.innerHTML = '<div class="p-4 text-center text-gray-500 text-sm">No blogs found.</div>';
      return;
    }
    
    blogs.forEach(blog => {
      const rawDate = blog.createdAt || Date.now() / 1000;
      const date = new Date(rawDate < 20000000000 ? rawDate * 1000 : rawDate).toLocaleDateString();
      const statusClass = blog.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
      const statusText = blog.status === 'published' ? 'Published' : 'Draft';
      
      const div = document.createElement('div');
      div.className = `blog-list-item p-3 border-b border-gray-100 cursor-pointer flex flex-col gap-1 ${currentBlogId === blog.id ? 'active' : ''}`;
      div.innerHTML = `
        <div class="flex justify-between items-start">
          <h3 class="font-semibold text-gray-800 truncate pr-2 text-sm">${blog.title || 'Untitled'}</h3>
          <button class="text-gray-400 hover:text-red-500 transition btn-delete" data-id="${blog.id}"><i class="fas fa-trash-alt text-xs"></i></button>
        </div>
        <div class="flex justify-between items-center mt-1">
          <span class="text-xs text-gray-500">${date}</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full font-medium ${statusClass}">${statusText}</span>
        </div>
      `;
      
      div.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-delete')) {
          loadBlog(blog.id);
        }
      });
      
      div.querySelector('.btn-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete "${blog.title}"?`)) {
          deleteBlog(blog.id);
        }
      });
      
      container.appendChild(div);
    });
  } catch (err) {
    container.innerHTML = '<div class="p-4 text-center text-red-500 text-sm">Error loading blogs.</div>';
  }
}

async function loadBlog(id) {
  try {
    const res = await fetch(`${API_URL}?action=get&id=${id}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load blog');
    const blog = await res.json();
    
    currentBlogId = blog.id;
    document.getElementById('blogTitle').value = blog.title || '';
    document.getElementById('blogSlug').value = blog.slug || '';
    document.getElementById('metaTitle').value = blog.metaTitle || '';
    document.getElementById('metaDesc').value = blog.metaDescription || '';
    
    const editor = document.getElementById('editorContent');
    editor.innerHTML = blog.content || '<p><br></p>';
    if (isSourceMode) {
      document.getElementById('editorSource').value = editor.innerHTML;
    }
    
    setFeaturedImagePreview(blog.featuredImage);
    
    const isPublished = blog.status === 'published';
    document.getElementById('blogStatus').checked = isPublished;
    updateStatusLabel();
    updateSeoPreview();
    updateCharCounters();
    
    // Update active class in sidebar
    document.querySelectorAll('.blog-list-item').forEach(el => el.classList.remove('active'));
    setTimeout(loadBlogList, 100);
    
  } catch (err) {
    showToast('Error loading blog', 'error');
  }
}

async function saveBlog(status) {
  const title = document.getElementById('blogTitle').value;
  if (!title.trim()) {
    showToast('Title is required', 'error');
    return;
  }
  
  if (isSourceMode) {
    document.getElementById('editorContent').innerHTML = document.getElementById('editorSource').value;
  }
  
  const payload = {
    id: currentBlogId,
    title: title,
    slug: document.getElementById('blogSlug').value,
    metaTitle: document.getElementById('metaTitle').value,
    metaDescription: document.getElementById('metaDesc').value,
    content: document.getElementById('editorContent').innerHTML,
    featuredImage: document.getElementById('featuredImageUrl').value,
    status: status
  };
  
  try {
    const res = await fetch(`${API_URL}?action=save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      if (res.status === 401) {
        sessionStorage.removeItem('blogAdminPassword');
        showToast('Session expired — please log in again', 'error');
        setTimeout(() => window.location.reload(), 1200);
        return;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to save');
    }
    const result = await res.json();

    if (result.id) {
      currentBlogId = result.id;
    }

    document.getElementById('lastSavedText').classList.remove('hidden');
    document.getElementById('lastSavedText').textContent = `Last saved: ${new Date().toLocaleTimeString()}`;

    showToast(`Blog ${status === 'published' ? 'published' : 'saved as draft'} successfully`);
    loadBlogList();

  } catch (err) {
    showToast(err.message || 'Error saving blog', 'error');
  }
}

async function deleteBlog(id) {
  try {
    const res = await fetch(`${API_URL}?action=delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ id })
    });
    
    if (!res.ok) {
      if (res.status === 401) {
        sessionStorage.removeItem('blogAdminPassword');
        showToast('Session expired — please log in again', 'error');
        setTimeout(() => window.location.reload(), 1200);
        return;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to delete');
    }

    showToast('Blog deleted');
    if (currentBlogId === id) {
      resetForm();
    }
    loadBlogList();
  } catch (err) {
    showToast(err.message || 'Error deleting blog', 'error');
  }
}

function resetForm() {
  currentBlogId = null;
  document.getElementById('editorForm').reset();
  document.getElementById('editorContent').innerHTML = '<p><br></p>';
  document.getElementById('editorSource').value = '<p><br></p>';
  setFeaturedImagePreview('');
  document.getElementById('blogStatus').checked = false;
  updateStatusLabel();
  updateSeoPreview();
  updateCharCounters();
  document.querySelectorAll('.blog-list-item').forEach(el => el.classList.remove('active'));
}

// --- Editor Functions ---

// The editor toolbar sits outside the contenteditable area, so clicking any
// button/select/input inside it makes the browser collapse or move the text
// selection *before* our click handler even runs. That's what caused heading,
// font-size, line-height and spacing changes to silently do nothing. The fix
// is to continuously remember the last real selection made inside the editor,
// and to restore it right before we run any formatting command.
let savedRange = null;

function isSelectionInside(content, sel) {
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  return content.contains(range.commonAncestorContainer);
}

function trackSelection(content) {
  const sel = window.getSelection();
  if (isSelectionInside(content, sel)) {
    savedRange = sel.getRangeAt(0).cloneRange();
  }
}

function restoreSelection(content) {
  content.focus();
  if (savedRange) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }
}

function setupEditor() {
  const content = document.getElementById('editorContent');

  // Keep savedRange up to date while the user is actually working in the editor.
  content.addEventListener('mouseup', () => trackSelection(content));
  content.addEventListener('keyup', () => trackSelection(content));
  content.addEventListener('focus', () => trackSelection(content));

  document.querySelectorAll('.toolbar-btn[data-command]').forEach(btn => {
    // Prevent the browser's default mousedown behaviour (which moves focus off
    // the editor and collapses the current selection) BEFORE it happens.
    btn.addEventListener('mousedown', (e) => e.preventDefault());

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      restoreSelection(content);
      const command = btn.getAttribute('data-command');
      if (command === 'formatBlock') {
        document.execCommand(command, false, btn.getAttribute('data-value'));
      } else if (command === 'removeFormat') {
        document.execCommand(command, false, null);
        const sel = window.getSelection();
        if (!sel.isCollapsed) {
          const range = sel.getRangeAt(0);
          const frag = range.extractContents();
          const div = document.createElement('div');
          div.appendChild(frag);
          div.querySelectorAll('*').forEach(el => el.removeAttribute('style'));
          range.insertNode(div);
        }
      } else {
        document.execCommand(command, false, null);
      }
      trackSelection(content);
      content.focus();
    });
  });

  const formatBlockSelect = document.getElementById('formatBlock');
  formatBlockSelect.addEventListener('mousedown', () => trackSelection(content));
  formatBlockSelect.addEventListener('change', (e) => {
    restoreSelection(content);
    document.execCommand('formatBlock', false, `<${e.target.value.toLowerCase()}>`);
    e.target.value = 'P';
    trackSelection(content);
    content.focus();
  });

  const fontSizeSelect = document.getElementById('fontSize');
  fontSizeSelect.addEventListener('mousedown', () => trackSelection(content));
  fontSizeSelect.addEventListener('change', (e) => {
    const size = e.target.value;
    if (size) {
      restoreSelection(content);
      const selection = window.getSelection();
      if (!selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.style.fontSize = size;
        span.appendChild(range.extractContents());
        range.insertNode(span);
        selection.removeAllRanges();
      } else {
        showToast('Select some text first to change its size', 'error');
      }
    }
    e.target.value = '';
    trackSelection(content);
    content.focus();
  });

  const lineHeightSelect = document.getElementById('lineHeight');
  lineHeightSelect.addEventListener('mousedown', () => trackSelection(content));
  lineHeightSelect.addEventListener('change', (e) => {
    const value = e.target.value;
    if (value) {
      restoreSelection(content);
      let node = savedRange ? savedRange.startContainer : null;
      if (node && node.nodeType === 3) node = node.parentNode;
      while (node && node !== content && !isBlockElement(node)) {
        node = node.parentNode;
      }
      if (node && node !== content) {
        node.style.lineHeight = value;
      } else {
        showToast('Click inside a paragraph or heading first', 'error');
      }
    }
    e.target.value = '';
    trackSelection(content);
    content.focus();
  });

  const foreColorInput = document.getElementById('foreColor');
  foreColorInput.addEventListener('mousedown', () => trackSelection(content));
  foreColorInput.addEventListener('input', (e) => {
    restoreSelection(content);
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, e.target.value);
    trackSelection(content);
  });

  const hiliteColorInput = document.getElementById('hiliteColor');
  hiliteColorInput.addEventListener('mousedown', () => trackSelection(content));
  hiliteColorInput.addEventListener('input', (e) => {
    restoreSelection(content);
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('hiliteColor', false, e.target.value);
    trackSelection(content);
  });

  document.getElementById('btnLink').addEventListener('mousedown', (e) => e.preventDefault());
  document.getElementById('btnLink').addEventListener('click', () => {
    restoreSelection(content);
    const url = prompt('Enter link URL:');
    if (url) {
      document.execCommand('createLink', false, url);
    }
    trackSelection(content);
  });

  document.getElementById('btnImage').addEventListener('mousedown', (e) => e.preventDefault());
  document.getElementById('btnImage').addEventListener('click', () => {
    trackSelection(content);
    document.getElementById('editorImageInput').click();
  });

  document.getElementById('editorImageInput').addEventListener('change', async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('image', file);

      try {
        const res = await fetch(`${API_URL}?action=upload-image`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Image upload failed');
        }
        const data = await res.json();
        if (data.url) {
          restoreSelection(content);
          document.execCommand('insertImage', false, data.url);
        }
      } catch (err) {
        showToast(err.message || 'Image upload failed', 'error');
      }
    }
    e.target.value = '';
  });

  document.getElementById('btnToggleHtml').addEventListener('mousedown', (e) => e.preventDefault());
  document.getElementById('btnToggleHtml').addEventListener('click', () => {
    isSourceMode = !isSourceMode;
    const source = document.getElementById('editorSource');

    if (isSourceMode) {
      source.value = content.innerHTML;
      content.classList.add('hidden');
      source.classList.remove('hidden');
      document.getElementById('btnToggleHtml').classList.add('bg-gray-200');
    } else {
      content.innerHTML = source.value;
      source.classList.add('hidden');
      content.classList.remove('hidden');
      document.getElementById('btnToggleHtml').classList.remove('bg-gray-200');
    }
  });

  const btnSpacing = document.getElementById('btnSpacing');
  const popup = document.getElementById('spacingPopup');

  btnSpacing.addEventListener('mousedown', () => trackSelection(content));
  btnSpacing.addEventListener('click', (e) => {
    e.stopPropagation();
    const rect = btnSpacing.getBoundingClientRect();
    const popupWidth = 264; // matches w-64 (16rem) + padding
    let left = rect.left + window.scrollX;
    // Keep the popup fully on-screen instead of drifting off the right edge,
    // which is what made it look like a stray, unusable box.
    if (left + popupWidth > window.innerWidth - 12) {
      left = window.innerWidth - popupWidth - 12;
    }
    popup.style.top = `${rect.bottom + window.scrollY + 5}px`;
    popup.style.left = `${Math.max(12, left)}px`;
    popup.classList.toggle('hidden');
  });

  // Don't let the popup linger as an orphaned box: close it if the user
  // clicks anywhere else on the page.
  document.addEventListener('mousedown', (e) => {
    if (!popup.classList.contains('hidden') && !popup.contains(e.target) && e.target !== btnSpacing && !btnSpacing.contains(e.target)) {
      popup.classList.add('hidden');
    }
  });

  document.getElementById('btnCancelSpacing').addEventListener('click', () => {
    popup.classList.add('hidden');
  });

  document.getElementById('btnApplySpacing').addEventListener('click', () => {
    let node = savedRange ? savedRange.startContainer : null;
    if (node && node.nodeType === 3) node = node.parentNode;

    while (node && node !== content && !isBlockElement(node)) {
      node = node.parentNode;
    }

    if (node && node !== content) {
      const pt = document.getElementById('pt').value;
      const pb = document.getElementById('pb').value;
      const pl = document.getElementById('pl').value;
      const pr = document.getElementById('pr').value;
      const mt = document.getElementById('mt').value;
      const mb = document.getElementById('mb').value;
      const ml = document.getElementById('ml').value;
      const mr = document.getElementById('mr').value;

      if (pt) node.style.paddingTop = pt;
      if (pb) node.style.paddingBottom = pb;
      if (pl) node.style.paddingLeft = pl;
      if (pr) node.style.paddingRight = pr;
      if (mt) node.style.marginTop = mt;
      if (mb) node.style.marginBottom = mb;
      if (ml) node.style.marginLeft = ml;
      if (mr) node.style.marginRight = mr;
    } else {
      showToast('Click inside a paragraph or heading first', 'error');
    }

    popup.classList.add('hidden');
    content.focus();
  });
}

function isBlockElement(node) {
  const blocks = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE'];
  return blocks.includes(node.nodeName);
}

// --- Image Resizing ---

function setupImageResizing() {
  const content = document.getElementById('editorContent');
  const overlay = document.getElementById('imageOverlay');
  
  content.addEventListener('click', (e) => {
    if (e.target.tagName === 'IMG') {
      selectImage(e.target);
    } else {
      deselectImage();
    }
  });

  // If the user clicks anywhere outside the editor (title, SEO panel,
  // sidebar, etc.) the resize overlay used to stay stuck on screen looking
  // like a random empty box. Close it in that case too.
  document.addEventListener('mousedown', (e) => {
    if (!selectedImage) return;
    if (!content.contains(e.target) && !overlay.contains(e.target)) {
      deselectImage();
    }
  });

  content.addEventListener('scroll', () => {
    if (selectedImage) updateOverlayPosition();
  });
  window.addEventListener('resize', () => {
    if (selectedImage) updateOverlayPosition();
  });
  
  let startX, startY, startW, startH, dir;
  
  overlay.querySelectorAll('.resize-handle').forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dir = handle.getAttribute('data-dir');
      startX = e.clientX;
      startY = e.clientY;
      startW = selectedImage.offsetWidth;
      startH = selectedImage.offsetHeight;
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  });
  
  function onMouseMove(e) {
    if (!selectedImage) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    let newW = startW, newH = startH;
    
    const ratio = startW / startH;
    
    if (dir.includes('e')) newW = startW + dx;
    if (dir.includes('w')) newW = startW - dx;
    if (dir.includes('s')) newH = startH + dy;
    if (dir.includes('n')) newH = startH - dy;
    
    if (dir === 'e' || dir === 'w') {
      newH = newW / ratio;
    } else if (dir === 'n' || dir === 's') {
      newW = newH * ratio;
    } else {
      newH = newW / ratio;
    }
    
    if (newW > 20 && newH > 20) {
      selectedImage.style.width = newW + 'px';
      selectedImage.style.height = 'auto';
      updateOverlayPosition();
    }
  }
  
  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
  
  document.querySelectorAll('.img-align-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!selectedImage) return;
      const align = btn.getAttribute('data-align');
      
      selectedImage.style.float = 'none';
      selectedImage.style.display = 'inline-block';
      selectedImage.style.margin = '0';
      selectedImage.style.width = selectedImage.style.width || 'auto';
      
      if (align === 'left') {
        selectedImage.style.float = 'left';
        selectedImage.style.margin = '0 1rem 1rem 0';
      } else if (align === 'center') {
        selectedImage.style.display = 'block';
        selectedImage.style.margin = '1rem auto';
      } else if (align === 'right') {
        selectedImage.style.float = 'right';
        selectedImage.style.margin = '0 0 1rem 1rem';
      } else if (align === '100%') {
        selectedImage.style.width = '100%';
        selectedImage.style.height = 'auto';
        selectedImage.style.display = 'block';
        selectedImage.style.margin = '1rem auto';
        selectedImage.style.float = 'none';
      }
      
      updateOverlayPosition();
    });
  });
}

function selectImage(img) {
  if (selectedImage) selectedImage.classList.remove('selected');
  selectedImage = img;
  selectedImage.classList.add('selected');
  document.getElementById('imageOverlay').classList.remove('hidden');
  updateOverlayPosition();
}

function deselectImage() {
  if (selectedImage) {
    selectedImage.classList.remove('selected');
    selectedImage = null;
    document.getElementById('imageOverlay').classList.add('hidden');
  }
}

function updateOverlayPosition() {
  if (!selectedImage) return;
  const overlay = document.getElementById('imageOverlay');
  const rect = selectedImage.getBoundingClientRect();
  
  overlay.style.position = 'fixed';
  overlay.style.top = `${rect.top}px`;
  overlay.style.left = `${rect.left}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
}

// --- Other Setup Events ---

function setupEvents() {
  document.getElementById('btnNewBlog').addEventListener('click', resetForm);
  
  document.getElementById('btnSave').addEventListener('click', () => {
    const isChecked = document.getElementById('blogStatus').checked;
    saveBlog(isChecked ? 'published' : 'draft');
  });
  
  document.getElementById('btnSaveDraft').addEventListener('click', () => {
    document.getElementById('blogStatus').checked = false;
    updateStatusLabel();
    saveBlog('draft');
  });
  
  document.getElementById('btnPreview').addEventListener('click', () => {
    const slug = document.getElementById('blogSlug').value;
    if (slug) {
      window.open(`/blog/${slug}`, '_blank');
    } else {
      showToast('Save the blog first to generate a preview link', 'error');
    }
  });
  
  const titleInput = document.getElementById('blogTitle');
  titleInput.addEventListener('input', () => {
    if (!currentBlogId) {
      const slug = titleInput.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      document.getElementById('blogSlug').value = slug;
      
      const mTitle = document.getElementById('metaTitle');
      if (mTitle.value === '' || mTitle.value === mTitle.getAttribute('data-auto')) {
        mTitle.value = titleInput.value.substring(0, 60);
        mTitle.setAttribute('data-auto', mTitle.value);
      }
      
      updateSeoPreview();
      updateCharCounters();
    }
  });
  
  document.getElementById('metaTitle').addEventListener('input', () => {
    updateCharCounters();
    updateSeoPreview();
  });
  document.getElementById('metaDesc').addEventListener('input', () => {
    updateCharCounters();
    updateSeoPreview();
  });
  
  document.getElementById('blogStatus').addEventListener('change', updateStatusLabel);
  
  const fiArea = document.getElementById('featuredImageArea');
  const fiInput = document.getElementById('featuredImageInput');
  const btnRemoveFi = document.getElementById('btnRemoveFeaturedImage');
  
  fiArea.addEventListener('click', (e) => {
    if (!e.target.closest('#btnRemoveFeaturedImage')) {
      fiInput.click();
    }
  });
  
  fiArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fiArea.classList.add('border-sps-red', 'bg-red-50');
  });
  
  fiArea.addEventListener('dragleave', () => {
    fiArea.classList.remove('border-sps-red', 'bg-red-50');
  });
  
  fiArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fiArea.classList.remove('border-sps-red', 'bg-red-50');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFeaturedImage(e.dataTransfer.files[0]);
    }
  });
  
  fiInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadFeaturedImage(e.target.files[0]);
    }
  });
  
  btnRemoveFi.addEventListener('click', (e) => {
    e.stopPropagation();
    setFeaturedImagePreview('');
  });
}

async function uploadFeaturedImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  
  try {
    const res = await fetch(`${API_URL}?action=upload-image`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    });
    const data = await res.json();
    if (data.url) {
      setFeaturedImagePreview(data.url);
    }
  } catch (err) {
    showToast('Failed to upload featured image', 'error');
  }
}

function setFeaturedImagePreview(url) {
  const input = document.getElementById('featuredImageUrl');
  const preview = document.getElementById('featuredImagePreview');
  const placeholder = document.getElementById('featuredImagePlaceholder');
  const actions = document.getElementById('featuredImageActions');
  
  input.value = url || '';
  
  if (url) {
    preview.src = url;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
    actions.classList.remove('hidden');
  } else {
    preview.src = '';
    preview.classList.add('hidden');
    placeholder.classList.remove('hidden');
    actions.classList.add('hidden');
  }
}

function updateStatusLabel() {
  const isChecked = document.getElementById('blogStatus').checked;
  const label = document.getElementById('statusLabel');
  label.textContent = isChecked ? 'Published' : 'Draft';
}

function updateCharCounters() {
  const title = document.getElementById('metaTitle').value;
  const desc = document.getElementById('metaDesc').value;
  
  const titleCount = document.getElementById('metaTitleCount');
  titleCount.textContent = `${title.length}/60`;
  titleCount.className = `text-xs ${title.length > 60 ? 'text-red-500 font-bold' : 'text-gray-500'}`;
  
  const descCount = document.getElementById('metaDescCount');
  descCount.textContent = `${desc.length}/160`;
  descCount.className = `text-xs ${desc.length > 160 ? 'text-red-500 font-bold' : 'text-gray-500'}`;
}

function updateSeoPreview() {
  const title = document.getElementById('metaTitle').value || document.getElementById('blogTitle').value || 'Blog Title';
  const desc = document.getElementById('metaDesc').value || 'Blog description will appear here in the search results. Make it catchy and relevant to improve click-through rates.';
  const slug = document.getElementById('blogSlug').value || 'example-slug';
  
  document.getElementById('previewTitle').textContent = title;
  document.getElementById('previewDesc').textContent = desc;
  document.getElementById('previewSlug').textContent = slug;
}
