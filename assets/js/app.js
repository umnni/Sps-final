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
    // Preserve the server-rendered index content as the canonical Home
    const contentEl = document.getElementById("content");
    window.indexHomeHtml = contentEl ? contentEl.innerHTML : "";

    await Promise.all([
        loadComponent("header", "components/header.html"),
        loadComponent("footer", "components/footer.html")
    ]);

    // Expose a helper to restore the original index.html home content
    window.showIndexHome = function () {
        const c = document.getElementById("content");

        if (!c) return;

        if (window.indexHomeHtml && window.indexHomeHtml.length) {
            c.innerHTML = window.indexHomeHtml;
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    };
}

document.addEventListener("DOMContentLoaded", bootstrap);

/* Exposed globally because header/footer links use inline onclick="loadPage(...)" */
window.loadPage = loadPage;
