/*=========================================
        TWAGALANE ADMIN USERS
=========================================*/

import { db } from "./firebase.js";

import {
    ref,
    get,
    update,
    remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/*=========================================
STATE
=========================================*/

const state = {

    users: [],
    filteredUsers: [],
    currentUser: null,

    currentPage: 1,
    pageSize: 10,

    loading: false

};

/*=========================================
MAIN DOM
=========================================*/

const usersTable = document.getElementById("usersTable");

const searchInput =
document.getElementById("userSearch");

const genderFilter =
document.getElementById("genderFilter");

const statusFilter =
document.getElementById("statusFilter");

const verifiedFilter =
document.getElementById("verifiedFilter");

const applyFiltersBtn =
document.getElementById("applyFilters");

const exportUsersBtn =
document.getElementById("exportUsersBtn");

const prevBtn =
document.getElementById("prevUsers");

const nextBtn =
document.getElementById("nextUsers");

const pageNumber =
document.getElementById("pageNumber");

/*=========================================
USER MODAL
=========================================*/

const userModal =
document.getElementById("userModal");

const closeUserModalBtn =
document.getElementById("closeUserModal");

const closeModalBtn =
document.getElementById("closeModalBtn");

/*=========================================
HEADER
=========================================*/

const modalAvatar =
document.getElementById("modalAvatar");

const modalName =
document.getElementById("modalName");

const modalUsername =
document.getElementById("modalUsername");

const modalBadge =
document.getElementById("modalBadge");

const modalAge =
document.getElementById("modalAge");

const modalGender =
document.getElementById("modalGender");

const modalDistrict =
document.getElementById("modalDistrict");

const modalStatus =
document.getElementById("modalStatus");

const onlineIndicator =
document.getElementById("onlineIndicator");

/*=========================================
INITIALISE
=========================================*/

export async function initUsers() {

    bindEvents();

    initializeModalTabs();

    await loadUsers();

}
/*=========================================
UTILITY FUNCTIONS
=========================================*/

function getProfilePhoto(user) {

    if (user.photoURL) return user.photoURL;

    if (user.photos) {

        const photos = Object.values(user.photos);

        if (photos.length) {

            return photos[0];

        }

    }

    return "../assets/default-user.png";

}

function getPhotos(user) {

    if (!user.photos) return [];

    return Object.values(user.photos)
        .filter(photo => photo);

}

function formatDate(timestamp) {

    if (!timestamp) return "-";

    return new Date(timestamp)
        .toLocaleString();

}

/*=========================================
LOAD USERS
=========================================*/

async function loadUsers() {

    try {

        state.loading = true;

        usersTable.innerHTML = `
        <tr>
            <td colspan="8">
                Loading users...
            </td>
        </tr>
        `;

        const snapshot = await get(
            ref(db, "users")
        );

        state.users = [];

        if (snapshot.exists()) {

            snapshot.forEach(child => {

                state.users.push({

                    uid: child.key,

                    ...child.val()

                });

            });

        }

        state.filteredUsers = [...state.users];

        renderUsers();

    } catch (error) {

        console.error(error);

        usersTable.innerHTML = `
        <tr>
            <td colspan="8">
                Failed to load users.
            </td>
        </tr>
        `;

    } finally {

        state.loading = false;

    }

}
/*=========================================
RENDER USERS
=========================================*/

function renderUsers() {

    const start = (state.currentPage - 1) * state.pageSize;
    const end = start + state.pageSize;

    const users = state.filteredUsers.slice(start, end);

    if (!users.length) {

        usersTable.innerHTML = `
        <tr>
            <td colspan="8">
                No users found.
            </td>
        </tr>
        `;

        updatePagination();

        return;

    }

    usersTable.innerHTML = users.map(user => {

        const info = user.personalInformation || {};
        const verification = user.verification || {};
        const home = user.location?.home || {};

        const avatar = getProfilePhoto(user);

        const subscription =

            user.subscription?.plan ||

            user.subscription?.type ||

            "Free";

        const status =

            user.status ||

            (user.online ? "Online" : "Offline");

        const verified =

            verification.status === "approved"

                ? "✔"

                : "";

        return `

        <tr>

            <td>

                <div class="user-cell">

                    <img
                        class="table-avatar"
                        src="${avatar}"
                        onerror="this.src='../assets/default-user.png'">

                    <div>

                        <strong>

                            ${info.fullName || user.username || "Unknown"}

                            ${verified}

                        </strong>

                        <br>

                        <small>@${user.username || ""}</small>

                        <br>

                        <small>${user.email || ""}</small>

                    </div>

                </div>

            </td>

            <td>${info.gender || "-"}</td>

            <td>${info.age || "-"}</td>

            <td>${home.district || "-"}</td>

            <td>${info.phoneNumber || "-"}</td>

            <td>${subscription}</td>

            <td>${status}</td>

            <td>

                <button

                    class="view-user-btn"

                    data-id="${user.uid}">

                    View

                </button>

            </td>

        </tr>

        `;

    }).join("");

    updatePagination();

    setupViewButtons();

}

/*=========================================
PAGINATION
=========================================*/

function updatePagination() {

    const totalPages = Math.max(

        1,

        Math.ceil(

            state.filteredUsers.length /

            state.pageSize

        )

    );

    pageNumber.textContent =

        `Page ${state.currentPage} of ${totalPages}`;

    prevBtn.disabled =

        state.currentPage === 1;

    nextBtn.disabled =

        state.currentPage === totalPages;

}

/*=========================================
VIEW USER BUTTONS
=========================================*/

function setupViewButtons() {

    document

        .querySelectorAll(".view-user-btn")

        .forEach(button => {

            button.onclick = () => {

                const user = state.users.find(

                    u => u.uid === button.dataset.id

                );

                if (!user) return;

                openUserModal(user);

            };

        });

}
/*=========================================
SEARCH & FILTERS
=========================================*/

function applyFilters() {

    const search =
        searchInput.value.toLowerCase().trim();

    const gender =
        genderFilter.value;

    const status =
        statusFilter.value;

    const verified =
        verifiedFilter.value;

    state.filteredUsers = state.users.filter(user => {

        const info =
            user.personalInformation || {};

        const home =
            user.location?.home || {};

        const verification =
            user.verification || {};

        const searchable = [

            info.fullName,

            user.username,

            user.email,

            info.phoneNumber,

            home.district,

            info.gender

        ].join(" ").toLowerCase();

        const searchMatch =
            searchable.includes(search);

        const genderMatch =
            !gender ||
            info.gender === gender;

        const currentStatus =
            user.status ||
            (user.online ? "Online" : "Offline");

        const statusMatch =
            !status ||
            currentStatus === status;

        const verifiedMatch =

            !verified ||

            (
                verified === "Verified" &&
                verification.status === "approved"
            ) ||

            (
                verified === "Not Verified" &&
                verification.status !== "approved"
            );

        return (

            searchMatch &&
            genderMatch &&
            statusMatch &&
            verifiedMatch

        );

    });

    state.currentPage = 1;

    renderUsers();

}

/*=========================================
REFRESH USERS
=========================================*/

async function refreshUsers() {

    await loadUsers();

}

/*=========================================
EXPORT USERS
=========================================*/

function exportUsers() {

    if (!state.filteredUsers.length) {

        alert("No users available.");

        return;

    }

    const rows = [[

        "Full Name",

        "Username",

        "Email",

        "Gender",

        "District",

        "Status"

    ]];

    state.filteredUsers.forEach(user => {

        const info =
            user.personalInformation || {};

        const home =
            user.location?.home || {};

        rows.push([

            info.fullName || "",

            user.username || "",

            user.email || "",

            info.gender || "",

            home.district || "",

            user.status || "Active"

        ]);

    });

    const csv = rows

        .map(row => row.join(","))

        .join("\n");

    const blob = new Blob(

        [csv],

        { type: "text/csv" }

    );

    const link =
        document.createElement("a");

    link.href =
        URL.createObjectURL(blob);

    link.download =
        "twagalane-users.csv";

    link.click();

    URL.revokeObjectURL(link.href);

}

/*=========================================
EVENTS
=========================================*/

function bindEvents() {

    searchInput?.addEventListener(

        "input",

        applyFilters

    );

    genderFilter?.addEventListener(

        "change",

        applyFilters

    );

    statusFilter?.addEventListener(

        "change",

        applyFilters

    );

    verifiedFilter?.addEventListener(

        "change",

        applyFilters

    );

    applyFiltersBtn?.addEventListener(

        "click",

        applyFilters

    );

    exportUsersBtn?.addEventListener(

        "click",

        exportUsers

    );

    prevBtn?.addEventListener(

        "click",

        () => {

            if (state.currentPage > 1) {

                state.currentPage--;

                renderUsers();

            }

        }

    );

    nextBtn?.addEventListener(

        "click",

        () => {

            const totalPages = Math.ceil(

                state.filteredUsers.length /

                state.pageSize

            );

            if (state.currentPage < totalPages) {

                state.currentPage++;

                renderUsers();

            }

        }

    );

    closeUserModalBtn?.addEventListener(

        "click",

        closeUserModal

    );

    closeModalBtn?.addEventListener(

        "click",

        closeUserModal

    );

    userModal?.addEventListener(

        "click",

        e => {

            if (e.target === userModal) {

                closeUserModal();

            }

        }

    );

}
/*=========================================
OPEN USER MODAL
=========================================*/

function openUserModal(user) {

    state.currentUser = user;

    populateHeader(user);
    populateProfile(user);
    populatePhotos(user);
    populatePreferences(user);
    populateLocation(user);
    populateVerification(user);
    populateActivity(user);
    populateAccount(user);
    populateNotes(user);

    userModal.classList.add("show");

}

/*=========================================
CLOSE USER MODAL
=========================================*/

function closeUserModal() {

    userModal.classList.remove("show");

    state.currentUser = null;

}

/*=========================================
HEADER
=========================================*/

function populateHeader(user) {

    const info = user.personalInformation || {};
    const location = user.location?.home || {};
    const verification = user.verification || {};

    modalAvatar.src = getProfilePhoto(user);

    modalName.textContent =
        info.fullName ||
        user.username ||
        "Unknown User";

    modalUsername.textContent =
        "@" + (user.username || "");

    modalAge.textContent =
        info.age || "-";

    modalGender.textContent =
        info.gender || "-";

    modalDistrict.textContent =
        location.district || "-";

    modalStatus.textContent =
        user.status ||
        (user.online ? "Online" : "Offline");

    if (verification.status === "approved") {

        modalBadge.innerHTML =
            `<i class="fas fa-check-circle"></i> Verified`;

    } else {

        modalBadge.innerHTML =
            `<i class="fas fa-times-circle"></i> Unverified`;

    }

    if (user.online) {

        onlineIndicator.classList.add("online");

    } else {

        onlineIndicator.classList.remove("online");

    }

}
/*=========================================
PROFILE
=========================================*/

function setText(id, value) {

    const element = document.getElementById(id);

    if (element) {

        element.textContent = value || "-";

    }

}

function populateProfile(user) {

    const info = user.personalInformation || {};

    setText("profileFullName", info.fullName);
    setText("profileUsername", user.username);
    setText("profileEmail", user.email);
    setText("profilePhone", info.phoneNumber);
    setText("profileDOB", info.dateOfBirth);
    setText("profileAge", info.age);
    setText("profileGender", info.gender);
    setText("profileHeight", info.height);
    setText("profileReligion", info.religion);
    setText("profileTribe", info.tribe);
    setText("profileEducation", info.education);
    setText("profileOccupation", info.occupation);
    setText("profileMaritalStatus", info.maritalStatus);
    setText("profileChildren", info.children);
    setText("profileLanguages", info.languages);
    setText("profileBio", info.bio);

}

/*=========================================
PHOTOS
=========================================*/

function populatePhotos(user) {

    const gallery =
        document.getElementById("userPhotoGallery");

    if (!gallery) return;

    const photos = getPhotos(user);

    if (!photos.length) {

        gallery.innerHTML =
            "<p>No photos uploaded.</p>";

        return;

    }

    gallery.innerHTML = photos.map(photo => `

        <img
            src="${photo}"
            class="user-photo"
            loading="lazy"
            onclick="window.open('${photo}','_blank')">

    `).join("");

}

/*=========================================
PREFERENCES
=========================================*/

function populatePreferences(user) {

    const pref = user.preferences || {};

    setText("prefLookingFor", pref.lookingFor);
    setText("prefGender", pref.gender);
    setText("prefAgeRange", pref.ageRange);
    setText("prefDistance", pref.distance);
    setText("prefReligion", pref.religion);
    setText("prefTribe", pref.tribe);
    setText("prefEducation", pref.education);
    setText("prefOccupation", pref.occupation);

}

/*=========================================
LOCATION
=========================================*/

function populateLocation(user) {

    const home = user.location?.home || {};

    setText("originLocation", home.origin);
    setText("homeLocation", home.address);
    setText("currentLocation", home.currentLocation);

    const mapBtn =
        document.getElementById("openMapBtn");

    if (mapBtn) {

        if (home.latitude && home.longitude) {

            mapBtn.onclick = () => {

                window.open(

                    `https://maps.google.com/?q=${home.latitude},${home.longitude}`,

                    "_blank"

                );

            };

            mapBtn.disabled = false;

        } else {

            mapBtn.disabled = true;

        }

    }

}
/*=========================================
VERIFICATION
=========================================*/

function populateVerification(user) {

    const verification = user.verification || {};

    setText("emailVerification",
        verification.emailVerified ? "Verified" : "Not Verified");

    setText("phoneVerification",
        verification.phoneVerified ? "Verified" : "Not Verified");

    setText("idVerification",
        verification.idVerified ? "Verified" : "Not Verified");

    setText("faceVerification",
        verification.faceVerified ? "Verified" : "Not Verified");

    const history =
        document.getElementById("verificationHistory");

    if (!history) return;

    if (verification.history && Array.isArray(verification.history)) {

        history.innerHTML = verification.history
            .map(item => `<li>${item}</li>`)
            .join("");

    } else {

        history.innerHTML =
            "<li>No verification history.</li>";

    }

}

/*=========================================
ACTIVITY
=========================================*/

function populateActivity(user) {

    const activity = user.activity || {};

    setText("createdAt",
        formatDate(user.createdAt));

    setText("lastLogin",
        formatDate(activity.lastLogin));

    setText("lastOnline",
        formatDate(activity.lastOnline));

    setText("activityLogins",
        activity.totalLogins);

    setText("likesSent",
        activity.likesSent);

    setText("likesReceived",
        activity.likesReceived);

    setText("activityMatches",
        activity.matches);

    setText("activityReports",
        activity.reports);

    setText("activityWarnings",
        activity.warnings);

    setText("activityBlocks",
        activity.blocks);

}

/*=========================================
ACCOUNT
=========================================*/

function populateAccount(user) {

    const account = user.account || {};
    const subscription = user.subscription || {};

    setText("accountUid", user.uid);

    setText("accountSubscription",
        subscription.plan || "Free");

    setText("accountStatus",
        user.status || "Active");

    setText("accountEmailVerified",
        user.emailVerified ? "Yes" : "No");

    setText("accountPhoneVerified",
        account.phoneVerified ? "Yes" : "No");

    setText("accountDevice",
        account.device);

    setText("accountVersion",
        account.appVersion);

    setText("accountUpdated",
        formatDate(account.updatedAt));

}

/*=========================================
ADMIN NOTES
=========================================*/

function populateNotes(user) {

    const textarea =
        document.getElementById("adminNotes");

    if (!textarea) return;

    textarea.value = user.adminNotes || "";

}
/*=========================================
SAVE ADMIN NOTES
=========================================*/

const saveNotesBtn =
document.getElementById("saveAdminNotes");

saveNotesBtn?.addEventListener("click", saveAdminNotes);

async function saveAdminNotes() {

    if (!state.currentUser) return;

    const notes = document.getElementById("adminNotes").value;

    await update(
        ref(db, `users/${state.currentUser.uid}`),
        {
            adminNotes: notes
        }
    );

    alert("Admin notes saved.");

}

/*=========================================
ADMIN ACTIONS
=========================================*/

document.getElementById("verifyUserBtn")
?.addEventListener("click", verifyCurrentUser);

document.getElementById("suspendUserBtn")
?.addEventListener("click", suspendCurrentUser);

document.getElementById("deleteUserBtn")
?.addEventListener("click", deleteCurrentUser);

document.getElementById("messageUserBtn")
?.addEventListener("click", messageCurrentUser);

document.getElementById("resetPasswordBtn")
?.addEventListener("click", resetCurrentPassword);

async function verifyCurrentUser() {

    if (!state.currentUser) return;

    await update(
        ref(db, `users/${state.currentUser.uid}/verification`),
        {
            status: "approved",
            verifiedAt: Date.now()
        }
    );

    alert("User verified.");

    await refreshUsers();

    openUserModal(
        state.users.find(u => u.uid === state.currentUser.uid)
    );

}

async function suspendCurrentUser() {

    if (!state.currentUser) return;

    if (!confirm("Suspend this user?")) return;

    await update(
        ref(db, `users/${state.currentUser.uid}`),
        {
            status: "Suspended"
        }
    );

    alert("User suspended.");

    await refreshUsers();

    closeUserModal();

}

async function deleteCurrentUser() {

    if (!state.currentUser) return;

    if (!confirm("Delete this user permanently?")) return;

    await remove(
        ref(db, `users/${state.currentUser.uid}`)
    );

    alert("User deleted.");

    await refreshUsers();

    closeUserModal();

}

function messageCurrentUser() {

    if (!state.currentUser) return;

    alert(
        `Messaging ${state.currentUser.username} will be implemented later.`
    );

}

function resetCurrentPassword() {

    if (!state.currentUser) return;

    alert(
        "Password reset will be implemented with Firebase Authentication."
    );

}

/*=========================================
MODAL TABS
=========================================*/
function initializeModalTabs() {

    const tabs = document.querySelectorAll(".modal-tab");
    const pages = document.querySelectorAll(".tab-page");

    tabs.forEach(tab => {

        tab.addEventListener("click", () => {

            tabs.forEach(btn =>
                btn.classList.remove("active")
            );

            pages.forEach(page =>
                page.classList.remove("active")
            );

            tab.classList.add("active");

            const target =
                document.getElementById(
                    tab.dataset.tab
                );

            if (target) {

                target.classList.add("active");

            }

        });

    });

}