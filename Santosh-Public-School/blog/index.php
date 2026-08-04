<?php
declare(strict_types=1);

// Helper function to read blogs
function readBlogs(): array {
    $blogsFile = __DIR__ . '/../php/storage/blogs.json';
    if (!file_exists($blogsFile)) {
        return [];
    }
    $content = file_get_contents($blogsFile);
    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

$slug = $_GET['slug'] ?? '';
$uriSlug = basename(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
if (empty($slug) && $uriSlug !== 'blog') {
    $slug = $uriSlug;
}

if (empty($slug)) {
    // If no slug, just redirect to blog list
    header('Location: /?page=blog');
    exit;
}

$blogs = readBlogs();
$blog = null;
$related = [];

// Find the blog
foreach ($blogs as $b) {
    if (($b['slug'] ?? '') === $slug) {
        if (($b['status'] ?? '') !== 'published') {
            break; // Treat draft as not found for public
        }
        $blog = $b;
        break;
    }
}

if (!$blog) {
    http_response_code(404);
    echo "<h1>404 - Blog Post Not Found</h1><p><a href='/'>Return to Home</a></p>";
    exit;
}

// Find related blogs
$publishedBlogs = array_filter($blogs, function($b) use ($blog) {
    return ($b['status'] ?? '') === 'published' && $b['id'] !== $blog['id'];
});
usort($publishedBlogs, function($a, $b) {
    return ($b['createdAt'] ?? 0) <=> ($a['createdAt'] ?? 0);
});
$related = array_slice($publishedBlogs, 0, 3);

$title = htmlspecialchars($blog['title'] ?? 'Blog');
$metaTitle = htmlspecialchars($blog['metaTitle'] ?? $blog['title']);
$metaDescription = htmlspecialchars($blog['metaDescription'] ?? '');
$featuredImage = htmlspecialchars($blog['featuredImage'] ?? '');
$fullImageUrl = $featuredImage ? "https://santoshpublicschool.com/" . ltrim($featuredImage, '/') : '';
$url = "https://santoshpublicschool.com/blog/" . urlencode($slug);
$createdAtIso = date('c', $blog['createdAt'] ?? time());
$updatedAtIso = date('c', $blog['updatedAt'] ?? time());
$formattedDate = date('F j, Y', $blog['createdAt'] ?? time());

// Estimate reading time
$wordCount = str_word_count(strip_tags($blog['content'] ?? ''));
$readingTime = ceil($wordCount / 200) ?: 1;

?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= $metaTitle ?> — Santosh Public School</title>
  <meta name="description" content="<?= $metaDescription ?>">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="<?= $url ?>">
  
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="<?= $metaTitle ?>">
  <meta property="og:description" content="<?= $metaDescription ?>">
  <?php if ($fullImageUrl): ?>
  <meta property="og:image" content="<?= $fullImageUrl ?>">
  <?php endif; ?>
  <meta property="og:url" content="<?= $url ?>">
  <meta property="og:site_name" content="Santosh Public School">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="<?= $metaTitle ?>">
  <meta name="twitter:description" content="<?= $metaDescription ?>">
  <?php if ($fullImageUrl): ?>
  <meta name="twitter:image" content="<?= $fullImageUrl ?>">
  <?php endif; ?>
  
  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "<?= $title ?>",
    "description": "<?= $metaDescription ?>",
    <?php if ($fullImageUrl): ?>"image": "<?= $fullImageUrl ?>",<?php endif; ?>
    "datePublished": "<?= $createdAtIso ?>",
    "dateModified": "<?= $updatedAtIso ?>",
    "author": { "@type": "Organization", "name": "Santosh Public School" },
    "publisher": { "@type": "Organization", "name": "Santosh Public School" }
  }
  </script>
  
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="../assets/css/style.css">
  <link rel="stylesheet" href="../assets/css/blog.css">
  
  <style>
    /* Content styling for output HTML */
    .blog-content h2 { font-size: 1.5rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem; color: var(--sps-blue, #1E3A8A); }
    .blog-content h3 { font-size: 1.25rem; font-weight: bold; margin-top: 1rem; margin-bottom: 0.5rem; }
    .blog-content p { margin-bottom: 1rem; line-height: 1.7; }
    .blog-content ul { list-style-type: disc; margin-left: 1.5rem; margin-bottom: 1rem; }
    .blog-content ol { list-style-type: decimal; margin-left: 1.5rem; margin-bottom: 1rem; }
    .blog-content a { color: var(--sps-blue, #1E3A8A); text-decoration: underline; }
    .blog-content img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 1rem 0; }
    .blog-content blockquote { border-left: 4px solid var(--sps-red, #B91C1C); padding-left: 1rem; font-style: italic; color: #555; }
  </style>
</head>
<body class="bg-gray-50 flex flex-col min-h-screen">

  <!-- Minimal Header for Blog Page -->
  <header class="bg-white shadow-md py-4">
      <div class="container mx-auto px-4 flex justify-between items-center">
          <a href="/" class="flex items-center gap-2">
              <span class="text-xl font-bold text-blue-900">Santosh Public School</span>
          </a>
          <nav class="hidden md:flex gap-6">
              <a href="/" class="text-gray-700 hover:text-red-700 font-medium transition">Home</a>
              <a href="/?page=about-us" class="text-gray-700 hover:text-red-700 font-medium transition">About</a>
              <a href="/?page=blog" class="text-gray-700 hover:text-red-700 font-medium transition">Blog</a>
              <a href="/?page=contact" class="text-gray-700 hover:text-red-700 font-medium transition">Contact</a>
          </nav>
      </div>
  </header>

  <main class="flex-grow container mx-auto px-4 py-8 max-w-4xl">
      <!-- Breadcrumb -->
      <div class="text-sm text-gray-500 mb-6">
          <a href="/" class="hover:text-blue-800">Home</a> &gt; 
          <a href="/?page=blog" class="hover:text-blue-800">Blog</a> &gt; 
          <span class="text-gray-800"><?= $title ?></span>
      </div>

      <article class="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
          <?php if ($featuredImage): ?>
          <img src="/<?= ltrim($featuredImage, '/') ?>" alt="<?= $title ?>" class="w-full h-[300px] md:h-[450px] object-cover">
          <?php endif; ?>
          
          <div class="p-6 md:p-10">
              <h1 class="text-3xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight"><?= $title ?></h1>
              
              <div class="flex items-center text-sm text-gray-500 mb-8 pb-8 border-b border-gray-100">
                  <div class="flex items-center mr-6">
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      <?= $formattedDate ?>
                  </div>
                  <div class="flex items-center">
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <?= $readingTime ?> min read
                  </div>
              </div>
              
              <div class="blog-content text-gray-800 text-lg">
                  <?= $blog['content'] ?? '' ?>
              </div>
          </div>
      </article>

      <!-- Share -->
      <div class="flex items-center justify-between bg-white p-6 rounded-xl shadow-sm mb-12">
          <h3 class="font-bold text-gray-900">Share this article:</h3>
          <div class="flex gap-4">
              <a href="https://api.whatsapp.com/send?text=<?= urlencode($title . ' ' . $url) ?>" target="_blank" class="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              </a>
              <a href="https://www.facebook.com/sharer/sharer.php?u=<?= urlencode($url) ?>" target="_blank" class="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
              </a>
              <a href="https://twitter.com/intent/tweet?url=<?= urlencode($url) ?>&text=<?= urlencode($title) ?>" target="_blank" class="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center hover:bg-sky-600 transition">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <button onclick="navigator.clipboard.writeText('<?= $url ?>'); alert('Link copied to clipboard!');" class="w-10 h-10 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-300 transition" title="Copy Link">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
              </button>
          </div>
      </div>

      <!-- Related Blogs -->
      <?php if (!empty($related)): ?>
      <div class="mb-12">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">Related Articles</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <?php foreach ($related as $rel): ?>
              <a href="/blog/<?= $rel['slug'] ?>" class="group bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition">
                  <?php if (!empty($rel['featuredImage'])): ?>
                  <img src="/<?= ltrim($rel['featuredImage'], '/') ?>" alt="<?= htmlspecialchars($rel['title']) ?>" class="w-full h-48 object-cover group-hover:scale-105 transition duration-300">
                  <?php else: ?>
                  <div class="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400">No Image</div>
                  <?php endif; ?>
                  <div class="p-5">
                      <h3 class="font-bold text-lg text-gray-900 group-hover:text-blue-700 transition line-clamp-2 mb-2"><?= htmlspecialchars($rel['title']) ?></h3>
                      <p class="text-sm text-gray-500"><?= date('M j, Y', $rel['createdAt'] ?? time()) ?></p>
                  </div>
              </a>
              <?php endforeach; ?>
          </div>
      </div>
      <?php endif; ?>
      
      <div class="text-center mb-8">
          <a href="/?page=blog" class="inline-block bg-blue-900 text-white font-medium py-2 px-6 rounded-lg hover:bg-blue-800 transition">
              &larr; Back to all articles
          </a>
      </div>
  </main>

  <footer class="bg-blue-900 text-white py-8 mt-auto">
      <div class="container mx-auto px-4 text-center">
          <p>&copy; <?= date('Y') ?> Santosh Public School. All rights reserved.</p>
      </div>
  </footer>

  <!-- ========== STICKY WHATSAPP BUTTON ========== -->
  <div class="sps-whatsapp-btn">
    <a href="https://wa.me/919911826993?text=Hello%2C%20I%20would%20like%20to%20know%20more%20about%20admissions%20at%20Santosh%20Public%20School." target="_blank" rel="noopener" title="Chat with us on WhatsApp" aria-label="Chat on WhatsApp">
      <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.004 2C6.486 2 2 6.486 2 12.004c0 1.925.55 3.802 1.593 5.416L2 22l4.71-1.552a10 10 0 0 0 5.294 1.514h.004c5.518 0 10.002-4.486 10.002-10.004C22.01 6.486 17.524 2 12.005 2Zm.001 18.324h-.003a8.31 8.31 0 0 1-4.242-1.162l-.305-.181-3.152 1.04 1.055-3.07-.198-.315a8.31 8.31 0 0 1-1.276-4.432c0-4.596 3.74-8.336 8.337-8.336 2.227 0 4.32.868 5.894 2.443a8.28 8.28 0 0 1 2.44 5.897c0 4.596-3.74 8.116-8.55 8.116Z"/></svg>
    </a>
  </div>

  <script>
    function loadPage(page) {
      if (page === 'home') window.location.href = '/';
      else window.location.href = '/?page=' + page;
    }
  </script>
</body>
</html>
