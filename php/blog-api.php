<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';
$blogsFile = __DIR__ . '/storage/blogs.json';
$uploadsDir = __DIR__ . '/uploads/blog/';

// Helper function to get JSON body
function getJsonBody(): array {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    return is_array($data) ? $data : [];
}

// Helper function to read blogs
function readBlogs(): array {
    global $blogsFile;
    if (!file_exists($blogsFile)) {
        return [];
    }
    $content = file_get_contents($blogsFile);
    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

// Helper function to write blogs
function writeBlogs(array $blogs): bool {
    global $blogsFile;
    $json = json_encode($blogs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    return file_put_contents($blogsFile, $json, LOCK_EX) !== false;
}

// Helper to check admin password
function checkAdminPassword(): bool {
    $headers = getallheaders();
    // Some servers lowercase headers
    $password = $headers['X-Admin-Password'] ?? $headers['x-admin-password'] ?? '';
    // Assume env() is available from config.php or fallback
    $expected = function_exists('env') ? env('BLOG_ADMIN_PASSWORD', 'sps@admin2026') : 'sps@admin2026';
    return $password === $expected;
}

function sendError(string $message, int $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit;
}

// Handle actions
try {
    switch ($action) {
        case 'list':
            $blogs = readBlogs();
            usort($blogs, function($a, $b) {
                return ($b['createdAt'] ?? 0) <=> ($a['createdAt'] ?? 0);
            });
            
            $all = $_GET['all'] ?? '0';
            if ($all !== '1') {
                $blogs = array_filter($blogs, function($b) {
                    return ($b['status'] ?? '') === 'published';
                });
                $blogs = array_values($blogs);
            }
            echo json_encode($blogs);
            break;

        case 'get':
            $slug = $_GET['slug'] ?? '';
            $id = $_GET['id'] ?? '';
            if (empty($slug) && empty($id)) {
                sendError('Slug or id is required');
            }
            $blogs = readBlogs();
            foreach ($blogs as $b) {
                if ((!empty($id) && ($b['id'] ?? '') === $id) || (!empty($slug) && ($b['slug'] ?? '') === $slug)) {
                    echo json_encode($b);
                    exit;
                }
            }
            sendError('Blog not found', 404);
            break;

        case 'save':
            if (!checkAdminPassword()) {
                sendError('Unauthorized', 401);
            }
            $data = getJsonBody();
            if (empty($data['title']) || empty($data['content'])) {
                sendError('Title and content are required');
            }

            $blogs = readBlogs();
            $id = $data['id'] ?? null;
            $now = time();

            // Generate slug from title
            $baseSlug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $data['title'])));
            $baseSlug = preg_replace('/-+/', '-', $baseSlug);
            $baseSlug = trim($baseSlug, '-');
            
            if (!$id) {
                // New blog
                $id = uniqid('blog_');
                $slug = $baseSlug;
                
                // Ensure unique slug
                $counter = 1;
                while (true) {
                    $slugExists = false;
                    foreach ($blogs as $b) {
                        if (($b['slug'] ?? '') === $slug) {
                            $slugExists = true;
                            break;
                        }
                    }
                    if (!$slugExists) break;
                    $slug = $baseSlug . '-' . $counter;
                    $counter++;
                }

                $blog = [
                    'id' => $id,
                    'slug' => $slug,
                    'title' => $data['title'],
                    'metaTitle' => $data['metaTitle'] ?? $data['title'],
                    'metaDescription' => $data['metaDescription'] ?? '',
                    'content' => $data['content'],
                    'featuredImage' => $data['featuredImage'] ?? '',
                    'status' => $data['status'] ?? 'draft',
                    'createdAt' => $now,
                    'updatedAt' => $now
                ];
                $blogs[] = $blog;
                $savedBlog = $blog;
            } else {
                // Update blog
                $found = false;
                foreach ($blogs as &$b) {
                    if ($b['id'] === $id) {
                        $b['title'] = $data['title'];
                        $b['metaTitle'] = $data['metaTitle'] ?? $b['metaTitle'] ?? $data['title'];
                        $b['metaDescription'] = $data['metaDescription'] ?? $b['metaDescription'] ?? '';
                        $b['content'] = $data['content'];
                        $b['featuredImage'] = $data['featuredImage'] ?? $b['featuredImage'] ?? '';
                        $b['status'] = $data['status'] ?? $b['status'] ?? 'draft';
                        $b['updatedAt'] = $now;
                        $savedBlog = $b;
                        $found = true;
                        break;
                    }
                }
                if (!$found) {
                    sendError('Blog not found', 404);
                }
            }
            
            writeBlogs($blogs);
            echo json_encode($savedBlog);
            break;

        case 'delete':
            if (!checkAdminPassword()) {
                sendError('Unauthorized', 401);
            }
            $data = getJsonBody();
            $id = $data['id'] ?? '';
            if (empty($id)) {
                sendError('ID is required');
            }
            
            $blogs = readBlogs();
            $initialCount = count($blogs);
            $blogs = array_filter($blogs, function($b) use ($id) {
                return $b['id'] !== $id;
            });
            
            if (count($blogs) === $initialCount) {
                sendError('Blog not found', 404);
            }
            
            $blogs = array_values($blogs);
            writeBlogs($blogs);
            echo json_encode(['success' => true, 'message' => 'Blog deleted']);
            break;

        case 'upload-image':
            if (!checkAdminPassword()) {
                sendError('Unauthorized', 401);
            }
            if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
                sendError('No file uploaded or upload error');
            }
            
            $file = $_FILES['image'];
            $size = $file['size'];
            $tmpName = $file['tmp_name'];
            $type = mime_content_type($tmpName);
            
            if ($size > 2 * 1024 * 1024) {
                sendError('File size exceeds 2MB limit');
            }
            if (!in_array($type, ['image/jpeg', 'image/png', 'image/webp'])) {
                sendError('Only JPEG, PNG and WEBP images are allowed');
            }
            
            if (!is_dir($uploadsDir)) {
                mkdir($uploadsDir, 0755, true);
            }
            
            $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
            if (empty($ext)) {
                $ext = $type === 'image/jpeg' ? 'jpg' : ($type === 'image/webp' ? 'webp' : 'png');
            }
            
            $filename = time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
            $destination = $uploadsDir . $filename;
            
            if (move_uploaded_file($tmpName, $destination)) {
                echo json_encode(['url' => 'php/uploads/blog/' . $filename]);
            } else {
                sendError('Failed to save file', 500);
            }
            break;

        case 'verify-password':
            $data = getJsonBody();
            $password = $data['password'] ?? '';
            $expected = function_exists('env') ? env('BLOG_ADMIN_PASSWORD', 'sps@admin2026') : 'sps@admin2026';
            echo json_encode(['valid' => $password === $expected]);
            break;
            
        default:
            sendError('Invalid action');
    }
} catch (Exception $e) {
    sendError('Server error: ' . $e->getMessage(), 500);
}
