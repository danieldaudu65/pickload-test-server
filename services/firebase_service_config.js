const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

let serviceAccount;

// Check if running in Render (where credentials are stored in an environment variable)
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    console.log("Using credentials from environment variable.");
    serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
} else {
    console.log("Using local credentials file.");
    serviceAccount = require("../secure_keys/pickload-3aba1-053f0dc67e2c.json");
}

// Initialize Firebase Admin SDK
initializeApp({
    credential: cert(serviceAccount),
});

const db = getFirestore();
const FsUserTest = db.collection("user_tests");
const FsUser = db.collection("users");
const FsDeliveryAgent = db.collection("delivery_agents");
const FsDeliveryRequest = db.collection("delivery_requests");
const FsConversation = db.collection("conversations");
const FsStatistics = db.collection("statistics");
const FsAdmins = db.collection("admins");

module.exports = {
    FsUserTest,
    FsUser,
    FsDeliveryAgent,
    FsDeliveryRequest,
    FsConversation,
    FsStatistics,
    FsAdmins,
    FieldValue,
    db,
};
