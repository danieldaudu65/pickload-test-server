const express = require('express');
const jwt = require('jsonwebtoken');

const Admin = require('../models/admin');
const Delivery_agent = require('../models/delivery_agent');
const Request = require('../models/bank_account_change_request');

const router = express.Router();

// Endpoint to view all account change requests
router.post('/requests', async (req, res) => {
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

        let requests = await Request.find({ status: 'pending' })
        .select([ 'delivery_agent_id', 'delivery_agent_name' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countRequests = await Request.find({ status: 'pending' }).select([ '_id' ]).lean();

        let count = countRequests.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No requests available' })
        }

        return res.status(200).send({status: 'ok', msg: 'Success', count, requests });
    } 
    
    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view a specific request
router.post('/request', async (req, res) => {
    const { token, request_id } = req.body;

    if(!token || !request_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let request = await Request.findOne({ _id: request_id }).lean();

        return res.status(200).send({status: 'ok', msg: 'Success', request });
    } 
    
    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to accept change request
router.post('/accept_request', async (req, res) => {
    const { token, request_id } = req.body;

    if(!token || !request_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let request = await Request.findOneAndUpdate(
            { _id: request_id },
            { status: 'approved' },
            { new: true }
        ).lean();

        let details = {
            bank_name: request.new_bank_name || request.old_bank_name,
            account_no: request.new_account_no || request.old_account_no,
            account_name: request.new_account_name || request.old_account_name,
            account_type: request.new_account_type || request.old_account_type,
            bvn: request.new_bvn || request.old_bvn
        }

        // Update bank details for delivery agent
        await Delivery_agent.updateOne(
            { _id: request.delivery_agent_id },
            { bank_details: details }
        );

        return res.status(200).send({status: 'ok', msg: 'Success', request });
    } 
    
    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to decline change request
router.post('/decline_request', async (req, res) => {
    const { token, request_id } = req.body;

    if(!token || !request_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);
        
        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let request = await Request.findOneAndUpdate(
            { _id: request_id },
            { status: 'declined' },
            { new: true }
        ).lean();

        return res.status(200).send({status: 'ok', msg: 'Success', request });
    } 
    
    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

module.exports = router
