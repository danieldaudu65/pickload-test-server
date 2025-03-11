const express = require('express');
const jwt = require('jsonwebtoken');

const Admin = require('../models/admin');
const Review = require('../models/review');

const router = express.Router();

// Endpoint to view all reviews
router.post('/reviews', async (req, res) => {
    const { token , pageCount, resultPerPage} = req.body;

    if(!token, !pageCount || !resultPerPage) {
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

        let reviews = await Review.find()
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countReviews = await Review.find().select([ '_id' ]).lean();

        let count = countReviews.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No reviews available presently' })
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, reviews });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view all reviews for a specific delivery agent
router.post('/agent_reviews', async (req, res) => {
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

        let reviews = await Review.find({ delivery_agent_id: delivery_agent_id })
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countReviews = await Review.find({ delivery_agent_id: delivery_agent_id }).select([ '_id' ]).lean();

        let count = countReviews.length;

        if(reviews.length == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No reviews available yet' })
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, reviews });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

module.exports = router