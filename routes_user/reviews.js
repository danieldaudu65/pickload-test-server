const express = require('express');
const jwt = require('jsonwebtoken');

const DeliveryAgent = require('../models/delivery_agent');
const Delivery = require("../models/delivery");
const Review = require('../models/review');

const router =  express.Router();

// important endpoints left
// fetch a delivery document using the delivery_id (received in req.body)
// an endpoint which receives the distance between pickup location & delivery location in kilometers and returns the price for that distance
// endpoints to fetch notifications for users & delivery agents
// alteration of delivery document to (pickup_location, pickup_address, drop_off_location, drop_off_address)


//create review endpoint
router.post('/new_review', async (req, res) => {
    const {token, review, delivery_agent_id, user_img, user_img_id, user_name, stars, delivery_id} = req.body

    if(!token || !review || !delivery_agent_id || !user_name || !stars || !delivery_id){
        return res.status(400).send({status : 'error', msg: 'All fields must be filled' })
    }

    try{
        const timestamp = Date.now();
         
        let user = jwt.verify(token, process.env.JWT_SECRET)

        let crit;
        if(stars <= 2){
            crit = true;
        }else{
            crit = false;
        }
        
        //creating new review document
        let mReview = new Review;
  
        mReview.user_img = user_img || '';
        mReview.user_id = user._id;
        mReview.user_img_id = user_img_id || '';
        mReview.user_name = user_name;
        mReview.review = review;
        mReview.delivery_agent_id = delivery_agent_id;
        mReview.stars = stars;
        mReview.timestamp = timestamp;
        mReview.critical = crit;
        mReview.delivery_id = delivery_id;
        
        mReview  = await mReview.save()

        // compute average rating
        await DeliveryAgent.findOneAndUpdate({_id: delivery_agent_id}, {
            $inc: {
                'rating.total_rating': stars,
                'rating.rating_count': 1
            }
        }, {new: true});

        // update delivery document
        await Delivery.updateOne({_id: delivery_id}, {
            is_reviewed: true, review_id: mReview._id, review: review, review_timestamp: timestamp, review_stars: stars
        });

        return res.status(200).send({status: 'ok' , msg: 'Successful Review', review: mReview});
    }catch(e){
        console.log(e);
        res.status(403).send({status: 'error', msg: 'An error occured'});
    }
})

/**
 * this endpoint gets the reviews for a specific delivery agent
 * it will be used in the scheduled deliveries section of the user app
 * where the user views the reviews for a specific user
 * 
 * This endpoint is capable of fetching either critical or good reviews
 * critical: receives a value of either true or false
 * true for critical, false for good reviews
 */

 router.post('/get_reviews', async(req, res) => {
    const {token, pagec, delivery_agent_id, critical} = req.body;

    if(!token || !pagec || !delivery_agent_id || critical == undefined || critical == null){
        return res.status(400).json({status: 'error', msg: 'All fields must be entered'});
    }

    try{
        const user = jwt.verify(token, process.env.JWT_SECRET);

        const resultsPerPage = 10;
        let page = pagec >= 1 ? pagec : 1;
        page = page -1;

        const reviews = await Review.find({delivery_agent_id, critical}).sort({timestamp: "desc"}).limit(resultsPerPage).skip(resultsPerPage * page).lean();
        return res.status(200).send({status: 'ok', msg: 'Success', count: reviews.length, reviews});

    }catch(e){
        console.log(e);
        return res.status(400).json({status: 'error', msg: e});
    }
});


// endpoint to fetch top three reviews for a delivery agent
router.post('/top_reviews', async (req, res) => {
    const {token, delivery_agent_id} = req.body;

    if(!token || !delivery_agent_id){
        return res.status(400).send({status: 'error', msg: 'All fields must be entered'})
    }

    try{
        const user =jwt.verify(token, process.env.JWT_SECRET);

        const reviews = await Review.find({delivery_agent_id}).sort({timestamp: "desc"}).limit(3).lean();
        return res.status(200).send({status: 'ok', msg: 'Success', reviews});

    }catch(e){
        console.log(e);
        return res.status(400).send({status: 'error', msg: e})
    }
});

module.exports = router