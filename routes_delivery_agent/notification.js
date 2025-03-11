const express = require('express');
const jwt = require('jsonwebtoken');
const { model } = require('mongoose');

const Notification = require('../models/notification');

const router = express.Router();

// endpoint to view a delivery agent notification
router.post('/view_notifications', async (req, res) => {
    const { token, pagec } = req.body;

    // check for required fields
    if(!token || !pagec)
      return res.status(400).send({status: 'error', msg: 'All fields must be filled'});

    try{
        // verify token
        const delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

        const resultsPerPage = 10;
        let page = pagec >= 1 ? pagec : 1;
        page = page -1;

        // get notification
        const notifications = await Notification.find(
            {delivery_agent_ids:  delivery_agent._id, is_deleted: false}
        )
        .sort({timestamp: 'desc'})
        .limit(resultsPerPage)
        .skip(resultsPerPage * page)
        .lean();

        if(notifications.length === 0)
            return res.status(200).send({status: 'ok', msg: 'notifications gotten successfully', notifications});
              
        return res.status(200).send({status: 'ok', msg: 'notifications gotten successfully', notifications, count: notifications.length});
    }catch(e) {
        console.log(e);
        return res.status(403).send({status: 'error', msg: 'some error occurred', e});
    }
});

// endpoint to delete a notification
router.post('/delete_notification', async (req, res) => {
    const { token, notification_id } = req.body;

    // check for required fields
    if(!token || !notification_id)
      return res.status(400).send({status: 'error', msg: 'all fields must be filled'});

    try{
        // verify token
        jwt.verify(token, process.env.JWT_SECRET);

        // delete notification
        const notification = await Notification.findOneAndUpdate(
            {_id: notification_id},
            {is_deleted: true},
            {new: true}
        ).lean();
        return res.status(200).send({status: 'ok', msg: 'Delete successful', notification});
    }catch(e) {
        consoleo.log(e);
        return res.status(403).send({status: 'error', msg: 'some error occurred', e});
    }
});

module.exports = router;