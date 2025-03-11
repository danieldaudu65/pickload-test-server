const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

const Delivery = require('../models/delivery');


dotenv.config();
const router = express.Router();

// endpoint to search for delivery in history
router.post('/search_delivery', async (req, res) => {
  const { token, search_string, pagec } = req.body;

  // check for required fields
  if(!token || !search_string || !pagec)
    return res.status(400).send({status: 'error', msg: 'all fields must be filled'});

  try{
    // verify token
    const delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

    const resultsPerPage = 5;
    let page = pagec >= 1 ? pagec : 1;
    page = page -1;
    
    // fetch the delivery history documents based on search string
    const deliveries = await Delivery.find(
      {delivery_agent_id: delivery_agent._id,
        '$or': [{'delivery_status.is_completed': true},
          {'delivery_status.is_cancelled': true}
        ],
        '$or': [
        {delivery_code: {$regex: search_string}},
        {parcel_name: {$regex: search_string}},
        {parcel_code: {$regex: search_string}},
        {drop_off_address: {$regex: search_string}},
        {pick_up_address: {$regex: search_string}}
      ]}
    ).sort({timestamp: 'desc'})
    .limit(resultsPerPage)
    .skip(resultsPerPage * page)
    .lean()

    console.log(deliveries);
    // check if search matches any document in the database
    if(deliveries.length === 0)
      return res.status(200).send({status: 'error', msg: 'no deliveries found'});
      
    return res.status(200).send({status: 'ok', msg: 'deliveries gotten successfully', deliveries});
  }catch(e) {
    console.log(e);
    return res.status(403).send({status: 'error', msg: 'Some error occurred'});
  }
  });

module.exports = router;