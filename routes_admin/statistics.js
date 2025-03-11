const express = require('express');
const jwt = require('jsonwebtoken');

const Admin = require('../models/admin');
const Statistics = require('../models/statistics');

const router = express.Router();

// Endpoint to view all statistics
router.post('/statistics', async (req, res) => {
    const { token } = req.body;

    if(!token) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);
        
        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let statistics = await Statistics.findOne({ doc_type: 'admin' }).lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', statistics });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

module.exports = router
