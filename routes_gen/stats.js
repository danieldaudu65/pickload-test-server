const express = require('express');
const jwt = require('jsonwebtoken');
const Statistics = require('../models/statistics');

const router = express.Router();

// endpoint to get refund percent
router.post('/get_refund_percent', async (req, res) => {
    const {token} = req.body;

    if(!token) {
        return res.status(400).send({status: 'error', msg: 'All fields must be entered'});
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);

        const stats = await Statistics.findOne({doc_type: 'admin'}).select(['refund_percent']).lean();

        return res.status(200).send({status: 'ok', msg: 'Success', refund_percent: stats.refund_percent});
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});


// check active delivery mediums
router.post('/get_delivery_medium_states', async (req, res) => {
    const {token} = req.body;

    if(!token) {
        return res.status(400).send({status: 'error', msg: 'All fields must be entered'});
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);

        let stats = await Statistics.findOne({doc_type: 'admin'}).select(['active_delivery_mediums']).lean();

        return res.status(200).send({status: 'ok', msg: 'Success', active_delivery_mediums: stats.active_delivery_mediums});
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

router.post('/get_payment_timeout_duration', async (req, res) => {
    const {token} = req.body;

    if(!token) {
        return res.status(400).send({status: 'error', msg: 'All fields must be entered'});
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);

        const stats = await Statistics.findOne({doc_type: 'admin'}).select(['payment_timeout_duration']).lean();

        return res.status(200).send({status: 'ok', msg: 'Success', payment_timeout_duration: stats.payment_timeout_duration});
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

router.post('/get_request_timeout_duration', async (req, res) => {
    const {token} = req.body;

    if(!token) {
        return res.status(400).send({status: 'error', msg: 'All fields must be entered'});
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);

        const stats = await Statistics.findOne({doc_type: 'admin'}).select(['request_timeout_duration']).lean();

        return res.status(200).send({status: 'ok', msg: 'Success', request_timeout_duration: stats.request_timeout_duration});
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

module.exports = router