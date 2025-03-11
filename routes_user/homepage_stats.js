const express = require('express');

const Statistics = require('../models/statistics');

const router = express.Router();

// endpoint to view a delivery agent statistic
router.post('/view_homepage_stats', async (req, res) => {
    try{
        // get statistics
        const statistics = await Statistics.findOne(
            {doc_type: 'admin'},
            {no_of_users:  1, no_of_delivery_agents: 1, no_of_fleet_managers: 1, total_completed_deliveries: 1}
        ).lean();

        if(!statistics)
            return res.status(200).send({status: 'ok', msg: 'no stats yet'});
              
        return res.status(200).send({status: 'ok', msg: 'statistics gotten successfully', statistics});
    }catch(e) {
        console.log(e);
        return res.status(403).send({status: 'error', msg: 'some error occurred', e});
    }
});

module.exports = router;