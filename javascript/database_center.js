/* =========================================
   TWAGALANE DATABASE CENTRE
   IMPORT ENGINE
========================================= */
console.log("DATABASE_CENTER.JS LOADED");
import { db } from "./firebase.js";

import {
    ref,
    get,
    update,
    push
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


/* =========================================
   DOM HELPER
========================================= */

const $ = id =>
    document.getElementById(id);


/* =========================================
   STATE
========================================= */

let databaseUsers = [];

let importedRows = [];

let importMapping = {};

let selectedImportFile = null;


/* =========================================
   INITIALIZE
========================================= */

export async function initDatabaseCentre() {

    await loadUsers();

    bindImportButton();

}


/* =========================================
   LOAD FIREBASE USERS
========================================= */

async function loadUsers() {

    try {

        const snapshot =
            await get(
                ref(db, "users")
            );


        if (!snapshot.exists()) {

            databaseUsers = [];

            return;

        }


        const data =
            snapshot.val();


        databaseUsers =
            Object.entries(data)
                .map(
                    ([uid, user]) => ({

                        uid,

                        ...user

                    })
                );


        console.log(
            "Database users loaded:",
            databaseUsers.length
        );


    } catch (error) {

        console.error(
            "Unable to load users:",
            error
        );

    }

}


/* =========================================
   IMPORT BUTTON
========================================= */

function bindImportButton() {

    const button =
        $("importDatabaseBtn");

    const input =
        $("databaseFileInput");


    if (!button || !input) {

        console.warn(
            "Database import elements not found."
        );

        return;

    }


    button.addEventListener(
        "click",
        () => {

            input.click();

        }
    );


    input.addEventListener(
        "change",
        async event => {

            const file =
                event.target.files?.[0];


            if (!file) {

                return;

            }


            selectedImportFile =
                file;


            await readImportFile(
                file
            );

        }
    );

}


/* =========================================
   READ IMPORT FILE
========================================= */

async function readImportFile(
    file
) {

    try {

        const extension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();


        if (
            extension === "csv"
        ) {

            const text =
                await file.text();


            importedRows =
                parseCSV(text);

        }

        else if (
            extension === "json"
        ) {

            const text =
                await file.text();


            const data =
                JSON.parse(text);


            importedRows =
                Array.isArray(data)
                    ? data
                    : Object.values(data);

        }

        else {

            showImportMessage(
                "For now, test with CSV or JSON.",
                "warning"
            );

            return;

        }


        if (
            !importedRows.length
        ) {

            showImportMessage(
                "The selected file contains no records.",
                "warning"
            );

            return;

        }


        createImportWizard();


    } catch (error) {

        console.error(
            "Import file error:",
            error
        );


        showImportMessage(
            "Unable to read this file.",
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

    const lines =
        text
            .trim()
            .split(/\r?\n/);


    if (
        lines.length < 2
    ) {

        return [];

    }


    const headers =
        lines[0]
            .split(",")
            .map(
                value =>
                    value
                        .trim()
                        .replace(/^"|"$/g, "")
            );


    return lines
        .slice(1)
        .filter(
            line =>
                line.trim()
        )
        .map(
            line => {

                const values =
                    line
                        .split(",")
                        .map(
                            value =>
                                value
                                    .trim()
                                    .replace(
                                        /^"|"$/g,
                                        ""
                                    )
                        );


                const row = {};


                headers.forEach(
                    (header, index) => {

                        row[header] =
                            values[index] || "";

                    }
                );


                return row;

            }
        );

}


/* =========================================
   IMPORT WIZARD
========================================= */

function createImportWizard() {

    let modal =
        $("databaseCentreImportWizard");


    if (!modal) {

        modal =
            document.createElement(
                "div"
            );


        modal.id =
            "databaseCentreImportWizard";


        modal.className =
            "db-import-modal";


        modal.innerHTML = `

            <div class="db-import-dialog">

                <div class="db-import-header">

                    <div>

                        <span class="db-import-kicker">
                            DATABASE IMPORT
                        </span>

                        <h2>
                            Review Imported Data
                        </h2>

                        <p>
                            ${escapeHTML(
                                selectedImportFile?.name ||
                                "Imported file"
                            )}
                        </p>

                    </div>


                    <button
                        type="button"
                        class="db-close-btn"
                        id="closeDatabaseImport">

                        ×

                    </button>

                </div>


                <div class="db-import-body">

                    <div class="db-import-summary">

                        <div>
                            <strong>
                                ${importedRows.length}
                            </strong>

                            <span>
                                Records
                            </span>
                        </div>

                        <div>
                            <strong>
                                ${Object.keys(
                                    importedRows[0] || {}
                                ).length}
                            </strong>

                            <span>
                                Columns
                            </span>
                        </div>

                        <div>
                            <strong>
                                ${selectedImportFile?.name || ""}
                            </strong>

                            <span>
                                File
                            </span>
                        </div>

                    </div>


                    <div class="db-section-title">

                        <h3>
                            Field Mapping
                        </h3>

                        <span>
                            Match your file columns
                            with Twagalane fields.
                        </span>

                    </div>


                    <div
                        id="databaseCentreMapping"
                        class="db-map-grid">
                    </div>


                    <div
                        id="databaseCentrePreview"
                        class="db-preview-wrap"
                        style="margin-top:20px;">
                    </div>

                </div>


                <div class="db-import-footer">

                    <button
                        type="button"
                        class="secondary-btn"
                        id="cancelDatabaseImport">

                        Cancel

                    </button>


                    <button
                        type="button"
                        class="primary-btn"
                        id="continueDatabaseImport">

                        Continue

                    </button>

                </div>

            </div>

        `;


        document.body.appendChild(
            modal
        );

    }


    buildMapping();


    buildPreview();


    modal.classList.add(
        "show"
    );


    $("closeDatabaseImport")
        ?.addEventListener(
            "click",
            closeImportWizard
        );


    $("cancelDatabaseImport")
        ?.addEventListener(
            "click",
            closeImportWizard
        );


    $("continueDatabaseImport")
        ?.addEventListener(
            "click",
            continueImport
        );

}


/* =========================================
   FIREBASE FIELDS
========================================= */

const DATABASE_FIELDS = [

    "fullName",
    "username",
    "email",
    "phone",
    "gender",
    "dateOfBirth",
    "age",
    "district",
    "religion",
    "tribe",
    "education",
    "occupation",
    "maritalStatus"

];


/* =========================================
   BUILD MAPPING
========================================= */

function buildMapping() {

    const container =
        $("databaseCentreMapping");


    if (!container) {

        return;

    }


    const columns =
        Object.keys(
            importedRows[0] || {}
        );


    container.innerHTML = "";


    DATABASE_FIELDS.forEach(
        field => {

            const label =
                document.createElement(
                    "label"
                );


            const select =
                document.createElement(
                    "select"
                );


            select.dataset.field =
                field;


            select.innerHTML = `

                <option value="">
                    Don't import
                </option>

                ${columns.map(
                    column => `

                    <option value="${escapeHTML(column)}">

                        ${escapeHTML(column)}

                    </option>

                `
                ).join("")}

            `;


            const guessed =
                findMatchingColumn(
                    field,
                    columns
                );


            if (guessed) {

                select.value =
                    guessed;

                importMapping[
                    field
                ] =
                    guessed;

            }


            select.addEventListener(
                "change",
                () => {

                    importMapping[
                        field
                    ] =
                        select.value;

                }
            );


            label.innerHTML =
                `<span>${formatFieldName(field)}</span>`;


            label.appendChild(
                select
            );


            container.appendChild(
                label
            );

        }
    );

}


/* =========================================
   AUTOMATIC COLUMN MATCH
========================================= */

function findMatchingColumn(
    field,
    columns
) {

    const aliases = {

        fullName: [
            "name",
            "fullname",
            "full name"
        ],

        username: [
            "username",
            "user name"
        ],

        email: [
            "email",
            "email address"
        ],

        phone: [
            "phone",
            "telephone",
            "mobile",
            "phone number"
        ],

        gender: [
            "gender",
            "sex"
        ],

        age: [
            "age"
        ],

        district: [
            "district",
            "location"
        ],

        religion: [
            "religion"
        ],

        tribe: [
            "tribe"
        ],

        education: [
            "education"
        ],

        occupation: [
            "occupation",
            "job"
        ],

        maritalStatus: [
            "marital status",
            "maritalstatus"
        ],

        dateOfBirth: [
            "date of birth",
            "dob",
            "birthdate"
        ]

    };


    const possible =
        aliases[field] || [];


    return columns.find(
        column => {

            const normalized =
                column
                    .toLowerCase()
                    .trim();


            return possible.includes(
                normalized
            );

        }
    ) || "";

}


/* =========================================
   PREVIEW
========================================= */

function buildPreview() {

    const container =
        $("databaseCentrePreview");


    if (!container) {

        return;

    }


    const columns =
        Object.keys(
            importedRows[0] || {}
        );


    const preview =
        importedRows.slice(
            0,
            5
        );


    container.innerHTML = `

        <table class="db-preview-table">

            <thead>

                <tr>

                    ${columns.map(
                        column =>
                            `<th>${escapeHTML(column)}</th>`
                    ).join("")}

                </tr>

            </thead>

            <tbody>

                ${preview.map(
                    row => `

                    <tr>

                        ${columns.map(
                            column =>
                                `<td>${escapeHTML(
                                    row[column]
                                )}</td>`
                        ).join("")}

                    </tr>

                `
                ).join("")}

            </tbody>

        </table>

    `;

}


/* =========================================
   CONTINUE
========================================= */

async function continueImport() {

    const mapped =
        importedRows.map(
            row => {

                const user = {};


                Object.entries(
                    importMapping
                ).forEach(
                    ([field, column]) => {

                        if (!column) {

                            return;

                        }


                        user[field] =
                            row[column] ?? "";

                    }
                );


                return user;

            }
        );


    const duplicates =
        mapped.filter(
            user =>
                databaseUsers.some(
                    existing =>

                        (
                            user.email &&
                            existing.email &&
                            user.email.toLowerCase() ===
                            existing.email.toLowerCase()
                        )

                        ||

                        (
                            user.phone &&
                            existing.phone &&
                            user.phone === existing.phone
                        )

                )
        );


    const newUsers =
        mapped.filter(
            user =>
                !duplicates.includes(
                    user
                )
        );


    const proceed =
        window.confirm(
            `${newUsers.length} new records found.\n\n` +
            `${duplicates.length} possible duplicates found.\n\n` +
            `Import the new records?`
        );


    if (!proceed) {

        return;

    }


    await insertUsers(
        newUsers
    );

}


/* =========================================
   INSERT USERS
========================================= */

async function insertUsers(
    users
) {

    if (!users.length) {

        showImportMessage(
            "There are no new records to import.",
            "warning"
        );

        return;

    }


    try {

        const updates = {};


        users.forEach(
            user => {

                const userRef =
                    push(
                        ref(db, "users")
                    );


                updates[
                    userRef.key
                ] = {

                    ...user,

                    importedAt:
                        new Date()
                            .toISOString(),

                    importedFrom:
                        selectedImportFile?.name ||
                        "database import"

                };

            }
        );


        await update(
            ref(db, "users"),
            updates
        );


        await loadUsers();


        showImportMessage(
            `${users.length} records imported successfully.`,
            "success"
        );


        closeImportWizard();


    } catch (error) {

        console.error(
            "Firebase import failed:",
            error
        );


        showImportMessage(
            "Import failed. Please try again.",
            "error"
        );

    }

}


/* =========================================
   CLOSE WIZARD
========================================= */

function closeImportWizard() {

    const modal =
        $("databaseCentreImportWizard");


    modal?.classList.remove(
        "show"
    );

}


/* =========================================
   FIELD LABEL
========================================= */

function formatFieldName(
    field
) {

    return field
        .replace(
            /([A-Z])/g,
            " $1"
        )
        .replace(
            /^./,
            value =>
                value.toUpperCase()
        );

}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );

}


/* =========================================
   MESSAGE
========================================= */

function showImportMessage(
    message,
    type = "info"
) {

    const container =
        $("databaseImportMessages");


    if (!container) {

        return;

    }


    const messageElement =
        document.createElement(
            "div"
        );


    messageElement.className =
        `database-import-message ${type}`;


    messageElement.innerHTML = `

        <div class="import-message-icon">
            !
        </div>

        <div class="import-message-text">
            ${escapeHTML(message)}
        </div>

    `;


    container.prepend(
        messageElement
    );


    setTimeout(
        () => {

            messageElement.remove();

        },
        5000
    );

}


/* =========================================
   START
====================================*/
document.addEventListener(
    "DOMContentLoaded",
    () => {

        initDatabaseCentre();

    }
);