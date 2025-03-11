const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const Request = require('../models/bank_account_change_request');
const Delivery_agent = require('../models/delivery_agent')

dotenv.config();
const router = express.Router();

// endpoint to request to change bank account details
router.post('/change_bank_account', async (req, res) => {
  const { token, new_bank_name, new_account_no, new_account_name, new_account_type, new_bvn } = req.body;
  
  // check for required fields
  if(!token)
    return res.status(400).send({status: 'error', msg: 'all fields must be filled'});

  try{
    // verify token
    const {_id} = jwt.verify(token, process.env.JWT_SECRET);

    // fetch delivery agent document
    const delivery_agent = await Delivery_agent.findByIdAndUpdate({_id: _id}, {
      bank_details: 1
    });

    const bank_details = {
      bank_name: new_bank_name || delivery_agent.bank_details.bank_name,
      account_no: new_account_no || delivery_agent.bank_details.account_no,
      account_name: new_account_name || delivery_agent.bank_details.account_name,
      account_type: new_account_type || delivery_agent.bank_details.account_type,
      bvn: new_bvn || delivery_agent.bank_details.bvn

    }

    delivery_agent.bank_details = bank_details;
    await delivery_agent.save();
    // // create new document and populate it
    // let request = await new Request;

    // console.log(delivery_agent.bank_details);;
    // request.new_bank_name = new_bank_name || delivery_agent.bank_details.bank_name;
    // request.new_account_no = new_account_no || delivery_agent.bank_details.account_no;
    // request.new_account_name = new_account_name || delivery_agent.bank_details.account_name;
    // request.new_account_type = new_account_type || delivery_agent.bank_details.account_type;
    // request.new_bvn = new_bvn || delivery_agent.bank_details.bvn;
    // request.old_bank_name = delivery_agent.bank_details.bank_name;
    // request.old_account_no = delivery_agent.bank_details.account_no;
    // request.old_account_name = delivery_agent.bank_details.account_name;
    // request.old_account_type = delivery_agent.bank_details.account_type;
    // request.old_bvn = delivery_agent.bank_details.bvn;

    // await request.save();

    // // remove this code later after testing from line 36 till line 48 and the delivery agent response 
    // const data = {
    //   bank_name: new_bank_name || delivery_agent.bank_details.new_bank_name,
    //   account_no: new_account_no || delivery_agent.bank_details.account_no,
    //   account_name: new_account_name || delivery_agent.bank_details.account_name,
    //   account_type: new_account_type || delivery_agent.bank_details.account_type,
    //   bvn: new_bvn || delivery_agent.bank_details.bvn,
    // }
    // delivery_agent = Delivery_agent.findByIdAndUpdate(
    //   {_id: delivery_agent._id},
    //   {bank_details: data},
    //   {new: true}
    // ).lean();

    return res.status(200).send({status: 'ok', msg: 'success', delivery_agent});

  }catch(e) {
    console.log(e);
    return res.status(403).send({status: 'error', msg: 'some error occurred'});
  }
});

// endpoint to view request to change bank account details
router.post('/view_request', async (req, res) => {
  const { token, request_id } = req.body;
  
  // check for required fields
  if(!token || !request_id)
    return res.status(400).send({status: 'error', msg: 'all fields must be filled'});

  try{
    // verify token
    const delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

    const request = await Request.findOne({_id: request_id}).lean();
    // if(!request)
    //   return res.status(400).send({status: 'error', msg: 'request not found'});

    return res.status(200).send({status: 'error', msg: 'request gotten successfully', request});

  }catch(e) {
    console.log(e);
    return res.status(403).send({status: 'error', msg: 'some error occurred'});
  }
});

module.exports = router;