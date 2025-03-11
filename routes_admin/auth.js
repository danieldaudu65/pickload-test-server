const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const _ = require('underscore');

const cloudinary = require('cloudinary');
const upload = require('../utils/multer');

const passwordGenerator = require('generate-password');
const usernameGenerator = require('unique-username-generator');

const Admin = require('../models/admin');
const Statistics = require('../models/statistics');
const Percentage = require('../models/percentage');
const AdminIds = require('../models/admin_ids');
const Conversation = require('../models/conversation');

const { FsStatistics, FsConversation, FsAdmins, FieldValue, db } = require('../services/firebase_service_config');

const router = express.Router();

// Endpoint to signup
router.post('/signup', upload.single('img'), async (req, res) => {
    const { email, fullname, phone_no, role } = req.body;

    //Checks
    if (!email || !fullname || !phone_no || !role) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    if ((typeof email !== 'string') || (typeof fullname !== 'string')) {
        return res.status(400).send({ status: 'error', msg: 'Invalid name or email' });
    }

    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(String(email).toLocaleLowerCase())) {
        return res.status(400).send({ status: 'error', msg: 'Please enter a valid email' });
    }

    // Checking if phone_number has been used by another admin
    const phoneCheck = await Admin.findOne({ is_deleted: false, phone_no: phone_no });

    if (phoneCheck) {
        return res.status(400).send({ status: 'error', msg: 'Phone number already in use by another admin' });
    }

    // Generating username
    let username;
    const generateUsername = async () => {
        username = usernameGenerator.generateFromEmail(email, 3);
        const found = await Admin.findOne({ username }).lean();
        if (found) {
            generateUsername();
        }

        return username;
    }

    generateUsername();

    // Generating password and activity pin
    let password = passwordGenerator.generate({ length: 6, numbers: true });
    const activity_pin = passwordGenerator.generate({ length: 6, numbers: true });

    // Encrypting password and activity pin
    let passwordHash = await bcrypt.hash(password, 10);
    const activity_pin_hash = await bcrypt.hash(activity_pin, 10);

    try {
        let img_url, img_url_id;
        if (req.file) {
            let result = await cloudinary.uploader.upload(req.file.path, { folder: 'Pickload_project' });
            img_url = result.secure_url;
            img_url_id = result.public_id;
        }

        let admin = await Admin.create({
            email,
            fullname,
            username: username,
            password: passwordHash,
            activity_pin: activity_pin_hash,
            phone_no,
            role: role.split(','),
            img: img_url,
            img_id: img_url_id
        });

        //Generating jwt
        const token = jwt.sign({
            _id: admin._id,
            email: admin.email
        }, process.env.JWT_SECRET);

        await admin.save();

        delete admin.password;
        delete admin.activity_pin;

        await FsAdmins.doc(admin._id.toString()).set({
            _id: admin._id.toString(),
            is_calling: false,
            is_online: false,
            call_in_progress: false,
            token: '',
            channel_name: '',
            fullname: fullname,
            img_url: '',
            designation: 'admin'
        });

        let login_details = { username: username, password: password, activity_pin };

        // Update statistics schema
        await Statistics.updateOne(
            { doc_type: 'admin' },
            {
                $inc: {
                    "no_of_admins": 1,
                    "no_of_active_admins": 1
                }
            },
            { upsert: true }
        );

        await FsStatistics.doc('statistics').update({
            no_of_admins: FieldValue.increment(1),
            no_of_active_admins: FieldValue.increment(1)
        });

        // create percentage
        const fPercentage = await Percentage.findOne({ doc_type: 'percentage' }).lean();
        if (!fPercentage) {
            const percentage = new Percentage;

            percentage.doc_type = 'percentage';
            percentage.delivery_percentage = 10;
            percentage.cancel_delivery_refund_percentage = 25;

            await percentage.save();
        }

        // update conversation document on mongodb and firebase if admin role is users care or agents support
        if (admin.role.some(element => element === 'Agents Support' || 'Users Customer care')) {
            await AdminIds.updateOne(
                { doc_type: 'admin_ids' },
                {
                    '$push': { 'ids': admin._id },
                    '$inc': { 'count': 1 }
                },
                { upsert: true }
            ).lean();

            // check if conversations have been made before and update documents
            const convers = Conversation.find({ doc_type: 'conversations' }).select(['members']).lean();
            if (convers) {
                // update mongodb document
                await Conversation.updateMany(
                    { doc_type: 'conversations', conv_type: 'help_feedback' },
                    { '$push': { members: admin._id } }
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

        return res.status(200).send({ status: 'ok', msg: 'Successfully created admin', login_details, admin, token });
    }

    catch (error) {
        console.log(error);
        return res.status(403).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    //Checks
    if (!username || !password) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    if ((typeof username !== 'string') || (typeof password !== 'string')) {
        return res.status(400).send({ status: 'error', msg: 'Invalid username or password' });
    }

    if (password.length < 6) {
        return res.status(400).send({ status: 'error', msg: 'Password must be at least 6 characters' });
    }

    try {
        let admin = await Admin.findOne({ username }).lean();

        if (!admin) {
            return res.status(400).send({ status: 'error', msg: 'Incorrect username or password' });
        }

        if (admin.is_deleted == true) {
            return res.status(400).send({ status: 'error', msg: 'Cannot login, account has been deleted' });
        }

        if (await bcrypt.compare(password, admin.password)) {
            // Generating token
            const token = jwt.sign({
                _id: admin._id,
                email: admin.email
            }, process.env.JWT_SECRET);

            delete admin.password;
            admin.token = token;

            return res.status(200).send({ status: 'ok', msg: 'Successfully logged in', admin, token });
        } else {
            return res.status(400).send({ status: 'error', msg: 'Incorrect username or password' });
        }
    }

    catch (error) {
        console.log(error);
        return res.status(403).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to change password
router.post('/change_password', async (req, res) => {
    const { token, password, newPassword1, newPassword2 } = req.body;

    //Checks
    if (!token || !password || !newPassword1 || !newPassword2) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    if ((typeof password !== 'string') || (typeof newPassword1 !== 'string') || (typeof newPassword2 !== 'string')) {
        return res.status(400).send({ status: 'error', msg: 'Invalid password' });
    }

    if ((password.length < 6) || (newPassword1.length < 6) || (newPassword2.length < 6)) {
        return res.status(400).send({ status: 'error', msg: 'Passwords must be at least 6 characters' });
    }

    if (newPassword1 !== newPassword2) {
        return res.status(400).send({ status: 'error', msg: 'New passwords do not match' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).lean();

        if (await bcrypt.compare(password, admin.password)) {
            // Encrypt new password
            let newPassword = await bcrypt.hash(newPassword1, 10);

            //update the password field
            await Admin.updateOne(
                { _id: admin._id },
                { $set: { password: newPassword } }
            );

            return res.status(200).send({ status: 'ok', msg: 'Successfully updated password' });
        } else {
            return res.status(400).send({ status: 'error', msg: 'Incorrect password' });
        }
    }

    catch (error) {
        console.log(error);
        return res.status(403).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

module.exports = router