/*=========================================
    Santosh Public School
    Admission Form Logic

    Exported as initAdmissionForm() so the
    SPA router can (re)initialize it every
    time the admission page markup is
    injected into the DOM.
=========================================*/

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "application/pdf"
];

function validateEmailFormat(emailValue) {
    if (emailValue.trim() === "") return true;
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(emailValue);
}

function validateMobileFormat(number) {
    return /^[6-9]\d{9}$/.test(number);
}

function validatePincodeFormat(pin) {
    return /^\d{6}$/.test(pin);
}

function showError(message) {
    alert(message); // TODO: replace with a nicer toast/SweetAlert2 later
}

/*=========================================
    WhatsApp Redirect
    School's WhatsApp number (with country
    code, no + or spaces).
=========================================*/
const SCHOOL_WHATSAPP_NUMBER = "916398780826";

function buildWhatsAppUrl(heading, fields) {
    const lines = [`*${heading}*`, `_Santosh Public School Website_`, ""];

    fields.forEach(([label, value]) => {
        if (value && String(value).trim() !== "") {
            lines.push(`*${label}:* ${value}`);
        }
    });

    const text = encodeURIComponent(lines.join("\n"));
    return `https://wa.me/${SCHOOL_WHATSAPP_NUMBER}?text=${text}`;
}

export function initAdmissionForm() {

    const form = document.getElementById("admissionForm");

    if (!form) return;

    /*=========================================
    DOM Elements
    =========================================*/

    const dob = form.querySelector('input[name="dob"]');
    const age = document.getElementById("age");
    const submitBtn = document.getElementById("submitBtn");

    const mobile = form.querySelector('input[name="mobile"]');
    const alternateMobile = form.querySelector('input[name="alternate_mobile"]');
    const email = form.querySelector('input[name="email"]');
    const pincode = form.querySelector('input[name="pincode"]');

    const passport = document.getElementById("photo");
    const birth = document.getElementById("birthCertificate");
    const aadhaar = document.getElementById("aadhaar");

    const photoName = document.getElementById("photoName");
    const birthName = document.getElementById("birthName");
    const aadhaarName = document.getElementById("aadhaarName");

    const csrfField = document.getElementById("csrfToken");

    /*=========================================
        CSRF Token
        Fetch a fresh token for this session
        and store it in the hidden field.
    =========================================*/

    if (csrfField) {
        fetch("php/csrf.php")
            .then((res) => res.json())
            .then((data) => {
                if (data && data.token) {
                    csrfField.value = data.token;
                }
            })
            .catch((error) => console.error("Could not fetch CSRF token:", error));
    }

    /*=========================================
        Auto Age Calculator
    =========================================*/

    if (dob && age) {
        dob.addEventListener("change", () => {

            if (!dob.value) {
                age.value = "";
                return;
            }

            const birthDate = new Date(dob.value);
            const today = new Date();

            let years = today.getFullYear() - birthDate.getFullYear();
            const month = today.getMonth() - birthDate.getMonth();

            if (
                month < 0 ||
                (month === 0 && today.getDate() < birthDate.getDate())
            ) {
                years--;
            }

            age.value = years + " Years";
        });
    }

    /*=========================================
        File Validation + Preview
    =========================================*/

    function validateFile(file, label) {

        if (!file) return false;

        if (file.size > MAX_SIZE) {
            alert(label + " must be under 5 MB.");
            return false;
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            alert(label + " has invalid format.");
            return false;
        }

        return true;
    }

    function wireFileInput(input, nameEl, label) {

        if (!input || !nameEl) return;

        input.addEventListener("change", () => {

            if (!input.files.length) return;

            if (!validateFile(input.files[0], label)) {
                input.value = "";
                nameEl.innerHTML = "No file selected";
                return;
            }

            nameEl.innerHTML = input.files[0].name;
        });
    }

    wireFileInput(passport, photoName, "Passport Photo");
    wireFileInput(birth, birthName, "Birth Certificate");
    wireFileInput(aadhaar, aadhaarName, "Aadhaar Card");

    /*=========================================
        Digits-only Inputs
    =========================================*/

    function onlyNumber(input) {
        if (!input) return;

        input.addEventListener("input", () => {
            input.value = input.value.replace(/\D/g, "");
        });
    }

    onlyNumber(mobile);
    onlyNumber(alternateMobile);
    onlyNumber(pincode);

    /*=========================================
        Form Submit
    =========================================*/

    form.addEventListener("submit", async function (e) {

        e.preventDefault();

        /* Field Validation */

        if (!validateMobileFormat(mobile.value)) {
            showError("Please enter a valid 10-digit mobile number.");
            mobile.focus();
            return;
        }

        if (alternateMobile.value && !validateMobileFormat(alternateMobile.value)) {
            showError("Alternate mobile number is invalid.");
            alternateMobile.focus();
            return;
        }

        if (!validateEmailFormat(email.value)) {
            showError("Please enter a valid email address.");
            email.focus();
            return;
        }

        if (!validatePincodeFormat(pincode.value)) {
            showError("Please enter a valid 6-digit pincode.");
            pincode.focus();
            return;
        }

        /* Required Documents */

        if (!passport.files.length) {
            showError("Please upload Passport Photo.");
            return;
        }

        if (!birth.files.length) {
            showError("Please upload Birth Certificate.");
            return;
        }

        if (!aadhaar.files.length) {
            showError("Please upload Aadhaar Card.");
            return;
        }

        /* Loading State */

        submitBtn.disabled = true;
        const originalText = submitBtn.innerHTML;

        submitBtn.innerHTML = `
            <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg"
                 fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            Submitting...
        `;

        try {

            const formData = new FormData(form);

            const response = await fetch("php/submit-admission.php", {
                method: "POST",
                body: formData
            });

            let result;

            try {
                result = await response.json();
            } catch (parseError) {
                throw new Error("Unexpected server response.");
            }

            if (response.ok && result.status === "success") {

                /* Build the WhatsApp message BEFORE the form is reset,
                   so we still have the values the user typed in. */
                const waUrl = buildWhatsAppUrl("ADMISSION PAGE - FORM DATA", [
                    ["Student Name", form.querySelector('[name="student_name"]')?.value],
                    ["Gender", form.querySelector('[name="gender"]')?.value],
                    ["Date of Birth", dob?.value],
                    ["Age", age?.value],
                    ["Class Applying For", form.querySelector('[name="class"]')?.value],
                    ["Nationality", form.querySelector('[name="nationality"]')?.value],
                    ["Father Name", form.querySelector('[name="father_name"]')?.value],
                    ["Mother Name", form.querySelector('[name="mother_name"]')?.value],
                    ["Mobile", mobile?.value],
                    ["Alternate Mobile", alternateMobile?.value],
                    ["Email", email?.value],
                    ["City", form.querySelector('[name="city"]')?.value],
                    ["State", form.querySelector('[name="state"]')?.value],
                    ["Pincode", pincode?.value],
                    ["Previous School", form.querySelector('[name="previous_school"]')?.value],
                    ["Admission Type", form.querySelector('[name="admission_type"]')?.value],
                ]);

                alert(result.message);
                form.reset();

                if (age) age.value = "";
                if (photoName) photoName.innerHTML = "No file selected";
                if (birthName) birthName.innerHTML = "No file selected";
                if (aadhaarName) aadhaarName.innerHTML = "No file selected";

                if (csrfField) {
                    fetch("php/csrf.php")
                        .then((res) => res.json())
                        .then((data) => {
                            if (data && data.token) csrfField.value = data.token;
                        })
                        .catch(() => {});
                }

                /* Redirect to WhatsApp with the form data pre-filled. */
                window.location.href = waUrl;

            } else {
                showError(result.message || "Something went wrong. Please try again.");
            }

        } catch (error) {
            console.error(error);
            showError("Something went wrong. Please try again.");
        }

        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });
}
