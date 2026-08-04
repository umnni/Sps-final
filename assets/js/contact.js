/*=========================================
    Santosh Public School
    Contact Form Logic

    Exported as initContactForm() so the
    SPA router can (re)initialize it every
    time the contact page markup is
    injected into the DOM.
=========================================*/

function validateEmailFormat(emailValue) {
    if (emailValue.trim() === "") return true;
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(emailValue);
}

function validateMobileFormat(number) {
    if (number.trim() === "") return true;
    return /^[6-9]\d{9}$/.test(number);
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

export function initContactForm() {

    const form = document.getElementById("contactForm");

    if (!form) return;

    const nameField = form.querySelector('input[name="name"]');
    const mobile = form.querySelector('input[name="mobile"]');
    const email = form.querySelector('input[name="email"]');
    const message = form.querySelector('textarea[name="message"]');
    const submitBtn = document.getElementById("contactSubmitBtn");
    const csrfField = document.getElementById("contactCsrfToken");

    /*=========================================
        CSRF Token
        Fetch a fresh token for this session
        and store it in the hidden field.
    =========================================*/

    function refreshCsrfToken() {
        if (!csrfField) return;

        fetch("php/csrf.php")
            .then((res) => res.json())
            .then((data) => {
                if (data && data.token) {
                    csrfField.value = data.token;
                }
            })
            .catch((error) => console.error("Could not fetch CSRF token:", error));
    }

    refreshCsrfToken();

    /*=========================================
        Digits-only Mobile Input
    =========================================*/

    if (mobile) {
        mobile.addEventListener("input", () => {
            mobile.value = mobile.value.replace(/\D/g, "");
        });
    }

    /*=========================================
        Form Submit
    =========================================*/

    form.addEventListener("submit", async function (e) {

        e.preventDefault();

        /* Field Validation */

        if (!nameField.value.trim()) {
            showError("Please enter your name.");
            nameField.focus();
            return;
        }

        if (!mobile.value.trim() && !email.value.trim()) {
            showError("Please provide at least a mobile number or an email address.");
            mobile.focus();
            return;
        }

        if (!validateMobileFormat(mobile.value)) {
            showError("Please enter a valid 10-digit mobile number.");
            mobile.focus();
            return;
        }

        if (!validateEmailFormat(email.value)) {
            showError("Please enter a valid email address.");
            email.focus();
            return;
        }

        if (!message.value.trim()) {
            showError("Please enter your message.");
            message.focus();
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
            Sending...
        `;

        try {

            const formData = new FormData(form);

            const response = await fetch("php/submit-contact.php", {
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
                const waUrl = buildWhatsAppUrl("CONTACT US PAGE - ENQUIRY", [
                    ["Name", nameField?.value],
                    ["Mobile", mobile?.value],
                    ["Email", email?.value],
                    ["Message", message?.value],
                ]);

                alert(result.message);
                form.reset();
                refreshCsrfToken();

                /* Redirect to WhatsApp with the enquiry data pre-filled. */
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