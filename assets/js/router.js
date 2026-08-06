/*=========================================
    Santosh Public School
    SPA Router

    Loads page fragments into #content and
    runs any page-specific initializer after
    the markup has been injected into the DOM.
=========================================*/

import { initAdmissionForm } from "./admission.js";
import { initContactForm } from "./contact.js";
import { initBlogPage } from "./blog.js";

/* Map of page name -> initializer to run after that page's HTML loads */
const pageInitializers = {
    admission: initAdmissionForm,
    contact: initContactForm,
    blog: initBlogPage
};

export async function loadPage(page) {
    const content = document.getElementById("content");

    if (!content) {
        console.error("Missing #content element.");
        return;
    }

    try {
        let response = await fetch(`pages/${page}.html`);

        if (!response.ok) {
            response = await fetch(`pages/404.html`);
        }

        const html = await response.text();

        content.innerHTML = html;

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        /* Close mobile menu after navigation, if open */
        const mobileMenu = document.getElementById("mobileMenu");

        if (mobileMenu) {
            mobileMenu.classList.add("hidden");
        }

        /* Run page-specific JS now that its HTML exists in the DOM */

        const init = pageInitializers[page];

        if (typeof init === "function") {
            init();
        }

    } catch (error) {

        console.error(error);

        content.innerHTML = `
            <div class="text-center py-20">
                <h1 class="text-5xl font-bold text-red-600">
                    Something Went Wrong
                </h1>

                <p class="mt-5 text-gray-600">
                    Please try again later.
                </p>
            </div>
        `;
    }
}
