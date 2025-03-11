const express = require('express');
const jwt = require('jsonwebtoken');
const Transaction = require('../models/transaction');
const Delivery_agent = require('../models/delivery_agent');
const PaymentCheck = require('../models/payment_check');

const router = express.Router();

// endpoint to view single delivery agent earnings
router.post('/view_single_delivery_agent_earnings', async (req, res) => {
  const { token, week, month, year } = req.body;

  // check for required fields
  if(!token || !month || !year || !week)
    return res.status(400).send({status: 'error', msg: 'all fields must be filled'});

  try{
    // verify token
    const delivery_agent = jwt.verify(token, process.env.JWT_SECRET);
      
    // fetch delivery agent earnings by week
    const delivery_agent_earnings = await Transaction.find(
      {
        delivery_agent_id: delivery_agent._id,
        completed_month: month,
        completed_year: year,
        completed_week: week,
        is_completed: true
      }
    )
    .select(['_id', 'delivery_agent_id', 'amt_for_delivery_agent', 'timestamp'])
    .sort({timestamp: 'asc'})
    .lean();
    
    // check if earnings were made in that date
    if(delivery_agent_earnings.length === 0)
      return res.status(200).send({status: 'ok', msg: 'no earnings for this date'});

    // calculate total week earnings
    let total = 0;
    delivery_agent_earnings.forEach((earning, index) => {
      total += delivery_agent_earnings[index].amt_for_delivery_agent
    });
    delivery_agent_earnings.push({total_weekly_earnings: total});

    return res.status(200).send({status: 'ok', msg: 'earnings gotten successfully', delivery_agent_earnings});
  }catch(e) {
      console.log(e);
      return res.status(403).send({status: 'error', msg: 'some error occurred'});
  }
});

// endpoint to view fleet manager weekly summary earnings
router.post('/view_fleet_manager_earnings', async (req, res) => {
  const { token, week, month, year, type} = req.body;

  // check for required fields
  if(!token || !month || !year || !week)
    return res.status(400).send({status: 'error', msg: 'all fields must be filled'});

  try{
    // verify token
    let delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

    // fetch delivery agents who are under a fleet manager
    const delivery_agents = await Delivery_agent.find(
      {
        fleet_manager_id: delivery_agent._id, 
        'vehicle_details.type': type
      }
    ).lean();
    // console.log(delivery_agents);
    
    // define a two dimensional array
    let Pdelivery_agents = [];

    // get the earnings document for each delivery agent and push into the two dimensional array
    let delivery_agent_earnings = [];
    let count = 0;
    for(let i = 0; i < delivery_agents.length; i++) {
      console.log(delivery_agents[i]._id)
      delivery_agent_earnings = await Transaction.find(
        { delivery_agent_id: delivery_agents[i]._id,
          completed_month: month,
          completed_year: year,
          completed_week: week,
          type,
          is_completed: true
        }
      )
      .select(['_id', 'delivery_agent_name', 'delivery_agent_id', 'delivery_agent_code', 'amt_for_delivery_agent', 'timestamp'])
      .sort({timestamp: 'asc'})
      .lean();
      if(delivery_agent_earnings.length !== 0 ) {
        count++
      }
      // console.log(delivery_agent_earnings);
      Pdelivery_agents.push(delivery_agent_earnings);        
    }

    console.log(count);

    // check if earnings werer made in that date
    if(count === 0)
      return res.status(200).send({status: 'ok', msg: 'no earnings were made on this date'});

    // get the total weekly earnings of each array in the two dimensional array
    // let total = 0;
    let Pdata = [];
    let delivery_agent_name = '';
    let delivery_agent_id = '';
    let total_earnings = 0;// for delivery agents
    let Total = 0;// for fleet manager
    Pdelivery_agents.forEach(delivery_agent => {
      if(delivery_agent.length !== 0) {
        delivery_agent.forEach((transaction, index) => {
          total_earnings += delivery_agent[index].amt_for_delivery_agent
          delivery_agent_name = transaction.delivery_agent_name;
          delivery_agent_id = transaction.delivery_agent_id;
        });
        let data = {
          delivery_agent_name: delivery_agent_name,
          delivery_agent_id: delivery_agent_id,
          total_earnings: total_earnings
        }
        Total += data.total_earnings;
        Pdata.push(data);
      }
      // delivery_agent.push({total_weekly_earnings: total});
    });
    Pdata.push(Total);
    // console.log(Pdata);

    return res.status(200).send({status: 'ok', msg: 'fleet manager weekly transactions gotten successfully', Pdata});
  }catch(e) {
    console.log(e);
    return res.status(403).send({status: 'error', msg: 'some error occurred'});
  }
});

// endpoint to view fleet manager single delivery agents earnings 
router.post('/view_fleet_manager_delivery_agent_earnings', async (req, res) => {
  const { token, delivery_agent_id, month, year, week } = req.body;

  // check for required fields
  if(!token || !delivery_agent_id || !month || !year || !week)
    return res.status(400).send({status: 'error', msg: 'all fields must be filled'});

  try{
    // verify token
    jwt.verify(token, process.env.JWT_SECRET);

    // get delivery_agent img
    const delivery_agent = await Delivery_agent.findById(
      {_id: delivery_agent_id}
    ).select(['img_url', 'phone_no', 'delivery_agent_code', 'vehicle_details']) 
    .lean();

    // fetch delivery agent earnings by week
    const delivery_agent_earnings = await Transaction.find(
      {
        delivery_agent_id: delivery_agent_id,
        completed_month: month,
        completed_year: year,
        completed_week: week,
        is_completed: true
      }
    )
    .select(['_id', 'delivery_agent_id', 'amt_for_delivery_agent', 'timestamp'])
    .sort({timestamp: 'asc'})
    .lean();
    console.log(delivery_agent_earnings);

    // check if delivery agent has earnings
    if(delivery_agent_earnings.length === 0)
      return res.status(200).send({status: 'ok', msg: 'no earnings for this delivery agent'});

    // calculate total week earnings
    let total = 0;
    delivery_agent_earnings.forEach((earning, index) => {
      total += earning.amt_for_delivery_agent
    });
    delivery_agent_earnings.push({total_weekly_earnings: total});


    return res.status(200).send({status: 'ok', msg: 'earnings gotten successfully', delivery_agent_earnings, delivery_agent});

  }catch(e) {
    console.log(e);
    return res.status(403).send({status: 'error', msg: 'some error occurred'});
  }

});

// endpoint to view fleet manager combined earnings
router.post('/view_combined_earnings', async (req, res) => {
  const { token, year, week, month } = req.body;

  // check for required fields
  if(!token || !year || !week || !month)
    return res.status(400).send({status: 'error', msg: 'all field must be filled'});

  try{
    // verify token
    const fleet_manager = jwt.verify(token, process.env.JWT_SECRET);
    console.log(fleet_manager, year, week, month);

    // feth earnings document
    const earnings = await Transaction.find(
      {
        fleet_manager_id: fleet_manager._id,
        completed_month: month,
        completed_year: year,
        completed_week: week,
        is_completed: true
      }
    ).select(['delivery_medium', 'amt_for_delivery_agent'])
    .lean();
    console.log(earnings);

    // check if earnings doucments exists
    if(earnings.length === 0)
      return res.status(200).send({status: 'ok', msg: 'no eanings for this fleet yet'});

    
    // calculate the total earnings by delivery medium
    let total_earnings = [];
    let vehicles = {
      total_car_earnings: 0,
      total_bike_earnings: 0,
      total_truck_earnings: 0,
      total_van_earnings: 0,
      total: 0
    }
    earnings.forEach((transaction, index) => {
      if(transaction.delivery_medium === 'Car') {
        vehicles.total_car_earnings += transaction.amt_for_delivery_agent;
      }else if(transaction.delivery_medium === 'Bike') {
        vehicles.total_bike_earnings += transaction.amt_for_delivery_agent;
      }else if(transaction.delivery_medium === 'Van') {
        vehicles.total_van_earnings += transaction.amt_for_delivery_agent;
      }else if(transaction.delivery_medium === 'Truck') {
        vehicles.total_truck_earnings += transaction.amt_for_delivery_agent
      }
    });
    vehicles.total = vehicles.total_car_earnings + vehicles.total_bike_earnings + vehicles.total_van_earnings + vehicles.total_truck_earnings;
    total_earnings.push(vehicles);

    return res.status(200).send({status: 'ok', msg: 'combined fleet earnings gotten successfully', total_earnings});

  }catch(e) {
    console.log(e);
    return res.status(403).send({status: 'error', msg: 'some error occurred'});
  }

});

// endpoint to view fleet manager delivery agents total earnings
router.post('/view_fleet_manager_delivery_agent_total_earnings', async (req, res) => {
  const { token, type } = req.body;

  // check for required fields 
  if(!token || !type)
    return res.status(400).send({status: 'error', msg: 'all fields must be filled'});

  try{
    // verify token
    const fleet_manager = jwt.verify(token, process.env.JWT_SECRET);

    // fetch delivery agent documents
    const delivery_agents = await Delivery_agent.find(
      {
        fleet_manager_id: fleet_manager._id,
        'vehicle_details.type': type
      }
    ).select(['fullname', 'total_earnings', 'delivery_agent_code', '_id'])
    .lean();

    if(delivery_agents.length === 0)
      return res.status(200).send({status: 'ok', msg: 'no earnings made by this fleet yet'});

    return res.status(200).send({status: 'ok', msg: 'delivery agents total earnings gotten successfully', delivery_agents});
    
  }catch(e) {
    console.log(e);
    return res.status(403).send({status: 'error', msg: 'some error occurred'});
  }
});

// view specific delivery agent under a fleet manager
router.post('/view_fleet_manager_delivery_agent', async (req, res) => {
  const { token, delivery_agent_id } = req.body;

  // check for required fields 
  if(!token || !delivery_agent_id)
    return res.status(400).send({status: 'error', msg: 'all fields must be filled'});

  try{
    // verify token
    const fleet_manager = jwt.verify(token, process.env.JWT_SECRET);

    // fetch delivery agent document
    const delivery_agent = await Delivery_agent.find(
      {
        _id: delivery_agent_id
      }
    ).select(['fullname', 'vehicle_details', 'deliver_agent_code', '_id', 'bank_details', 'email', 'phone_no', 'address', 'state', 'img_url'])
    .lean();

    return res.status(200).send({status: 'ok', msg: 'delivery agent gotten successfully', delivery_agent});
    
  }catch(e) {
    console.log(e);
    return res.status(403).send({status: 'error', msg: 'some error occurred'});
  }
});

// endpoint to view weekly payment status
// transaction_type: individual, fleet
router.post('/view_payment_status', async(req, res) => {
  const {week, month, year, transaction_type, token, vehicle_type} = req.body;

  // check for required fields
  if(!token || !transaction_type || !week || !month || !year) 
    return res.status(400).send({status: 'error', msg: 'all fields must be filled'});
  
  let type = '';
  // optional check for vehicle type if delivery agent is not under a fleet manager
  if(transaction_type === 'individual') { 
    if(!vehicle_type) 
      return res.status(400).send({status: 'error', msg: 'All fields must be entered'});
    
    // convert type to lowercase
    type = vehicle_type.toLowerCase();
    
    // check for valid type
    if(type != 'bike' && type != 'car' && type != 'van' && type != 'truck') 
      return res.status(400).send({status: 'error', msg: 'Invalid vehicle type' });
    
  } 

  try{
    // verify token
    jwt.verify(token, process.env.JWT_SECRET);

    // fetch payment check document
    const transaction_date = `${week}/${month}/${year}`;
    const payment_check = await PaymentCheck.findOne({transaction_date, transaction_type, vehicle_type: type}).lean();

    return res.status(200).send({status: 'ok', msg: 'delivery agent gotten successfully', payment_check});
    
  }catch(e) {
    console.log(e);
    return res.status(403).send({status: 'error', msg: 'some error occurred'});
  } 
});

module.exports = router;