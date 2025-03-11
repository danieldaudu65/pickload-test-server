const express = require('express');
const jwt = require('jsonwebtoken');

const Admin = require('../models/admin');
const User = require('../models/user');

const router = express.Router();

//Endpoint to view all users total expenditure
router.post('/expenditure', async (req, res) => {
    const { token, pageCount, resultPerPage } = req.body;

    if(!token || !pageCount || !resultPerPage) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);
        
        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }
        
        let page = (pageCount > 1) ? pageCount : 1;
        page -= 1;

        let users_expenditure = await User.find()
        .select([ 'img', 'fullname', 'total_expenditure' ])
        .sort({ total_expenditure: -1 })
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countUsersExpenditure = await User.find().select([ '_id' ]).lean();

        let count = countUsersExpenditure.length;

        return res.status(200).send({ status: 'ok', msg: 'Success', count, users_expenditure })
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

module.exports = router