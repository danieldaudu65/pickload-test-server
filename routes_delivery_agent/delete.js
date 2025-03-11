const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const Delivery_agent = require('../models/delivery_agent');

dotenv.config();
const {FsDeliveryAgent} = require('../services/firebase_service_config');
const router = express.Router();

// endpoint to delete and account on upgrade from a delivery agent to a fleet manager
router.post('/delete_account', async (req, res) => {
    const { token} = req.body;
  
    // check for required fields
    if(!token) 
      return res.status(400).send({status: 'error', msg: 'all fields must be filled'});
  
    try{
      // verify token
      let delivery_agent = jwt.verify(token, process.env.JWT_SECRET);
      let fsDA = delivery_agent;
  
      delivery_agent = await Delivery_agent.findOneAndUpdate(
        {_id: delivery_agent._id},
        {is_deleted: true},
        {new: true}
      ).lean();
      console.log(delivery_agent);
  
      // update the delivery agent account on firebase
      await FsDeliveryAgent.doc(fsDA._id.toString()).update({is_deleted: true});
  
      return res.status(200).send({status: 'ok', msg: 'account delete successful', delivery_agent});
  
    }catch(e) {
      console.log(e);
      return res.status(403).send({status: 'error', msg: 'some error occurred'});
    }
  });


module.exports = router;