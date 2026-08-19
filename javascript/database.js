/* =========================================
   TWAGALANE DATABASE CENTRE
   STAGE 1 — DATABASE READER
========================================= */

import { db } from "./firebase.js";
import { showToast } from "./admin-auth.js";
import {
    ref,
    get,
    push,
    update,
    set
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


/* =========================================
   DATABASE STATE
========================================= */

const databaseState = {

    users: [],

    filteredUsers: [],

    loaded: false,
  
  duplicateGroups: []

};


/* =========================================
   DOM HELPER
========================================= */

function $(id) {

    return document.getElementById(id);

}


/* =========================================
   SAFE TEXT
========================================= */

function safeText(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "-";

    }

    return String(value);

}


/* =========================================
   GET USER INFORMATION
========================================= */

function getPersonalInformation(user) {

    return user?.personalInformation || {};

}


function getHomeInformation(user) {

    return user?.location?.home || {};

}


/* =========================================
   USER FIELDS
========================================= */

function getName(user) {

    const info =
        getPersonalInformation(user);

    return (
        info.fullName ||
        info.name ||
        user.fullName ||
        user.name ||
        user.username ||
        "Unknown User"
    );

}


function getEmail(user) {

    const info =
        getPersonalInformation(user);

    return (
        info.email ||
        user.email ||
        "-"
    );

}


function getGender(user) {

    const info =
        getPersonalInformation(user);

    return (
        info.gender ||
        user.gender ||
        ""
    );

}


function getDistrict(user) {

    const info =
        getPersonalInformation(user);

    const home =
        getHomeInformation(user);

    return (
        home.district ||
        info.district ||
        user.district ||
        ""
    );

}


function getReligion(user) {

    const info =
        getPersonalInformation(user);

    return (
        info.religion ||
        user.religion ||
        ""
    );

}


function getTribe(user) {

    const info =
        getPersonalInformation(user);

    return (
        info.tribe ||
        user.tribe ||
        ""
    );

}


function getEducation(user) {

    const info =
        getPersonalInformation(user);

    return (
        info.education ||
        user.education ||
        ""
    );

}


function getOccupation(user) {

    const info =
        getPersonalInformation(user);

    return (
        info.occupation ||
        user.occupation ||
        ""
    );

}
/* =========================================
   PROFILE PHOTO
========================================= */

function getProfilePhoto(user) {

    if (!user) {
        return "";
    }


    /*
        Some older records may have
        photoURL directly on the user.
    */

    if (
        typeof user.photoURL === "string" &&
        user.photoURL.trim()
    ) {

        return user.photoURL.trim();

    }


    const photos =
        user.photos;


    if (!photos) {
        return "";
    }


    /*
        New/current structure:
        photos: [
            "https://...",
            "https://..."
        ]
    */

    if (
        Array.isArray(photos)
    ) {

        const firstPhoto =
            photos.find(
                photo =>
                    typeof photo === "string" &&
                    photo.trim()
            );


        return firstPhoto || "";

    }


    /*
        Older/object structure:
        photos: {
            profile: "https://...",
            photo1: "https://..."
        }
    */

    if (
        typeof photos === "object"
    ) {

        if (
            typeof photos.profile === "string" &&
            photos.profile.trim()
        ) {

            return photos.profile.trim();

        }


        const firstPhoto =
            Object.values(
                photos
            ).find(
                photo =>
                    typeof photo === "string" &&
                    photo.trim()
            );


        return firstPhoto || "";

    }


    return "";

}

/* =========================================
   AGE
========================================= */

function calculateAge(dateOfBirth) {

    if (!dateOfBirth) {

        return "";

    }


    const birthDate =
        new Date(dateOfBirth);


    if (
        Number.isNaN(
            birthDate.getTime()
        )
    ) {

        return "";

    }


    const today =
        new Date();


    let age =
        today.getFullYear() -
        birthDate.getFullYear();


    const monthDifference =
        today.getMonth() -
        birthDate.getMonth();


    if (
        monthDifference < 0 ||
        (
            monthDifference === 0 &&
            today.getDate() <
            birthDate.getDate()
        )
    ) {

        age--;

    }


    return age >= 0
        ? age
        : "";

}


function getAge(user) {

    const info =
        getPersonalInformation(user);


    if (
        info.age !== undefined &&
        info.age !== null &&
        info.age !== ""
    ) {

        return Number(
            info.age
        ) || info.age;

    }


    return calculateAge(
        info.dateOfBirth
    );

}


/* =========================================
   LOAD USERS
========================================= */

async function loadDatabaseUsers() {

    try {

        console.log(
            "Loading Twagalane users..."
        );


        const usersRef =
            ref(
                db,
                "users"
            );


        const snapshot =
            await get(
                usersRef
            );


        databaseState.users = [];


        if (
            snapshot.exists()
        ) {

            snapshot.forEach(
                childSnapshot => {

                    databaseState.users.push({

                        uid:
                            childSnapshot.key,

                        ...childSnapshot.val()

                    });

                }
            );

        }


        databaseState.filteredUsers =
            [
                ...databaseState.users
            ];


        databaseState.loaded =
            true;


        console.log(
            `Database loaded: ${databaseState.users.length} users`
        );


        updateDatabaseOverview();

        renderDatabaseRecords();

        renderDatabaseGroups();


    } catch (error) {

        console.error(
            "Database loading failed:",
            error
        );

        showDatabaseError(
            "Unable to load database records."
        );

    }

}


/* =========================================
   DATABASE OVERVIEW
========================================= */

function updateDatabaseOverview() {

    const totalRecords =
        $("totalRecords");


  if (totalRecords) {

    totalRecords.textContent =
        databaseState.users
            .filter(
                user =>
                    getAccountStatus(user)
                        .toLowerCase() !==
                    "archived"
            )
            .length
            .toLocaleString();

  }


    const archivedUsers =
        $("archivedUsers");

if (archivedUsers) {

    archivedUsers.textContent =
        databaseState.users
            .filter(
                user =>
                    getAccountStatus(user)
                        .toLowerCase() ===
                    "archived"
            )
            .length
            .toLocaleString();

}

    const duplicateAccounts =
        $("duplicateAccounts");


    if (duplicateAccounts) {

        duplicateAccounts.textContent =
            "0";

    }


    calculateDatabaseSize();

}


/* =========================================
   DATABASE SIZE
========================================= */

function calculateDatabaseSize() {

    const databaseSize =
        $("databaseSize");


    if (!databaseSize)
        return;


    try {

        const json =
            JSON.stringify(
                databaseState.users
            );


        const bytes =
            new Blob(
                [json]
            ).size;


        const megabytes =
            bytes /
            1024 /
            1024;


        databaseSize.textContent =
            `${megabytes.toFixed(2)} MB`;


    } catch (error) {

        console.warn(
            "Could not calculate database size:",
            error
        );


        databaseSize.textContent =
            "Unknown";

    }

}
/* =========================================
   RENDER DATABASE RECORDS
   CLICKABLE USER RECORDS
========================================= */

function renderDatabaseRecords() {

    const table =
        $("databaseRecordsTable");

    if (!table) return;


    const users =
        databaseState.filteredUsers || [];


    /* ================================
       NO RECORDS
    ================================= */

    if (!users.length) {

        table.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:30px;
                    "
                >
                    No database records found.
                </td>
            </tr>
        `;

        return;
    }


    /* ================================
       DISPLAY USERS
    ================================= */

    const visibleUsers =
        users.slice(0, 100);


    table.innerHTML = visibleUsers
        .map(user => {

            const name =
                getName(user) ||
                "Unknown User";

            const email =
                getEmail(user) ||
                "No email";

            const gender =
                getGender(user) ||
                "-";

            const age =
                getAge(user) ||
                "-";

            const district =
                getDistrict(user) ||
                "-";

            const religion =
                getReligion(user) ||
                "-";

            const occupation =
                getOccupation(user) ||
                "-";


            const verified =
                user?.verification?.status ===
                "approved";


            const premium =
                user?.subscription?.active ===
                true;


            /* =========================
               PROFILE PHOTO
            ========================= */

            const photo =
                getProfilePhoto(user);


            return `

                <tr
                    class="database-user-row"
                    data-user-uid="${escapeHtml(
                        user.uid
                    )}"
                    tabindex="0"
                    role="button"
                    aria-label="Open ${escapeHtml(
                        name
                    )}"
                >

                    <!-- USER -->

                    <td>

                        <div
                            class="database-user-cell"
                        >

                            <div
                                class="database-user-avatar"
                            >

                                ${
                                    photo

                                    ?

                                    `
                                    <img
                                        src="${escapeHtml(
                                            photo
                                        )}"
                                        alt="${escapeHtml(
                                            name
                                        )}"
                                        loading="lazy"
                                        onerror="
                                            this.onerror=null;
                                            this.src='assets/avatar.png';
                                        "
                                    >
                                    `

                                    :

                                    `
                                    <span>
                                        ${escapeHtml(
                                            name
                                                .charAt(0)
                                                .toUpperCase()
                                        )}
                                    </span>
                                    `
                                }

                            </div>


                            <div
                                class="database-user-info"
                            >

                                <strong>
                                    ${escapeHtml(
                                        name
                                    )}
                                </strong>

                                <small>
                                    ${escapeHtml(
                                        email
                                    )}
                                </small>

                            </div>

                        </div>

                    </td>


                    <!-- GENDER -->

                    <td>
                        ${escapeHtml(
                            String(gender)
                        )}
                    </td>


                    <!-- AGE -->

                    <td>
                        ${escapeHtml(
                            String(age)
                        )}
                    </td>


                    <!-- DISTRICT -->

                    <td>
                        ${escapeHtml(
                            String(district)
                        )}
                    </td>


                    <!-- RELIGION -->

                    <td>
                        ${escapeHtml(
                            String(religion)
                        )}
                    </td>


                    <!-- OCCUPATION -->

                    <td>
                        ${escapeHtml(
                            String(occupation)
                        )}
                    </td>


                    <!-- VERIFICATION -->

                    <td>

                        <span
                            class="
                                database-status
                                ${
                                    verified
                                        ? "verified"
                                        : "unverified"
                                }
                            "
                        >

                            ${
                                verified
                                    ? "Verified"
                                    : "Unverified"
                            }

                        </span>

                    </td>


                    <!-- SUBSCRIPTION -->

                    <td>

                        <span
                            class="
                                database-status
                                ${
                                    premium
                                        ? "premium"
                                        : "free"
                                }
                            "
                        >

                            ${
                                premium
                                    ? "Premium"
                                    : "Free"
                            }

                        </span>

                    </td>

                </tr>

            `;

        })
        .join("");


    /* ================================
       UPDATE RECORD COUNT
    ================================= */

    const viewCount =
        $("databaseViewCount");


    if (viewCount) {

        viewCount.textContent =
            `${users.length.toLocaleString()} records`;

    }

}

/* =========================================
   DATABASE USER MANAGEMENT EDITOR
========================================= */

const databaseUserEditor = {
    uid: null,
    user: null,
    photos: []
};


/* =========================================
   GET USER PHOTOS
========================================= */

function getUserPhotosForEditor(user) {

    const result = [];
    const seen = new Set();

    const addPhoto = (url, id = "") => {

        if (
            typeof url !== "string" ||
            !url.trim()
        ) {
            return;
        }

        const clean =
            url.trim();

        if (seen.has(clean)) {
            return;
        }

        seen.add(clean);

        result.push({
            id:
                id ||
                `photo_${result.length + 1}`,

            url:
                clean
        });

    };


    if (
        typeof user?.photoURL ===
        "string"
    ) {

        addPhoto(
            user.photoURL,
            "profile"
        );

    }


    const photos =
        user?.photos;


    if (
        Array.isArray(photos)
    ) {

        photos.forEach(
            (url, index) => {

                addPhoto(
                    url,
                    index === 0
                        ? "profile"
                        : `photo_${index + 1}`
                );

            }
        );

    }

    else if (
        photos &&
        typeof photos === "object"
    ) {

        Object.entries(
            photos
        ).forEach(
            ([key, value]) => {

                if (
                    typeof value ===
                    "string"
                ) {

                    addPhoto(
                        value,
                        key
                    );

                }

                else if (
                    value &&
                    typeof value ===
                    "object" &&
                    typeof value.url ===
                    "string"
                ) {

                    addPhoto(
                        value.url,
                        key
                    );

                }

            }
        );

    }


    return result;

}


/* =========================================
   NORMALIZE PHOTOS FOR FIREBASE
========================================= */

function normalizeEditorPhotos() {

    const photos = {};

    databaseUserEditor.photos
        .forEach(
            (photo, index) => {

                const key =
                    index === 0
                        ? "profile"
                        : (
                            photo.id ||
                            `photo_${index + 1}`
                        );

                photos[key] =
                    photo.url;

            }
        );

    return photos;

}


/* =========================================
   RENDER USER PHOTOS
========================================= */

function renderDatabaseUserPhotos() {

    const grid =
        $("databasePhotoGrid");

    const count =
        $("databasePhotoCount");


    if (!grid) {
        return;
    }


    const photos =
        databaseUserEditor.photos || [];


    if (count) {

        count.textContent =
            `${photos.length} photo${
                photos.length === 1
                    ? ""
                    : "s"
            }`;

    }


    if (!photos.length) {

        grid.innerHTML = `

            <div class="database-photo-empty">

                <span>📷</span>

                <strong>
                    No photos added yet
                </strong>

                <small>
                    Use the upload area below
                    to add this person's photos.
                </small>

            </div>

        `;

        return;

    }


    grid.innerHTML =
        photos
            .map(
                (photo, index) => `

                    <div
                        class="database-photo-card">

                        <img
                            src="${escapeHtml(
                                photo.url
                            )}"
                            alt="User photo ${
                                index + 1
                            }"
                            loading="lazy"
                            onerror="
                                this.onerror=null;
                                this.src='assets/avatar.png';
                            "
                        >

                        ${
                            index === 0
                                ? `
                                    <span
                                        class="database-photo-badge">
                                        PROFILE
                                    </span>
                                  `
                                : ""
                        }

                        <button
                            type="button"
                            class="database-photo-remove"
                            data-photo-id="${escapeHtml(
                                photo.id
                            )}"
                            aria-label="Remove photo">

                            ×

                        </button>

                    </div>

                `
            )
            .join("");


    grid
        .querySelectorAll(
            ".database-photo-remove"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        removeDatabaseUserPhoto(
                            button.dataset.photoId
                        );

                    }
                );

            }
        );

}


/* =========================================
   FILL EDIT FORM
========================================= */

function fillDatabaseUserForm(user) {

    const info =
        getPersonalInformation(user);

    const home =
        getHomeInformation(user);


    $("databaseEditUid").value =
        user.uid || "";


    $("databaseEditUidDisplay")
        .textContent =
        user.uid || "-";


    $("databaseUserModalTitle")
        .textContent =
        getName(user);


    $("databaseUserModalSubtitle")
        .textContent =
        `${getEmail(user) || "No email"} • ${
            user.uid || "No UID"
        }`;


    $("editFullName").value =
        info.fullName ||
        info.name ||
        user.fullName ||
        user.name ||
        "";


    $("editUsername").value =
        info.username ||
        user.username ||
        "";


    $("editEmail").value =
        info.email ||
        user.email ||
        "";


    $("editPhone").value =
        info.phone ||
        info.phoneNumber ||
        user.phone ||
        user.phoneNumber ||
        "";


    $("editGender").value =
        info.gender ||
        user.gender ||
        "";


    $("editDateOfBirth").value =
        info.dateOfBirth ||
        "";


    $("editAge").value =
        info.age ??
        "";


    $("editDistrict").value =
        home.district ||
        info.district ||
        user.district ||
        "";


    $("editReligion").value =
        info.religion ||
        user.religion ||
        "";


    $("editTribe").value =
        info.tribe ||
        user.tribe ||
        "";


    $("editEducation").value =
        info.education ||
        user.education ||
        "";


    $("editOccupation").value =
        info.occupation ||
        user.occupation ||
        "";


    $("editMaritalStatus").value =
        info.maritalStatus ||
        "";


    $("editAccountStatus").value =
        getAccountStatus(user);


    databaseUserEditor.photos =
        getUserPhotosForEditor(
            user
        );


    renderDatabaseUserPhotos();

}


/* =========================================
   OPEN USER EDITOR
========================================= */

function openDatabaseUserModal(uid) {


      const table =
        $("databaseRecordsTable");

    if (table) {

        table.addEventListener(
            "click",
            event => {

                const row =
                    event.target.closest(
                        ".database-user-row"
                    );

                if (!row) {
                    return;
                }

                const uid =
                    row.dataset.userUid;

                if (!uid) {
                    return;
                }

                openDatabaseUserModal(
                    uid
                );

            }
        );


        table.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !== "Enter" &&
                    event.key !== " "
                ) {
                    return;
                }

                const row =
                    event.target.closest(
                        ".database-user-row"
                    );

                if (!row) {
                    return;
                }

                event.preventDefault();

                const uid =
                    row.dataset.userUid;

                if (!uid) {
                    return;
                }

                openDatabaseUserModal(
                    uid
                );

            }
        );

    }
    const user =
        databaseState.users.find(
            item =>
                String(item.uid) ===
                String(uid)
        );


    if (!user) {

        showToast(
            "This database record could not be found.",
            "error"
        );

        return;

    }


    const modal =
        $("databaseUserModal");


    if (!modal) {

        console.error(
            "databaseUserModal was not found."
        );

        showToast(
            "User editor modal is missing.",
            "error"
        );

        return;

    }


    databaseUserEditor.uid =
        user.uid;

    databaseUserEditor.user =
        user;


    fillDatabaseUserForm(
        user
    );


    modal.classList.add(
        "show"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "database-modal-open"
    );

}


/* =========================================
   CLOSE USER EDITOR
========================================= */

function closeDatabaseUserModal() {

    const modal =
        $("databaseUserModal");


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "show"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.classList.remove(
        "database-modal-open"
    );


    databaseUserEditor.uid =
        null;

    databaseUserEditor.user =
        null;

    databaseUserEditor.photos =
        [];

}


/* =========================================
   UPLOAD USER PHOTOS
========================================= */

async function uploadDatabaseUserPhotos(
    files
) {

    const uid =
        databaseUserEditor.uid;


    if (
        !uid ||
        !files.length
    ) {

        return;

    }


    const status =
        $("databasePhotoUploadStatus");


    if (status) {

        status.hidden =
            false;

        status.textContent =
            `Uploading ${
                files.length
            } photo${
                files.length === 1
                    ? ""
                    : "s"
            }...`;

    }


    try {

        for (
            const file of files
        ) {

            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                continue;

            }


            if (
                file.size >
                8 * 1024 * 1024
            ) {

                showToast(
                    `${file.name} is larger than 8 MB.`,
                    "warning"
                );

                continue;

            }


            const safeName =
                file.name.replace(
                    /[^a-zA-Z0-9._-]/g,
                    "_"
                );


            const id =
                `photo_${Date.now()}_${
                    Math.random()
                        .toString(36)
                        .slice(2, 8)
                }`;


            const path =
                `profilePhotos/${uid}/${id}_${safeName}`;


            const fileRef =
                storageRef(
                    storage,
                    path
                );


            await uploadBytes(
                fileRef,
                file,
                {
                    contentType:
                        file.type
                }
            );


            const url =
                await getDownloadURL(
                    fileRef
                );


            databaseUserEditor
                .photos
                .push({
                    id,
                    url,
                    storagePath:
                        path
                });

        }


        const photos =
            normalizeEditorPhotos();


        await update(
            ref(
                db,
                `users/${uid}`
            ),
            {
                photos
            }
        );


        const freshUser =
            databaseState.users.find(
                item =>
                    String(item.uid) ===
                    String(uid)
            );


        if (freshUser) {

            freshUser.photos =
                photos;

        }


        renderDatabaseUserPhotos();

        renderDatabaseRecords();


        if (status) {

            status.textContent =
                "Photos uploaded and saved to this user's record.";

        }


        showToast(
            "Photos added successfully.",
            "success"
        );

    }

    catch (error) {

        console.error(
            "User photo upload failed:",
            error
        );


        if (status) {

            status.textContent =
                "Photo upload failed.";

        }


        showToast(
            "Unable to upload the selected photos. Check Firebase Storage rules.",
            "error"
        );

    }

}


/* =========================================
   REMOVE USER PHOTO
========================================= */

async function removeDatabaseUserPhoto(
    photoId
) {

    const uid =
        databaseUserEditor.uid;


    if (!uid) {
        return;
    }


    const photo =
        databaseUserEditor.photos.find(
            item =>
                String(item.id) ===
                String(photoId)
        );


    if (!photo) {
        return;
    }


    if (
        !confirm(
            "Remove this photo from this user's profile?"
        )
    ) {

        return;

    }


    try {

        if (
            photo.storagePath
        ) {

            try {

                await deleteObject(
                    storageRef(
                        storage,
                        photo.storagePath
                    )
                );

            }

            catch (error) {

                console.warn(
                    "Storage photo deletion skipped:",
                    error
                );

            }

        }


        databaseUserEditor.photos =
            databaseUserEditor.photos.filter(
                item =>
                    item.id !==
                    photo.id
            );


        await update(
            ref(
                db,
                `users/${uid}`
            ),
            {
                photos:
                    normalizeEditorPhotos()
            }
        );


        const freshUser =
            databaseState.users.find(
                item =>
                    String(item.uid) ===
                    String(uid)
            );


        if (freshUser) {

            freshUser.photos =
                normalizeEditorPhotos();

        }


        renderDatabaseUserPhotos();

        renderDatabaseRecords();


        showToast(
            "Photo removed.",
            "success"
        );

    }

    catch (error) {

        console.error(
            "User photo removal failed:",
            error
        );


        showToast(
            "Unable to remove the photo.",
            "error"
        );

    }

}


/* =========================================
   SAVE USER CHANGES
========================================= */

async function saveDatabaseUserChanges(
    event
) {

    event.preventDefault();


    const uid =
        databaseUserEditor.uid;


    if (!uid) {
        return;
    }


    const saveButton =
        $("saveDatabaseUserBtn");


    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            "Saving...";

    }


    try {

        const original =
            databaseUserEditor.user ||
            {};


        const existingInfo =
            getPersonalInformation(
                original
            );


        const existingHome =
            getHomeInformation(
                original
            );


        const updates = {};


        const setInfo =
            (
                key,
                value
            ) => {

                updates[
                    `users/${uid}/personalInformation/${key}`
                ] =
                    value;

            };


        setInfo(
            "fullName",
            $("editFullName").value.trim()
        );

        setInfo(
            "username",
            $("editUsername").value.trim()
        );

        setInfo(
            "email",
            $("editEmail").value.trim()
        );

        setInfo(
            "phone",
            $("editPhone").value.trim()
        );

        setInfo(
            "phoneNumber",
            $("editPhone").value.trim()
        );

        setInfo(
            "gender",
            $("editGender").value.trim()
        );

        setInfo(
            "dateOfBirth",
            $("editDateOfBirth").value.trim()
        );

        setInfo(
            "age",
            $("editAge").value === ""
                ? ""
                : Number(
                    $("editAge").value
                )
        );

        setInfo(
            "district",
            $("editDistrict").value.trim()
        );

        setInfo(
            "religion",
            $("editReligion").value.trim()
        );

        setInfo(
            "tribe",
            $("editTribe").value.trim()
        );

        setInfo(
            "education",
            $("editEducation").value.trim()
        );

        setInfo(
            "occupation",
            $("editOccupation").value.trim()
        );

        setInfo(
            "maritalStatus",
            $("editMaritalStatus").value.trim()
        );


        updates[
            `users/${uid}/location/home/district`
        ] =
            $("editDistrict").value.trim();


        updates[
            `users/${uid}/status`
        ] =
            $("editAccountStatus").value;


        updates[
            `users/${uid}/account/status`
        ] =
            $("editAccountStatus").value;


        await update(
            ref(db),
            updates
        );


        const freshUser =
            databaseState.users.find(
                item =>
                    String(item.uid) ===
                    String(uid)
            );


        if (freshUser) {

            freshUser.personalInformation = {

                ...existingInfo,

                fullName:
                    $("editFullName").value.trim(),

                username:
                    $("editUsername").value.trim(),

                email:
                    $("editEmail").value.trim(),

                phone:
                    $("editPhone").value.trim(),

                phoneNumber:
                    $("editPhone").value.trim(),

                gender:
                    $("editGender").value.trim(),

                dateOfBirth:
                    $("editDateOfBirth").value.trim(),

                age:
                    $("editAge").value === ""
                        ? ""
                        : Number(
                            $("editAge").value
                        ),

                district:
                    $("editDistrict").value.trim(),

                religion:
                    $("editReligion").value.trim(),

                tribe:
                    $("editTribe").value.trim(),

                education:
                    $("editEducation").value.trim(),

                occupation:
                    $("editOccupation").value.trim(),

                maritalStatus:
                    $("editMaritalStatus").value.trim()

            };


            freshUser.location = {

                ...(freshUser.location || {}),

                home: {

                    ...existingHome,

                    district:
                        $("editDistrict")
                            .value
                            .trim()

                }

            };


            freshUser.status =
                $("editAccountStatus").value;


            freshUser.account = {
              ...(freshUser.account || {}),

                status:
                    $("editAccountStatus").value

            };

        }


        await saveDatabaseActivity(
            `Updated database record for ${
                $("editFullName").value.trim() ||
                uid
            }`,
            "Success"
        );


        renderDatabaseRecords();

        updateDatabaseOverview();

        updateFilteredSummary();


        showToast(
            "User record updated successfully.",
            "success"
        );


        closeDatabaseUserModal();

    }

    catch (error) {

        console.error(
            "Database user update failed:",
            error
        );


        showToast(
            "Unable to save this user's changes.",
            "error"
        );

    }
finally {

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "Save Changes";

        }

    }

}


/* =========================================
   CONNECT USER EDITOR CONTROLS
========================================= */

function bindDatabaseUserEditorControls() {

    $("closeDatabaseUserModal")
        ?.addEventListener(
            "click",
            closeDatabaseUserModal
        );


    $("cancelDatabaseUserEdit")
        ?.addEventListener(
            "click",
            closeDatabaseUserModal
        );


    $("databaseUserModal")
        ?.querySelector(
            "[data-close-user-modal]"
        )
        ?.addEventListener(
            "click",
            closeDatabaseUserModal
        );

$("databaseUserForm")
        ?.addEventListener(
            "submit",
            saveDatabaseUserChanges
        );


    $("databasePhotoInput")
        ?.addEventListener(
            "change",
            event => {

                const files =
                    Array.from(
                        event.target.files ||
                        []
                    );


                event.target.value =
                    "";


                uploadDatabaseUserPhotos(
                    files
                );

            }
        );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape" &&
                $("databaseUserModal")
                    ?.classList
                    .contains("show")
            ) {

                closeDatabaseUserModal();

            }

        }
    );

}

        
/* =========================================
   ESCAPE HTML
========================================= */

function escapeHtml(value) {

    return String(
        value ?? ""
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================================
   GROUP COUNTER
========================================= */

function createGroups(
    users,
    getter
) {

    const groups =
        {};


    users.forEach(
        user => {

            let value =
                getter(user);


            if (
                value === null ||
                value === undefined ||
                value === ""
            ) {

                value =
                    "Unknown";

            }


            value =
                String(
                    value
                ).trim();


            groups[value] =
                (
                    groups[value] ||
                    0
                ) + 1;

        }
    );


    return groups;

}

/* =========================================
   SCAN DUPLICATE ACCOUNTS
========================================= */

async function scanDuplicateAccounts() {

    try {

        const users =
            databaseState.users || [];


        if (!users.length) {

            showToast(
                "No database records available to scan.",
                "warning"
            );

            return;

        }


        /*
            Map each identity value to
            the users who have it.
        */

        const identityMap =
            new Map();


        const addIdentity = (
            type,
            value,
            user
        ) => {

            const normalized =
                String(value || "")
                    .trim()
                    .toLowerCase();


            if (!normalized)
                return;


            const key =
                `${type}:${normalized}`;


            if (!identityMap.has(key)) {

                identityMap.set(
                    key,
                    []
                );

            }


            identityMap
                .get(key)
                .push(user);

        };


        /*
            Scan every Firebase user.
        */

        users.forEach(user => {

            const info =
                user.personalInformation || {};


            /*
                EMAIL
            */

            addIdentity(
                "email",
                info.email ||
                user.email,
                user
            );


            /*
                PHONE
            */

            addIdentity(
                "phone",
                info.phone ||
                info.phoneNumber ||
                user.phone ||
                user.phoneNumber,
                user
            );


            /*
                USERNAME
            */

            addIdentity(
                "username",
                info.username ||
                user.username,
                user
            );

        });


        /*
            Build duplicate groups.
        */

        const groups = [];


        identityMap.forEach(
            (matchedUsers, key) => {

                if (
                    matchedUsers.length < 2
                ) {

                    return;

                }


                const separator =
                    key.indexOf(":");


                const type =
                    key.substring(
                        0,
                        separator
                    );


                const value =
                    key.substring(
                        separator + 1
                    );


                groups.push({

                    type,

                    value,

                    users:
                        matchedUsers.map(
                            user => ({
                                uid:
                                    user.uid,

                                name:
                                    getName(user),

                                email:
                                    getEmail(user),

                                phone:
                                    getPhoneForImport(
                                        user
                                    )
                            })
                        )

                });

            }
        );


        databaseState.duplicateGroups =
            groups;


        /*
            Count affected accounts.
        */

        const affectedUids =
            new Set();


        groups.forEach(group => {

            group.users.forEach(user => {

                affectedUids.add(
                    user.uid
                );

            });

        });


        const duplicateCount =
            affectedUids.size;


        /*
            Update dashboard number.
        */

        const duplicateElement =
            $("duplicateAccounts");


        if (duplicateElement) {

            duplicateElement.textContent =
                duplicateCount.toLocaleString();

        }


        /*
            Save activity.
        */

        await saveDatabaseActivity(
            `Scanned duplicate accounts: ${duplicateCount} affected records`,
            "Success"
        );


        /*
            Show result.
        */

        if (!duplicateCount) {

            showToast(
                "No duplicate accounts found.",
                "success"
            );

            return;

        }


        showDuplicateResults(
            groups,
            duplicateCount
        );


    }

    catch (error) {

        console.error(
            "Duplicate scan failed:",
            error
        );


        await saveDatabaseActivity(
            "Duplicate account scan failed",
            "Failed"
        );


        showToast(
            "Unable to scan duplicate accounts.",
            "error"
        );

    }

}
/* =========================================
   SHOW DUPLICATE RESULTS
========================================= */

function showDuplicateResults(
    groups,
    duplicateCount
) {

    let modal =
        $("duplicateAccountsModal");


    /*
        Create modal if it does not exist.
    */

    if (!modal) {

        modal =
            document.createElement(
                "div"
            );


        modal.id =
            "duplicateAccountsModal";


        modal.className =
            "database-action-modal";


        document.body.appendChild(
            modal
        );

    }


    /*
        Build duplicate groups.
    */

    const groupsHTML =
        groups
            .map(
                (group, index) => `

                    <div
                        class="duplicate-group">

                        <div
                            class="duplicate-group-header">

                            <strong>
                                Possible duplicate ${
                                    index + 1
                                }
                            </strong>

                            <span>
                                ${escapeHtml(
                                    group.type
                                )}
                                match
                            </span>

                        </div>


                        <div
                            class="duplicate-users">

                            ${group.users
                                .map(
                                    user => `

                                    <div
                                        class="duplicate-user">

                                        <div>

                                            <strong>
                                                ${escapeHtml(
                                                    user.name ||
                                                    "Unknown User"
                                                )}
                                            </strong>

                                            <small>
                                                ${escapeHtml(
                                                    user.email ||
                                                    user.phone ||
                                                    "No contact information"
                                                )}
                                            </small>

                                        </div>


                                        <span>
                                            ${
                                                escapeHtml(
                                                    user.uid
                                                )
                                            }
                                        </span>

                                    </div>

                                `
                                )
                                .join("")}

                        </div>

                    </div>

                `
            )
            .join("");


    modal.innerHTML = `

        <div
            class="database-action-dialog">

            <div
                class="database-action-header">

                <div>

                    <span>
                        DATABASE MAINTENANCE
                    </span>

                    <h2>
                        Duplicate Accounts
                    </h2>

                    <p>
                        ${duplicateCount}
                        affected account${
                            duplicateCount === 1
                                ? ""
                                : "s"
                        }
                        found.
                    </p>

                </div>


                <button
                    type="button"
                    id="closeDuplicateModal">

                    ×

                </button>

            </div>


            <div
                class="database-action-body">

                ${
                    groupsHTML ||
                    `
                        <div
                            class="duplicate-empty">

                            <strong>
                                No duplicates found
                            </strong>

                            <p>
                                Every account has a
                                unique email, phone
                                and username.
                            </p>

                        </div>
                    `
                }

            </div>


            <div
                class="database-action-footer">

                <button
                    type="button"
                    id="closeDuplicateResults"
                    class="secondary-btn">

                    Close

                </button>

            </div>

        </div>

    `;


    modal.classList.add(
        "show"
    );


    $("closeDuplicateModal")
        ?.addEventListener(
            "click",
            closeDuplicateResults
        );


    $("closeDuplicateResults")
        ?.addEventListener(
            "click",
            closeDuplicateResults
        );

}


/* =========================================
   CLOSE DUPLICATE RESULTS
========================================= */

function closeDuplicateResults() {

    const modal =
        $("duplicateAccountsModal");


    if (!modal)
        return;


    modal.classList.remove(
        "show"
    );

}
/* =========================================
   MERGE ACCOUNTS - OPEN
========================================= */

function openMergeAccounts() {

    const groups =
        databaseState.duplicateGroups || [];


    if (!groups.length) {

        showToast(
            "Scan for duplicate accounts first.",
            "warning"
        );

        return;

    }


    let modal =
        $("mergeAccountsModal");


    if (!modal) {

        modal =
            document.createElement("div");

        modal.id =
            "mergeAccountsModal";

        modal.className =
            "database-action-modal";

        document.body.appendChild(
            modal
        );

    }


    modal.innerHTML = `

        <div
            class="database-action-dialog">

            <div
                class="database-action-header">

                <div>

                    <span>
                        DATABASE MAINTENANCE
                    </span>

                    <h2>
                        Merge Accounts
                    </h2>

                    <p>
                        Choose the primary account
                        that should be kept.
                    </p>

                </div>

                <button
                    type="button"
                    id="closeMergeModal">

                    ×

                </button>

            </div>


            <div
                class="database-action-body">

                <div
                    class="merge-warning">

                    <strong>
                        ⚠ Review carefully
                    </strong>

                    <p>
                        Merging accounts can change
                        database records. No account
                        will be changed until you
                        confirm the merge.
                    </p>

                </div>


                ${
                    groups.map(
                        (group, groupIndex) => `

                            <div
                                class="merge-group">

                                <div
                                    class="merge-group-title">

                                    <strong>
                                        Duplicate Group ${
                                            groupIndex + 1
                                        }
                                    </strong>

                                    <span>
                                        ${escapeHtml(
                                            group.type
                                        )} match
                                    </span>

                                </div>


                                <p
                                    class="merge-match-value">

                                    Matching value:
                                    <strong>
                                        ${escapeHtml(
                                            group.value
                                        )}
                                    </strong>

                                </p>


                                <div
                                    class="merge-account-list">

                                    ${
                                        group.users
                                            .map(
                                                (
                                                    user,
                                                    userIndex
                                                ) => `

                                                    <label
                                                        class="merge-account-option">

                                                        <input
                                                            type="radio"

                                                            name="mergePrimary_${groupIndex}"

                                                            value="${
                                                                escapeHtml(
                                                                    user.uid
                                                                )
                                                            }"

                                                            ${
                                                                userIndex === 0
                                                                    ? "checked"
                                                                    : ""
                                                            }>

                                                        <span
                                                            class="merge-radio-content">

                                                            <strong>
                                                                ${
                                                                    escapeHtml(
                                                                        user.name ||
                                                                        "Unknown User"
                                                                    )
                                                                }
                                                            </strong>

                                                            <small>
                                                                ${
                                                                    escapeHtml(
                                                                        user.email ||
                                                                        user.phone ||
                                                                        "No contact information"
                                                                    )
                                                                }
                                                            </small>

                                                            <em>
                                                                UID:
                                                                ${
                                                                    escapeHtml(
                                                                        user.uid
                                                                    )
                                                                }
                                                            </em>

                                                        </span>

                                                    </label>

                                                `
                                            )
                                            .join("")
                                    }

                                </div>

                            </div>

                        `
                    )
                    .join("")
                }

            </div>


            <div
                class="database-action-footer">

                <button
                    type="button"
                    id="cancelMergeAccounts"
                    class="secondary-btn">

                    Cancel

                </button>


                <button
                    type="button"
                    id="reviewMergeAccounts"
                    class="primary-btn">

                    Review Merge

                </button>

            </div>

        </div>

    `;


    modal.classList.add("show");


    $("closeMergeModal")
        ?.addEventListener(
            "click",
            closeMergeAccounts
        );


    $("cancelMergeAccounts")
        ?.addEventListener(
            "click",
            closeMergeAccounts
        );


    $("reviewMergeAccounts")
        ?.addEventListener(
            "click",
            reviewAccountMerge
        );

}


/* =========================================
   CLOSE MERGE MODAL
========================================= */

function closeMergeAccounts() {

    $("mergeAccountsModal")
        ?.classList.remove("show");

}
/* =========================================
   REVIEW ACCOUNT MERGE
========================================= */

function reviewAccountMerge() {

    const groups =
        databaseState.duplicateGroups || [];


    const selections = [];


    for (
        let groupIndex = 0;
        groupIndex < groups.length;
        groupIndex++
    ) {

        const selected =
            document.querySelector(
                `input[name="mergePrimary_${groupIndex}"]:checked`
            );


        if (!selected) {

            showToast(
                `Choose a primary account for duplicate group ${groupIndex + 1}.`,
                "warning"
            );

            return;

        }


        selections.push({

            group:
                groups[groupIndex],

            primaryUid:
                selected.value

        });

    }


    /*
        Show the final review screen.
        Nothing is written to Firebase yet.
    */

    showMergeReview(
        selections
    );

}
 
/* =========================================
   FINAL MERGE REVIEW
========================================= */

function showMergeReview(
    selections
) {

    let modal =
        $("mergeAccountsModal");


    if (!modal) {

        return;

    }


    const reviewHTML =
        selections
            .map(
                (
                    selection,
                    index
                ) => {

                    const group =
                        selection.group;


                    const primaryUid =
                        selection.primaryUid;


                    const primary =
                        group.users.find(
                            user =>
                                String(
                                    user.uid
                                ) ===
                                String(
                                    primaryUid
                                )
                        );


                    const duplicates =
                        group.users.filter(
                            user =>
                                String(
                                    user.uid
                                ) !==
                                String(
                                    primaryUid
                                )
                        );


                    return `

                        <div
                            class="merge-group">

                            <div
                                class="merge-group-title">

                                <strong>
                                    Duplicate Group ${
                                        index + 1
                                    }
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        group.type
                                    )} match
                                </span>

                            </div>


                            <p
                                class="merge-match-value">

                                Matching value:

                                <strong>
                                    ${escapeHtml(
                                        group.value
                                    )}
                                </strong>

                            </p>


                            <div
                                class="merge-review-primary">

                                <span>
                                    PRIMARY ACCOUNT
                                </span>

                                <strong>
                                    ${escapeHtml(
                                        primary?.name ||
                                        "Unknown User"
                                    )}
                                </strong>

                                <small>
                                    ${escapeHtml(
                                        primary?.email ||
                                        primary?.phone ||
                                        "No contact information"
                                    )}
                                </small>

                                <em>
                                    UID:
                                    ${escapeHtml(
                                        primaryUid
                                    )}
                                </em>

                            </div>


                            <div
                                class="merge-review-duplicates">

                                <span>
                                    ACCOUNTS TO MERGE
                                </span>

                                ${
                                    duplicates
                                        .map(
                                            duplicate => `

                                                <div
                                                    class="merge-review-duplicate">

                                                    <strong>
                                                        ${escapeHtml(
                                                            duplicate.name ||
                                                            "Unknown User"
                                                        )}
                                                    </strong>

                                                    <small>
                                                        ${escapeHtml(
                                                            duplicate.email ||
                                                            duplicate.phone ||
                                                            "No contact information"
                                                        )}
                                                    </small>

                                                    <em>
                                                        UID:
                                                        ${escapeHtml(
                                                            duplicate.uid
                                                        )}
                                                    </em>

                                                </div>

                                            `
                                        )
                                        .join("")
                                }

                            </div>

                        </div>

                    `;

                }
            )
            .join("");


    modal.innerHTML = `

        <div
            class="database-action-dialog">

            <div
                class="database-action-header">

                <div>

                    <span>
                        DATABASE MAINTENANCE
                    </span>

                    <h2>
                        Review Merge
                    </h2>

                    <p>
                        Carefully review the accounts
                        before performing the merge.
                    </p>

                </div>


                <button
                    type="button"
                    id="closeMergeReview">

                    ×

                </button>

            </div>


            <div
                class="database-action-body">

                <div
                    class="merge-warning">

                    <strong>
                        ⚠ Review carefully
                    </strong>

                    <p>
                        The primary account will be
                        preserved. Missing information
                        may be copied from the duplicate
                        accounts.
                    </p>

                    <p>
                        Duplicate accounts will NOT be
                        deleted. They will be marked as
                        Merged and kept for recovery.
                    </p>

                </div>


                ${reviewHTML}

            </div>


            <div
                class="database-action-footer">

                <button
                    type="button"
                    id="cancelMergeReview"
                    class="secondary-btn">

                    Back

                </button>


                <button
                    type="button"
                    id="confirmAccountMerge"
                    class="primary-btn">

                    Confirm Merge

                </button>

            </div>

        </div>

    `;


    modal.classList.add(
        "show"
    );


    $("closeMergeReview")
        ?.addEventListener(
            "click",
            closeMergeAccounts
        );


    $("cancelMergeReview")
        ?.addEventListener(
            "click",
            () => {

                /*
                    Return to the account
                    selection screen.
                */

                openMergeAccounts();

            }
        );


    /*
        THIS IS THE CODE YOU WERE
        LOOKING FOR.
    */
  

    $("confirmAccountMerge")
        ?.addEventListener(
            "click",
            () => {

                executeAccountMerge(
                    selections
                );

            }
        );

}

/* =========================================
   CUSTOM MERGE CONFIRMATION
========================================= */

function showMergeConfirmation() {

    return new Promise(resolve => {

        const existing =
            document.getElementById(
                "mergeConfirmModal"
            );

        existing?.remove();


        const modal =
            document.createElement("div");

        modal.id =
            "mergeConfirmModal";

        modal.className =
            "merge-confirm-overlay";


        modal.innerHTML = `

            <div
                class="merge-confirm-card">

                <div
                    class="merge-confirm-icon">

                    ⚠

                </div>


                <div
                    class="merge-confirm-content">

                    <span
                        class="merge-confirm-label">

                        DATABASE MAINTENANCE

                    </span>


                    <h3>
                        Confirm Account Merge
                    </h3>


                    <p>
                        The selected primary account
                        will receive missing information
                        from the duplicate accounts.
                    </p>


                    <div
                        class="merge-confirm-warning">

                        <strong>
                            Important
                        </strong>

                        <span>
                            Duplicate records will NOT
                            be deleted. They will be
                            marked as Merged so they can
                            be recovered later.
                        </span>

                    </div>

                </div>


                <div
                    class="merge-confirm-actions">

                    <button
                        type="button"
                        id="cancelMergeConfirmation"
                        class="merge-confirm-cancel">

                        Cancel

                    </button>


                    <button
                        type="button"
                        id="acceptMergeConfirmation"
                        class="merge-confirm-danger">

                        Confirm Merge

                    </button>

                </div>

            </div>

        `;


        document.body.appendChild(
            modal
        );


        requestAnimationFrame(() => {

            modal.classList.add(
                "show"
            );

        });


        const close =
            value => {

                modal.classList.remove(
                    "show"
                );


                setTimeout(() => {

                    modal.remove();

                    resolve(value);

                }, 200);

            };


        document
            .getElementById(
                "cancelMergeConfirmation"
            )
            ?.addEventListener(
                "click",
                () => close(false)
            );


        document
            .getElementById(
                "acceptMergeConfirmation"
            )
            ?.addEventListener(
                "click",
                () => close(true)
            );


        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target === modal
                ) {

                    close(false);

                }

            }
        );


        document.addEventListener(
            "keydown",
            function escapeHandler(event) {

                if (
                    event.key === "Escape"
                ) {

                    document.removeEventListener(
                        "keydown",
                        escapeHandler
                    );

                    close(false);

                }

            }
        );

    });

}


/* =========================================
   ACCOUNT MERGE ENGINE
   SAFE / NON-DESTRUCTIVE
========================================= */

async function executeAccountMerge(
    selections
) {

    if (
        !Array.isArray(selections) ||
        !selections.length
    ) {

        showToast(
            "No accounts selected for merging.",
            "warning"
        );

        return;

    }


    /*
        Final confirmation.
    */
const confirmed =
    await showMergeConfirmation();

if (!confirmed) {
    return;
}

    if (!confirmed) {

        return;

    }


    const mergeButton =
        $("confirmAccountMerge");


    if (mergeButton) {

        mergeButton.disabled = true;

        mergeButton.textContent =
            "Merging...";

    }


    try {

        const updates = {};

        const mergeRecords = [];

        let totalMerged = 0;


        /*
            Process every duplicate group.
        */

        for (
            const selection of selections
        ) {

            const group =
                selection.group;


            const primaryUid =
                selection.primaryUid;


            /*
                Make sure the primary account
                actually exists in our loaded
                database.
            */

            const primary =
                databaseState.users
                    .find(
                        user =>
                            String(user.uid) ===
                            String(primaryUid)
                    );


            if (!primary) {

                throw new Error(
                    `Primary account ${primaryUid} could not be found.`
                );

            }


            /*
                Get duplicate accounts.
            */

            const duplicates =
                group.users
                    .filter(
                        user =>
                            String(user.uid) !==
                            String(primaryUid)
                    );


            if (!duplicates.length) {

                continue;

            }


            /*
                Work with a copy so we don't
                mutate databaseState directly.
            */

            const mergedPrimary =
                JSON.parse(
                    JSON.stringify(primary)
                );


            /*
                Preserve merge information.
            */

            if (
                !mergedPrimary.mergeHistory
            ) {

                mergedPrimary.mergeHistory =
                    {};

            }


            /*
                Find every duplicate user
                from the loaded database.
            */

            for (
                const duplicateInfo
                of duplicates
            ) {

                const duplicate =
                    databaseState.users
                        .find(
                            user =>
                                String(
                                    user.uid
                                ) ===
                                String(
                                    duplicateInfo.uid
                                )
                        );


                if (!duplicate) {

                    console.warn(
                        "Duplicate account not found:",
                        duplicateInfo.uid
                    );

                    continue;

                }


                /*
                    Copy ONLY missing information.
                    Existing primary information
                    is never overwritten.
                */

                mergeMissingUserData(
                    mergedPrimary,
                    duplicate
                );


                /*
                    Record the merge.
                */

                const mergeId =
                    `merge_${Date.now()}_${Math.random()
                        .toString(36)
                        .slice(2, 8)}`;


                mergedPrimary.mergeHistory[
                    mergeId
                ] = {

                    mergedUid:
                        duplicate.uid,

                    mergedName:
                        getName(duplicate),

                    mergedEmail:
                        getEmail(duplicate),

                    mergedAt:
                        Date.now(),

                    mergedBy:
                        sessionStorage.getItem(
                            "adminName"
                        ) ||
                        "Super Admin"

                };


                /*
                    IMPORTANT:
                    Do NOT delete the duplicate.
                */

                updates[
                    `users/${duplicate.uid}/status`
                ] = "Merged";


                updates[
                    `users/${duplicate.uid}/account/status`
                ] = "Merged";


                updates[
                    `users/${duplicate.uid}/account/merged`
                ] = true;


                updates[
                    `users/${duplicate.uid}/account/mergedInto`
                ] = primaryUid;


                updates[
                    `users/${duplicate.uid}/account/mergedAt`
                ] = Date.now();


                updates[
                    `users/${duplicate.uid}/account/mergedBy`
                ] =
                    sessionStorage.getItem(
                        "adminName"
                    ) ||
                    "Super Admin";


                /*
                    Keep a recovery copy.
                */

                updates[
                    `users/${duplicate.uid}/mergeSnapshot`
                ] =
                    duplicate;


                totalMerged++;

            }


            /*
                Write the improved primary
                account.
            */

            updates[
                `users/${primaryUid}`
            ] =
                mergedPrimary;


            /*
                Record this merge operation.
            */

            mergeRecords.push({

                primaryUid,

                primaryName:
                    getName(primary),

                duplicateUids:
                    duplicates.map(
                        user =>
                            user.uid
                    ),

                matchType:
                    group.type,

                matchValue:
                    group.value,

                mergedAt:
                    Date.now(),

                mergedBy:
                    sessionStorage.getItem(
                        "adminName"
                    ) ||
                    "Super Admin"

            });

        }


        /*
            Nothing to merge.
        */

        if (!totalMerged) {

            showToast(
                "No duplicate accounts were available to merge.",
                "warning"
            );

            return;

        }


        /*
            Write everything in ONE Firebase
            multi-location update.
        */

        await update(
            ref(db),
            updates
        );


        /*
            Save a permanent merge audit.
        */

        const mergeAuditRef =
            push(
                ref(
                    db,
                    "databaseMergeHistory"
                )
            );


        await set(
            mergeAuditRef,
            {

                timestamp:
                    Date.now(),

                administrator:
                    sessionStorage.getItem(
                        "adminName"
                    ) ||
                    "Super Admin",

                mergedCount:
                    totalMerged,

                operations:
                    mergeRecords,

                type:
                    "account_merge",

                status:
                    "Success"

            }
        );


        /*
            Save activity to the activity
            system already used by the
            Database Centre.
        */

        await saveDatabaseActivity(

            `Merged ${totalMerged} duplicate account${
                totalMerged === 1
                    ? ""
                    : "s"
            } safely`,

            "Success"

        );


        /*
            Reload Firebase users.
        */

        await loadDatabaseUsers();


        /*
            Rebuild filters and summaries.
        */

        populateDatabaseFilters();

        updateFilteredSummary();


        /*
            Clear old duplicate results.
        */

        databaseState.duplicateGroups =
            [];


        /*
            Close merge modal.
        */

        $("mergeAccountsModal")
            ?.classList.remove(
                "show"
            );


        /*
            Tell administrator what happened.
        */

        showToast(

            `${totalMerged} account${
                totalMerged === 1
                    ? ""
                    : "s"
            } merged successfully. Duplicate records were preserved.`,

            "success"

        );


        console.log(
            "ACCOUNT MERGE COMPLETE:",
            mergeRecords
        );

    }

    catch (error) {

        console.error(
            "ACCOUNT MERGE FAILED:",
            error
        );


        await saveDatabaseActivity(

            "Account merge failed",

            "Failed"

        );


        showToast(

            error.message ||
            "Account merge failed.",

            "error"

        );

    }

    finally {

        if (mergeButton) {

            mergeButton.disabled =
                false;

            mergeButton.textContent =
                "Confirm Merge";

        }

    }

}
/* =========================================
   MERGE MISSING USER DATA
========================================= */

function mergeMissingUserData(
    primary,
    duplicate
) {

    if (
        !primary ||
        !duplicate
    ) {

        return;

    }


    const ignoredKeys = new Set([

        "uid",

        "status",

        "account",

        "mergeHistory",

        "mergeSnapshot",

        "mergedInto",

        "mergedAt",

        "mergedBy",

        "merged"

    ]);


    function mergeObject(
        target,
        source
    ) {

        if (
            !target ||
            !source ||
            typeof target !== "object" ||
            typeof source !== "object"
        ) {

            return;

        }


        Object.entries(
            source
        ).forEach(
            ([key, value]) => {

                if (
                    ignoredKeys.has(key)
                ) {

                    return;

                }


                /*
                    Ignore UID at every level.
                */

                if (
                    key === "uid"
                ) {

                    return;

                }


                /*
                    Missing value.
                */

                if (
                    target[key] ===
                    undefined ||
                    target[key] ===
                    null ||
                    target[key] === ""
                ) {

                    target[key] =
                        JSON.parse(
                            JSON.stringify(
                                value
                            )
                        );

                    return;

                }


                /*
                    Recursively merge objects.
                */

                if (
                    value &&
                    typeof value ===
                        "object" &&
                    !Array.isArray(value) &&

                    target[key] &&
                    typeof target[key] ===
                        "object" &&
                    !Array.isArray(
                        target[key]
                    )
                ) {

                    mergeObject(
                        target[key],
                        value
                    );

                }

            }
        );

    }


    mergeObject(
        primary,
        duplicate
    );

}
/* =========================================
   AGE GROUP
========================================= */

function getAgeGroup(user) {

    const age =
        Number(
            getAge(user)
        );


    if (!age)
        return "Unknown";


    if (age < 18)
        return "Under 18";


    if (age <= 25)
        return "18 - 25";


    if (age <= 35)
        return "26 - 35";


    if (age <= 45)
        return "36 - 45";


    if (age <= 55)
        return "46 - 55";


    return "56+";

}




/* =========================================
   GROUP CARD
========================================= */
function renderGroupCard(
    title,
    groups,
    filterType
) {

    const entries =
        Object.entries(
            groups
        )
        .sort(
            (
                a,
                b
            ) =>
                b[1] -
                a[1]
        )
        .slice(
            0,
            8
        );


    return `

        <div
            class="db-live-group">

            <h4>

                ${escapeHtml(
                    title
                )}

            </h4>


            ${
                entries.length

                ?

                entries.map(
                    (
                        [
                            name,
                            count
                        ]
                    ) => `

                        <button
                            type="button"
                            class="db-group-item"
                            data-group-filter="${escapeHtml(
                                filterType
                            )}"
                            data-group-value="${escapeHtml(
                                name
                            )}">

                            <span>

                                ${escapeHtml(
                                    name
                                )}

                            </span>

                            <b>

                                ${count}

                            </b>

                        </button>

                    `
                ).join("")

                :

                `

                    <div
                        class="db-group-empty">

                        No data

                    </div>

                `
            }

        </div>

    `;

}
/* =========================================
   RENDER GROUPS
========================================= */

function renderDatabaseGroups() {

    const panel =
        $("databaseGroupingPanel");


    if (!panel)
        return;


    const users =
        databaseState.filteredUsers;

panel.innerHTML = `

    ${renderGroupCard(
        "Age",
        createGroups(
            users,
            getAgeGroup
        ),
        "age"
    )}


    ${renderGroupCard(
        "Gender",
        createGroups(
            users,
            getGender
        ),
        "gender"
    )}


    ${renderGroupCard(
        "District",
        createGroups(
            users,
            getDistrict
        ),
        "district"
    )}


    ${renderGroupCard(
        "Religion",
        createGroups(
            users,
            getReligion
        ),
        "religion"
    )}


    ${renderGroupCard(
        "Tribe",
        createGroups(
            users,
            getTribe
        ),
        "tribe"
    )}

`;
}

/* =========================================
   CLICKABLE GROUP FILTERS
========================================= */

function bindDatabaseGroupEvents() {

    const panel =
        $("databaseGroupingPanel");


    if (!panel)
        return;


    panel.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    ".db-group-item"
                );


            if (!button)
                return;


            const type =
                button.dataset.groupFilter;


            const value =
                button.dataset.groupValue;


            applyGroupFilter(
                type,
                value
            );

        }
    );

}
/* =========================================
   APPLY GROUP FILTER
========================================= */

function applyGroupFilter(
    type,
    value
) {

    /*
        Clear current filters first.
    */

    clearDatabaseFilterValues();


    /*
        AGE
    */

    if (
        type === "age"
    ) {

        databaseFilters.age =
            convertAgeGroupValue(
                value
            );


        const select =
            $("databaseAgeFilter");


        if (select) {

            select.value =
                databaseFilters.age;

        }

    }


    /*
        GENDER
    */

    else if (
        type === "gender"
    ) {

        databaseFilters.gender =
            value;


        const select =
            $("databaseGenderFilter");


        if (select) {

            select.value =
                value;

        }

    }


    /*
        DISTRICT
    */

    else if (
        type === "district"
    ) {

        databaseFilters.district =
            value;


        const select =
            $("databaseDistrictFilter");


        if (select) {

            select.value =
                value;

        }

    }


    /*
        RELIGION
    */

    else if (
        type === "religion"
    ) {

        databaseFilters.religion =
            value;


        const select =
            $("databaseReligionFilter");


        if (select) {

            select.value =
                value;

        }

    }


    /*
        TRIBE
    */

    else if (
        type === "tribe"
    ) {

        databaseFilters.tribe =
            value;


        const select =
            $("databaseTribeFilter");


        if (select) {

            select.value =
                value;

        }

    }


    applyDatabaseFilters();

}
/* =========================================
   CLEAR FILTER VALUES
========================================= */

function clearDatabaseFilterValues() {

    databaseFilters.age = "";
    databaseFilters.gender = "";
    databaseFilters.district = "";
    databaseFilters.religion = "";
    databaseFilters.tribe = "";
    databaseFilters.education = "";
    databaseFilters.occupation = "";
    databaseFilters.status = "";


    const ids = [

        "databaseAgeFilter",
        "databaseGenderFilter",
        "databaseDistrictFilter",
        "databaseReligionFilter",
        "databaseTribeFilter",
        "databaseEducationFilter",
        "databaseOccupationFilter",
        "databaseStatusFilter"

    ];


    ids.forEach(
        id => {

            const element =
                $(id);


            if (element) {

                element.value = "";

            }

        }
    );

}


/* =========================================
   AGE GROUP VALUE
========================================= */

function convertAgeGroupValue(
    value
) {

    const normalized =
        String(
            value
        )
        .replace(
            /\s/g,
            ""
        );


    if (
        normalized ===
        "18-25"
    ) {

        return "18-25";

    }


    if (
        normalized ===
        "26-35"
    ) {

        return "26-35";

    }


    if (
        normalized ===
        "36-45"
    ) {

        return "36-45";

    }


    if (
        normalized ===
        "46-55"
    ) {

        return "46-55";

    }


    if (
        normalized ===
        "56+"
    ) {

        return "56+";

    }


    return "";

}
/* =========================================
   DATABASE ERROR
========================================= */

function showDatabaseError(
    message
) {

    const table =
        $("databaseRecordsTable");


    if (table) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:40px;
                    ">

                    <strong>
                        Database Error
                    </strong>

                    <br>

                    <span>
                        ${escapeHtml(
                            message
                        )}
                    </span>

                </td>

            </tr>

        `;

    }

}
/* =========================================
   DATABASE FILTER SYSTEM
========================================= */

const databaseFilters = {

    age: "",
    gender: "",
    district: "",
    religion: "",
    tribe: "",
    education: "",
    occupation: "",
    status: ""

};


/* =========================================
   ACCOUNT STATUS
========================================= */

function getAccountStatus(user) {

    return (
        user?.status ||
        user?.account?.status ||
        "Active"
    );

}


/* =========================================
   CHECK AGE GROUP
========================================= */

function matchesAgeGroup(
    user,
    selectedAge
) {

    if (!selectedAge) {

        return true;

    }


    const age =
        Number(
            getAge(user)
        );


    if (!age) {

        return selectedAge ===
            "unknown";

    }


    switch (selectedAge) {

        case "18-25":

            return age >= 18 &&
                   age <= 25;


        case "26-35":

            return age >= 26 &&
                   age <= 35;


        case "36-45":

            return age >= 36 &&
                   age <= 45;


        case "46-55":

            return age >= 46 &&
                   age <= 55;


        case "56+":

            return age >= 56;


        default:

            return true;

    }

}


/* =========================================
   CHECK ONE USER AGAINST FILTERS
========================================= */

function matchesDatabaseFilters(
    user
) {

    /*
        AGE
    */

    if (
        !matchesAgeGroup(
            user,
            databaseFilters.age
        )
    ) {

        return false;

    }


    /*
        GENDER
    */

    if (
        databaseFilters.gender
    ) {

        if (
            String(
                getGender(user)
            ).trim().toLowerCase()
            !==
            databaseFilters.gender
                .trim()
                .toLowerCase()
        ) {

            return false;

        }

    }


    /*
        DISTRICT
    */

    if (
        databaseFilters.district
    ) {

        if (
            String(
                getDistrict(user)
            ).trim().toLowerCase()
            !==
            databaseFilters.district
                .trim()
                .toLowerCase()
        ) {

            return false;

        }

    }


    /*
        RELIGION
    */

    if (
        databaseFilters.religion
    ) {

        if (
            String(
                getReligion(user)
            ).trim().toLowerCase()
            !==
            databaseFilters.religion
                .trim()
                .toLowerCase()
        ) {

            return false;

        }

    }


    /*
        TRIBE
    */

    if (
        databaseFilters.tribe
    ) {

        if (
            String(
                getTribe(user)
            ).trim().toLowerCase()
            !==
            databaseFilters.tribe
                .trim()
                .toLowerCase()
        ) {

            return false;

        }

    }


    /*
        EDUCATION
    */

    if (
        databaseFilters.education
    ) {

        if (
            String(
                getEducation(user)
            ).trim().toLowerCase()
            !==
            databaseFilters.education
                .trim()
                .toLowerCase()
        ) {

            return false;

        }

    }


    /*
        OCCUPATION
    */

    if (
        databaseFilters.occupation
    ) {

        if (
            String(
                getOccupation(user)
            ).trim().toLowerCase()
            !==
            databaseFilters.occupation
                .trim()
                .toLowerCase()
        ) {

            return false;

        }

    }


    /*
        ACCOUNT STATUS
    */

    if (
        databaseFilters.status
    ) {

        if (
            String(
                getAccountStatus(user)
            ).trim().toLowerCase()
            !==
            databaseFilters.status
                .trim()
                .toLowerCase()
        ) {

            return false;

        }

    }


    return true;

}


/* =========================================
   APPLY DATABASE FILTERS
========================================= */

function applyDatabaseFilters() {

    databaseState.filteredUsers =
        databaseState.users.filter(
            user =>
                matchesDatabaseFilters(
                    user
                )
        );


    updateFilteredSummary();

    renderDatabaseRecords();

    renderDatabaseGroups();

}


/* =========================================
   UPDATE FILTERED SUMMARY
========================================= */

function updateFilteredSummary() {

    const users =
        databaseState.filteredUsers;


    /*
        MATCHING RECORDS
    */

    const filteredCount =
        $("filteredRecordCount");


    if (filteredCount) {

        filteredCount.textContent =
            users.length
                .toLocaleString();

    }


    /*
        MALE
    */

    const maleCount =
        $("databaseMaleCount");


    if (maleCount) {

        maleCount.textContent =
            users.filter(
                user =>
                    String(
                        getGender(user)
                    )
                    .trim()
                    .toLowerCase()
                    ===
                    "male"
            ).length
            .toLocaleString();

    }


    /*
        FEMALE
    */

    const femaleCount =
        $("databaseFemaleCount");


    if (femaleCount) {

        femaleCount.textContent =
            users.filter(
                user =>
                    String(
                        getGender(user)
                    )
                    .trim()
                    .toLowerCase()
                    ===
                    "female"
            ).length
            .toLocaleString();

    }


    /*
        VERIFIED
    */

    const verifiedCount =
        $("databaseVerifiedCount");


    if (verifiedCount) {

        verifiedCount.textContent =
            users.filter(
                user =>
                    user?.verification?.status
                    ===
                    "approved"
            ).length
            .toLocaleString();

    }


    /*
        PREMIUM
    */

    const premiumCount =
        $("databasePremiumCount");


    if (premiumCount) {

        premiumCount.textContent =
            users.filter(
                user =>
                    user?.subscription?.active
                    ===
                    true
            ).length
            .toLocaleString();

    }

}


/* =========================================
   UNIQUE VALUES
========================================= */

function getUniqueDatabaseValues(
    getter
) {

    const values =
        new Set();


    databaseState.users.forEach(
        user => {

            const value =
                getter(user);


            if (
                value !== null &&
                value !== undefined &&
                String(value).trim()
            ) {

                values.add(
                    String(
                        value
                    ).trim()
                );

            }

        }
    );


    return [
        ...values
    ].sort(
        (
            a,
            b
        ) =>
            a.localeCompare(
                b
            )
    );

}


/* =========================================
   ADD OPTIONS TO SELECT
========================================= */

function populateDatabaseSelect(
    id,
    values
) {

    const select =
        $(id);


    if (!select)
        return;


    /*
        Preserve the first
        "All..." option.
    */

    const firstOption =
        select.options[0];


    select.innerHTML =
        "";


    if (firstOption) {

        select.appendChild(
            firstOption
        );

    }


    values.forEach(
        value => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                value;


            option.textContent =
                value;


            select.appendChild(
                option
            );

        }
    );

}


/* =========================================
   POPULATE DATABASE FILTERS
========================================= */

function populateDatabaseFilters() {

    populateDatabaseSelect(

        "databaseDistrictFilter",

        getUniqueDatabaseValues(
            getDistrict
        )

    );


    populateDatabaseSelect(

        "databaseReligionFilter",

        getUniqueDatabaseValues(
            getReligion
        )

    );


    populateDatabaseSelect(

        "databaseTribeFilter",

        getUniqueDatabaseValues(
            getTribe
        )

    );


    populateDatabaseSelect(

        "databaseEducationFilter",

        getUniqueDatabaseValues(
            getEducation
        )

    );


    populateDatabaseSelect(

        "databaseOccupationFilter",

        getUniqueDatabaseValues(
            getOccupation
        )

    );

}


/* =========================================
   READ FILTER CONTROLS
========================================= */

function readDatabaseFilters() {

    databaseFilters.age =
        $("databaseAgeFilter")
        ?.value || "";


    databaseFilters.gender =
        $("databaseGenderFilter")
        ?.value || "";


    databaseFilters.district =
        $("databaseDistrictFilter")
        ?.value || "";


    databaseFilters.religion =
        $("databaseReligionFilter")
        ?.value || "";


    databaseFilters.tribe =
        $("databaseTribeFilter")
        ?.value || "";


    databaseFilters.education =
        $("databaseEducationFilter")
        ?.value || "";


    databaseFilters.occupation =
        $("databaseOccupationFilter")
        ?.value || "";


    databaseFilters.status =
        $("databaseStatusFilter")
        ?.value || "";

}


/* =========================================
   CLEAR FILTERS
========================================= */

function clearDatabaseFilters() {

    const filterIds = [

        "databaseAgeFilter",

        "databaseGenderFilter",

        "databaseDistrictFilter",

        "databaseReligionFilter",

        "databaseTribeFilter",

        "databaseEducationFilter",

        "databaseOccupationFilter",

        "databaseStatusFilter"

    ];


    filterIds.forEach(
        id => {

            const select =
                $(id);


            if (select) {

                select.value =
                    "";

            }

        }
    );


    readDatabaseFilters();

    applyDatabaseFilters();

}


/* =========================================
   FILTER EVENTS
========================================= */

function bindDatabaseFilterEvents() {


    /*
        Apply Filters button
    */

    $("applyDatabaseFilters")
        ?.addEventListener(
            "click",
            () => {

                readDatabaseFilters();

                applyDatabaseFilters();

            }
        );


    /*
        Clear Filters button
    */

    $("clearDatabaseFilters")
        ?.addEventListener(
            "click",
            clearDatabaseFilters
        );


    /*
        Optional:
        allow filters to update immediately
        when changed.
    */

    const filterIds = [

        "databaseAgeFilter",

        "databaseGenderFilter",

        "databaseDistrictFilter",

        "databaseReligionFilter",

        "databaseTribeFilter",

        "databaseEducationFilter",

        "databaseOccupationFilter",

        "databaseStatusFilter"

    ];


    filterIds.forEach(
        id => {

            const select =
                $(id);


            if (!select)
                return;


            select.addEventListener(
                "change",
                () => {

                    readDatabaseFilters();

                    applyDatabaseFilters();

                }
            );

        }
    );

  
}
/* =========================================
   USER ACTIVITY TIME
========================================= */

function getUserActivityTime(user) {

    const possibleTimes = [

        user?.lastActive,

        user?.presence?.lastSeen,

        user?.lastLogin,

        user?.lastSeen,

        user?.updatedAt

    ];


    for (
        const value of possibleTimes
    ) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            continue;

        }


        let time;


        /*
            Real number timestamp
        */

        if (
            typeof value === "number"
        ) {

            time = value;

        }


        /*
            Numeric timestamp stored
            as a string.
        */

        else if (
            /^\d+$/.test(
                String(value).trim()
            )
        ) {

            time =
                Number(
                    String(value).trim()
                );

        }


        /*
            Normal date string.
        */

        else {

            time =
                Date.parse(
                    String(value).trim()
                );

        }


        if (
            Number.isFinite(time) &&
            time > 0
        ) {

            return time;

        }

    }


    return null;

}
/* =========================================
   FIND INACTIVE USERS
========================================= */

function findInactiveUsers(
    inactiveDays
) {

    const cutoff =
        Date.now() -
        (
            Number(inactiveDays) *
            24 *
            60 *
            60 *
            1000
        );


    return databaseState.users.filter(
        user => {

            /*
                Never offer an already archived
                account for archiving again.
            */

            if (
                getAccountStatus(user)
                    .toLowerCase() ===
                "archived"
            ) {

                return false;

            }


            const activityTime =
                getUserActivityTime(user);


            /*
                If the account has no activity
                timestamp, we DO NOT assume it
                is inactive.
            */

            if (!activityTime) {

                return false;

            }


            return activityTime < cutoff;

        }
    );

}


/* =========================================
   OPEN ARCHIVE SCREEN
========================================= */

function openArchiveInactiveUsers() {

    renderArchiveInactiveModal(
        30
    );

}


/* =========================================
   ARCHIVE MODAL
========================================= */

function renderArchiveInactiveModal(
    inactiveDays
) {

    const candidates =
        findInactiveUsers(
            inactiveDays
        );


    let modal =
        $("archiveInactiveModal");


    if (!modal) {

        modal =
            document.createElement(
                "div"
            );

        modal.id =
            "archiveInactiveModal";

        modal.className =
            "database-action-modal";

        document.body.appendChild(
            modal
        );

    }


    modal.innerHTML = `

        <div
            class="database-action-dialog archive-dialog">

            <div
                class="database-action-header">

                <div>

                    <span>
                        DATABASE MAINTENANCE
                    </span>

                    <h2>
                        Archive Inactive Users
                    </h2>

                    <p>
                        Review accounts that have not
                        been active for the selected period.
                    </p>

                </div>


                <button
                    type="button"
                    id="closeArchiveInactive"
                    class="archive-close-btn">

                    ×

                </button>

            </div>


            <div
                class="database-action-body">

                <div
                    class="archive-rule-box">

                    <strong>
                        Inactivity period
                    </strong>

                    <select
                        id="archiveInactiveDays">

                        <option
                            value="30"
                            ${inactiveDays == 30
                                ? "selected"
                                : ""}>

                            30 days

                        </option>

                        <option
                            value="60"
                            ${inactiveDays == 60
                                ? "selected"
                                : ""}>

                            60 days

                        </option>

                        <option
                            value="90"
                            ${inactiveDays == 90
                                ? "selected"
                                : ""}>

                            90 days

                        </option>

                        <option
                            value="180"
                            ${inactiveDays == 180
                                ? "selected"
                                : ""}>

                            180 days

                        </option>

                        <option
                            value="365"
                            ${inactiveDays == 365
                                ? "selected"
                                : ""}>

                            1 year

                        </option>

                    </select>

                </div>


                <div
                    class="archive-summary">

                    <strong>
                        ${candidates.length}
                    </strong>

                    <span>
                        inactive accounts found
                    </span>

                </div>


                ${
                    candidates.length
                    ?

                    `

                    <div
                        class="archive-selection">

                        <div
                            class="archive-select-all">

                            <label>

                                <input
                                    type="checkbox"
                                    id="selectAllInactiveUsers">

                                Select all

                            </label>

                        </div>


                        <div
                            class="archive-user-list">

                            ${
                                candidates
                                    .map(
                                        user => {

                                            const
                                                activity =
                                                getUserActivityTime(
                                                    user
                                                );

                                            const
                                                activityDate =
                                                activity
                                                    ? new Date(
                                                        activity
                                                    ).toLocaleString()
                                                    : "Unknown";


                                            return `

                                                <label
                                                    class="archive-user-item">

                                                    <input
                                                        type="checkbox"
                                                        class="archive-user-checkbox"
                                                        value="${escapeHtml(
                                                            user.uid
                                                        )}">

                                                    <span
                                                        class="archive-user-info">

                                                        <strong>
                                                            ${escapeHtml(
                                                                getName(
                                                                    user
                                                                )
                                                            )}
                                                        </strong>

                                                        <small>
                                                            ${escapeHtml(
                                                                getEmail(
                                                                    user
                                                                )
                                                            )}
                                                        </small>

                                                        <em>
                                                            Last activity:
                                                            ${escapeHtml(
                                                                activityDate
                                                            )}
                                                        </em>

                                                    </span>

                                                </label>

                                            `;

                                        }
                                    )
                                    .join("")
                            }

                        </div>

                    </div>

                    `

                    :

                    `

                    <div
                        class="archive-empty">

                        <div>
                            ✓
                        </div>

                        <strong>
                            No inactive users found
                        </strong>

                        <span>
                            No active account has exceeded
                            the selected inactivity period.
                        </span>

                    </div>

                    `
                }

            </div>


            <div
                class="database-action-footer">

                <button
                    type="button"
                    id="cancelArchiveInactive"
                    class="secondary-btn">

                    Cancel

                </button>


                <button
                    type="button"
                    id="reviewArchiveInactive"
                    class="primary-btn"
                    ${
                        candidates.length
                            ? ""
                            : "disabled"
                    }>

                    Review Archive

                </button>

            </div>

        </div>

    `;


    modal.classList.add(
        "show"
    );


    /*
        Change inactivity period.
    */

    $("archiveInactiveDays")
        ?.addEventListener(
            "change",
            event => {

                renderArchiveInactiveModal(
                    Number(
                        event.target.value
                    )
                );

            }
        );


    /*
        Close.
    */

    $("closeArchiveInactive")
        ?.addEventListener(
            "click",
            closeArchiveInactiveModal
        );


    $("cancelArchiveInactive")
        ?.addEventListener(
            "click",
            closeArchiveInactiveModal
        );


    /*
        Select all.
    */

    $("selectAllInactiveUsers")
        ?.addEventListener(
            "change",
            event => {

                document
                    .querySelectorAll(
                        ".archive-user-checkbox"
                    )
                    .forEach(
                        checkbox => {

                            checkbox.checked =
                                event.target.checked;

                        }
                    );

            }
        );


    /*
        Review selected accounts.
    */

    $("reviewArchiveInactive")
        ?.addEventListener(
            "click",
            reviewArchiveSelection
        );

}


/* =========================================
   CLOSE ARCHIVE MODAL
========================================= */

function closeArchiveInactiveModal() {

    $("archiveInactiveModal")
        ?.classList.remove(
            "show"
        );

}


/* =========================================
   REVIEW ARCHIVE SELECTION
========================================= */

function reviewArchiveSelection() {

    const selected =
        Array.from(
            document.querySelectorAll(
                ".archive-user-checkbox:checked"
            )
        )
        .map(
            checkbox =>
                checkbox.value
        );


    if (!selected.length) {

        showToast(
            "Select at least one account to archive.",
            "warning"
        );

        return;

    }


    showArchiveConfirmation(
        selected
    );

}


/* =========================================
   ARCHIVE CONFIRMATION
========================================= */

function showArchiveConfirmation(
    selectedUids
) {

    const existing =
        $("archiveConfirmModal");


    existing?.remove();


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "archiveConfirmModal";

    modal.className =
        "merge-confirm-overlay";


    modal.innerHTML = `

        <div
            class="merge-confirm-card">

            <div
                class="merge-confirm-icon">

                📦

            </div>


            <div
                class="merge-confirm-content">

                <span
                    class="merge-confirm-label">

                    DATABASE MAINTENANCE

                </span>


                <h3>
                    Confirm Archive
                </h3>


                <p>
                    You are about to archive
                    <strong>
                        ${selectedUids.length}
                    </strong>
                    account${
                        selectedUids.length === 1
                            ? ""
                            : "s"
                    }.
                </p>


                <div
                    class="merge-confirm-warning">

                    <strong>
                        Safe archive
                    </strong>

                    <span>
                        The accounts will not be deleted.
                        Their records will be preserved
                        and marked as Archived so they
                        can be restored later.
                    </span>

                </div>

            </div>


            <div
                class="merge-confirm-actions">

                <button
                    type="button"
                    id="cancelArchiveConfirm"
                    class="merge-confirm-cancel">

                    Cancel

                </button>


                <button
                    type="button"
                    id="acceptArchiveConfirm"
                    class="merge-confirm-danger">

                    Archive Users

                </button>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    requestAnimationFrame(
        () => {

            modal.classList.add(
                "show"
            );

        }
    );


    $("cancelArchiveConfirm")
        ?.addEventListener(
            "click",
            () => {

                modal.remove();

            }
        );


    $("acceptArchiveConfirm")
        ?.addEventListener(
            "click",
            async () => {

                modal.remove();

                await executeArchiveInactiveUsers(
                    selectedUids
                );

            }
        );

}


/* =========================================
   EXECUTE ARCHIVE
========================================= */

async function executeArchiveInactiveUsers(
    selectedUids
) {

    try {

        const updates = {};

        const archivedAt =
            Date.now();


        const archivedBy =
            "Super Admin";


        let archivedCount =
            0;


        for (
            const uid of selectedUids
        ) {

            const user =
                databaseState.users.find(
                    item =>
                        String(item.uid) ===
                        String(uid)
                );


            if (!user) {

                continue;

            }


            /*
                Save a complete recovery copy.
            */

            updates[
                `archivedUsers/${uid}`
            ] = {

                ...user,

                archivedAt,

                archivedBy,

                archiveReason:
                    "Inactive user"

            };


            /*
                Mark the live account archived.
            */

            updates[
                `users/${uid}/status`
            ] =
                "Archived";


            updates[
                `users/${uid}/account/status`
            ] =
                "Archived";


            updates[
                `users/${uid}/account/archived`
            ] =
                true;


            updates[
                `users/${uid}/account/archivedAt`
            ] =
                archivedAt;


            updates[
                `users/${uid}/account/archivedBy`
            ] =
                archivedBy;


            archivedCount++;

        }


        if (!archivedCount) {

            showToast(
                "No accounts were archived.",
                "warning"
            );

            return;

        }


        /*
            One Firebase update.
        */

        await update(
            ref(db),
            updates
        );


        /*
            Record the action.
        */

        await saveDatabaseActivity(

            `Archived ${archivedCount} inactive account${
                archivedCount === 1
                    ? ""
                    : "s"
            }`,

            "Success"

        );


        /*
            Reload everything.
        */

        await loadDatabaseUsers();


        populateDatabaseFilters();

        updateFilteredSummary();


        showToast(

            `${archivedCount} account${
                archivedCount === 1
                    ? ""
                    : "s"
            } archived successfully.`,

            "success"

        );


    }

    catch (error) {

        console.error(
            "ARCHIVE INACTIVE USERS ERROR:",
            error
        );


        await saveDatabaseActivity(
            "Archive inactive users failed",
            "Failed"
        );


        showToast(
            error.message ||
            "Unable to archive inactive users.",
            "error"
        );

    }

}
/* =========================================
   DATABASE CENTRE INITIALIZATION
========================================= */

async function initDatabaseCentre() {

    console.log(
        "Twagalane Database Centre starting..."
    );


    try {

        /*
            1. Load existing Firebase users
        */

        await loadDatabaseUsers();
      
        /*
            2. Build filter options
        */

        populateDatabaseFilters();


        /*
            3. Connect database filters
        */

        bindDatabaseFilterEvents();
      bindDatabaseUserEditorControls();
      



$("scanDuplicatesBtn")
    ?.addEventListener(
        "click",
        scanDuplicateAccounts
    );
$("mergeAccountsBtn")
    ?.addEventListener(
        "click",
        openMergeAccounts
    );


$("archiveInactiveBtn")
    ?.addEventListener(
        "click",
        openArchiveInactiveUsers
    );


bindDatabaseImportEvents();
      
        /*
            4. Connect database grouping
        */

        bindDatabaseGroupEvents();


        /*
            5. Connect export buttons
        */

        bindDatabaseExportEvents();


        /*
            6. Connect IMPORT buttons
            and file input
        */

      


        /*
            7. Update summary
        */

        updateFilteredSummary();
      

await loadImportHistory();


/*
    Load recent database activity.
*/

await loadDatabaseActivity();


        /*
            Database Centre is ready
        */

        console.log(
            "Twagalane Database Centre ready."
        );

        console.log(
            "Users loaded:",
            databaseState.users.length
        );

        console.log(
            "Import system initialized."
        );


    } catch (error) {

        console.error(
            "Database Centre initialization failed:",
            error
        );

        showDatabaseError(
            "Database Centre failed to initialize."
        );

    }

}

/* =========================================
   DATABASE EXPORT CENTRE
   CSV / EXCEL / JSON / PDF / SQL / FIREBASE
========================================= */


/* =========================================
   CSV ESCAPE
========================================= */

function csvEscape(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    const text =
        String(value);


    if (
        text.includes(",") ||
        text.includes('"') ||
        text.includes("\n") ||
        text.includes("\r")
    ) {

        return `"${text.replaceAll(
            '"',
            '""'
        )}"`;

    }


    return text;

}


/* =========================================
   CREATE EXPORT RECORD
========================================= */

function createExportRecord(user) {

    const info =
        getPersonalInformation(user);


    return {

        UID:
            user.uid || "",

        Name:
            getName(user),

        Username:
            info.username ||
            user.username ||
            "",

        Email:
            getEmail(user),

        Phone:
            info.phoneNumber ||
            info.phone ||
            user.phoneNumber ||
            user.phone ||
            "",

        Gender:
            getGender(user),

        Age:
            getAge(user),

        DateOfBirth:
            info.dateOfBirth ||
            "",

        District:
            getDistrict(user),

        Religion:
            getReligion(user),

        Tribe:
            getTribe(user),

        Education:
            getEducation(user),

        Occupation:
            getOccupation(user),

        MaritalStatus:
            info.maritalStatus ||
            "",

        Verification:
            user?.verification?.status ===
            "approved"
                ? "Verified"
                : "Unverified",

        Subscription:
            user?.subscription?.active ===
            true
                ? "Premium"
                : "Free",

        AccountStatus:
            getAccountStatus(user)

    };

}


/* =========================================
   DOWNLOAD HELPER
========================================= */

function downloadDatabaseFile(
    content,
    filename,
    type
) {

    const blob =
        content instanceof Blob

        ? content

        :

        new Blob(
            [content],
            {
                type
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        filename;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    setTimeout(
        () => {

            URL.revokeObjectURL(
                url
            );

        },
        1000
    );

}


/* =========================================
   FILE DATE
========================================= */

function exportDate() {

    return new Date()
        .toISOString()
        .slice(
            0,
            10
        );

}


/* =========================================
   1. CSV EXPORT
========================================= */

function exportDatabaseCSV() {

    const users =
        databaseState.filteredUsers;


    if (!users.length) {

        showImportMessage(
    "There are no records to export.",
    "warning"
);

        return;

    }


    const records =
        users.map(
            createExportRecord
        );


    const headers =
        Object.keys(
            records[0]
        );


    const lines = [];


    lines.push(
        headers
            .map(
                csvEscape
            )
            .join(",")
    );


    records.forEach(
        record => {

            lines.push(

                headers
                    .map(
                        header =>
                            csvEscape(
                                record[
                                    header
                                ]
                            )
                    )
                    .join(",")

            );

        }
    );


    const csv =
        lines.join(
            "\r\n"
        );


    downloadDatabaseFile(

        "\uFEFF" + csv,

        `twagalane-database-${exportDate()}.csv`,

        "text/csv;charset=utf-8;"

    );


    console.log(
        `CSV exported: ${users.length} records`
    );

}


/* =========================================
   2. EXCEL EXPORT
========================================= */

function loadExcelLibrary() {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            if (
                window.XLSX
            ) {

                resolve(
                    window.XLSX
                );

                return;

            }


            const script =
                document.createElement(
                    "script"
                );


            script.src =
                "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";


            script.onload =
                () => {

                    if (
                        window.XLSX
                    ) {

                        resolve(
                            window.XLSX
                        );

                    } else {

                        reject(
                            new Error(
                                "Excel library unavailable."
                            )
                        );

                    }

                };


            script.onerror =
                () => {

                    reject(
                        new Error(
                            "Unable to load Excel library."
                        )
                    );

                };


            document.head.appendChild(
                script
            );

        }
    );

}


async function exportDatabaseExcel() {

    const users =
        databaseState.filteredUsers;


    if (!users.length) {
showImportMessage(
        "There are no records to export.",
        "warning"
    );
        return;

    }


    try {

        const XLSX =
            await loadExcelLibrary();


        const records =
            users.map(
                createExportRecord
            );


        const worksheet =
            XLSX.utils.json_to_sheet(
                records
            );


        /*
            Make columns reasonably wide.
        */

        worksheet["!cols"] =
            [

                {
                    wch: 25
                },

                {
                    wch: 25
                },

                {
                    wch: 18
                },

                {
                    wch: 30
                },

                {
                    wch: 18
                },

                {
                    wch: 12
                },

                {
                    wch: 8
                },

                {
                    wch: 15
                },

                {
                    wch: 18
                },

                {
                    wch: 18
                },

                {
                    wch: 18
                },

                {
                    wch: 22
                },

                {
                    wch: 22
                },

                {
                    wch: 20
                },

                {
                    wch: 15
                },

                {
                    wch: 15
                },

                {
                    wch: 18
                }

            ];


        const workbook =
            XLSX.utils.book_new();


        XLSX.utils.book_append_sheet(

            workbook,

            worksheet,

            "Users"

        );


        /*
            Add a second sheet showing
            the current filters.
        */

        const filterSheet =
            XLSX.utils.aoa_to_sheet(

                [

                    [
                        "Twagalane Database Export"
                    ],

                    [
                        "Generated",
                        new Date()
                            .toLocaleString()
                    ],

                    [
                        "Records",
                        users.length
                    ],

                    [],

                    [
                        "Filter",
                        "Value"
                    ],

                    [
                        "Age",
                        databaseFilters.age ||
                        "All"
                    ],

                    [
                        "Gender",
                        databaseFilters.gender ||
                        "All"
                    ],

                    [
                        "District",
                        databaseFilters.district ||
                        "All"
                    ],

                    [
                        "Religion",
                        databaseFilters.religion ||
                        "All"
                    ],

                    [
                        "Tribe",
                        databaseFilters.tribe ||
                        "All"
                    ],

                    [
                        "Education",
                        databaseFilters.education ||
                        "All"
                    ],

                    [
                        "Occupation",
                        databaseFilters.occupation ||
                        "All"
                    ],

                    [
                        "Account Status",
                        databaseFilters.status ||
                        "All"
                    ]

                ]

            );


        XLSX.utils.book_append_sheet(

            workbook,

            filterSheet,

            "Export Information"

        );


        XLSX.writeFile(

            workbook,

            `twagalane-database-${exportDate()}.xlsx`

        );


        console.log(
            `Excel exported: ${users.length} records`
        );


    } catch (error) {

        console.error(
            "Excel export failed:",
            error
        );

showImportMessage(
    "Excel export failed. Check your internet connection and try again.",
    "error"
);

    }

}


/* =========================================
   3. JSON EXPORT
========================================= */

function exportDatabaseJSON() {

    const users =
        databaseState.filteredUsers;


    if (!users.length) {

       showImportMessage(
    "There are no records to export.",
    "warning"
);

        return;

    }


    const exportData = {

        exportType:
            "TWAGALANE_FILTERED_DATABASE",

        version:
            1,

        generatedAt:
            new Date().toISOString(),

        generatedBy:
            "Super Admin",

        totalRecords:
            users.length,

        filters:
            {
                ...databaseFilters
            },

        users

    };


    downloadDatabaseFile(

        JSON.stringify(
            exportData,
            null,
            2
        ),

        `twagalane-database-${exportDate()}.json`,

        "application/json"

    );


    console.log(
        `JSON exported: ${users.length} records`
    );

}


/* =========================================
   4. FULL FIREBASE BACKUP
========================================= */

async function exportFirebaseBackup() {

    try {

        const confirmBackup =
            confirm(

                "Create a complete Firebase database backup?\n\n" +

                "This will export the entire database, not just the currently filtered users."

            );


        if (!confirmBackup)
            return;


        console.log(
            "Creating full Firebase backup..."
        );


        const databaseRef =
            ref(db);


        const snapshot =
            await get(
                databaseRef
            );


        if (
            !snapshot.exists()
        ) {

            alert(
                "Firebase database is empty."
            );

            return;

        }


        const backup = {

            backupType:
                "TWAGALANE_FULL_FIREBASE_BACKUP",

            version:
                1,

            createdAt:
                new Date().toISOString(),

            data:
                snapshot.val()

        };


        downloadDatabaseFile(

            JSON.stringify(
                backup,
                null,
                2
            ),

            `twagalane-full-backup-${exportDate()}.json`,

            "application/json"

        );


        console.log(
            "Full Firebase backup exported."
        );


    } catch (error) {

        console.error(
            "Firebase backup failed:",
            error
        );


        alert(
            "Firebase backup failed."
        );

    }

}


/* =========================================
   5. PDF REPORT
========================================= */

function exportDatabasePDF() {

    const users =
        databaseState.filteredUsers;


    if (!users.length) {

        showImportMessage(
    "There are no records to export.",
    "warning"
);
        return;

    }


    /*
        Open a printable report.
        The administrator can choose
        Save as PDF from the browser.
    */

    const report =
        window.open(
            "",
            "_blank"
        );


    if (!report) {

     showImportMessage(
        "Please allow popups for PDF export.",
        "warning"
    );
        return;

    }


    const rows =
        users
            .slice(
                0,
                1000
            )
            .map(
                user => {

                    const info =
                        getPersonalInformation(
                            user
                        );


                    return `

                        <tr>

                            <td>
                                ${escapeHtml(
                                    getName(user)
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    getGender(user) ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    getAge(user) ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    getDistrict(user) ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    getReligion(user) ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    getOccupation(user) ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${
                                    user?.verification?.status ===
                                    "approved"
                                    ? "Verified"
                                    : "Unverified"
                                }
                            </td>

                        </tr>

                    `;

                }
            )
            .join("");


    report.document.write(`

        <!DOCTYPE html>

        <html>

        <head>

            <meta charset="UTF-8">

            <title>
                Twagalane Database Report
            </title>


            <style>

                * {
                    box-sizing: border-box;
                }


                body {

                    margin: 0;

                    padding: 35px;

                    font-family:
                        Arial,
                        sans-serif;

                    color:
                        #111827;

                    background:
                        #ffffff;

                }


                .header {

                    border-bottom:
                        2px solid #4F46E5;

                    padding-bottom:
                        20px;

                    margin-bottom:
                        25px;

                }


                h1 {

                    margin:
                        0 0 7px;

                    font-size:
                        25px;

                }


                .subtitle {

                    color:
                        #64748B;

                    font-size:
                        12px;

                }


                .summary {

                    display:
                        flex;

                    gap:
                        20px;

                    margin-bottom:
                        25px;

                }


                .summary-card {

                    padding:
                        12px 18px;

                    background:
                        #F8FAFC;

                    border:
                        1px solid #E2E8F0;

                    border-radius:
                        8px;

                }


                .summary-card strong {

                    display:
                        block;

                    font-size:
                        20px;

                }


                .summary-card span {

                    font-size:
                        10px;

                    color:
                        #64748B;

                }


                table {

                    width:
                        100%;

                    border-collapse:
                        collapse;

                }


                th {

                    background:
                        #F1F5F9;

                    font-weight:
                        700;

                }


                th,
                td {

                    border:
                        1px solid #E2E8F0;

                    padding:
                        7px;

                    text-align:
                        left;

                    font-size:
                        9px;

                }


                .print-button {

                    margin-bottom:
                        20px;

                    padding:
                        10px 18px;

                    border:
                        0;

                    border-radius:
                        7px;

                    background:
                        #4F46E5;

                    color:
                        #ffffff;

                    cursor:
                        pointer;

                }


                @media print {

                    .print-button {

                        display:
                            none;

                    }

                }

            </style>

        </head>


        <body>


            <div class="header">

                <h1>
                    Twagalane Database Report
                </h1>

                <div class="subtitle">

                    Generated:
                    ${new Date().toLocaleString()}

                </div>

            </div>


          <button
                class="print-button"
                onclick="window.print()">

                Print / Save as PDF

            </button>


            <div class="summary">


                <div class="summary-card">

                    <strong>
                        ${users.length.toLocaleString()}
                    </strong>

                    <span>
                        Records
                    </span>

                </div>


                <div class="summary-card">

                    <strong>
                        ${
                            users.filter(
                                user =>
                                    String(
                                        getGender(user)
                                    )
                                    .toLowerCase()
                                    ===
                                    "male"
                            ).length
                        }
                    </strong>

                    <span>
                        Male
                    </span>

                </div>


                <div class="summary-card">

                    <strong>
                        ${
                            users.filter(
                                user =>
                                    String(
                                        getGender(user)
                                    )
                                    .toLowerCase()
                                    ===
                                    "female"
                            ).length
                        }
                    </strong>

                    <span>
                        Female
                    </span>

                </div>


            </div>


            <table>

                <thead>

                    <tr>

                        <th>
                            Name
                        </th>

                        <th>
                            Gender
                        </th>

                        <th>
                            Age
                        </th>

                        <th>
                            District
                        </th>

                        <th>
                            Religion
                        </th>

                        <th>
                            Occupation
                        </th>

                        <th>
                            Verification
                        </th>

                    </tr>

                </thead>

<tbody>

                    ${rows}

                </tbody>

            </table>


        </body>

        </html>

    `);


    report.document.close();


    console.log(
        `PDF report prepared: ${users.length} records`
    );

}


/* =========================================
   6. SQL EXPORT
========================================= */

function sqlEscape(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "NULL";

    }


    const text =
        String(value)
            .replaceAll(
                "'",
                "''"
            );


    return `'${text}'`;

}


function exportDatabaseSQL() {

    const users =
        databaseState.filteredUsers;


    if (!users.length) {

        showImportMessage(
    "There are no records to export.",
    "warning"
);

        return;

    }


    const lines = [];


    lines.push(
        "-- TWAGALANE DATABASE EXPORT"
    );


    lines.push(
        `-- Generated: ${new Date().toISOString()}`
    );


    lines.push(
        `-- Records: ${users.length}`
    );


    lines.push("");


    lines.push(

        "CREATE TABLE IF NOT EXISTS users (" +

        "uid VARCHAR(255) PRIMARY KEY," +

        "name VARCHAR(255)," +

        "username VARCHAR(255)," +

        "email VARCHAR(255)," +

        "phone VARCHAR(100)," +

        "gender VARCHAR(50)," +

        "age INT," +

        "date_of_birth VARCHAR(50)," +

        "district VARCHAR(255)," +

        "religion VARCHAR(255)," +

        "tribe VARCHAR(255)," +

        "education VARCHAR(255)," +

        "occupation VARCHAR(255)," +

        "marital_status VARCHAR(100)," +

        "verification VARCHAR(50)," +

        "subscription VARCHAR(50)," +

        "account_status VARCHAR(50)" +

        ");"

    );


    lines.push("");

    users.forEach(
        user => {

            const record =
                createExportRecord(user);

            lines.push(
                "INSERT INTO users (" +
                "uid,name,username,email,phone," +
                "gender,age,date_of_birth,district," +
                "religion,tribe,education,occupation," +
                "marital_status,verification," +
                "subscription,account_status" +
                ") VALUES (" +

                [
                    sqlEscape(record.UID),
                    sqlEscape(record.Name),
                    sqlEscape(record.Username),
                    sqlEscape(record.Email),
                    sqlEscape(record.Phone),
                    sqlEscape(record.Gender),

                    record.Age
                        ? Number(record.Age) || "NULL"
                        : "NULL",

                    sqlEscape(record.DateOfBirth),
                    sqlEscape(record.District),
                    sqlEscape(record.Religion),
                    sqlEscape(record.Tribe),
                    sqlEscape(record.Education),
                    sqlEscape(record.Occupation),
                    sqlEscape(record.MaritalStatus),
                    sqlEscape(record.Verification),
                    sqlEscape(record.Subscription),
                    sqlEscape(record.AccountStatus)

                ].join(",") +

                ");"
            );

        }
    );

    downloadDatabaseFile(
        lines.join("\n"),
        `twagalane-database-${exportDate()}.sql`,
        "application/sql"
    );

    console.log(
        `SQL exported: ${users.length} records`
    );

}

/* =========================================
   EXPORT BUTTON EVENTS
========================================= */

function bindDatabaseExportEvents() {

    $("exportCsvBtn")
        ?.addEventListener("click", exportDatabaseCSV);

    $("exportExcelBtn")
        ?.addEventListener("click", exportDatabaseExcel);

    $("exportJsonBtn")
        ?.addEventListener("click", exportDatabaseJSON);

    $("exportPdfBtn")
        ?.addEventListener("click", exportDatabasePDF);

    $("exportSqlBtn")
        ?.addEventListener("click", exportDatabaseSQL);

    $("exportFirebaseBtn")
        ?.addEventListener("click", exportFirebaseBackup);

}
  
  /* =========================================
   DATABASE IMPORT CENTRE
========================================= */

let selectedImportFile = null;

let importedRecords = [];

/* =========================================
   IMPORT FILE EVENTS
========================================= */

function bindDatabaseImportEvents() {

    const importButton =
        $("importDatabaseBtn");

    const fileInput =
        $("databaseFileInput");

    if (!fileInput) {

        console.warn(
            "databaseFileInput not found."
        );

        return;

    }


    /*
        IMPORT BUTTON
        ---------------------------------
        Only use JavaScript click when
        the button itself is clicked.
    */


    /*
        FILE SELECTED
    */

    fileInput.addEventListener(
        "change",
        async event => {

            const file =
                event.target.files &&
                event.target.files[0];


            if (!file) {

                return;

            }


            selectedImportFile =
                file;


            console.log(
                "Import file selected:",
                file.name,
                file.type,
                file.size
            );


            try {

                await processImportFile(
                    file
                );

            } catch (error) {

                console.error(
                    "File processing failed:",
                    error
                );

                showImportMessage(
                    "Unable to process the selected file.",
                    "error"
                );

            }


            /*
                Allows the user to select
                the SAME file again.
            */

            fileInput.value = "";

        }
    );


    /*
        AUTO MAP
    */

    $("autoMapImportBtn")
        ?.addEventListener(
            "click",
            autoMapImportedFields
        );


    /*
        VALIDATE MAPPING
    */

    $("validateMappedImportBtn")
        ?.addEventListener(
            "click",
            () => {

                if (
                    !validateImportMapping()
                ) {

                    return;

                }


                const results =
                    validateImportedRecords();


                showImportValidationResults(
                    results
                );

            }
        );

}

  /* =========================================
   IMPORT MAPPING VALIDATION
========================================= */

function getCurrentImportMapping() {

    const mapping = {};

    const selects =
        document.querySelectorAll(
            ".import-field-select"
        );


    selects.forEach(
        select => {

            const source =
                select.dataset.source;

            const target =
                select.value;


            if (
                source &&
                target
            ) {

                mapping[
                    source
                ] = target;

            }

        }
    );


    return mapping;

}


/* =========================================
   CHECK REQUIRED MAPPING
========================================= */

function validateImportMapping() {

    const mapping =
        getCurrentImportMapping();


    const mappedFields =
        Object.values(
            mapping
        );


    const requiredFields =
        importFields.filter(
            field =>
                field.required
        );


    const missingRequired =
        requiredFields.filter(
            field =>
                !mappedFields.includes(
                    field.key
                )
        );


    if (
        missingRequired.length
    ) {

        showImportMessage(

            `Required field missing: ${missingRequired.map(
                field =>
                    field.label
            ).join(", ")}`,

            "warning"

        );


        return false;

    }


    /*
        Prevent two old columns from
        being mapped to the same field.
    */

    const duplicates =
        mappedFields.filter(
            (
                value,
                index,
                array
            ) =>
                array.indexOf(
                    value
                ) !== index
        );


    if (
        duplicates.length
    ) {

        showImportMessage(

            "Two or more columns are mapped to the same Twagalane field. Please correct the mapping.",

            "warning"

        );


        return false;

    }


    return true;

}
  /* =========================================
   VALIDATE IMPORTED RECORDS
========================================= */

function validateImportedRecords() {

    const mapping =
        getCurrentImportMapping();


    const results = {

        valid: [],

        invalid: [],

        duplicates: [],

        total:
            importedRecords.length

    };


    const seenEmails =
        new Set();

    const seenPhones =
        new Set();


    /*
        Existing Firebase users
    */

    const existingEmails =
        new Set();

    const existingPhones =
        new Set();

    const existingUids =
        new Set();


    databaseState.users.forEach(
        user => {

            const email =
                String(
                    getEmail(user) || ""
                )
                .trim()
                .toLowerCase();


            const phone =
                String(
                    getPhoneForImport(user) || ""
                )
                .trim();


            if (email) {

                existingEmails.add(
                    email
                );

            }


            if (phone) {

                existingPhones.add(
                    phone
                );

            }


            if (user.uid) {

                existingUids.add(
                    String(
                        user.uid
                    )
                );

            }

        }
    );


    importedRecords.forEach(
        (
            record,
            index
        ) => {

            const mapped =
                mapImportedRecord(
                    record,
                    mapping
                );


            const problems = [];


            /*
                NAME
            */

            if (
                !String(
                    mapped.name || ""
                ).trim()
            ) {

                problems.push(
                    "Missing name"
                );

            }


            /*
                EMAIL
            */

            const email =
                String(
                    mapped.email || ""
                )
                .trim()
                .toLowerCase();


            if (
                email &&
                !isValidImportEmail(
                    email
                )
            ) {

                problems.push(
                    "Invalid email"
                );

            }


            /*
                AGE
            */

            if (
                mapped.age !== "" &&
                mapped.age !== null &&
                mapped.age !== undefined
            ) {

                const age =
                    Number(
                        mapped.age
                    );


                if (
                    !Number.isFinite(
                        age
                    ) ||
                    age < 0 ||
                    age > 120
                ) {

                    problems.push(
                        "Invalid age"
                    );

                }

            }


            /*
                DUPLICATE EMAIL
            */

            if (email) {

                if (
                    seenEmails.has(
                        email
                    ) ||
                    existingEmails.has(
                        email
                    )
                ) {

                    problems.push(
                        "Duplicate email"
                    );

                }


                seenEmails.add(
                    email
                );

            }


            /*
                DUPLICATE PHONE
            */

            const phone =
                String(
                    mapped.phone || ""
                )
                .trim();


            if (phone) {

                if (
                    seenPhones.has(
                        phone
                    ) ||
                    existingPhones.has(
                        phone
                    )
                ) {

                    problems.push(
                        "Duplicate phone"
                    );

                }


                seenPhones.add(
                    phone
                );

            }


            /*
                DUPLICATE UID
            */

            const uid =
                String(
                    mapped.uid || ""
                ).trim();


            if (
                uid &&
                existingUids.has(
                    uid
                )
            ) {

                problems.push(
                    "Existing Firebase UID"
                );

            }


            const result = {

                row:
                    index + 2,

                original:
                    record,

                mapped,

                problems

            };


            if (
                problems.length
            ) {

                if (
                    problems.some(
                        problem =>
                            problem.includes(
                                "Duplicate"
                            ) ||
                            problem.includes(
                                "Existing Firebase UID"
                            )
                    )
                ) {

                    results.duplicates.push(
                        result
                    );

                } else {

                    results.invalid.push(
                        result
                    );

                }

            } else {

                results.valid.push(
                    result
                );

            }

        }
    );


    return results;

}

  /* =========================================
   MAP ONE IMPORTED RECORD
========================================= */

function mapImportedRecord(
    record,
    mapping
) {

    const mapped = {};


    Object.entries(
        mapping
    ).forEach(
        (
            [
                source,
                target
            ]
        ) => {

            mapped[
                target
            ] =
                record[
                    source
                ];

        }
    );


    return mapped;

}
/* =========================================
   BUILD FIREBASE IMPORT RECORD
========================================= */

function buildFirebaseImportRecord(
    mapped,
    originalUid = ""
) {

    const record = {};


    /*
        Firebase UID
    */

    if (
        originalUid
    ) {

        record.uid =
            String(
                originalUid
            ).trim();

    }
/* =========================================
   IMPORTED ACCOUNT IDENTITY
========================================= */

record.account = {

    source: "imported",

    imported: true,

    registered: false

};

    /*
        PERSONAL INFORMATION
    */

    record.personalInformation = {

        fullName:
            String(
                mapped.name || ""
            ).trim(),

        email:
            String(
                mapped.email || ""
            ).trim(),

        phone:
            String(
                mapped.phone || ""
            ).trim(),

        gender:
            String(
                mapped.gender || ""
            ).trim(),

        dateOfBirth:
            String(
                mapped.dateOfBirth || ""
            ).trim(),

        age:
            mapped.age !== undefined &&
            mapped.age !== null &&
            mapped.age !== ""
                ? Number(
                    mapped.age
                )
                : "",

        religion:
            String(
                mapped.religion || ""
            ).trim(),

        tribe:
            String(
                mapped.tribe || ""
            ).trim(),

        education:
            String(
                mapped.education || ""
            ).trim(),

        occupation:
            String(
                mapped.occupation || ""
            ).trim(),

        maritalStatus:
            String(
                mapped.maritalStatus || ""
            ).trim(),

        username:
            String(
                mapped.username || ""
            ).trim()

    };


    /*
        PHONE COMPATIBILITY
    */

    if (
        record.personalInformation.phone
    ) {

        record.personalInformation.phoneNumber =
            record.personalInformation.phone;

    }


    /*
        LOCATION
    */

    if (
        mapped.district
    ) {

        record.location = {

            home: {

                district:
                    String(
                        mapped.district
                    ).trim()

            }

        };

    }


    /*
        LAST ACTIVE
        ---------------------------------
        Keep this at the ROOT level because
        getUserActivityTime() checks:
        
        user.lastActive
    */

    if (
        mapped.lastActive !== undefined &&
        mapped.lastActive !== null &&
        String(
            mapped.lastActive
        ).trim() !== ""
    ) {

        const rawLastActive =
            mapped.lastActive;


        /*
            If already a number, preserve it.
        */

        if (
            typeof rawLastActive ===
            "number" &&
            Number.isFinite(
                rawLastActive
            )
        ) {

            record.lastActive =
                rawLastActive;

        }

        /*
            Numeric timestamp stored as
            a CSV string.
        */

        else if (
            /^\d+$/.test(
                String(
                    rawLastActive
                ).trim()
            )
        ) {

            record.lastActive =
                Number(
                    String(
                        rawLastActive
                    ).trim()
                );

        }

        /*
            Date string such as:
            2026-05-19
            2026-05-19T12:30:00Z
        */

        else {

            const parsedDate =
                Date.parse(
                    String(
                        rawLastActive
                    ).trim()
                );


            if (
                Number.isFinite(
                    parsedDate
                )
            ) {

                record.lastActive =
                    parsedDate;

            }

        }

    }


    /*
        PRESERVE IMPORTED UID
        when available.
    */

    if (
        mapped.uid
    ) {

        record.uid =
            String(
                mapped.uid
            ).trim();

    }


    return record;

}
/* =========================================
   GENERATE SAFE IMPORT UID
========================================= */

function generateImportUID() {

    const usersRef =
        ref(
            db,
            "users"
        );

    const newUserRef =
        push(
            usersRef
        );

    return newUserRef.key;

}
/* =========================================
   PREPARE IMPORTED USER
========================================= */

function prepareImportedFirebaseUser(
    validationResult
) {

    const mapped =
        validationResult.mapped;


    const importedUid =
        String(
            mapped.uid || ""
        ).trim();


    const uid =
        importedUid ||
        generateImportUID();


    const firebaseUser =
        buildFirebaseImportRecord(
            mapped,
            uid
        );


    /*
        Never allow the imported UID
        to remain inside the user object.
        The UID is the Firebase database key.
    */

    delete firebaseUser.uid;


    return {

        uid,

        data:
            firebaseUser

    };

}

/* =========================================
   IMPORT PROGRESS
========================================= */

function showImportProgress(
    current,
    total,
    message
) {

    let panel =
        document.getElementById(
            "databaseImportProgress"
        );


    if (!panel) {

        panel =
            document.createElement(
                "div"
            );

        panel.id =
            "databaseImportProgress";

        panel.className =
            "database-import-progress";


        const container =
            $("databaseImportMapping") ||
            document.body;


        container.appendChild(
            panel
        );

    }


    const percentage =
        total > 0
            ? Math.min(
                100,
                Math.round(
                    (
                        current /
                        total
                    ) * 100
                )
            )
            : 0;


    panel.innerHTML = `

        <div class="import-progress-header">

            <div>

                <span>
                    DATABASE IMPORT
                </span>

                <strong>
                    ${message}
                </strong>

            </div>


            <b>
                ${percentage}%
            </b>

        </div>


        <div
            class="import-progress-track">

            <div
                class="import-progress-bar"
                style="width:${percentage}%">
            </div>

        </div>


        <div
            class="import-progress-count">

            ${current.toLocaleString()}
            /
            ${total.toLocaleString()}
            records

        </div>

    `;

}

/* =========================================
   IMPORT COMPLETION REPORT
========================================= */

function showImportCompletionReport({
    imported = 0,
    skipped = 0,
    invalid = 0,
    failed = 0,
    total = 0
}) {

    const oldReport =
        document.getElementById(
            "importCompletionReport"
        );

    if (oldReport) {
        oldReport.remove();
    }


    const report =
        document.createElement(
            "div"
        );


    report.id =
        "importCompletionReport";


    report.className =
        "import-completion-report";


    report.innerHTML = `

        <div class="completion-icon">
            ✓
        </div>


        <div class="completion-content">

            <span class="completion-kicker">
                DATABASE IMPORT
            </span>


            <h3>
                Import completed
            </h3>


            <p>
                The database import process has finished.
            </p>


            <div class="completion-stats">

                <div>
                    <strong>
                        ${imported.toLocaleString()}
                    </strong>

                    <span>
                        Imported
                    </span>
                </div>


                <div>
                    <strong>
                        ${skipped.toLocaleString()}
                    </strong>

                    <span>
                        Skipped
                    </span>
                </div>


                <div>
                    <strong>
                        ${invalid.toLocaleString()}
                    </strong>

                    <span>
                        Invalid
                    </span>
                </div>


                <div>
                    <strong>
                        ${failed.toLocaleString()}
                    </strong>

                    <span>
                        Failed
                    </span>
                </div>

            </div>


            <div class="completion-total">

                <span>
                    Total processed
                </span>

                <strong>
                    ${total.toLocaleString()}
                </strong>

            </div>


            <div class="completion-actions">

                <button
                    type="button"
                    id="closeImportCompletion"
                    class="secondary-btn">

                    Close

                </button>

            </div>

        </div>

    `;


    const container =
        $("databaseImportMapping");


    if (container) {

        container.appendChild(
            report
        );

    } else {

        document.body.appendChild(
            report
        );

    }


    report
        .querySelector(
            "#closeImportCompletion"
        )
        ?.addEventListener(
            "click",
            () => {

                report.remove();

            }
        );

}


/* =========================================
   SAVE IMPORT HISTORY
========================================= */

async function saveImportHistory({
    fileName,
    imported,
    skipped,
    invalid,
    failed
}) {

    try {

        const historyRef =
            ref(
                db,
                "databaseImportHistory"
            );


        await push(
            historyRef,
            {

                fileName:
                    fileName || "Unknown file",

                records:
                    imported || 0,

                duplicates:
                    skipped || 0,

                invalid:
                    invalid || 0,

                failed:
                    failed || 0,

                importedBy:
                    "Super Admin",

                timestamp:
                    new Date().toISOString(),

                status:
                    failed > 0
                        ? "Partial"
                        : "Success"

            }
        );


        console.log(
            "Import history saved."
        );


    } catch (error) {

        console.error(
            "Could not save import history:",
            error
        );

    }

}

/* =========================================
   LOAD IMPORT HISTORY
========================================= */

async function loadImportHistory() {

    const table =
        $("importHistoryTable");

    if (!table) {

        console.warn(
            "importHistoryTable not found."
        );

        return;

    }


    try {

        const snapshot =
            await get(
                ref(
                    db,
                    "databaseImportHistory"
                )
            );


        if (!snapshot.exists()) {

            table.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        style="text-align:center;">
                        No imports yet.
                    </td>
                </tr>
            `;

            return;

        }


        const history =
            Object.entries(
                snapshot.val()
            )
            .map(
                ([id, item]) => ({
                    id,
                    ...item
                })
            )
            .sort(
                (a, b) =>
                    new Date(
                        b.timestamp || 0
                    ) -
                    new Date(
                        a.timestamp || 0
                    )
            );


        table.innerHTML =
            history
                .slice(0, 20)
                .map(item => {

                    const date =
                        item.timestamp
                            ? new Date(
                                item.timestamp
                            ).toLocaleString()
                            : "-";


                    const status =
                        item.status ||
                        "Success";


                    return `
                        <tr>

                            <td>
                                ${safeText(date)}
                            </td>

                            <td>
                                ${safeText(
                                    item.fileName
                                )}
                            </td>

                            <td>
                                ${safeText(
                                    item.records
                                )}
                            </td>

                            <td>
                                ${safeText(
                                    item.duplicates
                                )}
                            </td>

                            <td>
                                ${safeText(
                                    item.importedBy
                                )}
                            </td>

                            <td>
                                <span
                                    class="badge ${
                                        status === "Success"
                                            ? "success"
                                            : "warning"
                                    }">
                                    ${safeText(status)}
                                </span>
                            </td>

                        </tr>
                    `;

                })
                .join("");


        console.log(
            "Import history loaded:",
            history.length
        );

    }

    catch (error) {

        console.error(
            "Failed to load import history:",
            error
        );

        table.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    style="text-align:center;">
                    Unable to load import history.
                </td>
            </tr>
        `;

    }

}


/* =========================================
   SAVE DATABASE ACTIVITY
========================================= */

async function saveDatabaseActivity(
    action,
    status = "Success"
) {

    try {

        await push(
            ref(
                db,
                "databaseActivity"
            ),
            {

                action:
                    action,

                administrator:
                    "Super Admin",

                status:
                    status,

                timestamp:
                    new Date().toISOString()

            }
        );


        console.log(
            "Database activity saved:",
            action
        );

    }

    catch (error) {

        console.error(
            "Failed to save database activity:",
            error
        );

    }

}


/* =========================================
   LOAD DATABASE ACTIVITY
========================================= */

async function loadDatabaseActivity() {

    const table =
        $("databaseLogs");

    if (!table) {

        console.warn(
            "databaseLogs not found."
        );

        return;

    }


    try {

        const snapshot =
            await get(
                ref(
                    db,
                    "databaseActivity"
                )
            );


        if (!snapshot.exists()) {

            table.innerHTML = `
                <tr>
                    <td
                        colspan="4"
                        style="text-align:center;">
                        No database activity yet.
                    </td>
                </tr>
            `;

            return;

        }


        const activities =
            Object.entries(
                snapshot.val()
            )
            .map(
                ([id, item]) => ({
                    id,
                    ...item
                })
            )
            .sort(
                (a, b) =>
                    new Date(
                        b.timestamp || 0
                    ) -
                    new Date(
                        a.timestamp || 0
                    )
            );


        table.innerHTML =
            activities
                .slice(0, 20)
                .map(item => {

                    const date =
                        item.timestamp
                            ? new Date(
                                item.timestamp
                            ).toLocaleString()
                            : "-";


                    const status =
                        item.status ||
                        "Success";


                    return `
                        <tr>

                            <td>
                                ${safeText(date)}
                            </td>

                            <td>
                                ${safeText(
                                    item.action
                                )}
                            </td>

                            <td>
                                ${safeText(
                                    item.administrator ||
                                    "Super Admin"
                                )}
                            </td>

                            <td>
                                <span
                                    class="badge ${
                                        status === "Success"
                                            ? "success"
                                            : "warning"
                                    }">
                                    ${safeText(status)}
                                </span>
                            </td>

                        </tr>
                    `;

                })
                .join("");


        console.log(
            "Database activity loaded:",
            activities.length
        );

    }

    catch (error) {

        console.error(
            "Failed to load database activity:",
            error
        );

        table.innerHTML = `
            <tr>
                <td
                    colspan="4"
                    style="text-align:center;">
                    Unable to load database activity.
                </td>
            </tr>
        `;

    }

}

/* =========================================
   IMPORT VALID RECORDS TO FIREBASE
========================================= */

async function startDatabaseImport(
    results,
    duplicateMode = "skip"
) {

    if (!results) {

        showImportMessage(
            "No import results were supplied.",
            "warning"
        );

        return;

    }


    /*
        Start with valid records.
    */

    const recordsToImport = [
        ...(results.valid || [])
    ];


    /*
        If admin selected
        "Import as new", include duplicates.
    */

    if (
        duplicateMode === "new"
    ) {

        recordsToImport.push(
            ...(results.duplicates || [])
        );

    }


    /*
        Nothing to import.
    */

    if (
        !recordsToImport.length
    ) {

        showImportMessage(
            "There are no records ready for import.",
            "warning"
        );

        return;

    }


    try {

        showImportMessage(
            "Preparing records for Firebase...",
            "info"
        );


        const BATCH_SIZE =
            200;


        let importedCount =
            0;


        let failedCount =
            0;


        const total =
            recordsToImport.length;


        /*
            Start progress.
        */

        showImportProgress(
            0,
            total,
            "Preparing records..."
        );


        /*
            Import in batches.
        */

        for (
            let start = 0;
            start < total;
            start += BATCH_SIZE
        ) {

            const batch =
                recordsToImport.slice(
                    start,
                    start + BATCH_SIZE
                );


            const updates = {};


            batch.forEach(
                validationResult => {

                    const prepared =
                        prepareImportedFirebaseUser(
                            validationResult
                        );


                    updates[
                        `users/${prepared.uid}`
                    ] =
                        prepared.data;

                }
            );


            /*
                Write batch to Firebase.
            */

            try {

                await update(
                    ref(db),
                    updates
                );


                /*
                    Count ONLY after
                    Firebase succeeds.
                */

                importedCount +=
                    batch.length;


            } catch (error) {

                console.error(
                    "Import batch failed:",
                    error
                );


                failedCount +=
                    batch.length;

            }


            /*
                Update real progress.
            */

            const processed =
                importedCount +
                failedCount;


            showImportProgress(
                processed,
                total,
                `Processed ${processed.toLocaleString()} of ${total.toLocaleString()} records`
            );

        }


        /*
            Import complete.
        */

        showImportProgress(
            total,
            total,
            "Import complete"
        );


        /*
            Show final report.
        */

        showImportCompletionReport({

            imported:
                importedCount,

            skipped:
                duplicateMode === "skip"
                    ? (
                        results.duplicates?.length ||
                        0
                    )
                    : 0,

            invalid:
                results.invalid?.length ||
                0,

            failed:
                failedCount,

            total:
                total +
                (
                    results.invalid?.length ||
                    0
                ) +
                (
                    duplicateMode === "skip"
                        ? (
                            results.duplicates?.length ||
                            0
                        )
                        : 0
                )

        });


        if (
            failedCount === 0
        ) {

            showImportMessage(
                `${importedCount.toLocaleString()} records imported successfully.`,
                "success"
            );

        } else {

            showImportMessage(
                `${importedCount.toLocaleString()} imported, ${failedCount.toLocaleString()} failed.`,
                "warning"
            );

        }


        /*
            Refresh database.
        */

        await loadDatabaseUsers();


        populateDatabaseFilters();

await saveImportHistory({

    fileName:
        selectedImportFile?.name ||
        "Unknown file",

    imported:
        importedCount,

    skipped:
        duplicateMode === "skip"
            ? (
                results.duplicates?.length ||
                0
            )
            : 0,

    invalid:
        results.invalid?.length ||
        0,

    failed:
        failedCount

});
      await saveDatabaseActivity(
    `Imported ${importedCount} records from ${
        selectedImportFile?.name ||
        "Unknown file"
    }`,
    failedCount > 0
        ? "Partial"
        : "Success"
);

await loadImportHistory();

await loadDatabaseActivity();
      
      
        showImportMessage(
            "Database refreshed successfully.",
            "success"
        );


    } 
    
    
    catch (error) {

        console.error(
            "Firebase database import failed:",
            error
        );


        showImportMessage(
            "Import failed. No further records were processed.",
            "error"
        );

    }

}

/* =========================================
   EMAIL VALIDATION
========================================= */

function isValidImportEmail(
    email
) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(
            email
        );

}


/* =========================================
   PHONE READER
========================================= */

function getPhoneForImport(
    user
) {

    const info =
        getPersonalInformation(
            user
        );


    return (
        info.phone ||
        info.phoneNumber ||
        user.phone ||
        user.phoneNumber ||
        ""
    );

}
/* =========================================
   SHOW VALIDATION RESULTS
========================================= */

function showImportValidationResults(
    results
) {

    const status =
        $("mappingStatus");


    if (status) {

        status.textContent =
            "Validation complete";

    }


    const existing =
        document.getElementById(
            "importValidationResults"
        );


    if (existing) {

        existing.remove();

    }


    const panel =
        document.createElement(
            "div"
        );


    panel.id =
        "importValidationResults";


    panel.className =
        "import-validation-results";


    panel.innerHTML = `

        <div
            class="validation-header">

            <div>

                <span>
                    Import Validation
                </span>

                <h3>
                    ${results.total.toLocaleString()}
                    records checked
                </h3>

            </div>

        </div>


        <div
            class="validation-stats">


            <div
                class="validation-stat valid">

                <strong>
                    ${results.valid.length.toLocaleString()}
                </strong>

                <span>
                    Valid
                </span>

            </div>


            <div
                class="validation-stat duplicate">

                <strong>
                    ${results.duplicates.length.toLocaleString()}
                </strong>

                <span>
                    Duplicates
                </span>

            </div>


            <div
                class="validation-stat invalid">

                <strong>
                    ${results.invalid.length.toLocaleString()}
                </strong>

                <span>
                    Invalid
                </span>

            </div>

        </div>


        <div
            class="validation-message">

            ${
                results.invalid.length === 0 &&
                results.duplicates.length === 0

                ?

                `
                    <span class="validation-check">
                        ✓
                    </span>

                    <div>

                        <strong>
                            Ready to import
                        </strong>

                        <p>
                            All records passed validation.
                        </p>

                    </div>
                `

                :

                `
                    <span class="validation-warning">
                        !
                    </span>

                    <div>

                        <strong>
                            Review required
                        </strong>

                        <p>
                            Some records need attention
                            before importing.
                        </p>

                    </div>
                `

            }

        </div>


        <div
            class="validation-actions">

            <button
                type="button"
                id="cancelImportValidationBtn"
                class="secondary-btn">

                Cancel

            </button>


            <button
                type="button"
                id="continueImportBtn"
                class="primary-btn"
                ${
                    results.valid.length === 0
                    ? "disabled"
                    : ""
                }>

                Continue Import

            </button>

        </div>

    `;


    const mappingPanel =
        $("databaseImportMapping");


    if (
        mappingPanel
    ) {

        mappingPanel.appendChild(
            panel
        );

    }


    /*
        Save results for next phase.
    */

    window.databaseImportValidation =
        results;


    /*
        Continue button.
    */
  panel
    .querySelector(
        "#continueImportBtn"
    )
    ?.addEventListener(
        "click",
        () => {

            showImportDecisionPanel(
                results
            );

        }
    );
    /*
        Cancel.
    */

    panel
        .querySelector(
            "#cancelImportValidationBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                panel.remove();

            }
        );

}

/* =========================================
   IMPORT DECISION PANEL
========================================= */

function showImportDecisionPanel(
    results
) {

    const existing =
        document.getElementById(
            "importDecisionPanel"
        );


    if (existing) {

        existing.remove();

    }


    const panel =
        document.createElement(
            "div"
        );


    panel.id =
        "importDecisionPanel";


    panel.className =
        "import-decision-panel";


    panel.innerHTML = `

        <div
            class="decision-icon">

            ⇩

        </div>


        <div
            class="decision-content">

            <span
                class="decision-kicker">

                READY TO IMPORT

            </span>


            <h3>
                Choose how to handle duplicates
            </h3>


            <p>

                ${results.valid.length.toLocaleString()}
                clean records are ready.

                ${
                    results.duplicates.length
                        ? `${results.duplicates.length.toLocaleString()} duplicate records were detected.`
                        : "No duplicates were detected."
                }

            </p>


            <div
                class="decision-options">


                <label
                    class="decision-option selected">

                    <input
                        type="radio"
                        name="importDuplicateMode"
                        value="skip"
                        checked>

                    <span>

                        <strong>
                            Skip duplicates
                        </strong>

                        <small>
                            Keep existing Firebase accounts unchanged.
                        </small>

                    </span>

                </label>


                <label
                    class="decision-option">

                    <input
                        type="radio"
                        name="importDuplicateMode"
                        value="new">

                    <span>

                        <strong>
                            Import as new accounts
                        </strong>

                        <small>
                            Create new Firebase IDs for duplicate records.
                        </small>

                    </span>

                </label>


            </div>


            <div
                class="decision-actions">

                <button
                    type="button"
                    id="cancelImportDecisionBtn"
                    class="secondary-btn">

                    Back

                </button>


                <button
                    type="button"
                    id="confirmImportDecisionBtn"
                    class="primary-btn">

                    Import Records

                </button>

            </div>

        </div>

    `;


    const mappingPanel =
        $("databaseImportMapping");


    if (
        mappingPanel
    ) {

        mappingPanel.appendChild(
            panel
        );

    }


    /*
        Highlight selected option
    */

    panel
        .querySelectorAll(
            ".decision-option"
        )
        .forEach(
            option => {

                option
                    .addEventListener(
                        "click",
                        () => {

                            panel
                                .querySelectorAll(
                                    ".decision-option"
                                )
                                .forEach(
                                    item =>
                                        item.classList.remove(
                                            "selected"
                                        )
                                );


                            option.classList.add(
                                "selected"
                            );


                            const radio =
                                option.querySelector(
                                    "input"
                                );


                            if (radio) {

                                radio.checked =
                                    true;

                            }

                        }
                    );

            }
        );


    /*
        Cancel
    */

    panel
        .querySelector(
            "#cancelImportDecisionBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                panel.remove();

            }
        );


    /*
        Confirm
    */

    panel
        .querySelector(
            "#confirmImportDecisionBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                const selected =
                    panel.querySelector(
                        'input[name="importDuplicateMode"]:checked'
                    );


                const mode =
                    selected
                        ? selected.value
                        : "skip";


                panel.remove();


                startDatabaseImport(
                    results,
                    mode
                );

            }
        );

}


/* =========================================
   PROCESS IMPORT FILE
========================================= */

async function processImportFile(
    file
) {

    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    console.log(
        "Import format:",
        extension
    );


    try {

        if (
            extension === "json"
        ) {

            await importJSONFile(
                file
            );

            return;

        }


        if (
            extension === "csv"
        ) {

            await importCSVFile(
                file
            );

            return;

        }


        if (
            extension === "xlsx" ||
            extension === "xls"
        ) {

            await importExcelFile(
                file
            );

            return;

        }


        /*
            These formats will have their
            own parsers later.
        */

        if (
            [
                "sql",
                "mdb",
                "accdb",
                "doc",
                "docx",
                "pdf",
                "txt"
            ].includes(
                extension
            )
        ) {
showImportMessage(
    `${extension.toUpperCase()} files are supported, but their importer is not enabled yet.`,
    "warning"
);
            return;

        }

showImportMessage(
    "This file format is not supported.",
    "error"
);

    } catch (error) {

        console.error(
            "Import processing failed:",
            error
        );

showImportMessage(
    "Unable to read this file. Please check the file and try again.",
    "error"
);
    }

}


/* =========================================
   JSON IMPORT
========================================= */

async function importJSONFile(
    file
) {

    const text =
        await file.text();


    const parsed =
        JSON.parse(
            text
        );


    let records;


    /*
        Our own exported JSON format
    */

    if (
        Array.isArray(
            parsed.users
        )
    ) {

        records =
            parsed.users;

    }


    /*
        Plain JSON array
    */

    else if (
        Array.isArray(
            parsed
        )
    ) {

        records =
            parsed;

    }


    /*
        Firebase backup
    */

    else if (
        parsed.data
    ) {

        records =
            convertFirebaseBackupToRecords(
                parsed.data
            );

    }


    else {

        throw new Error(
            "No readable records found in JSON."
        );

    }


    importedRecords =
        normalizeImportedRecords(
            records
        );


    showImportPreview(
        importedRecords,
        file
    );

}


/* =========================================
   CSV IMPORT
========================================= */

async function importCSVFile(
    file
) {

    const text =
        await file.text();


    const rows =
        parseCSV(
            text
        );


    if (
        rows.length < 2
    ) {

        throw new Error(
            "CSV does not contain enough records."
        );

    }


    const headers =
        rows[0];


    const records =
        rows
            .slice(1)
            .map(
                row => {

                    const record = {};


                    headers.forEach(
                        (
                            header,
                            index
                        ) => {

                            record[
                                header
                            ] =
                                row[
                                    index
                                ] ?? "";

                        }
                    );


                    return record;

                }
            );


    importedRecords =
        normalizeImportedRecords(
            records
        );


    showImportPreview(
        importedRecords,
        file
    );

}


/* =========================================
   EXCEL IMPORT
========================================= */

function loadExcelImportLibrary() {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            if (
                window.XLSX
            ) {

                resolve(
                    window.XLSX
                );

                return;

            }


            const script =
                document.createElement(
                    "script"
                );


            script.src =
                "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";


            script.onload =
                () => {

                    if (
                        window.XLSX
                    ) {

                        resolve(
                            window.XLSX
                        );

                    } else {

                        reject(
                            new Error(
                                "Excel library unavailable."
                            )
                        );

                    }

                };


            script.onerror =
                () => {

                    reject(
                        new Error(
                            "Could not load Excel reader."
                        )
                    );

                };


            document.head.appendChild(
                script
            );

        }
    );

}


async function importExcelFile(
    file
) {

    const XLSX =
        await loadExcelImportLibrary();


    const buffer =
        await file.arrayBuffer();


    const workbook =
        XLSX.read(
            buffer,
            {
                type: "array"
            }
        );


    /*
        Use the first worksheet initially.
    */

    const sheetName =
        workbook.SheetNames[0];


    const worksheet =
        workbook.Sheets[
            sheetName
        ];


    const records =
        XLSX.utils.sheet_to_json(
            worksheet,
            {
                defval: ""
            }
        );


    if (
        !records.length
    ) {

        throw new Error(
            "Excel sheet contains no records."
        );

    }


    importedRecords =
        normalizeImportedRecords(
            records
        );


    showImportPreview(
        importedRecords,
        file
    );

}


/* =========================================
   NORMALIZE IMPORTED RECORDS
========================================= */

function normalizeImportedRecords(
    records
) {

    return records
        .filter(
            record =>
                record &&
                typeof record ===
                "object"
        )
        .map(
            record => {

                const normalized = {};


                Object.entries(
                    record
                ).forEach(
                    (
                        [
                            key,
                            value
                        ]
                    ) => {

                        const cleanKey =
                            String(
                                key
                            )
                            .trim()
                            .toLowerCase();


                        normalized[
                            cleanKey
                        ] =
                            value;

                    }
                );


                return normalized;

            }
        );

}
/* =========================================
   IMPORT PREVIEW
========================================= */

function showImportPreview(
    records,
    file
) {

    try {

        /*
            Make sure records are actually available.
        */

        if (
            !Array.isArray(records) ||
            records.length === 0
        ) {

            showImportMessage(
                "The selected file contains no readable records.",
                "warning"
            );

            return;

        }


        /*
            Save imported data globally.
        */

        importedRecords =
            records;

        selectedImportFile =
            file;


        /*
            Update import status.
        */

        const status =
            $("importStatus");

        if (status) {

            status.textContent =
                `${records.length.toLocaleString()} records detected`;

        }


        /*
            Update import button.
        */

        const button =
            $("importDatabaseBtn");

        if (button) {

            button.textContent =
                "File Loaded";

        }


        /*
            Show a clear message.
        */

        showImportMessage(
            `${records.length.toLocaleString()} records loaded from ${file.name}.`,
            "success"
        );


        console.log(
            "IMPORT PREVIEW READY"
        );

        console.log(
            "File:",
            file.name
        );

        console.log(
            "Records:",
            records.length
        );

        console.log(
            "First record:",
            records[0]
        );


        /*
            Build the field-mapping interface.
        */

        createImportMapping();


        /*
            Confirm that the mapping interface
            was actually created.
        */

        const mappingPanel =
            $("databaseImportMapping");

        const mappingList =
            $("importMappingList");


        if (
            !mappingPanel ||
            !mappingList
        ) {

            console.error(
                "Import mapping HTML elements were not found."
            );

            showImportMessage(
                "Import loaded, but the field-mapping panel could not be found.",
                "error"
            );

            return;

        }


        /*
            Make mapping panel visible.
        */

        mappingPanel.hidden =
            false;


        /*
            Scroll the user to the mapping area.
        */

        mappingPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });


        console.log(
            "IMPORT MAPPING PANEL READY"
        );

    }

    catch (error) {

        console.error(
            "Import preview failed:",
            error
        );

        showImportMessage(
            "The file was read, but the import mapping could not be displayed.",
            "error"
        );

    }

}

/* =========================================
   SIMPLE CSV PARSER
========================================= */

function parseCSV(
    text
) {

    const rows = [];

    let row = [];

    let value = "";

    let insideQuotes =
        false;


    for (
        let i = 0;
        i < text.length;
        i++
    ) {

        const char =
            text[i];

        const next =
            text[i + 1];


        if (
            char === '"' &&
            insideQuotes &&
            next === '"'
        ) {

            value += '"';

            i++;

            continue;

        }


        if (
            char === '"'
        ) {

            insideQuotes =
                !insideQuotes;

            continue;

        }


        if (
            char === "," &&
            !insideQuotes
        ) {

            row.push(
                value
            );

            value = "";

            continue;

        }


        if (
            (
                char === "\n" ||
                char === "\r"
            ) &&
            !insideQuotes
        ) {

            if (
                char === "\r" &&
                next === "\n"
            ) {

                i++;

            }


            row.push(
                value
            );

            rows.push(
                row
            );

            row = [];

            value = "";

            continue;

        }


        value += char;

    }


    if (
        value ||
        row.length
    ) {

        row.push(
            value
        );

        rows.push(
            row
        );

    }


    return rows;

}



/* =========================================
   IMPORT FIELD DEFINITIONS
========================================= */

const importFields = [

    {
        key: "name",
        label: "Full Name",
        required: true,

        aliases: [
            "name",
            "fullname",
            "full name",
            "full_name",
            "customer name",
            "customer",
            "user name",
            "user",
            "person name"
        ]
    },

    {
        key: "email",
        label: "Email",
        required: false,

        aliases: [
            "email",
            "email address",
            "emailaddress",
            "e-mail",
            "mail"
        ]
    },

    {
        key: "phone",
        label: "Phone",
        required: false,

        aliases: [
            "phone",
            "phone number",
            "phonenumber",
            "mobile",
            "mobile number",
            "telephone",
            "tel",
            "contact"
        ]
    },

    {
        key: "gender",
        label: "Gender",
        required: false,

        aliases: [
            "gender",
            "sex"
        ]
    },

    {
        key: "dateOfBirth",
        label: "Date of Birth",
        required: false,

        aliases: [
            "dob",
            "date of birth",
            "dateofbirth",
            "birth date",
            "birthdate",
            "birthday"
        ]
    },

    {
        key: "age",
        label: "Age",
        required: false,

        aliases: [
            "age",
            "years",
            "years old"
        ]
    },

    {
        key: "district",
        label: "District",
        required: false,

        aliases: [
            "district",
            "district name",
            "home district",
            "location district"
        ]
    },

    {
        key: "religion",
        label: "Religion",
        required: false,

        aliases: [
            "religion",
            "faith"
        ]
    },

    {
        key: "tribe",
        label: "Tribe",
        required: false,

        aliases: [
            "tribe",
            "ethnicity",
            "ethnic group"
        ]
    },

    {
        key: "education",
        label: "Education",
        required: false,

        aliases: [
            "education",
            "education level",
            "school",
            "qualification",
            "academic level"
        ]
    },

    {
        key: "occupation",
        label: "Occupation",
        required: false,

        aliases: [
            "occupation",
            "job",
            "job title",
            "profession",
            "work",
            "employment"
        ]
    },

    {
        key: "maritalStatus",
        label: "Marital Status",
        required: false,

        aliases: [
            "marital status",
            "maritalstatus",
            "married",
            "relationship status"
        ]
    },

    {
        key: "username",
        label: "Username",
        required: false,

        aliases: [
            "username",
            "user name",
            "login",
            "account name"
        ]
    },

  {
    key: "uid",
    label: "Firebase UID",
    required: false,

    aliases: [
        "uid",
        "firebase uid",
        "firebase id",
        "user id",
        "userid",
        "id"
    ]
},

{
    key: "lastActive",
    label: "Last Active",
    required: false,

    aliases: [
        "lastactive",
        "last active",
        "last_active",
        "last seen",
        "lastseen",
        "last_seen",
        "last login",
        "lastlogin"
    ]
}
];

/* =========================================
   NORMALIZE FIELD NAME
========================================= */

function normalizeFieldName(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /[_-]+/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        );

}


/* =========================================
   DETECT FIELD
========================================= */

function detectImportField(
    column
) {

    const normalized =
        normalizeFieldName(
            column
        );


    /*
        Exact alias match
    */

    for (
        const field of importFields
    ) {

        const match =
            field.aliases.some(
                alias =>
                    normalizeFieldName(
                        alias
                    ) === normalized
            );


        if (match) {

            return field.key;

        }

    }


    return "";

}
/* =========================================
   CREATE IMPORT MAPPING
========================================= */

function createImportMapping() {

    const mappingPanel =
        $("databaseImportMapping");

    const mappingList =
        $("importMappingList");

    if (!mappingPanel || !mappingList) {

        console.error(
            "Import mapping elements not found."
        );

        showImportMessage(
            "Import mapping interface is missing.",
            "error"
        );

        return;

    }

    if (
        !Array.isArray(importedRecords) ||
        !importedRecords.length
    ) {

        console.warn(
            "No imported records available for mapping."
        );

        return;

    }


    /*
        Get the column names from
        the imported file.
    */

    const columns =
        Object.keys(
            importedRecords[0]
        );


    if (!columns.length) {

        showImportMessage(
            "No columns were detected in this file.",
            "error"
        );

        return;

    }


    /*
        Clear previous mapping.
    */

    mappingList.innerHTML = "";


    /*
        Create one mapping row
        for every imported column.
    */

    columns.forEach(
        column => {

            const detectedField =
                detectImportField(
                    column
                );


            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "import-mapping-row";


            const source =
                document.createElement(
                    "div"
                );

            source.className =
                "import-source-column";

            source.innerHTML = `
                <span>Imported Column</span>
                <strong>
                    ${escapeHtml(column)}
                </strong>
            `;


            const arrow =
                document.createElement(
                    "div"
                );

            arrow.className =
                "import-mapping-arrow";

            arrow.textContent =
                "→";


            const target =
                document.createElement(
                    "div"
                );

            target.className =
                "import-target-column";


            const label =
                document.createElement(
                    "label"
                );

            label.textContent =
                "Twagalane Field";


            const select =
                document.createElement(
                    "select"
                );

            select.className =
                "import-field-select";

            select.dataset.source =
                column;


            /*
                Do not import option.
            */

            const skipOption =
                document.createElement(
                    "option"
                );

            skipOption.value =
                "";

            skipOption.textContent =
                "Do not import";

            select.appendChild(
                skipOption
            );


            /*
                Add all supported
                Twagalane fields.
            */

            importFields.forEach(
                field => {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        field.key;

                    option.textContent =
                        field.label +
                        (
                            field.required
                                ? " *"
                                : ""
                        );


                    if (
                        field.key ===
                        detectedField
                    ) {

                        option.selected =
                            true;

                    }


                    select.appendChild(
                        option
                    );

                }
            );


            target.appendChild(
                label
            );

            target.appendChild(
                select
            );


            row.appendChild(
                source
            );

            row.appendChild(
                arrow
            );

            row.appendChild(
                target
            );


            mappingList.appendChild(
                row
            );

        }
    );


    /*
        Show mapping panel.
    */

    mappingPanel.hidden =
        false;


    /*
        Update mapping status.
    */

    const status =
        $("mappingStatus");

    if (status) {

        status.textContent =
            `${columns.length} columns detected`;

    }


    console.log(
        "IMPORT MAPPING CREATED:",
        columns
    );


    /*
        Make the mapping interface
        visible to the administrator.
    */

    mappingPanel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}
/* =========================================
   AUTO MAP IMPORTED FIELDS
========================================= */

function autoMapImportedFields() {

    const selects =
        document.querySelectorAll(
            ".import-field-select"
        );


    if (!selects.length) {

        showImportMessage(
            "There are no imported columns to map.",
            "warning"
        );

        return;

    }


    let mappedCount =
        0;


    selects.forEach(
        select => {

            const source =
                select.dataset.source;


            const detected =
                detectImportField(
                    source
                );


            if (detected) {

                select.value =
                    detected;

                mappedCount++;

            } else {

                select.value =
                    "";

            }

        }
    );


    const status =
        $("mappingStatus");


    if (status) {

        status.textContent =
            `${mappedCount} of ${selects.length} fields automatically mapped`;

    }


    showImportMessage(
        `${mappedCount} of ${selects.length} columns were automatically mapped.`,
        "success"
    );


    console.log(
        "AUTO MAPPING COMPLETE:",
        mappedCount,
        "/",
        selects.length
    );

}


/* =========================================
   FIREBASE BACKUP CONVERTER
========================================= */

function convertFirebaseBackupToRecords(
    data
) {

    if (
        data.users &&
        typeof data.users ===
        "object"
    ) {

        return Object.entries(
            data.users
        ).map(
            (
                [
                    uid,
                    user
                ]
            ) => ({

                uid,

                ...user

            })
        );

    }


    return [];

}



/* =========================================
   IMPORT NOTIFICATION
========================================= */

function showImportMessage(
    message,
    type = "info"
) {

    let container =
        document.getElementById(
            "databaseImportMessages"
        );


    if (!container) {

        container =
            document.createElement(
                "div"
            );

        container.id =
            "databaseImportMessages";

        container.className =
            "database-import-messages";


        const importSection =
            document.querySelector(
                ".database-import-main"
            )?.parentElement;


        if (importSection) {

            importSection.prepend(
                container
            );

        } else {

            document.body.prepend(
                container
            );

        }

    }


    const messageElement =
        document.createElement(
            "div"
        );


    messageElement.className =
        `database-import-message ${type}`;


    const icon =
        type === "error"
            ? "!"
            : type === "success"
                ? "✓"
                : type === "warning"
                    ? "!"
                    : "i";


    messageElement.innerHTML = `

        <span class="import-message-icon">

            ${icon}

        </span>

        <span class="import-message-text">

            ${escapeHtml(
                message
            )}

        </span>

        <button
            type="button"
            class="import-message-close"
            aria-label="Close">

            ×

        </button>

    `;


    container.appendChild(
        messageElement
    );


    messageElement
        .querySelector(
            ".import-message-close"
        )
        ?.addEventListener(
            "click",
            () => {

                messageElement.remove();

            }
        );


    setTimeout(
        () => {

            messageElement.classList.add(
                "hide"
            );


            setTimeout(
                () => {

                    messageElement.remove();

                },
                250
            );

        },
        5000
    );

}
/* =========================================
   PAGE READY
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initDatabaseCentre();

    }
);
/* =========================================
   MODULE EXPORTS
========================================= */

export {
    databaseState
};