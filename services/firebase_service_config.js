const {initializeApp, cert} = require('firebase-admin/app');
const {getFirestore, FieldValue} = require('firebase-admin/firestore');
const serviceAccount = require('../secure_keys/pickload-3aba1-053f0dc67e2c.json');

initializeApp({
    credential: cert(serviceAccount)
});
const db = getFirestore();
const FsUserTest = db.collection('user_tests'); // test collection ref

const FsUser = db.collection('users');
const FsDeliveryAgent = db.collection('delivery_agents');
const FsDeliveryRequest = db.collection('delivery_requests');
const FsConversation = db.collection('conversations');
const FsStatistics = db.collection('statistics');
const FsAdmins = db.collection('admins');

module.exports = {FsUserTest, FsUser, FsDeliveryAgent, FsDeliveryRequest, FsConversation, FsStatistics, FsAdmins, FieldValue, db};