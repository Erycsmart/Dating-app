// =======================================
// TWAGALANE DASHBOARD
// =======================================

import { db } from "./firebase.js";

import {
    ref,
    get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import { showToast } from "./admin-auth.js";

export async function initDashboard() {

    try {

        const usersSnap = await get(ref(db, "users"));

        let totalUsers = 0;
        let verifiedUsers = 0;
        let premiumUsers = 0;
        let onlineUsers = 0;
        let newUsers = 0;
        let pendingVerification = 0;

        if (usersSnap.exists()) {

            const users = usersSnap.val();

            totalUsers = Object.keys(users).length;

            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

            Object.values(users).forEach(user => {

                if (user.verification?.status === "verified") {

                    verifiedUsers++;

                }

                if (user.subscription?.active) {

                    premiumUsers++;

                }

                if (user.online === true) {

                    onlineUsers++;

                }

                if (user.createdAt && user.createdAt >= sevenDaysAgo) {

                    newUsers++;

                }

                if (user.verification?.status === "pending") {

                    pendingVerification++;

                }

            });

        }

        setValue("totalUsers", totalUsers);
        setValue("verifiedUsers", verifiedUsers);
        setValue("premiumUsers", premiumUsers);
        setValue("onlineUsers", onlineUsers);
        setValue("newUsers", newUsers);
        setValue("pendingVerification", pendingVerification);

        showToast("Dashboard updated.", "success");

    } catch (error) {

        console.error(error);

        showToast("Failed to load dashboard.", "error");

    }

}

function setValue(id, value) {

    const el = document.getElementById(id);

    if (el) {

        el.textContent = value;

    }

}