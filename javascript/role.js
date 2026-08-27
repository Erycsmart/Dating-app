/*=========================================
        ROLES & PERMISSIONS
=========================================*/

import { db } from "./firebase.js";

import {
    ref,
    get,
    update,
    remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import {
    showToast
} from "./admin-auth.js";

/*=========================================
STATE
=========================================*/

const state = {
    admins: [],
    selectedAdmin: null
};

/*=========================================
DOM
=========================================*/

const adminsTable = document.getElementById("adminsTable");

const totalAdmins = document.getElementById("totalAdmins");
const totalModerators = document.getElementById("totalModerators");
const totalSupportAdmins = document.getElementById("totalSupportAdmins");
const activeAdminSessions = document.getElementById("activeAdminSessions");

const createAdminBtn = document.getElementById("createAdminBtn");

const createAdminModal = document.getElementById("createAdminModal");
const closeCreateAdminModalBtn = document.getElementById("closeCreateAdminModal");
const cancelCreateAdminBtn = document.getElementById("cancelCreateAdmin");
const saveAdminBtn = document.getElementById("saveAdminBtn");

/*=========================================
INIT
=========================================*/

export async function initRoles() {

    try {

        bindEvents();

        await loadAdmins();

    } catch (error) {

        console.error("Roles Module:", error);

        showToast(
            "Failed to load Roles & Permissions",
            "error"
        );

    }

}

/*=========================================
LOAD ADMINS
=========================================*/

async function loadAdmins() {

    try {

        const snapshot = await get(ref(db, "admins"));

        state.admins = [];

        if (snapshot.exists()) {

            snapshot.forEach(item => {

                state.admins.push({
                    uid: item.key,
                    ...item.val()
                });

            });

        }

        updateStatistics();

        renderAdmins();

    } catch (error) {

        console.error(error);

        showToast(
            "Unable to load administrators.",
            "error"
        );

    }

}
/*=========================================
STATISTICS
=========================================*/

function updateStatistics() {

    if (totalAdmins)
        totalAdmins.textContent = state.admins.length;

    if (totalModerators)
        totalModerators.textContent =
            state.admins.filter(a => a.role === "moderator").length;

    if (totalSupportAdmins)
        totalSupportAdmins.textContent =
            state.admins.filter(a => a.role === "support").length;
  const totalMessagingAdmins =
    document.getElementById("totalMessagingAdmins");

if (totalMessagingAdmins)
    totalMessagingAdmins.textContent =
        state.admins.filter(
            a => a.role === "messagingAdmin"
        ).length;

    if (activeAdminSessions)
        activeAdminSessions.textContent =
            state.admins.filter(a => a.active).length;

}

/*=========================================
TABLE
=========================================*/

function renderAdmins() {

    if (!adminsTable) return;

    if (!state.admins.length) {

        adminsTable.innerHTML = `
        <tr>
            <td colspan="6" style="text-align:center;">
                No administrators found
            </td>
        </tr>`;

        return;

    }

    adminsTable.innerHTML = state.admins.map(admin => `

<tr>

<td>
<b>${admin.fullName || "-"}</b><br>
<small>${admin.username || "-"}</small>
</td>

<td>${admin.role || "-"}</td>

<td>${admin.email || "-"}</td>

<td>
${admin.active
? '<span class="badge success">Active</span>'
: '<span class="badge danger">Disabled</span>'}
</td>

<td>
${admin.lastLogin
? new Date(admin.lastLogin).toLocaleString()
: "Never"}
</td>

<td>

<button
class="edit-admin"
data-id="${admin.uid}">
Edit
</button>

<button
class="toggle-admin"
data-id="${admin.uid}">
${admin.active ? "Disable" : "Enable"}
</button>

<button
class="delete-admin"
data-id="${admin.uid}">
Delete
</button>

</td>

</tr>

`).join("");

}

/*=========================================
EVENTS
=========================================*/

function bindEvents() {

    createAdminBtn?.addEventListener(
        "click",
        openCreateAdminModal
    );

    closeCreateAdminModalBtn?.addEventListener(
        "click",
        closeCreateAdminModal
    );

    cancelCreateAdminBtn?.addEventListener(
        "click",
        closeCreateAdminModal
    );

    saveAdminBtn?.addEventListener(
        "click",
        saveAdmin
    );

    adminsTable?.addEventListener(
        "click",
        handleTableClick
    );

}

/*=========================================
MODAL
=========================================*/

function openCreateAdminModal() {

    createAdminModal?.classList.add("active");

}

function closeCreateAdminModal() {

    createAdminModal?.classList.remove("active");

}
/*=========================================
SAVE ADMIN
=========================================*/

async function saveAdmin() {

    try {

        const fullName =
            document.getElementById("adminFullName")
                ?.value.trim();

        const username =
            document.getElementById("adminUsername")
                ?.value.trim();

        const email =
            document.getElementById("adminEmail")
                ?.value.trim();

        const password =
            document.getElementById("adminPassword")
                ?.value;

        const confirmPassword =
            document.getElementById("adminConfirmPassword")
                ?.value;

        const role =
            document.getElementById("newAdminRole")
                ?.value;


        /* =====================================
           COLLECT PERMISSIONS
        ===================================== */

        const permissions = [];

        document
            .querySelectorAll(
                "#createAdminModal .permissions-grid input[type='checkbox']:checked"
            )
            .forEach(checkbox => {

                permissions.push(
                    checkbox.value
                );

            });


        /* =====================================
           VALIDATION
        ===================================== */

        if (
            !fullName ||
            !username ||
            !email ||
            !password
        ) {

            showToast(
                "Please complete all required fields.",
                "error"
            );

            return;

        }


        if (
            password !== confirmPassword
        ) {

            showToast(
                "Passwords do not match.",
                "error"
            );

            return;

        }


        /* =====================================
           CURRENT ADMIN
        ===================================== */

        const {
            auth
        } = await import("./firebase.js");


        const currentUser =
            auth.currentUser;


        if (!currentUser) {

            showToast(
                "Your admin session has expired. Please sign in again.",
                "error"
            );

            return;

        }


        /* =====================================
           FIREBASE ID TOKEN
        ===================================== */

        const idToken =
            await currentUser.getIdToken(
                true
            );


        /* =====================================
           CREATE ADMIN
        ===================================== */

        const response =
            await fetch(
                "http://127.0.0.1:3000/api/admins/create",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${idToken}`

                    },

                    body: JSON.stringify({

                        fullName,

                        username,

                        email,

                        password,

                        role,

                        permissions

                    })

                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.message ||
                "Unable to create administrator."
            );

        }


        /* =====================================
           SUCCESS
        ===================================== */

        showToast(
            "Administrator created successfully.",
            "success"
        );


        closeCreateAdminModal();


        /* =====================================
           RESET FORM
        ===================================== */

        document
            .getElementById(
                "adminFullName"
            )
            .value = "";

        document
            .getElementById(
                "adminUsername"
            )
            .value = "";

        document
            .getElementById(
                "adminEmail"
            )
            .value = "";

        document
            .getElementById(
                "adminPassword"
            )
            .value = "";

        document
            .getElementById(
                "adminConfirmPassword"
            )
            .value = "";

        document
            .getElementById(
                "newAdminRole"
            )
            .selectedIndex = 0;


        document
            .querySelectorAll(
                "#createAdminModal .permissions-grid input[type='checkbox']"
            )
            .forEach(
                checkbox =>
                    checkbox.checked = false
            );


        await loadAdmins();


    } catch (error) {

        console.error(
            "SAVE ADMIN ERROR:",
            error
        );

        showToast(
            error.message ||
            "Unable to create administrator.",
            "error"
        );

    }

}

/*=========================================
TABLE EVENTS
=========================================*/

function handleTableClick(e) {

    const id = e.target.dataset.id;

    if (!id) return;

    if (e.target.classList.contains("delete-admin")) {

        deleteAdmin(id);

    }

    if (e.target.classList.contains("toggle-admin")) {

        toggleAdmin(id);

    }

    if (e.target.classList.contains("edit-admin")) {

        editAdmin(id);

    }

}

/*=========================================
EDIT ADMIN
=========================================*/

function editAdmin(uid) {

    const admin =
        state.admins.find(a => a.uid === uid);

    if (!admin) return;

    showToast(
        `Editing ${admin.fullName}`,
        "info"
    );

    // Edit modal implementation will be added later.

}
/*=========================================
DELETE ADMIN
=========================================*/

async function deleteAdmin(uid) {

    if (!confirm("Delete this administrator?")) return;

    try {

        await remove(ref(db, "admins/" + uid));

        showToast(
            "Administrator deleted.",
            "success"
        );

        await loadAdmins();

    } catch (error) {

        console.error(error);

        showToast(
            "Unable to delete administrator.",
            "error"
        );

    }

}

/*=========================================
ENABLE / DISABLE
=========================================*/

async function toggleAdmin(uid) {

    try {

        const admin =
            state.admins.find(a => a.uid === uid);

        if (!admin) return;

        await update(

            ref(db, "admins/" + uid),

            {
                active: !admin.active
            }

        );

        showToast(
            admin.active
                ? "Administrator disabled."
                : "Administrator enabled.",
            "success"
        );

        await loadAdmins();

    } catch (error) {

        console.error(error);

        showToast(
            "Unable to update administrator.",
            "error"
        );

    }

}