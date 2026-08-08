// =======================================
// TWAGALANE ADMIN AUTH
// =======================================

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    ref,
    get,
    update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// =======================================
// Toast Notification
// =======================================

export function showToast(message, type = "info") {

    const container = document.getElementById("toastContainer");

    if (!container) return;

    const toast = document.createElement("div");

    toast.className = `toast ${type}`;

    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {

        toast.classList.add("show");

    }, 50);

    setTimeout(() => {

        toast.classList.remove("show");

        setTimeout(() => {

            toast.remove();

        }, 300);

    }, 3000);

}

// =======================================
// Authentication
// =======================================

export function initAuth() {

    onAuthStateChanged(auth, async (user) => {

        if (!user) {

            location.replace("admin-login.html");

            return;

        }

        try {

            const adminRef = ref(db, `admins/${user.uid}`);

            const snapshot = await get(adminRef);

            if (!snapshot.exists()) {

                await signOut(auth);

                location.replace("admin-login.html");

                return;

            }

            const admin = snapshot.val();

             if (!admin.active) {

                showToast("Access denied.", "error");

                setTimeout(async () => {

                    await signOut(auth);

                    location.replace("admin-login.html");

                }, 1500);

                return;

            }

            loadAdmin(admin);

            await update(adminRef, {

                lastLogin: Date.now()

            });

            showToast(`Welcome back ${admin.fullName}!`, "success");

        } catch (error) {

            console.error(error);

            showToast("Failed to verify administrator.", "error");

            setTimeout(() => {

                location.replace("admin-login.html");

            }, 2000);

        }

    });

}

// =======================================
// Load Admin Profile
// =======================================

function loadAdmin(admin) {

   const avatar =
    admin.photo ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(admin.fullName)}&background=FF4FA3&color=ffffff`;

    document.getElementById("adminName").textContent =
    admin.fullName || "Administrator";

    document.getElementById("welcomeAdmin").textContent =
    admin.name || "Administrator";

    document.getElementById("adminRole").textContent =
        admin.role || "Super Administrator";

    document.getElementById("adminAvatar").src = avatar;

    const topAvatar = document.getElementById("topAvatar");

    if (topAvatar) {

        topAvatar.src = avatar;

    }

}
function applyPermissions(permissions) {

    document.querySelectorAll(".nav-link").forEach(link => {

        const section = link.dataset.section;

        if (!permissions.includes(section)) {

            link.style.display = "none";

        }

    });

}

// =======================================
// Logout
// =======================================

export async function logoutAdmin() {

    try {

        await signOut(auth);

        showToast("Logged out successfully.", "success");

        setTimeout(() => {

            location.replace("admin-login.html");

        }, 1000);

    } catch (error) {

        console.error(error);

        showToast("Logout failed.", "error");

    }

}