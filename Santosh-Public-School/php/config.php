<?php

declare(strict_types=1);

/*=========================================
    Santosh Public School
    Configuration File

    No database is used -- admission
    submissions are emailed directly to the
    school via SMTP/PHPMailer.

    Secrets (SMTP credentials, etc.) are
    read from a `.env` file at the project
    root. Copy `.env.example` to `.env` and
    fill in real values. `.env` is
    git-ignored and never committed.
=========================================*/

require_once __DIR__ . '/env.php';
loadEnvFile(__DIR__ . '/../.env');

date_default_timezone_set('Asia/Kolkata');

/* Never show raw PHP errors to visitors; log them instead. */
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/storage/error.log');
error_reporting(E_ALL);

function env(string $key, string $default = ''): string
{
    $value = getenv($key);
    return $value !== false && $value !== '' ? $value : $default;
}

/*=========================================
    School Details
=========================================*/

define('SCHOOL_NAME', 'Santosh Public School');
define('SCHOOL_EMAIL', env('SCHOOL_EMAIL', 'admission@santoshpublicschool.com'));
define('SCHOOL_PHONE', env('SCHOOL_PHONE', '9911826993'));
define('SCHOOL_ADDRESS', 'Bisrakh Road, Chhapraula, Greater Noida West');

/*=========================================
    SMTP Configuration
=========================================*/

define('SMTP_HOST', env('SMTP_HOST', 'smtp.gmail.com'));
define('SMTP_PORT', (int) env('SMTP_PORT', '465'));
define('SMTP_USERNAME', env('SMTP_USERNAME', ''));
define('SMTP_PASSWORD', env('SMTP_PASSWORD', ''));
define('SMTP_FROM_NAME', env('SMTP_FROM_NAME', 'Santosh Public School Website'));
define('SMTP_FROM_EMAIL', env('SMTP_FROM_EMAIL', SMTP_USERNAME));

/*=========================================
    Upload Settings
=========================================*/

define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5 MB
define('UPLOAD_DIR', __DIR__ . '/uploads/');

$ALLOWED_MIME = [
    'image/jpeg',
    'image/png',
    'application/pdf'
];

$ALLOWED_EXTENSIONS = [
    'jpg',
    'jpeg',
    'png',
    'pdf'
];

/*=========================================
    Rate Limiting (file-based -- no DB)
=========================================*/

define('RATE_LIMIT_MAX_SUBMISSIONS', 3);   // max submissions
define('RATE_LIMIT_WINDOW_MINUTES', 10);   // per this many minutes, per IP
define('RATE_LIMIT_DIR', __DIR__ . '/storage/rate-limit/');
