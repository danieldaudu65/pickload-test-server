const express = require('express');
const jwt = require('jsonwebtoken');

const Admin = require('../models/admin');
const Transaction = require('../models/transaction');

const router = express.Router();

// Endpoint to view all transactions

router.post('/transactions', async (req, res) => {
    const { token, transaction_id, pageCount, resultPerPage } = req.body;

    if(!token || !transaction_id || !pageCount || !resultPerPage) {
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

        let transactions = await Transaction.find()
        .select([ 'payable_amount', 'status', 'timestamp' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countTransactions = await Transaction.find().select([ 'payable_amount' ]).lean();

        let count = countTransactions.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No transaction made for this period' })
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, transactions });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view a single transaction
router.post('/single_transaction', async (req, res) => {
    const { token , transaction_id} = req.body;

    if(!token || !transaction_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let transaction = await Transaction.findOne({ _id: transaction_id }).lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', transaction });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view a user's transactions
router.post('/user_transactions', async (req, res) => {
    const { token, user_id, pageCount, resultPerPage } = req.body;

    if(!token || !user_id || !pageCount || !resultPerPage) {
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

        let transactions = await Transaction.find({ user_id: user_id })
        .select([ 'payable_amount', 'status', 'timestamp' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countTransactions = await Transaction.find({ user_id: user_id }).select([ '_id' ]).lean();

        let count = countTransactions.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No transaction available for this user' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, transactions });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view a delivery_agent's transactions
router.post('/agent_transactions', async (req, res) => {
    const { token, delivery_agent_id, pageCount, resultPerPage } = req.body;

    if(!token || !delivery_agent_id || !pageCount || !resultPerPage) {
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

        let transactions = await Transaction.find({ delivery_agent_id: delivery_agent_id })
        .select([ 'payable_amount', 'status', 'timestamp' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countTransactions = await Transaction.find({ delivery_agent_id: delivery_agent_id }).select([ '_id' ]).lean();

        let count = countTransactions.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No transaction available for this delivery agent' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, transactions });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

module.exports = router