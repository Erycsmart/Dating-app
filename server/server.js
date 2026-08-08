import express from "express";
import cors from "cors";
import { auth, db } from "./firebase-admin.js";

const app = express();

app.use(cors());
app.use(express.json());

/*=====================================
HOME
=====================================*/

app.get("/", async (req, res) => {

    try {

        await auth.listUsers(1);

        res.json({
            success: true,
            message: "Ruthy Connect Admin API connected successfully."
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
CREATE ADMIN
=====================================*/

app.post("/api/admins/create", async (req, res) => {

    try {

        console.log("Incoming Request:", req.body);

        const fullName = req.body.fullName;
        const username = req.body.username;
        const email = req.body.email;
        const password = req.body.password;
        const role = req.body.role || "admin";
        const permissions = req.body.permissions || [];

        if (!fullName || !username || !email || !password) {

            return res.status(400).json({
                success: false,
                message: "All required fields must be provided."
            });

        }

        // Check if email already exists
        try {

            await auth.getUserByEmail(email);

            return res.status(400).json({
                success: false,
                message: "The email address is already in use."
            });

        } catch (err) {

            if (err.code !== "auth/user-not-found") {
                throw err;
            }

        }

        // Create Firebase Authentication user
        const user = await auth.createUser({

            email,
            password,
            displayName: fullName

        });

        console.log("Created User:", user.uid);

        // Save administrator in Realtime Database
        await db.ref(`admins/${user.uid}`).set({

            uid: user.uid,
            fullName: fullName,
            username: username,
            email: email,
            role: role,
            permissions: permissions,
            active: true,
            createdAt: Date.now(),
            lastLogin: 0

        });

        console.log("Administrator saved successfully.");

        return res.json({

            success: true,
            uid: user.uid,
            message: "Administrator created successfully."

        });

    } catch (error) {

        console.error("CREATE ADMIN ERROR:", error);

        return res.status(500).json({

            success: false,
            message: error.message

        });

    }

});

/*=====================================
START SERVER
=====================================*/

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(`✅ Ruthy Connect server running on port ${PORT}`);

});