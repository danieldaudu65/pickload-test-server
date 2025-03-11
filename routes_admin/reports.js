const express = require('express');
const jwt = require('jsonwebtoken');

const Admin = require('../models/admin');
const Report = require('../models/report');
const Stats = require('../models/statistics');

const {FsStatistics, FieldValue} = require('../services/firebase_service_config');

const router = express.Router();

// Endpoint to view all unresolved reports made by users
router.post('/users_unresolved', async (req, res) => {
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

        let reports = await Report.find({ reporter: 'user', is_resolved: false })
        .sort({ timestamp: -1 })
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countReports = await Report.find({ reporter: 'user', is_resolved: false }).select([ '_id' ]).lean();

        let count = countReports.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No user reports available presently' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, reports });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view all unresolved reports made by delivery_agents
router.post('/agents_unresolved', async (req, res) => {
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

        let reports = await Report.find({ reporter: 'delivery agent', is_resolved: false })
        .sort({ timestamp: -1 })
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countReports = await Report.find({ reporter: 'delivery agent', is_resolved: false }).select([ '_id' ]).lean();

        let count = countReports.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No agent reports available presently' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, reports });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view a single report
router.post('/report', async (req, res) => {
    const { token, report_id } = req.body;

    if(!token || !report_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);
        
        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let report = await Report.find({ _id: report_id }).lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', report });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to resolve a report
router.post('/resolve', async (req, res) => {
    const { token, report_id } = req.body;

    if(!token || !report_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }
    
    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);
        
        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let report = await Report.findOne({ _id: report_id }).select([ 'is_resolved' ]).lean();

        if(report.is_resolved == true){
            return res.status(400).send({ status: 'error', msg: 'This report has already been resolved' })
        }

        const timestamp = Date.now();
        report = await Report.findOneAndUpdate(
            { _id: report_id },
            { is_resolved: true, resolved_timestamp: timestamp },
            { new: true }
        ).lean();

        // update statistics doucument
        await Stats.updateOne(
            {doc_type: 'admin'},
            {'$inc': {total_pending_reports: -1, total_resolved_reports: 1}},
            {upsert: true}
          ).lean();

          await FsStatistics.doc('statistics').update({
            total_pending_reports: FieldValue.increment(-1), 
            total_resolved_reports: FieldValue.increment(1)
        });

        return res.status(200).send({ status: 'ok', msg: 'Success', report });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view all resolved reports made by users
router.post('/users_resolved', async (req, res) => {
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

        let reports = await Report.find({ reporter: 'user', is_resolved: true })
        .sort({ resolved_timestamp: -1 })
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countReports = await Report.find({ reporter: 'user', is_resolved: true }).select([ '_id' ]).lean();

        let count = countReports.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No resolved reports available presently' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, reports });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view all resolved reports made by delivery_agents
router.post('/agents_resolved', async (req, res) => {
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

        let reports = await Report.find({ reporter: 'delivery agent', is_resolved: true })
        .sort({ resolved_timestamp: -1 })
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countReports = await Report.find({ reporter: 'delivery agent', is_resolved: true }).select([ '_id' ]).lean();

        let count = countReports.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No resolved reports available presently' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, reports });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

module.exports = router