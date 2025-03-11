const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const Review = require('../models/review');

dotenv.config();
const router = express.Router();

// // endpoint to view a single review
// router.post('/view_review', async (req, res) => {
//     const { token, review_id } = req.body;
    
//     // check for required fields
//     if(!token || !review_id)
//       return res.status(400).send({status: 'error', msg: 'all fields must be filled'});

//     try{
//         // verify token
//         const delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

//         const review = await Review.findById({_id: review_id}).lean();

//         // check if review document exists
//         if(!review)
//           return res.status(400).send({status: 'error', msg: 'review not found'});

//         return res.status(200).send({status: 'error', msg: 'review gotten successfully', review});

//     }catch(e) {
//         console.log(e);
//         return res.status(403).send({status: 'error', msg: 'some error occurred'});
//     }
// });

// endpoint to get reviews
router.post('/get_reviews', async (req, res) => {
    const { token, pagec, critical } = req.body;

    // check for required fields
    if(!token || !pagec || critical == undefined || critical == null){
        return res.status(400).json({status: 'error', msg: 'All fields must be entered'});
    }

    try{
        // verify token
        const delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

        const resultsPerPage = 10;
        let page = pagec >= 1 ? pagec : 1;
        page = page -1;

        // fetch reviews
        const reviews = await Review.find(
            {
                delivery_agent_id: delivery_agent._id,
                critical
            }
        )
        .sort({timestamp: "desc"})
        .limit(resultsPerPage)
        .skip(resultsPerPage * page)
        .lean();
        console.log(reviews);

        // check if delivery agent has reviews
        if(reviews.length === 0)
          return res.status(200).send({status: 'ok', msg: 'you do not have any reviews'});

        return res.status(200).send({status: 'ok', msg: 'Success', count: reviews.length, reviews});

    }catch(e){
        console.log(e);
        return res.status(403).json({status: 'error', msg: 'some error occurred', e});
    }
});

module.exports = router;