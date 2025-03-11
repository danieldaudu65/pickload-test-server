const express = require('express');
const jwt = require('jsonwebtoken');

const Admin = require('../models/admin');
const Percentage = require('../models/percentage');

const router = express.Router();

// Endpoint to change the delivery percentage on each delivery payment
router.post('/change_delivery_percentage', async (req, res) => {
    const {token, percent} = req.body;

    if(!token || !percent) {
        return res.status(400).send({status: 'error', msg: 'All fields must be entered'});
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({_id: admin._id }).select(['-password']).lean();

        if(admin.status != true) {
            return res.status(400).send({status: 'error', msg: 'Account has been blocked, please contact master admin'});
        }

        let percentage = await Percentage.findOneAndUpdate({doc_type: 'percentage'}, {delivery_percentage: percent}, {new: true, upsert: true}).lean();

        return res.status(200).send({status: 'ok', msg: 'Success', percentage});
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to get all percentages
router.post('/get_percentages', async (req, res) => {
    const {token} = req.body;

    if(!token) {
        return res.status(400).send({status: 'error', msg: 'All fields must be entered'});
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);
        
        admin = await Admin.findOne({_id: admin._id }).select(['-password']).lean();

        if(admin.status != true) {
            return res.status(400).send({status: 'error', msg: 'Account has been blocked, please contact master admin'});
        }

        let percentage = await Percentage.findOne({doc_type: 'percentage'}).lean();

        return res.status(200).send({status: 'ok', msg: 'Success', percentage});
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

module.exports = router