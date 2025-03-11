const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const DeliveryAgent = require('../models/delivery_agent');

const router = express.Router();

const {sendNotificationToDevice} = require('../controllers/push_notification_controller');

const handleNotification = async (toUser, receiver_id, img, notiTitle, notiSubtitle, notificationData, notiType) => {
    let user;

    if(toUser == true){
        user = await User.findOne({_id: receiver_id}).lean();
    }
    
    if(toUser == false){
        user = await DeliveryAgent.findOne({_id: receiver_id}).lean();
    }

    if((user != null) && (user != undefined)){
        sendNotificationToDevice(toUser, [user.device_token], img, notiTitle, notiSubtitle, notificationData, user.os_type, notiType);
    }
}

// from: user, delivery_agent
// endpoint to notifiy
router.post('/call_notification', async (req, res) => {
    const {token, from, caller_name, user_id} = req.body;

    if(!token || !from || !caller_name || !user_id) {
        return res.status(400).send({status: 'error', msg: 'All fields must be entered'});
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);

        // notification = new Notification;

        // notification.noti_type = 'call';
        // notification.delivery_id = '';
        // notification.user_id = '';
        // notification.to_id = delivery.sender_id;
        // notification.delivery_agent_ids = [];
        // notification.parcel_code = delivery.parcel_code;
        // notification.content = `${delivery.delivery_agent_name} accepted the delivery of ${delivery.parcel_name}`;
        // notification.user_name = delivery.sender_fullname;
        // notification.pickup_location = delivery.pickup_location;
        // notification.drop_off_location = delivery.drop_off_location;
        // notification.delivery_agent_name = delivery.delivery_agent_name;
        // notification.delivery_agent_img = delivery.delivery_agent_img;
        // notification.delivery_agent_img_id = delivery.delivery_agent_img_id;
        // notification.is_accepted = false;
        // notification.timestamp = timestamp;
    
        // notification = await notification.save();
        
        //send notification to the delivery agents to accept a delivery request
    
        // Send notifications to all relevant delivery agents (push notifications using device tokens)
    
        let toUser;
        if(from == 'user'){
            toUser = false;
        }else{
            toUser = true;
        }

        let subTitle;
        let noti_Type = "none";
        if(from == 'user'){
            subTitle = `Phone call from user: ${caller_name}`;
            noti_Type = "agent_call";
        }else{
            subTitle = `Phone call from delivery agent: ${caller_name}`;
        }

        setTimeout(handleNotification, 1000, toUser, user_id, '', process.env.APP_NAME, subTitle, {}, noti_Type);
        // setTimeout(handleNotification, 1000, toUser, user_id, '', process.env.APP_NAME, subTitle, {ongoing: true});
        return res.status(200).send({status: 'ok', msg: 'Success'});
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

module.exports = router;