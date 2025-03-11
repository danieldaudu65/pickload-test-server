const express = require('express');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const DeliveryAgent = require('../models/delivery_agent');
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const Admin = require('../models/admin');
const Notification = require('../models/notification');
const {sendNotificationToDevice} = require('../controllers/push_notification_controller');

const router = express.Router();

const handleNotification = async (toUser, receiver_tokens, img, notiTitle, notiSubtitle, notificationData, os_type, notiType) => {
    sendNotificationToDevice(toUser, receiver_tokens, img, notiTitle, notiSubtitle, notificationData, os_type, notiType || "");
}

// send messages to only users
router.post('/users', async (req, res) => {
    const {token, message} = req.body;

    if(!token || !message){
        return res.status(400).json({status: 'error', msg: 'All fields must be entered'});
    }

    // get timestamp
    const timestamp = Date.now();
    try{
        let admin = jwt.verify(token, process.env.JWT_SECRET);
        admin = await Admin.findOne({_id: admin._id }).select(['-password']).lean();

        if(admin.status != true) {
            return res.status(400).send({status: 'error', msg: 'Account has been blocked, please contact master admin'});
        }
        
        const user_ids = [];
        //const user_device_tokens = [];
        const ios_user_device_tokens = [];
        const android_user_device_tokens = [];

        const users = await User.find({is_deleted: false}).select(['device_token', '_id', 'os_type']).lean();
        users.map(user => {
            if(user.device_token) {
                user_ids.push(user._id);
                if(user.os_type == 'iOS'){
                    ios_user_device_tokens.push(user.device_token);
                }else{
                    android_user_device_tokens.push(user.device_token);
                }
            }
        });

        // send notification
        let notification = new Notification;

        notification.noti_type = 'system_message';
        notification.content = message;
        notification.user_name = 'Pickload';
        notification.sender_id = admin._id;
        notification.sender_img_url = ''; // add a url to pickload icon
        notification.read = false;
        notification.receiver_ids = user_ids;
        notification.timestamp = timestamp;
        
        notification = await notification.save();

        const subTitle = `Pickload: ${message}`;
        setTimeout(handleNotification, 1000, true, ios_user_device_tokens, '', process.env.APP_NAME, subTitle, {noti_type: 'system_message', user_name: 'Pickload', content: message}, 'iOS');
        setTimeout(handleNotification, 2000, true, android_user_device_tokens, '', process.env.APP_NAME, subTitle, {noti_type: 'system_message', user_name: 'Pickload', content: message}, 'android', 'user');

        return res.status(200).send({status: 'ok', msg: 'Messages sent to users'});
        
    }catch(e){
        console.log(e);
        return res.status(400).json({status: 'error', msg: e});
    }

});

// send messages to only delivery agents
router.post('/delivery_agents', async (req, res) => {
    const {token, message} = req.body;

    if(!token || !message){
        return res.status(400).json({status: 'error', msg: 'All fields must be entered'});
    }

    // get timestamp
    const timestamp = Date.now();
    try{
        let admin = jwt.verify(token, process.env.JWT_SECRET);
        admin = await Admin.findOne({_id: admin._id }).select(['-password']).lean();

        if(admin.status != true) {
            return res.status(400).send({status: 'error', msg: 'Account has been blocked, please contact master admin'});
        }
        
        const user_ids = [];
        //const user_device_tokens = [];
        const ios_user_device_tokens = [];
        const android_user_device_tokens = [];

        const users = await DeliveryAgent.find({is_deleted: false}).select(['device_token', '_id', 'os_type']).lean();
        users.map(user => {
            if(user.device_token) { 
                user_ids.push(user._id);
                if(user.os_type == 'iOS'){
                    ios_user_device_tokens.push(user.device_token);
                }else{
                    android_user_device_tokens.push(user.device_token);
                }
            }
        });

        // send notification
        let notification = new Notification;

        notification.noti_type = 'system_message';
        notification.content = message;
        notification.user_name = 'Pickload';
        notification.sender_id = admin._id;
        notification.sender_img_url = ''; // add a url to pickload icon
        notification.read = false;
        notification.delivery_agent_ids = user_ids;
        notification.timestamp = timestamp;
        
        notification = await notification.save();

        const subTitle = `Pickload: ${message}`;
        setTimeout(handleNotification, 1000, false, ios_user_device_tokens, '', process.env.APP_NAME, subTitle, {noti_type: 'system_message', user_name: 'Pickload', content: message}, 'iOS', "message");
        setTimeout(handleNotification, 2000, false, android_user_device_tokens, '', process.env.APP_NAME, subTitle, {noti_type: 'system_message', user_name: 'Pickload', content: message}, 'android', "message");

        return res.status(200).send({status: 'ok', msg: 'Messages sent to delivery agents'});
        
    }catch(e){
        console.log(e);
        return res.status(400).json({status: 'error', msg: e});
    }

});


// send messages to both users and delivery agents
router.post('/all', async (req, res) => {
    const {token, message} = req.body;

    if(!token || !message){
        return res.status(400).json({status: 'error', msg: 'All fields must be entered'});
    }

    // get timestamp
    const timestamp = Date.now();
    try{
        let admin = jwt.verify(token, process.env.JWT_SECRET);
        admin = await Admin.findOne({_id: admin._id }).select(['-password']).lean();

        if(admin.status != true) {
            return res.status(400).send({status: 'error', msg: 'Account has been blocked, please contact master admin'});
        }
        
        // Get tokens for users
        const user_ids = [];
        //const user_device_tokens = [];

        const ios_user_device_tokens = [];
        const android_user_device_tokens = [];

        const users = await User.find({is_deleted: false}).select(['device_token', '_id', 'os_type']).lean();
        users.map(user => {
            if(user.device_token) {
                user_ids.push(user._id);
                if(user.os_type == 'iOS'){
                    ios_user_device_tokens.push(user.device_token);
                }else{
                    android_user_device_tokens.push(user.device_token);
                }
            }
        });

        // send notification to users
        let notification = new Notification;

        notification.noti_type = 'system_message';
        notification.content = message;
        notification.user_name = 'Pickload';
        notification.sender_id = admin._id;
        notification.sender_img_url = ''; // add a url to pickload icon
        notification.read = false;
        notification.receiver_ids = user_ids;
        notification.timestamp = timestamp;
        
        notification = await notification.save();

        const subTitle = `Pickload: ${message}`;
        setTimeout(handleNotification, 1000, true, ios_user_device_tokens, '', process.env.APP_NAME, subTitle, {noti_type: 'system_message', user_name: 'Pickload', content: message}, 'iOS', "message");
        setTimeout(handleNotification, 2000, true, android_user_device_tokens, '', process.env.APP_NAME, subTitle, {noti_type: 'system_message', user_name: 'Pickload', content: message}, 'android', "message");

        // Get tokens for delivery agents
        const deli_agents_ids = [];
        
        const ios_deli_agents_device_tokens = [];
        const android_deli_agents_device_tokens = [];

        const deliAgents = await DeliveryAgent.find({is_deleted: false}).select(['device_token', '_id', 'os_type']).lean();
        deliAgents.map(deliAgent => {
            if(deliAgents.device_token) {
                deli_agents_ids.push(deliAgent._id);
                if(deliAgent.os_type == 'iOS'){
                    ios_deli_agents_device_tokens.push(deliAgent.device_token);
                }else{
                    android_deli_agents_device_tokens.push(deliAgent.device_token);
                }
            }
        });

        // send notifications to delivery agents

        let dNotification = new Notification;

        dNotification.noti_type = 'system_message';
        dNotification.content = message;
        dNotification.user_name = 'Pickload';
        dNotification.sender_id = admin._id;
        dNotification.sender_img_url = ''; // add a url to pickload icon
        dNotification.read = false;
        dNotification.delivery_agent_ids = deli_agents_ids;
        dNotification.timestamp = timestamp;
        
        dNotification = await dNotification.save();

        const dSubTitle = `Pickload: ${message}`;
        setTimeout(handleNotification, 1000, false, ios_deli_agents_device_tokens, '', process.env.APP_NAME, dSubTitle, {noti_type: 'system_message', user_name: 'Pickload', content: message}, 'iOS');
        setTimeout(handleNotification, 2000, false, android_deli_agents_device_tokens, '', process.env.APP_NAME, dSubTitle, {noti_type: 'system_message', user_name: 'Pickload', content: message}, 'android');
        return res.status(200).send({status: 'ok', msg: 'Messages sent to all users and delivery agents'});
        
    }catch(e){
        console.log(e);
        return res.status(400).json({status: 'error', msg: e});
    }

});

module.exports = router;