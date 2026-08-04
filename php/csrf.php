<?php

declare(strict_types=1);

/*=========================================
    Santosh Public School
    CSRF Token Endpoint

    Called by the frontend when the
    admission page loads. Issues (or reuses)
    a per-session token that must be echoed
    back on form submission.
=========================================*/

require_once __DIR__ . '/config.php';

session_start();

header('Content-Type: application/json');

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

echo json_encode([
    'token' => $_SESSION['csrf_token']
]);
