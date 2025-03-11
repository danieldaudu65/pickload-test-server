const express = require('express');
const jwt = require('jsonwebtoken');
const _ = require('underscore');

const Admin = require('../models/admin');
const AdminIds = require('../models/admin_ids');
const Statistics = require('../models/statistics');
const Conversation = require('../models/conversation');
const {FsStatistics, FsConversation, FieldValue, db} = require('../services/firebase_service_config');

const router = express.Router();

// Endpoint to view all admins
router.post('/all_admins', async (req, res) => {
    const { token, pageCount, resultPerPage } = req.body;

    //Checks
    if(!token || !pageCount || !resultPerPage) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // Checking that admin is master admin
        const master = await Admin.findOne({ _id: verify._id }).lean();

        if(!(master.role.some(role => role == 'master'))) {
            return res.status(400).send({ status: 'error', msg: 'Please login with master admin account' });
        }
        
        let page = (pageCount > 1) ? pageCount : 1;
        page -= 1;

        const admins = await Admin.find({ status: true, is_deleted: false })
        .select([ 'email', 'fullname', 'role', 'img', 'phone_no' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countAdmins = await Admin.find({ status: true, is_deleted: false }).select([ '_id' ]).lean();

        let count = countAdmins.length;

        if(count == 0) {
            return res.status(400).send({ status: 'error', msg: 'No admin at the moment' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, admins });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view a specific admin
router.post('/single_admin', async (req, res) => {
    const { token, admin_id } = req.body;

    if(!token || !admin_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // Checking that admin is master admin
        let master = await Admin.findOne({ _id: verify._id }).lean();

        if(!(master.role.some(role => role == 'master'))) {
            return res.status(400).send({ status: 'error', msg: 'Please login with master admin account' });
        }

        const admin = await Admin.findOne({ _id: admin_id }).select([ '-password' ]).lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', admin });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to edit admin role
router.post('/edit_admin', async (req, res) => {
    const { token, admin_id, role } = req.body;

    if(!token || !admin_id || !role) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // Checking that admin is master admin
        let master = await Admin.findOne({ _id: verify._id }).lean();

        if(!(master.role.some(role => role == 'master'))) {
            return res.status(400).send({ status: 'error', msg: 'Please login with master admin account' });
        }

        let admin = await Admin.findOne({ _id: admin_id });

        if(!admin) {
            return res.status(404).send({ status: 'error', msg: 'Admin not found' });
        }

        const roles = role.split(',');

        admin = await Admin.findOneAndUpdate(
            { _id: admin_id },
            { role: roles },
            { new: true }
        ).lean();
        
        // update conversation document on mongodb and firebase if admin role is users care or agents support
        if(admin.role.some(element => element === 'Agents Support' || 'Users Customer care')) {
            console.log('got here');
            await AdminIds.updateOne(
                {doc_type: 'admin_ids'},
                {
                    '$push': {'ids': admin._id},
                    '$inc': {'count': 1}
                },
                {upsert: true}
            ).lean();

            // check if conversations have been made before and update documents
            const convers = Conversation.find({doc_type: 'conversations'}).select(['members']).lean();
            if(convers) {
                // update mongodb document
                await Conversation.updateMany(
                    {doc_type: 'conversations', conv_type: 'help_feedback'},
                    {'$push': {members: admin._id}}
                ).lean();

                // update firebase document
                const conversations = await FsConversation.get();
                const batches = _.chunk(conversations.docs, 500).map(conversationDocs => {
                    const batch = db.batch()
                    conversationDocs.forEach(doc => {
                        batch.set(doc.ref, {
                            members: FieldValue.arrayUnion(admin._id.toString())
                        }, { merge: true })
                    })
                    return batch.commit()
                })
                await Promise.all(batches)
            }
        }
        return res.status(200).send({ status: 'error', msg: 'Success', admin }); 
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to block an admin's account
router.post('/block_admin', async (req, res) => {
    const { token, admin_id } = req.body;

    if(!token || !admin_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // Checking that admin is master admin
        let master = await Admin.findOne({ _id: verify._id }).lean();

        if(!(master.role.some(role => role == 'master'))) {
            return res.status(400).send({ status: 'error', msg: 'Please login with master admin account' });
        }

        let admin = await Admin.findOne({ _id: admin_id }).lean();

        if(!admin) {
            return res.status(404).send({ status: 'error', msg: 'Admin not found' });
        }

        if(admin.status == true) {
            admin = await Admin.findOneAndUpdate(
                { _id: admin_id },
                { status: false },
                { new: true }
            );

            // Update statistics schema
            await Statistics.updateOne(
                { doc_type: 'admin' }, 
                {
                    "$inc": { "no_of_active_admins": -1, "no_of_blocked_admins": 1 }
                },
                { upsert: true }
            );

            await FsStatistics.doc('statistics').update({
                no_of_active_admins: FieldValue.increment(-1), 
                no_of_blocked_admins: FieldValue.increment(1)
            });

            return res.status(200).send({ status: 'ok', msg: 'Successfully blocked admin', admin });
        } else {
            return res.status(400).send({ status: 'error', msg: 'Admin is blocked already' });
        }
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to unblock an admin
router.post('/unblock_admin', async (req, res) => {
    const { token, admin_id } = req.body;

    if(!token || !admin_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // Checking that admin is master admin
        let master = await Admin.findOne({ _id: verify._id }).lean();

        if(!(master.role.some(role => role == 'master'))) {
            return res.status(400).send({ status: 'error', msg: 'Please login with master admin account' });
        }

        let admin = await Admin.findOne({ _id: admin_id }).lean();

        if(!admin) {
            return res.status(404).send({ status: 'error', msg: 'Admin not found' });
        }

        if(admin.status == false) {
            admin = await Admin.findOneAndUpdate(
                { _id: admin_id },
                { status: true },
                { new: true }
            );

             // Update statistics schema
             await Statistics.updateOne(
                { doc_type: 'admin' }, 
                {
                    "$inc": { "no_of_active_admins": 1, "no_of_blocked_admins": -1 }
                },
                { upsert: true }
            );

            await FsStatistics.doc('statistics').update({
                no_of_active_admins: FieldValue.increment(1), 
                no_of_blocked_admins: FieldValue.increment(-1)
            });

            return res.status(200).send({ status: 'ok', msg: 'Successfully unblocked admin', admin });
        } else {
            return res.status(400).send({ status: 'error', msg: 'Admin isn\'t blocked' });
        }
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to delete admin
router.post('/delete_admin', async (req, res) => {
    const { token, admin_id } = req.body;

    if(!token || !admin_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // Checking that admin is master admin
        let master = await Admin.findOne({ _id: verify._id }).lean();

        if(!(master.role.some(role => role == 'master'))) {
            return res.status(400).send({ status: 'error', msg: 'Please login with master admin account' });
        }

        let admin = await Admin.findOne({ _id: admin_id }).lean();

        if(admin.is_deleted == false) {
            admin = await Admin.updateOne(
                { _id: admin_id },
                { $set: { is_deleted: true } }
            ).lean();
    
            // Update statistics schema
            await Statistics.updateOne(
                { doc_type: 'admin' }, 
                {
                    "$inc": { "no_of_admins": -1, "no_of_active_admins": -1 }
                },
                { upsert: true }
            );

            await FsStatistics.doc('statistics').update({
                no_of_admins: FieldValue.increment(-1), 
                no_of_active_admins: FieldValue.increment(-1)
            });
        }

        return res.status(200).send({ status: 'ok', msg: 'Successfully deleted admin' });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view blocked admins
router.post('/blocked_admins', async (req, res) => {
    const { token, pageCount, resultPerPage } = req.body;

    if(!token || !pageCount || !resultPerPage) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);
        
        // Checking that admin is master admin
        let master = await Admin.findOne({ _id: verify._id }).lean();

        if(!(master.role.some(role => role == 'master'))) {
            return res.status(400).send({ status: 'error', msg: 'Please login with master admin account' });
        }
        
        let page = (pageCount > 1) ? pageCount : 1;
        page -= 1;

        let blocked_admins = await Admin.find({ is_deleted: false, status: false })
        .select([ 'email', 'fullname', 'role', 'img', 'phone_no' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countBlockedAdmins = await Admin.find({ is_deleted: false, status: false }).select([ '_id' ]).lean();

        let count = countBlockedAdmins.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No blocked admin presently' });
        }

        return res.status(200).send({ status: 'error', msg: 'Success', count, blocked_admins });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view all admin ids
router.post('/admin_ids', async (req, res) => {
    const { token } = req.body;

    //Checks
    if(!token) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // Checking that admin is master admin
        const master = await Admin.findOne({ _id: verify._id }).lean();

        // if(!(master.role.some(role => role == 'master'))) {
        //     return res.status(400).send({ status: 'error', msg: 'Please login with master admin account' });
        // }

        const adminIDs = await Admin.find({ status: true, is_deleted: false }).select([ '_id' ]).lean();

        let count = adminIDs.length;

        if(count == 0) {
            return res.status(400).send({ status: 'error', msg: 'No admin at the moment' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, adminIDs });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

module.exports = router