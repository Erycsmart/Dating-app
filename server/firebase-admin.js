import admin from "firebase-admin";
import serviceAccount from "./serviceAccountKey.json" with { type: "json" };

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://nansubuga-869c6-default-rtdb.firebaseio.com"
});

export const auth = admin.auth();
export const db = admin.database();