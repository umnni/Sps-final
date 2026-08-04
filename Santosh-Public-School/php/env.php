<?php

declare(strict_types=1);

/*=========================================
    Santosh Public School
    Minimal .env Loader

    Reads KEY=VALUE pairs from a .env file
    into getenv()/$_ENV so config.php can
    read them. No Composer/vendor needed --
    keeps this deployable on plain shared
    hosting.
=========================================*/

function loadEnvFile(string $path): void
{
    if (!is_file($path) || !is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);

        // Skip comments and blank lines
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        if (!str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);

        $key = trim($key);
        $value = trim($value);

        // Strip matching surrounding quotes, e.g. KEY="some value"
        if (
            strlen($value) >= 2 &&
            (
                ($value[0] === '"' && $value[-1] === '"') ||
                ($value[0] === "'" && $value[-1] === "'")
            )
        ) {
            $value = substr($value, 1, -1);
        }

        if ($key === '') {
            continue;
        }

        // Don't overwrite real environment variables already set by the host
        if (getenv($key) === false) {
            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
        }
    }
}
