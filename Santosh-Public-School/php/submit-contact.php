<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

require_once __DIR__ . '/PHPMailer/src/Exception.php';
require_once __DIR__ . '/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

/*
|--------------------------------------------------------------------------
| Response Type
|--------------------------------------------------------------------------
*/

header('Content-Type: application/json');

session_start();

/*
|--------------------------------------------------------------------------
| Response Helper
|--------------------------------------------------------------------------
*/

function response(string $status, string $message, int $httpCode = 200)
{
    http_response_code($httpCode);

    echo json_encode([
        'status'  => $status,
        'message' => $message
    ]);

    exit;
}

/*
|--------------------------------------------------------------------------
| Allow POST Request Only
|--------------------------------------------------------------------------
*/

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    response('error', 'Method Not Allowed.', 405);
}

/*
|--------------------------------------------------------------------------
| Honeypot (silent bot trap)
| Real users never see or fill this field. If it has a value, pretend
| success so the bot moves on, but don't actually process anything.
|--------------------------------------------------------------------------
*/

if (!empty($_POST['website'])) {
    response('success', 'Message sent successfully.');
}

/*
|--------------------------------------------------------------------------
| CSRF Validation
|--------------------------------------------------------------------------
*/

$submittedToken = $_POST['csrf_token'] ?? '';

if (
    empty($_SESSION['csrf_token'])
    || !hash_equals($_SESSION['csrf_token'], $submittedToken)
) {
    response('error', 'Your session has expired. Please reload the page and try again.', 419);
}

/*
|--------------------------------------------------------------------------
| Rate Limiting (per IP, file-based -- no database)
| Uses its own bucket so it doesn't share a quota with the admission form.
|--------------------------------------------------------------------------
*/

function checkAndRecordRateLimit(string $ip, string $bucket): bool
{
    if (!is_dir(RATE_LIMIT_DIR)) {
        mkdir(RATE_LIMIT_DIR, 0755, true);
    }

    $file = RATE_LIMIT_DIR . md5($bucket . ':' . $ip) . '.json';
    $handle = fopen($file, 'c+');

    if ($handle === false) {
        // If we can't track it, fail open rather than blocking legitimate users.
        return true;
    }

    flock($handle, LOCK_EX);

    $raw = stream_get_contents($handle);
    $timestamps = json_decode($raw ?: '[]', true);

    if (!is_array($timestamps)) {
        $timestamps = [];
    }

    $windowStart = time() - (RATE_LIMIT_WINDOW_MINUTES * 60);
    $timestamps = array_values(array_filter(
        $timestamps,
        fn($ts) => $ts >= $windowStart
    ));

    $allowed = count($timestamps) < RATE_LIMIT_MAX_SUBMISSIONS;

    if ($allowed) {
        $timestamps[] = time();
        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, json_encode($timestamps));
        fflush($handle);
    }

    flock($handle, LOCK_UN);
    fclose($handle);

    return $allowed;
}

$ipAddress = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

if (!checkAndRecordRateLimit($ipAddress, 'contact')) {
    response('error', 'Too many messages from this network. Please try again later.', 429);
}

/*
|--------------------------------------------------------------------------
| Sanitize Function
|--------------------------------------------------------------------------
*/

function clean($value): string
{
    return htmlspecialchars(trim((string) $value), ENT_QUOTES, 'UTF-8');
}

/*
|--------------------------------------------------------------------------
| Get POST Data
|--------------------------------------------------------------------------
*/

$name    = clean($_POST['name'] ?? '');
$mobile  = clean($_POST['mobile'] ?? '');
$email   = clean($_POST['email'] ?? '');
$message = clean($_POST['message'] ?? '');

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
*/

if (empty($name)) {
    response('error', 'Name is required.');
}

if (empty($mobile) && empty($email)) {
    response('error', 'Please provide at least a mobile number or an email address.');
}

if (!empty($mobile) && !preg_match('/^[6-9][0-9]{9}$/', $mobile)) {
    response('error', 'Invalid mobile number.');
}

if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    response('error', 'Invalid email address.');
}

if (empty($message)) {
    response('error', 'Message is required.');
}

if (strlen($message) > 1000) {
    response('error', 'Message is too long (max 1000 characters).');
}

/*
|--------------------------------------------------------------------------
| Send Email To School
|--------------------------------------------------------------------------
*/

try {

    $mail = new PHPMailer(true);

    $mail->isSMTP();
    $mail->Host       = SMTP_HOST;
    $mail->SMTPAuth   = true;
    $mail->Username   = SMTP_USERNAME;
    $mail->Password   = SMTP_PASSWORD;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port       = SMTP_PORT;

    $mail->setFrom(SMTP_FROM_EMAIL, SCHOOL_NAME . ' - Contact Form');
    $mail->addAddress(SCHOOL_EMAIL);

    if (!empty($email)) {
        $mail->addReplyTo($email, $name);
    }

    $mail->isHTML(true);
    $mail->Subject = 'New Contact Message - ' . $name;

    $mail->Body = '
        <h2>New Contact Form Message</h2>
        <p><strong>Name:</strong> ' . $name . '</p>
        <p><strong>Mobile:</strong> ' . ($mobile !== '' ? $mobile : '-') . '</p>
        <p><strong>Email:</strong> ' . ($email !== '' ? $email : '-') . '</p>
        <hr>
        <p><strong>Message:</strong></p>
        <p>' . nl2br($message) . '</p>
    ';

    $mail->send();

} catch (PHPMailerException $e) {
    error_log('Contact email failed: ' . $mail->ErrorInfo);
    response('error', 'We could not send your message right now. Please try again shortly or call the school directly.', 500);
}

/*
|--------------------------------------------------------------------------
| Success
|--------------------------------------------------------------------------
*/

unset($_SESSION['csrf_token']);

response('success', 'Your message has been sent. Our team will get back to you soon.');
