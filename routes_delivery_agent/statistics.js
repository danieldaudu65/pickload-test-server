const express = require('express');
const jwt = require('jsonwebtoken');
const Delivery_agent = require('../models/delivery_agent');

const router = express.Router();

// endpoint to view statistics
router.post('/view_statistics', async (req, res) => {
  const { token, delivery_agent_type } = req.body;
  
  // check for required fields
  if(!token || !delivery_agent_type)
    return res.status(400).send({status: 'error', msg: 'all fields must be filled'});

  try{
    // verify token
    let delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

    // check for delivery agent type and fetch accordingly
    if(delivery_agent_type === 'delivery agent') {
      // fetch delivery agent
      delivery_agent = await Delivery_agent.findOne({_id: delivery_agent._id}).lean();

      // get the fields in the document and assign them to an object
      const stats = {
        no_accepted_deliveries: delivery_agent.no_accepted_deliveries,
        no_declined_deliveries: delivery_agent.no_declined_deliveries,
        no_completed_deliveries: delivery_agent.no_completed_deliveries,
        no_cancelled_deliveries: delivery_agent.no_cancelled_deliveries
      }

      // add earnings later
      const earnings = delivery_agent.total_earnings;

      return res.status(200).send({status: 'ok', msg: 'statistics gotten successfully', stats, earnings});

    }else {
      // fetch delivery agent
      delivery_agent = await Delivery_agent.findOne({_id: delivery_agent._id}).lean();

      // get the fields in the document and assign them to an object
      // personal deliveries statistics
      const personal_stats = {
        no_accepted_deliveries: delivery_agent.no_accepted_deliveries,
        no_declined_deliveries: delivery_agent.no_declined_deliveries,
        no_completed_deliveries: delivery_agent.no_completed_deliveries,
        no_cancelled_deliveries: delivery_agent.no_cancelled_deliveries
      }

      // delivery agent under fleet manager deliveries statistics
      const fleet_stats = {
        no_accepted_deliveries: delivery_agent.fleet_manager_delivery_agents_deliveries.no_accepted_deliveries,
        no_declined_deliveries: delivery_agent.fleet_manager_delivery_agents_deliveries.no_declined_deliveries,
        no_completed_deliveries: delivery_agent.fleet_manager_delivery_agents_deliveries.no_completed_deliveries,
        no_cancelled_deliveries: delivery_agent.fleet_manager_delivery_agents_deliveries.no_cancelled_deliveries
      }

      // total number of deliveries statistics
      const total_stats = {
        no_accepted_deliveries: delivery_agent.total_deliveries_stats.total_no_accepted_deliveries,
        no_declined_deliveries: delivery_agent.total_deliveries_stats.total_no_declined_deliveries,
        no_completed_deliveries: delivery_agent.total_deliveries_stats.total_no_completed_deliveries,
        no_cancelled_deliveries: delivery_agent.total_deliveries_stats.total_no_cancelled_deliveries
      }

      // get the vehicles under the fleet manager
      const vehicles = delivery_agent.fleet_manager_vehicles;

      // add earnings later
      const earnings = delivery_agent.total_earnings;

      return res.status(200).send({status: 'ok', msg: 'statistics and vehicle details gotten successfully', personal_stats, fleet_stats, total_stats, vehicles, earnings});
    }
      
  }catch(e) {
    console.log(e);
    return res.status(403).send({status: 'error', msg: 'some error occurred', e});
  }
});
module.exports = router;