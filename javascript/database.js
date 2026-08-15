/* =========================================
   TWAGALANE DATABASE CENTRE
   STAGE 1 — DATABASE READER
========================================= */

import { db } from "./firebase.js";

import {
    ref,
    get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


/* =========================================
   DATABASE STATE
========================================= */

const databaseState = {

    users: [],

    filteredUsers: [],

    loaded: false

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
                .length
                .toLocaleString();

    }


    const archivedUsers =
        $("archivedUsers");


    if (archivedUsers) {

        archivedUsers.textContent =
            "0";

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
========================================= */

function renderDatabaseRecords() {

    const table =
        $("databaseRecordsTable");


    if (!table)
        return;


    const users =
        databaseState.filteredUsers;


    if (!users.length) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    style="text-align:center;padding:30px;">

                    No database records found.

                </td>

            </tr>

        `;

        return;

    }


    /*
       We initially display the first 100 records.
       The database itself is NOT limited.
    */

    const visibleUsers =
        users.slice(
            0,
            100
        );


    table.innerHTML =
        visibleUsers.map(
            user => {

                const name =
                    getName(user);

                const email =
                    getEmail(user);

                const gender =
                    getGender(user);

                const age =
                    getAge(user);

                const district =
                    getDistrict(user);

                const religion =
                    getReligion(user);

                const occupation =
                    getOccupation(user);


                const verified =
                    user?.verification?.status ===
                    "approved";


                const premium =
                    user?.subscription?.active ===
                    true;


                return `

                    <tr>

                        <td>

                            <div
                                class="database-user-cell">

                          ${
    getProfilePhoto(user)

    ?

    `
    <img
        src="${escapeHtml(
            getProfilePhoto(user)
        )}"
        class="database-user-avatar"
        alt="${escapeHtml(
            getName(user)
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
    <div
        class="database-user-avatar">

        <span>
            👤
        </span>

    </div>
    `
                          }

                                </div>

                                <div
                                    class="database-user-info">

                                    <strong>

                                        ${escapeHtml(
                                            name
                                        )}

                                    </strong>

                                    <span>

                                        ${escapeHtml(
                                            email
                                        )}

                                    </span>

                                </div>

                            </div>

                        </td>


                        <td>

                            ${escapeHtml(
                                safeText(
                                    gender
                                )
                            )}

                        </td>


                        <td>

                            ${escapeHtml(
                                safeText(
                                    age
                                )
                            )}

                        </td>


                        <td>

                            ${escapeHtml(
                                safeText(
                                    district
                                )
                            )}

                        </td>


                        <td>

                            ${escapeHtml(
                                safeText(
                                    religion
                                )
                            )}

                        </td>


                        <td>

                            ${escapeHtml(
                                safeText(
                                    occupation
                                )
                            )}

                        </td>


                        <td>

                            <span
                                class="
                                database-status
                                ${
                                    verified
                                    ? "verified"
                                    : "unverified"
                                }">

                                ${
                                    verified
                                    ? "Verified"
                                    : "Unverified"
                                }

                            </span>

                        </td>


                        <td>

                            <span
                                class="
                                database-status
                                ${
                                    premium
                                    ? "premium"
                                    : "free"
                                }">

                                ${
                                    premium
                                    ? "Premium"
                                    : "Free"
                                }

                            </span>

                        </td>

                    </tr>

                `;

            }
        ).join("");


    const viewCount =
        $("databaseViewCount");


    if (viewCount) {

        viewCount.textContent =
            `${users.length.toLocaleString()} records`;

    }

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
async function initDatabaseCentre() {

    console.log(
        "Twagalane Database Centre starting..."
    );


    /*
        Load Firebase users first.
    */

    await loadDatabaseUsers();


    /*
        Build District, Religion,
        Tribe, Education and
        Occupation options.
    */

    populateDatabaseFilters();


    /*
        Connect filter controls.
    */

    bindDatabaseFilterEvents();


    /*
        Make sure summary values
        are correct on first load.
    */
bindDatabaseGroupEvents();


  bindDatabaseExportEvents()

  
    updateFilteredSummary();


    console.log(
        "Twagalane Database Centre ready."
    );

}
/* =========================================
   DATABASE EXPORT
   CSV
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


    /*
        CSV requires quotes when the
        value contains commas, quotes
        or line breaks.
    */

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
   CONVERT USER TO EXPORT RECORD
========================================= */

function createExportRecord(
    user
) {

    const info =
        getPersonalInformation(
            user
        );


    const home =
        getHomeInformation(
            user
        );


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
   CREATE CSV
========================================= */

function createCSV(
    users
) {

    if (!users.length) {

        return "";

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


    /*
        Header row
    */

    lines.push(

        headers
            .map(
                csvEscape
            )
            .join(",")

    );


    /*
        Data rows
    */

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


    return lines.join(
        "\r\n"
    );

}


/* =========================================
   DOWNLOAD FILE
========================================= */

function downloadFile(
    content,
    filename,
    type
) {

    const blob =
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
   EXPORT CURRENT FILTERED DATA
========================================= */

function exportFilteredCSV() {

    const users =
        databaseState.filteredUsers;


    if (!users.length) {

        alert(
            "There are no records to export."
        );

        return;

    }


    const csv =
        createCSV(
            users
        );


    const date =
        new Date()
            .toISOString()
            .slice(
                0,
                10
            );


    downloadFile(

        csv,

        `twagalane-database-${date}.csv`,

        "text/csv;charset=utf-8;"

    );


    console.log(
        `Exported ${users.length} database records.`
    );

}


/* =========================================
   EXPORT BUTTON
========================================= */

function bindDatabaseExportEvents() {

    const button =
        $("exportFilteredDatabase");


    if (!button)
        return;


    button.addEventListener(
        "click",
        exportFilteredCSV
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
