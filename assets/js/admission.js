/*=========================================
    Admission Form Initializer
=========================================*/

const SCHOOL_WHATSAPP_NUMBER = "916398780826";

function buildWhatsAppUrl(heading, fields) {
    const lines = [`*${heading}*`, `_Santosh Public School Website_`, ""];

    fields.forEach(([label, value]) => {
        if (value && String(value).trim() !== "") {
            lines.push(`*${label}:* ${value}`);
        }
    });

    return `https://wa.me/${SCHOOL_WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export function initAdmissionForm() {

    const form = document.getElementById("admissionForm");

    if (!form) return;

    const submitBtn = document.getElementById("submitBtn");
    const age = document.getElementById("age");

    form.addEventListener("submit", function (e) {

        e.preventDefault();

        const studentName = form.querySelector('input[name="student_name"]');
        const gender = form.querySelector('select[name="gender"]');
        const dob = form.querySelector('input[name="dob"]');
        const classField = form.querySelector('select[name="class"]');
        const nationality = form.querySelector('input[name="nationality"]');
        const declaration = form.querySelector('input[name="declaration"]');

        if (!studentName || !studentName.value.trim()) {
            alert("Please enter the student's full name.");
            studentName?.focus();
            return;
        }

        if (!gender || !gender.value.trim()) {
            alert("Please select the student's gender.");
            gender?.focus();
            return;
        }

        if (!dob || !dob.value.trim()) {
            alert("Please select the student's date of birth.");
            dob?.focus();
            return;
        }

        if (!classField || !classField.value.trim()) {
            alert("Please select the class applying for.");
            classField?.focus();
            return;
        }

        if (!declaration || !declaration.checked) {
            alert("Please accept the declaration before submitting.");
            declaration?.focus();
            return;
        }

        const originalText = submitBtn ? submitBtn.innerHTML : "Submit";
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = "Sending...";
        }

        const whatsappUrl = buildWhatsAppUrl("NEW ADMISSION ENQUIRY", [
            ["Student Name", studentName.value],
            ["Gender", gender.value],
            ["Date of Birth", dob.value],
            ["Age", age?.value || "N/A"],
            ["Class Applying For", classField.value],
            ["Nationality", nationality?.value || "N/A"],
        ]);

        window.location.href = whatsappUrl;

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

}