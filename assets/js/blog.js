export async function initBlogPage() {
  // Inline SVG data-URI so a missing featured image never 404s / loops.
  const PLACEHOLDER_IMG = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Crect width='100%25' height='100%25' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='20' fill='%239ca3af'%3ESantosh Public School%3C/text%3E%3C/svg%3E";
  const blogGrid = document.getElementById('blogGrid');
  const blogEmpty = document.getElementById('blogEmpty');
  const blogLoading = document.getElementById('blogLoading');
  const searchInput = document.getElementById('blogSearchInput');

  if (!blogGrid || !blogEmpty || !blogLoading || !searchInput) return;

  let allBlogs = [];

  // Show loading
  blogGrid.innerHTML = '';
  blogEmpty.classList.add('hidden');
  blogLoading.classList.remove('hidden');

  try {
    const res = await fetch('php/blog-api.php?action=list');
    if (!res.ok) throw new Error('Failed to fetch blogs');
    
    allBlogs = await res.json();
    
    blogLoading.classList.add('hidden');
    renderBlogs(allBlogs);
  } catch (err) {
    console.error(err);
    blogLoading.classList.add('hidden');
    blogEmpty.classList.remove('hidden');
    blogEmpty.querySelector('h2').textContent = 'Error Loading Blogs';
    blogEmpty.querySelector('p').textContent = 'Please try again later.';
  }

  // Search event delegation
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      renderBlogs(allBlogs);
      return;
    }

    const filtered = allBlogs.filter(blog => 
      blog.title.toLowerCase().includes(query) || 
      stripHtml(blog.content).toLowerCase().includes(query)
    );
    
    renderBlogs(filtered);
  });

  function renderBlogs(blogs) {
    blogGrid.innerHTML = '';
    
    if (blogs.length === 0) {
      blogEmpty.classList.remove('hidden');
      if (searchInput.value) {
          blogEmpty.querySelector('h2').textContent = 'No results found';
          blogEmpty.querySelector('p').textContent = 'Try adjusting your search query.';
      } else {
          blogEmpty.querySelector('h2').textContent = 'Coming Soon!';
          blogEmpty.querySelector('p').textContent = "We're working on exciting blog posts about education, school events, and learning tips. Stay tuned!";
      }
      return;
    }
    
    blogEmpty.classList.add('hidden');

    const html = blogs.map((blog, index) => {
      const excerpt = stripHtml(blog.content).substring(0, 120) + '...';
      const dateStr = formatDate(blog.createdAt || blog.updatedAt);
      const img = blog.featuredImage ? blog.featuredImage : PLACEHOLDER_IMG;
      const animDelay = index * 0.1;

      return `
        <article class="sps-blog-card group" style="animation: fadeUp 0.5s ease forwards ${animDelay}s; opacity: 0; transform: translateY(20px);">
          <div class="sps-blog-card-img">
            <img src="${img}" alt="${blog.title}" loading="lazy" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';">
            <div class="sps-blog-card-overlay"></div>
            <span class="sps-blog-card-date">${dateStr}</span>
          </div>
          <div class="sps-blog-card-body">
            <h3 class="sps-blog-card-title">${blog.title}</h3>
            <p class="sps-blog-card-excerpt">${excerpt}</p>
            <a href="/blog/index.php?slug=${blog.slug}" class="sps-blog-card-link">Read More &rarr;</a>
          </div>
        </article>
      `;
    }).join('');

    blogGrid.innerHTML = html;
  }

  // Try pretty URL first when a user clicks Read More, fallback to index.php
  blogGrid.addEventListener('click', async (e) => {
    const a = e.target.closest && e.target.closest('a.sps-blog-card-link');
    if (!a) return;
    e.preventDefault();

    try {
      // If our link already points to index.php, try pretty URL first
      const url = new URL(a.href, window.location.origin);
      const params = url.searchParams;
      const slug = params.get('slug');

      if (slug) {
        const pretty = '/blog/' + slug;

        // Try a HEAD request to the pretty URL
        const res = await fetch(pretty, { method: 'HEAD' });
        if (res.ok) {
          window.location.href = pretty;
          return;
        }
      }

      // Fallback to the original href (index.php?slug=...)
      window.location.href = a.href;
    } catch (err) {
      // On any error, go to the original href
      window.location.href = a.href;
    }
  });

  function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    // Blog timestamps are stored as Unix seconds (PHP time()), but the JS
    // Date constructor expects milliseconds — without this fix every post
    // showed a wrong 1970s date.
    const ms = dateString < 20000000000 ? dateString * 1000 : dateString;
    const d = new Date(ms);
    if (isNaN(d)) return '';
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return d.toLocaleDateString('en-GB', options);
  }
}
