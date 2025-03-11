const express = require('express');
const jwt = require('jsonwebtoken');

const Notification = require('../models/notification');

const router = express.Router();


// get notifications for a specific user
router.post('/notifications', async (req, res) => {
    const {token, pagec} = req.body;

    if(!token || !pagec){
        return res.status(400).json({status: 'error', msg: 'All fields must be entered'});
    }

    try{
        const user = jwt.verify(token, process.env.JWT_SECRET);

        const resultsPerPage = 10;
        let page = pagec >= 1 ? pagec : 1;
        page = page -1;

        // get total number of notifications from the database
        const count = await Notification.find({$or: [
            {to_id: user._id},
            {receiver_ids: user._id}
        ], is_deleted: false}).lean().length;

        // get notifications documents
        const notifications = await Notification.find({$or: [
            {to_id: user._id},
            {receiver_ids: user._id}
        ], is_deleted: false}).sort({timestamp: "desc"}).limit(resultsPerPage).skip(resultsPerPage * page).lean();
        return res.status(200).send({status: 'ok', msg: 'Success', count: notifications.length, notifications, pageCount: count});
        
    }catch(e){
        console.log(e);
        return res.status(400).json({status: 'error', msg: 'An error occured', e});
    }

});

//delete notification endpoint
router.post('/delete_notification', async (req, res) => {
    const {token, notification_id} = req.body

    if(!token || !notification_id){
        return res.status(400).send({status : 'error', msg: 'All  fields must be entered'})
    }

    try{

        const user = jwt.verify(token, process.env.JWT_SECRET);

        let dNotification = await Notification.findOneAndUpdate({owner_id: user._id, _id: notification_id},
             {
                is_deleted: true
             },
             {new: true}).lean()

        res.status(200).send({status: 'ok', msg: 'Successful Delete', notification: dNotification})
    }catch(e){
        console.log(e)
        return res.status(400).send({status: 'error', msg: 'An error occured'}, e)
    }
})
module.exports = router;