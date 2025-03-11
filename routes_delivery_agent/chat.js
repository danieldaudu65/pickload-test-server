const express = require('express');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const {sendNotificationToDevice} = require('../controllers/push_notification_controller');

const router = express.Router();

const handleNotification = async (toUser, receiver_id, img, notiTitle, notiSubtitle, notificationData, notiType) => {
    let user;
    user = await User.findOne({_id: receiver_id}).lean();
    sendNotificationToDevice(toUser, [user.device_token], img, notiTitle, notiSubtitle, notificationData, user.os_type, notiType || "");
}

// send message
router.post('/send_message', async (req, res) => {
    const {token, sender_name, sender_img, receiver_id, new_conv, conv_id, content} = req.body;
    console.log(receiver_id, 'rec id')

    if(!token || !sender_name || !receiver_id || ((new_conv != true) && (new_conv != false)) || !content || !sender_img){
        return res.status(400).json({status: 'error', msg: 'All fields must be entered'});
    }

    // get timestamp
    const timestamp = Date.now();
    try{
        const user = jwt.verify(token, process.env.JWT_SECRET);
        console.log(user._id, 'token id');

        let conversation_id = conv_id;
        let nConv;
        if(new_conv == true){
            // create new conversation
            const conversation = new Conversation;
            conversation.members = [user._id, receiver_id];
            conversation.timestamp = timestamp;
            conversation.channel_id = '';
            conversation.channel_name = '';
            conversation.conv_type = 'single';

            const nConv = await conversation.save();
            conversation_id = nConv._id;
        }

        // send the message
        const message = new Message;
        message.timestamp = timestamp;
        message.conversation_id = conversation_id;
        message.sender_name = sender_name;
        message.sender_id = user._id;
        message.content = content;

        const nMessage = await message.save();

        // update the latest message in converstion object
        const updConvo = await Conversation.findOneAndUpdate({_id: conversation_id}, {$set: {
            latest_message: {
                _id: nMessage._id,
                timestamp,
                conversation_id,
                sender_name,
                sender_id: user._id,
                content,
                sender_img
            }
        }});


        // send notification
        let notification = {};

        notification.noti_type = 'msg';
        notification.content = content;
        notification.sender_name = sender_name;
        notification.sender_id = user._id;
        notification.read = false;
        notification.owner_id = receiver_id;
        notification.timestamp = timestamp;

        console.log(conversation_id, 'conv_id');

        // send notification to specific user's device
        const subTitle = `${sender_name}: ${content}`;
        setTimeout(handleNotification, 1000, true, receiver_id, '', process.env.APP_NAME, subTitle, notification, 'user');
        
        return res.status(200).send({status: 'ok', msg: 'Message sent', message: nMessage});
        
    }catch(e){
        console.log(e);
        return res.status(400).json({status: 'error', msg: e});
    }

});

// get conversations for a specific user
router.post('/get_conversations', async (req, res) => {
    const {token} = req.body;

    if(!token){
        return res.status(400).json({status: 'error', msg: 'All fields must be entered'});
    }

    // get timestamp
    const timestamp = Date.now();
    try{
        const user = jwt.verify(token, process.env.JWT_SECRET);

        const conversations = await Conversation.find({conv_type: 'single', members: user._id}).sort({timestamp: "desc"}).lean();

        for(let i = 0; i < conversations.length; i++){

            let other_user_id;
            conversations[i].members.map(id => {
                if(id != user._id){
                    other_user_id = id;
                }
            });

            const otherUser = await User.findOne({_id: other_user_id}).lean();

            conversations[i].other_username = otherUser.fullname;
            conversations[i].other_user_img = otherUser.img;
        }

        return res.status(200).send({status: 'ok', msg: 'Success', count: conversations.length, conversations});
        
    }catch(e){
        console.log(e);
        return res.status(400).json({status: 'error', msg: e});
    }

});

// get messages for a specific conversation
router.post('/get_messages', async (req, res) => {
    const {token, conv_id, pagec} = req.body;

    if(!token || !conv_id || !pagec){
        return res.status(400).json({status: 'error', msg: 'All fields must be entered'});
    }

    // get timestamp
    const timestamp = Date.now();
    try{
        const user = jwt.verify(token, process.env.JWT_SECRET);

        const resultsPerPage = 10;
        let page = pagec >= 1 ? pagec : 1;
        page = page -1;

        const messages = await Message.find({conversation_id: conv_id}).sort({timestamp: "asc"}).limit(resultsPerPage).skip(resultsPerPage * page).lean();
        return res.status(200).send({status: 'ok', msg: 'Success', count: messages.length, messages});
        
    }catch(e){
        console.log(e);
        return res.status(400).json({status: 'error', msg: e});
    }

});

// endpoint to check if user has started conversation with the supposed receiver before
router.post('/check_convers', async (req, res) => {
    const {token, receiver_id} = req.body;

    if(!token || !receiver_id){
        return res.status(400).json({status: 'error', msg: 'All fields must be entered'});
    }

    // get timestamp
    try{

        const user = jwt.verify(token, process.env.JWT_SECRET);

        const conversation = await Conversation.findOne({members: {
            $all: [user._id, receiver_id]
        }}).lean();

        if(conversation){
            return res.status(200).send({status: 'ok', msg: 'Success', conversation_id: conversation._id});
        }
        return res.status(200).send({status: 'ok', msg: 'No conversation found'});
        
    }catch(e){
        console.log(e);
        return res.status(400).json({status: 'error', msg: e});
    }

});


module.exports = router;