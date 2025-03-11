const express = require('express');
const jwt = require('jsonwebtoken');

const Admin = require('../models/admin');
const {sendEmail} = require('../utils/nodemailer');

const router = express.Router();

// Endpoint for admin to send email
router.post('/send_mail', async (req, res) => {
    const { token, email, subject, body } = req.body;

    if(!token || !email || !subject || !body) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select(['-password']).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        sendEmail(email, subject, body);

        return res.status(200).send({ status: 'ok', msg: 'Success', admin });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

module.exports = router