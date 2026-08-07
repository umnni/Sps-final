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

/*=========================================
    PAGE META — Manually set title & description
    for each page. Edit these values as needed.

    "home" is used when the user returns to
    the homepage.
=========================================*/
const pageMeta = {
    home: {
        title: "Santosh Public School — English Medium | Greater Noida West",
        description: "Santosh Public School is a leading English medium school in Greater Noida West offering quality education from Nursery to Class 8."
    },
    "about-us": {
        title: "About Us — Santosh Public School | Greater Noida West",
        description: "Learn about Santosh Public School's history, mission, vision and values. Quality English medium education in Greater Noida West."
    },
    blog: {
        title: "Blog — Latest News & Updates | Santosh Public School",
        description: "Stay updated with the latest news, educational insights and school events from Santosh Public School, Greater Noida West."
    },
    contact: {
        title: "Contact Us — Santosh Public School | Greater Noida West",
        description: "Get in touch with Santosh Public School. Find our address, phone number, email and location in Greater Noida West."
    },
    admission: {
        title: "Admission Open 2025-26 — Santosh Public School | Greater Noida West",
        description: "Apply for admission at Santosh Public School, Greater Noida West. Enrollments open for Nursery to Class 8. Fill the online form now."
    }
};

/* Helper: update the <title> and <meta name="description"> */
function updateMeta(page) {
    const meta = pageMeta[page] || pageMeta["home"];
    document.title = meta.title;

    let descTag = document.querySelector('meta[name="description"]');
    if (!descTag) {
        descTag = document.createElement("meta");
        descTag.setAttribute("name", "description");
        document.head.appendChild(descTag);
    }
    descTag.setAttribute("content", meta.description);
}

export async function loadPage(page) {
    const content = document.getElementById("content");

    if (!content) {
        console.error("Missing #content element.");
        return;
    }

    /* If navigating to home, restore original content & meta */
    if (page === "home") {
        if (window.showIndexHome) window.showIndexHome();
        updateMeta("home");
        return;
    }

    try {
        let response = await fetch(`pages/${page}.html`);

        if (!response.ok) {
            response = await fetch(`pages/404.html`);
        }

        const html = await response.text();

        content.innerHTML = html;

        /* Update meta title & description */
        updateMeta(page);

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
