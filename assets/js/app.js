/*=========================================
    Santosh Public School
    App Entry Point

    Loads the shared header/footer components
    and boots the SPA router.
=========================================*/

import { loadPage } from "./router.js";

async function loadComponent(id, file) {
    const el = document.getElementById(id);

    if (!el) return;

    try {
        const response = await fetch(file);

        if (!response.ok) {
            throw new Error(`Unable to load ${file}`);
        }

        const html = await response.text();
        el.innerHTML = html;

        if (id === "header") {
            const btn = document.getElementById("menuBtn");

            if (btn) {
                btn.addEventListener("click", () => {
                    document
                        .getElementById("mobileMenu")
                        .classList.toggle("hidden");
                });
            }
        }

        if (id === "footer") {
            const yearEl = document.getElementById("currentYear");

            if (yearEl) {
                yearEl.textContent = new Date().getFullYear();
            }
        }

    } catch (error) {
        console.error(error);
    }
}

async function bootstrap() {
    await Promise.all([
        loadComponent("header", "components/header.html"),
        loadComponent("footer", "components/footer.html")
    ]);

    loadPage("home");
}

document.addEventListener("DOMContentLoaded", bootstrap);

/* Exposed globally because header/footer links use inline onclick="loadPage(...)" */
window.loadPage = loadPage;
