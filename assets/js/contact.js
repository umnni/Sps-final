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

    form.addEventListener("submit", function (e) {

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

        submitBtn.disabled = true;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = "Sending...";

        const waUrl = buildWhatsAppUrl("CONTACT ENQUIRY", [
            ["Name", nameField.value],
            ["Mobile", mobile.value],
            ["Email", email.value],
            ["Message", message.value],
        ]);

        form.reset();
        window.location.href = waUrl;

        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });
}