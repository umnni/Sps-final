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
    response('success', 'Application submitted successfully.');
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
|--------------------------------------------------------------------------
*/

/**
 * Returns true and records this attempt if the IP is still under the
 * limit; returns false (without recording) if the IP is over the limit.
 */
function checkAndRecordRateLimit(string $ip): bool
{
    if (!is_dir(RATE_LIMIT_DIR)) {
        mkdir(RATE_LIMIT_DIR, 0755, true);
    }

    $file = RATE_LIMIT_DIR . md5($ip) . '.json';
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

if (!checkAndRecordRateLimit($ipAddress)) {
    response('error', 'Too many submissions from this network. Please try again later.', 429);
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

$student_name       = clean($_POST['student_name'] ?? '');
$gender             = clean($_POST['gender'] ?? '');
$dob                = clean($_POST['dob'] ?? '');
$class              = clean($_POST['class'] ?? '');
$nationality        = clean($_POST['nationality'] ?? '');

$father_name        = clean($_POST['father_name'] ?? '');
$mother_name        = clean($_POST['mother_name'] ?? '');
$father_occupation  = clean($_POST['father_occupation'] ?? '');
$mother_occupation  = clean($_POST['mother_occupation'] ?? '');
$mobile             = clean($_POST['mobile'] ?? '');
$alternate_mobile   = clean($_POST['alternate_mobile'] ?? '');
$email              = clean($_POST['email'] ?? '');

$house_no           = clean($_POST['house_no'] ?? '');
$street             = clean($_POST['street'] ?? '');
$landmark           = clean($_POST['landmark'] ?? '');
$city               = clean($_POST['city'] ?? '');
$state              = clean($_POST['state'] ?? '');
$pincode            = clean($_POST['pincode'] ?? '');

$previous_school    = clean($_POST['previous_school'] ?? '');
$last_class         = clean($_POST['last_class'] ?? '');
$medium             = clean($_POST['medium'] ?? '');
$tc_available       = clean($_POST['tc_available'] ?? '');
$admission_type     = clean($_POST['admission_type'] ?? '');
$reason             = clean($_POST['reason'] ?? '');
$medical            = clean($_POST['medical'] ?? '');

/*
|--------------------------------------------------------------------------
| Required Field Validation
|--------------------------------------------------------------------------
*/

$requiredFields = [
    'Student Name'  => $student_name,
    'Gender'        => $gender,
    'Date of Birth' => $dob,
    'Class'         => $class,
    'Father Name'   => $father_name,
    'Mother Name'   => $mother_name,
    'Mobile Number' => $mobile,
    'City'          => $city,
    'State'         => $state,
    'Pincode'       => $pincode,
];

foreach ($requiredFields as $field => $value) {
    if (empty($value)) {
        response('error', $field . ' is required.');
    }
}

/*
|--------------------------------------------------------------------------
| Declaration Validation
|--------------------------------------------------------------------------
*/

if (!isset($_POST['declaration'])) {
    response('error', 'Please accept the declaration.');
}

/*
|--------------------------------------------------------------------------
| Mobile Validation
|--------------------------------------------------------------------------
*/

if (!preg_match('/^[6-9][0-9]{9}$/', $mobile)) {
    response('error', 'Invalid mobile number.');
}

if (!empty($alternate_mobile) && !preg_match('/^[6-9][0-9]{9}$/', $alternate_mobile)) {
    response('error', 'Invalid alternate mobile number.');
}

/*
|--------------------------------------------------------------------------
| Email Validation
|--------------------------------------------------------------------------
*/

if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    response('error', 'Invalid email address.');
}

/*
|--------------------------------------------------------------------------
| Pincode Validation
|--------------------------------------------------------------------------
*/

if (!preg_match('/^[0-9]{6}$/', $pincode)) {
    response('error', 'Invalid pincode.');
}

/*
|--------------------------------------------------------------------------
| Date of Birth Validation + Server-Side Age Calculation
|--------------------------------------------------------------------------
*/

$dobDate = DateTime::createFromFormat('Y-m-d', $dob);

if (!$dobDate || $dobDate->format('Y-m-d') !== $dob) {
    response('error', 'Invalid date of birth.');
}

$age = $dobDate->diff(new DateTime())->y . ' Years';

/*
|--------------------------------------------------------------------------
| Upload Directory
|--------------------------------------------------------------------------
*/

if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
}

/* Make sure uploaded files can never be executed as scripts. */
$uploadHtaccess = UPLOAD_DIR . '.htaccess';

if (!is_file($uploadHtaccess)) {
    file_put_contents(
        $uploadHtaccess,
        "<FilesMatch \"\\.(php|php\\d|phtml|pl|py|jsp|asp|sh|cgi)$\">\n" .
        "    Require all denied\n" .
        "</FilesMatch>\n" .
        "php_flag engine off\n" .
        "Options -ExecCGI -Indexes\n"
    );
}

/*
|--------------------------------------------------------------------------
| Required Files
|--------------------------------------------------------------------------
*/

$requiredUploads = ['photo', 'birth_certificate', 'aadhaar'];

foreach ($requiredUploads as $upload) {
    if (!isset($_FILES[$upload]) || $_FILES[$upload]['error'] !== UPLOAD_ERR_OK) {
        response('error', ucfirst(str_replace('_', ' ', $upload)) . ' is required.');
    }
}

/*
|--------------------------------------------------------------------------
| Secure File Upload
|--------------------------------------------------------------------------
*/

/** Track files written to disk this request so we can clean them up afterwards. */
$writtenFiles = [];

function uploadDocument(string $fieldName, array &$writtenFiles): string
{
    global $ALLOWED_MIME, $ALLOWED_EXTENSIONS;

    if (!isset($_FILES[$fieldName])) {
        response('error', ucfirst($fieldName) . ' file not found.');
    }

    $file = $_FILES[$fieldName];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        response('error', ucfirst($fieldName) . ' upload failed.');
    }

    /* Maximum Size */
    if ($file['size'] > MAX_FILE_SIZE) {
        response('error', ucfirst($fieldName) . ' must be less than 5 MB.');
    }

    /* MIME Validation (checks actual file content, not just the extension) */
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mime, $ALLOWED_MIME, true)) {
        response('error', ucfirst($fieldName) . ' has invalid file type.');
    }

    /* Extension Validation */
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    if (!in_array($extension, $ALLOWED_EXTENSIONS, true)) {
        response('error', ucfirst($fieldName) . ' has invalid extension.');
    }

    /* Generate Secure, Unguessable File Name */
    $newFileName = bin2hex(random_bytes(16)) . '_' . time() . '.' . $extension;
    $destination = UPLOAD_DIR . $newFileName;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        response('error', 'Unable to upload ' . ucfirst($fieldName));
    }

    $writtenFiles[] = $destination;

    return $destination;
}

/** Remove files we wrote to disk -- nothing needs to persist since there's no database. */
function cleanupUploadedFiles(array $paths): void
{
    foreach ($paths as $path) {
        if (is_file($path)) {
            @unlink($path);
        }
    }
}

$uploadedFiles = [];

$uploadedFiles['photo']             = uploadDocument('photo', $writtenFiles);
$uploadedFiles['birth_certificate'] = uploadDocument('birth_certificate', $writtenFiles);
$uploadedFiles['aadhaar']           = uploadDocument('aadhaar', $writtenFiles);

/*
|--------------------------------------------------------------------------
| Send Notification Email To School
| Since there's no database, the email IS the record -- if it fails to
| send, we tell the user rather than silently claiming success.
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

    $mail->setFrom(SMTP_FROM_EMAIL, SCHOOL_NAME . ' - Admission Form');
    $mail->addAddress(SCHOOL_EMAIL);

    if (!empty($email)) {
        $mail->addReplyTo($email, $student_name . ' (Parent/Guardian)');
    }

    $mail->addAttachment($uploadedFiles['photo'], 'Student Photo - ' . $student_name);
    $mail->addAttachment($uploadedFiles['birth_certificate'], 'Birth Certificate - ' . $student_name);
    $mail->addAttachment($uploadedFiles['aadhaar'], 'Aadhaar Card - ' . $student_name);

    $mail->isHTML(true);
    $mail->Subject = 'New Admission Enquiry - ' . $student_name;

    $mail->Body = '
        <h2>New Admission Enquiry</h2>
        <p><strong>Student Name:</strong> ' . $student_name . '</p>
        <p><strong>Gender:</strong> ' . $gender . '</p>
        <p><strong>Date of Birth:</strong> ' . $dob . ' (' . $age . ')</p>
        <p><strong>Class Applying For:</strong> ' . $class . '</p>
        <p><strong>Nationality:</strong> ' . $nationality . '</p>
        <hr>
        <p><strong>Father Name:</strong> ' . $father_name . ' (' . $father_occupation . ')</p>
        <p><strong>Mother Name:</strong> ' . $mother_name . ' (' . $mother_occupation . ')</p>
        <p><strong>Mobile:</strong> ' . $mobile . '</p>
        <p><strong>Alternate Mobile:</strong> ' . $alternate_mobile . '</p>
        <p><strong>Email:</strong> ' . $email . '</p>
        <hr>
        <p><strong>Address:</strong> ' . $house_no . ', ' . $street . ', ' . $landmark . ', ' . $city . ', ' . $state . ' - ' . $pincode . '</p>
        <hr>
        <p><strong>Previous School:</strong> ' . $previous_school . '</p>
        <p><strong>Last Class Studied:</strong> ' . $last_class . '</p>
        <p><strong>Medium:</strong> ' . $medium . '</p>
        <p><strong>TC Available:</strong> ' . $tc_available . '</p>
        <p><strong>Admission Type:</strong> ' . $admission_type . '</p>
        <p><strong>Reason:</strong> ' . $reason . '</p>
        <p><strong>Medical Info:</strong> ' . $medical . '</p>
    ';

    $mail->send();

} catch (PHPMailerException $e) {
    error_log('Admission email failed: ' . $mail->ErrorInfo);
    cleanupUploadedFiles($writtenFiles);
    response('error', 'We could not send your application right now. Please try again shortly or call the school directly.', 500);
}

/*
|--------------------------------------------------------------------------
| Success -- clean up local copies, the email already has everything
|--------------------------------------------------------------------------
*/

cleanupUploadedFiles($writtenFiles);

unset($_SESSION['csrf_token']);

response('success', 'Application submitted successfully. Our team will contact you soon.');
