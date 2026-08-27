// =======================================
// TWAGALANE SUPER ADMIN PANEL
// =======================================

import {
    auth,
    db
} from "./firebase.js";

import {
    ref,
    get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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
   }from "./users.js"
   
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
// =======================================
// ADMIN PERMISSION ACCESS
// =======================================

async function applyAdminPermissions() {

    try {

        const user = auth.currentUser;

        if (!user) return;

        const snapshot = await get(
            ref(db, `admins/${user.uid}`)
        );

        if (!snapshot.exists()) return;

        const admin = snapshot.val();

        const role =
            String(admin.role || "").toLowerCase();

        const permissions =
            Array.isArray(admin.permissions)
                ? admin.permissions
                : [];


        // Super Admin sees everything
        if (role === "superadmin") {
            return;
        }


        // Messaging Admin = Chat only
        if (role === "messagingadmin") {

            navLinks.forEach(link => {

                if (
                    link.id !==
                    "openCommunicationBtn"
                ) {

                    link.style.display = "none";

                }

            });

            return;
        }


        // Permission → navigation mapping
        const permissionMap = {

            dashboard: "dashboard",
            users: "users",
            roles: "roles",
            database: "database",
            locations: "locations",
            matching: "matching",
            communication: "communication",
            verification: "verification",
            reports: "reports",
            marketing: "marketing",
            analytics: "analytics",
            audit: "audit",
            system: "system"

        };


        navLinks.forEach(link => {

            if (
                link.id ===
                "openCommunicationBtn"
            ) {

                const allowed =
                    permissions.includes(
                        "messaging"
                    );

                link.style.display =
                    allowed ? "" : "none";

                return;

            }


            const section =
                link.dataset.section;

            if (!section) return;


            const requiredPermission =
                permissionMap[section] ||
                section;


            if (
                !permissions.includes(
                    requiredPermission
                )
            ) {

                link.style.display = "none";

            }

        });

    } catch (error) {

        console.error(
            "Permission check failed:",
            error
        );

    }

}
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
      await applyAdminPermissions();
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
// ==========================
// Navigation
// ==========================

navLinks.forEach(link => {

    link.addEventListener("click", (event) => {

        /*
         * CHAT IS A MODAL
         * It is NOT a page section.
         *
         * Let communication.js handle it.
         */

        if (
            link.id === "openCommunicationBtn"
        ) {

            event.preventDefault();

            return;

        }


        const sectionName =
            link.dataset.section;


        /*
         * Safety check.
         *
         * Prevent navigation code from
         * breaking when a button has no
         * page section.
         */

        if (!sectionName) {

            return;

        }


        navLinks.forEach(btn =>
            btn.classList.remove("active")
        );


        sections.forEach(section =>
            section.classList.remove("active")
        );


        link.classList.add("active");


        document
            .getElementById(
                `${sectionName}Section`
            )
            ?.classList.add("active");


        document.title =
            `Twagalane Admin • ${sectionName}`;


        showToast(
            `${link.textContent.trim()} loaded`,
            "info"
        );


        if (
            window.innerWidth <= 900
        ) {

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

});