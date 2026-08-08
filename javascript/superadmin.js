// =======================================
// TWAGALANE SUPER ADMIN PANEL
// =======================================

import {
    initAuth,
    logoutAdmin,
    showToast
} from "./admin-auth.js";

import {
    initDashboard
} from "./dashboard.js";

import { 
   initUsers
   }from "./users.js";
   
import {
  initRoles
} from "./role.js";

document.addEventListener("DOMContentLoaded", async () => {

    // ==========================
    // Elements
    // ==========================

    const loadingScreen = document.getElementById("loadingScreen");
    const sidebar = document.getElementById("sidebar");
    const menuBtn = document.getElementById("menuBtn");
    const overlay = document.getElementById("sidebarOverlay");

    const navLinks = document.querySelectorAll(".nav-link");
    const sections = document.querySelectorAll(".page-section");

    const logoutBtn = document.getElementById("logoutBtn");

    // ==========================
    // Loading Screen
    // ==========================

    function hideLoading() {

        if (!loadingScreen) return;

        loadingScreen.style.opacity = "0";
        loadingScreen.style.visibility = "hidden";
        loadingScreen.style.pointerEvents = "none";

        setTimeout(() => {

            loadingScreen.remove();

        }, 300);

    }

    // ==========================
    // Initialize
    // ==========================

    try {
await initAuth();
await initDashboard();
await initUsers();
await initRoles();

hideLoading();

        showToast(
            "Administration Centre Ready",
            "success"
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to initialize admin panel.",
            "error"
        );

        hideLoading();

    }

    // ==========================
    // Sidebar
    // ==========================

    function openSidebar() {

        sidebar?.classList.add("show");

        overlay?.classList.add("show");

    }

    function closeSidebar() {

        sidebar?.classList.remove("show");

        overlay?.classList.remove("show");

    }

    menuBtn?.addEventListener("click", () => {

        sidebar.classList.contains("show")
            ? closeSidebar()
            : openSidebar();

    });

    overlay?.addEventListener("click", closeSidebar);

    // ==========================
    // Navigation
    // ==========================

    navLinks.forEach(link => {

        link.addEventListener("click", () => {

            const sectionName = link.dataset.section;

            navLinks.forEach(btn =>
                btn.classList.remove("active")
            );

            sections.forEach(section =>
                section.classList.remove("active")
            );

            link.classList.add("active");

            document
                .getElementById(`${sectionName}Section`)
                ?.classList.add("active");

            document.title =
                `Twagalane Admin • ${sectionName}`;

            showToast(
                `${link.textContent.trim()} loaded`,
                "info"
            );

            if (window.innerWidth <= 900) {

                closeSidebar();

            }

        });

    });

    // ==========================
    // Responsive Sidebar
    // ==========================

    function handleResize() {

        if (window.innerWidth > 900) {

            closeSidebar();

        }

    }

    handleResize();

    window.addEventListener("resize", handleResize);

    // ==========================
    // Logout
    // ==========================

    logoutBtn?.addEventListener("click", async () => {

        showToast("Signing out...", "info");

        setTimeout(async () => {

            await logoutAdmin();

        }, 700);

    });

    // ==========================
    // Welcome
    // ==========================

    showToast(
        "Administration Centre Ready",
        "success"
    );

});