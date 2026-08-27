import express from "express";
import cors from "cors";
import { auth, db } from "./firebase-admin.js";

const app = express();

app.use(cors());
app.use(express.json());


/*=====================================
  ALLOWED ADMIN ROLES
=====================================*/

const ALLOWED_ROLES = [
    "admin",
    "moderator",
    "support",
    "messagingAdmin"
];


/*=====================================
  HOME
=====================================*/

app.get("/", async (req, res) => {

    try {

        await auth.listUsers(1);

        res.json({
            success: true,
            message:
                "Twagalane Admin API connected successfully."
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});


/*=====================================
  VERIFY SUPER ADMIN
=====================================*/

async function verifySuperAdmin(req) {

    const authorization =
        req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {

        throw new Error(
            "Authentication token is required."
        );

    }

    const idToken =
        authorization.substring(7).trim();

    if (!idToken) {

        throw new Error(
            "Authentication token is missing."
        );

    }

    /* Verify Firebase ID token */

    const decodedToken =
        await auth.verifyIdToken(idToken);

    const adminSnapshot =
        await db.ref(
            `admins/${decodedToken.uid}`
        ).once("value");

    if (!adminSnapshot.exists()) {

        throw new Error(
            "Administrator account not found."
        );

    }

    const adminData =
        adminSnapshot.val();

    /* Must be active */

    if (adminData.active !== true) {

        throw new Error(
            "Your administrator account is disabled."
        );

    }

    /* Must be Super Admin */

    if (
        adminData.role !== "superadmin" &&
        adminData.role !== "superAdmin"
    ) {

        throw new Error(
            "Only a Super Administrator can manage administrators."
        );

    }

    return {
        uid: decodedToken.uid,
        ...adminData
    };

}


/*=====================================
  CREATE ADMIN
=====================================*/

app.post(
    "/api/admins/create",
    async (req, res) => {

        let createdUser = null;

        try {

            /* ===============================
               VERIFY CALLER
            =============================== */

            const creator =
                await verifySuperAdmin(req);

            console.log(
                "Authorized Super Admin:",
                creator.uid
            );


            /* ===============================
               REQUEST DATA
            =============================== */

            const fullName =
                String(
                    req.body.fullName || ""
                ).trim();

            const username =
                String(
                    req.body.username || ""
                ).trim();

            const email =
                String(
                    req.body.email || ""
                ).trim()
                .toLowerCase();

            const password =
                String(
                    req.body.password || ""
                );

            const role =
                String(
                    req.body.role || "admin"
                ).trim();

            const permissions =
                Array.isArray(
                    req.body.permissions
                )
                    ? req.body.permissions
                    : [];


            /* ===============================
               REQUIRED FIELDS
            =============================== */

            if (
                !fullName ||
                !username ||
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "All required fields must be provided."

                });

            }


            /* ===============================
               ROLE VALIDATION
            =============================== */

            if (
                !ALLOWED_ROLES.includes(role)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid administrator role."

                });

            }


            /* ===============================
               PREVENT NEW SUPER ADMIN
               THROUGH THIS ENDPOINT
            =============================== */

            if (
                role === "superadmin" ||
                role === "superAdmin"
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "A new Super Administrator cannot be created from this form."

                });

            }


            /* ===============================
               NORMALIZE PERMISSIONS
            =============================== */

            const cleanPermissions =
                [
                    ...new Set(
                        permissions
                            .map(
                                permission =>
                                    String(permission)
                                        .trim()
                            )
                            .filter(Boolean)
                    )
                ];


            /* ===============================
               CHECK EMAIL
            =============================== */

            try {

                await auth.getUserByEmail(
                    email
                );

                return res.status(400).json({

                    success: false,

                    message:
                        "The email address is already in use."

                });

            } catch (error) {

                if (
                    error.code !==
                    "auth/user-not-found"
                ) {

                    throw error;

                }

            }


            /* ===============================
               CHECK USERNAME
            =============================== */

            const adminsSnapshot =
                await db.ref("admins")
                    .once("value");

            let usernameExists = false;

            if (adminsSnapshot.exists()) {

                adminsSnapshot.forEach(
                    child => {

                        const data =
                            child.val();

                        if (
                            String(
                                data.username || ""
                            ).toLowerCase()
                            ===
                            username.toLowerCase()
                        ) {

                            usernameExists = true;

                        }

                    }
                );

            }


            if (usernameExists) {

                return res.status(400).json({

                    success: false,

                    message:
                        "That username is already in use."

                });

            }


            /* ===============================
               CREATE AUTH USER
            =============================== */

            createdUser =
                await auth.createUser({

                    email,

                    password,

                    displayName:
                        fullName

                });


            console.log(
                "Created administrator:",
                createdUser.uid
            );


            /* ===============================
               SAVE ADMIN RECORD
            =============================== */

            await db
                .ref(
                    `admins/${createdUser.uid}`
                )
                .set({

                    uid:
                        createdUser.uid,

                    fullName,

                    username,

                    email,

                    role,

                    permissions:
                        cleanPermissions,

                    active:
                        true,

                    createdAt:
                        Date.now(),

                    createdBy:
                        creator.uid,

                    lastLogin:
                        0

                });


            console.log(
                "Administrator saved:",
                createdUser.uid
            );


            /* ===============================
               SUCCESS
            =============================== */

            return res.json({

                success: true,

                uid:
                    createdUser.uid,

                role,

                message:
                    role === "messagingAdmin"
                        ? "Messaging Administrator created successfully."
                        : "Administrator created successfully."

            });


        } catch (error) {

            console.error(
                "CREATE ADMIN ERROR:",
                error
            );


            /* ===============================
               CLEANUP AUTH USER
               IF DATABASE SAVE FAILED
            =============================== */

            if (
                createdUser?.uid
            ) {

                try {

                    await auth.deleteUser(
                        createdUser.uid
                    );

                    console.log(
                        "Rolled back Auth user:",
                        createdUser.uid
                    );

                } catch (
                    cleanupError
                ) {

                    console.error(
                        "AUTH CLEANUP ERROR:",
                        cleanupError
                    );

                }

            }


            const message =
                error?.message ||
                "Unable to create administrator.";


            const status =
                message.includes(
                    "Authentication token"
                ) ||
                message.includes(
                    "Only a Super Administrator"
                ) ||
                message.includes(
                    "Administrator account not found"
                ) ||
                message.includes(
                    "account is disabled"
                )
                    ? 403
                    : 500;


            return res.status(
                status
            ).json({

                success: false,

                message

            });

        }

    }
);


/*=====================================
  START SERVER
=====================================*/

const PORT =
    process.env.PORT || 3000;

app.listen(
    PORT,
    () => {

        console.log(
            `✅ Twagalane Admin API running on port ${PORT}`
        );

    }
);