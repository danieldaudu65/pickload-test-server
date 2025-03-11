const express = require('express');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const DeliveryAgent = require('../models/delivery_agent');
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const Admin = require('../models/admin');
const Notification = require('../models/notification');
const AdminIds = require('../models/admin_ids');
const {sendNotificationToDevice} = require('../controllers/push_notification_controller');
const { FsDeliveryAgent, FsConversation } = require('../services/firebase_service_config');

const router = express.Router();

const handleNotification = async (toUser, receiver_id, img, notiTitle, notiSubtitle, notificationData, which_user, notiType) => {
    let user;
    if(which_user == 'user'){
        user = await User.findOne({_id: receiver_id}).lean();
    }

    if(which_user == 'delivery_agent'){
        user = await DeliveryAgent.findOne({_id: receiver_id}).lean();
    }
    console.log(user.device_token);
    sendNotificationToDevice(toUser, [user.device_token], img, notiTitle, notiSubtitle, notificationData, user.os_type, notiType || "");
}


/**
 * 1. On tap help and feedback, check if any help and feedback conversations
 * exist involving the current user.
 * 
 * 2. if previous conversation exists, load up chats from that conversation
 * and show to the user and continue that conversation with the user.
 * if no previous conversation exists, send an indicator to the front end
 * and new_conv will be set to true.
 * 
 * 3. if help_feedback admin changes, when checking if previous conversation
 * exists, if user_id of the current help_feedback admin is different from the
 * other id in the found conversation, delete current conversation and create
 * a new converstion with recent info.
 * 
 * 4. check if current help_feedback admin's id is what is in conversation
 * each time a conversation is found
 * 
 * 
 */

// send message

// the requester_Id field is optional, it'll have a value if the person initiating
// the chat is an admin, if it's a user, then it will be unnecessary
// who_sent can either be "admin" or "user"
// which_user must always with be populated by the identity of the user who is chatting with the admin, wether the admin intiated the chat or the user initiated the chat
// which_user can either be "user" or "delivery_agent" or "admin" or "guest"
router.post('/send_message', async (req, res) => {
    const {token, sender_name, sender_img, new_conv, conv_id, content, who_sent, user_id, which_user, guest_user_id} = req.body;

    if(!token || !sender_name || ((new_conv != true) && (new_conv != false)) || !content || !sender_img || !who_sent || !which_user){
        return res.status(400).json({status: 'error', msg: 'All fields must be entered'});
    }

    // get timestamp
    const timestamp = Date.now();
    try{
        const user = jwt.verify(token, process.env.JWT_SECRET);

        let conversation_id = conv_id;
        let nConv;
        if(new_conv == true){
            console.log('new conversation');

            // create new conversation
            const conversation = new Conversation;

            // get admin ids
            const admin_ids = await AdminIds.findOne({doc_type: 'admin_ids'}).select(['ids']).lean();

            if(who_sent == 'user'){
                if(guest_user_id){
                    conversation.members = [guest_user_id];
                }else{
                    conversation.members = [user._id];
                }
                admin_ids.ids.forEach(element => conversation.members.push(element));
            }else{
                admin_ids.ids.push(user_id);
                conversation.members = admin_ids.ids;
            }

            conversation.timestamp = timestamp;
            conversation.conv_type = 'help_feedback';
            conversation.which_user = which_user;

            nConv = await conversation.save();
            console.log(conversation)
            conversation_id = nConv._id;

            // create conversation object on firebase
            await FsConversation.doc(conversation_id.toString()).set({
                _id: conversation_id.toString(),
                timestamp,
                conv_type: 'help_feedback',
                which_user,
                members: nConv.members,
                latest_message_id: '',
                latest_timestamp: 0,
                latest_message_conversation_id: '',
                latest_message_sender_name: '',
                latest_message_sender_id: '',
                latest_message_sender_img: '',
                latest_message_content: '',
                other_username: '',
                other_user_img: 'a',
                other_user_email: '',
                other_user_phone: '',
                unread_msg_count: 1
            });

        }

        // send the message
        const message = new Message;
        message.timestamp = timestamp;
        message.conversation_id = conversation_id;
        message.sender_name = guest_user_id ? "Guest" : sender_name;
        message.sender_id = guest_user_id || user._id;
        message.content = content;

        const nMessage = await message.save();

        // update the latest message in converstion object
        const updConvo = await Conversation.findOneAndUpdate({_id: conversation_id}, {$set: {
            latest_message: {
                _id: nMessage._id,
                timestamp,
                conversation_id,
                sender_name,
                sender_id: guest_user_id || user._id,
                content,
                sender_img
            }
        }},
        {new: true}
        ).lean();

        // update the conversation on firebase

        let fullname = "", img = "", email = "", phone_no = "";
        let user_idM = ""
        if(which_user == 'user'){
            const fUser = await User.findOne({_id: {$in: updConvo.members}}).select(['fullname', 'img', 'email', 'phone_no', '_id']).lean();
            console.log("user_id:" + user_id);
            console.log("user_document:" + fUser._id)
            user_idM = fUser._id
            fullname = fUser.fullname;
            img = fUser.img;
            email = fUser.email;
            phone_no = fUser.phone_no;
        }

        if(which_user == 'delivery_agent'){
            const fUser = await DeliveryAgent.findOne({_id: user_id}).select(['fullname', 'img_url', 'email', 'phone_no']).lean();
            fullname = fUser.fullname;
            img = fUser.img_url;
            email = fUser.email;
            phone_no = fUser.phone_no;
        }

        if(which_user == 'guest'){
            fullname = 'Guest';
            img = 'a';
            email = 'guest@mail.com';
            phone_no = 123;
        }

        await FsConversation.doc(conversation_id.toString()).update({
            latest_message_id: nMessage._id.toString(),
            latest_message_timestamp: timestamp,
            latest_message_conversation_id: conversation_id.toString(),
            latest_message_sender_name: sender_name,
            latest_message_sender_id: guest_user_id || user._id.toString(),
            latest_message_content: content,
            latest_message_sender_img: sender_img,
            other_username: fullname,
            other_user_img: img,
            other_user_email: email,
            other_user_phone: phone_no
        });

        const conversation = updConvo;
        let other_user_id;
        conversation.members.map(id => {
            if(!guest_user_id){
                if(id != user._id){
                    other_user_id = id;
                }
            }
        });
        
        
        const admin_ids = [];
        const admin_device_tokens = [];

        if(who_sent == 'user'){
            const admins = await Admin.find({role: 'Agents Support' || 'Users Customer care' || 'master'}).lean();
            admins.map(admin => {
                admin_ids.push(admin._id);
                admin_device_tokens.push(admin.device_token);
            });
        }

        // send notification
        let notification = new Notification;

        notification.noti_type = 'help_feedback';
        notification.content = content;
        notification.sender_name = sender_name;
        notification.sender_id = guest_user_id || user._id;
        notification.sender_img_url = sender_img;
        notification.read = false;
        notification.receiver_ids = who_sent == 'user' ? admin_ids : guest_user_id ? admin_ids : [other_user_id];
        notification.timestamp = timestamp;
        notification.is_deleted = false;
        
        notification = await notification.save();

        if(who_sent == 'admin' && which_user == 'delivery_agent'){
            // send notification to specific user's device 
            const subTitle = `Help & Feedback: ${content}`;
            setTimeout(handleNotification, 1000, false, user_id, '', process.env.APP_NAME, subTitle, notification, which_user, "message");
        }
        
        if(who_sent == 'admin' && which_user == 'user'){
            // send notification to specific user's device 
            const subTitle = `Help & Feedback: ${content}`;
            setTimeout(handleNotification, 1000, true, user_idM, '', process.env.APP_NAME, subTitle, notification, which_user, "user");
        }

        // maybe handle notification sending to admins when they are messaged also
        

        return res.status(200).send({status: 'ok', msg: 'Message sent', message: nMessage});
        
    }catch(e){
        console.log(e);
        return res.status(403).json({status: 'error', msg: e});
    }

});

// endpoint to send message for guest users
// router.post('/guest_user_send_message', async (req, res) => {
//     const {token, sender_name, sender_img, new_conv, conv_id, content, who_sent, user_id, which_user, guest_user_id} = req.body;
//     console.log(conv_id);

//     if(!token || !sender_name || ((new_conv != true) && (new_conv != false)) || !content || !sender_img || !who_sent || !which_user){
//         return res.status(400).json({status: 'error', msg: 'All fields must be entered'});
//     }

//     // get timestamp
//     const timestamp = Date.now();
//     try{
//         const user = jwt.verify(token, process.env.JWT_SECRET);

//         let conversation_id = conv_id;
//         let nConv;
//         if(new_conv == true){
//             console.log('new conversation');

//             // create new conversation
//             const conversation = new Conversation;

//             // get admin ids
//             const admin_ids = await AdminIds.findOne({doc_type: 'admin_ids'}).select(['ids']).lean();

//             if(who_sent == 'user'){
//                 if(guest_user_id){
//                     conversation.members = [guest_user_id];
//                 }else{
//                     conversation.members = [user._id];
//                 }
//                 admin_ids.ids.forEach(element => conversation.members.push(element));
//             }else{
//                 admin_ids.ids.push(user_id);
//                 conversation.members = admin_ids.ids;
//             }

//             conversation.timestamp = timestamp;
//             conversation.conv_type = 'help_feedback';
//             conversation.which_user = which_user;

//             nConv = await conversation.save();
//             console.log(conversation)
//             conversation_id = nConv._id;

//             // create conversation object on firebase
//             await FsConversation.doc(conversation_id.toString()).set({
//                 _id: conversation_id.toString(),
//                 timestamp,
//                 conv_type: 'help_feedback',
//                 which_user,
//                 members: nConv.members,
//                 latest_message_id: '',
//                 latest_timestamp: 0,
//                 latest_message_conversation_id: '',
//                 latest_message_sender_name: '',
//                 latest_message_sender_id: '',
//                 latest_message_sender_img: '',
//                 latest_message_content: '',
//                 other_username: '',
//                 other_user_img: 'a',
//                 other_user_email: '',
//                 other_user_phone: '',
//                 unread_msg_count: 1
//             });

//         }

//         // send the message
//         const message = new Message;
//         message.timestamp = timestamp;
//         message.conversation_id = conversation_id;
//         message.sender_name = guest_user_id ? "Guest" : sender_name;
//         message.sender_id = guest_user_id || user._id;
//         message.content = content;

//         const nMessage = await message.save();

//         // update the latest message in converstion object
//         const updConvo = await Conversation.findOneAndUpdate({_id: conversation_id}, {$set: {
//             latest_message: {
//                 _id: nMessage._id,
//                 timestamp,
//                 conversation_id,
//                 sender_name,
//                 sender_id: guest_user_id || user._id,
//                 content,
//                 sender_img
//             }
//         }},
//         {new: true}
//         ).lean();

//         // update the conversation on firebase

//         let fullname, img, email, phone_no;
        
//         if(which_user == 'user'){
//             const fUser = await User.findOne({_id: user_id}).select(['fullname', 'img', 'email', 'phone_no']).lean();
//             console.log(user._id, fUser);
//             fullname = fUser.fullname;
//             img = fUser.img;
//             email = fUser.email;
//             phone_no = fUser.phone_no;
//         }

//         if(which_user == 'delivery_agent'){
//             const fUser = await DeliveryAgent.findOne({_id: user_id}).select(['fullname', 'img_url', 'email', 'phone_no']).lean();
//             fullname = fUser.fullname;
//             img = fUser.img_url;
//             email = fUser.email;
//             phone_no = fUser.phone_no;
//         }

//         if(which_user == 'guest'){
//             fullname = 'Guest';
//             img = 'a';
//             email = 'guest@mail.com';
//             phone_no = 123;
//         }

//         await FsConversation.doc(conversation_id.toString()).update({
//             latest_message_id: nMessage._id.toString(),
//             latest_message_timestamp: timestamp,
//             latest_message_conversation_id: conversation_id.toString(),
//             latest_message_sender_name: sender_name,
//             latest_message_sender_id: guest_user_id || user._id.toString(),
//             latest_message_content: content,
//             latest_message_sender_img: sender_img,
//             other_username: fullname,
//             other_user_img: img,
//             other_user_email: email,
//             other_user_phone: phone_no
//         });

//         const conversation = updConvo;
//         let other_user_id;
//         conversation.members.map(id => {
//             if(!guest_user_id){
//                 if(id != user._id){
//                     other_user_id = id;
//                 }
//             }
//         });
        
        
//         const admin_ids = [];
//         const admin_device_tokens = [];

//         if(who_sent == 'user'){
//             const admins = await Admin.find({role: 'Agents Support' || 'Users Customer care' || 'master'}).lean();
//             admins.map(admin => {
//                 admin_ids.push(admin._id);
//                 admin_device_tokens.push(admin.device_token);
//             });
//         }

//         // send notification
//         let notification = new Notification;

//         notification.noti_type = 'help_feedback';
//         notification.content = content;
//         notification.sender_name = sender_name;
//         notification.sender_id = guest_user_id || user._id;
//         notification.sender_img_url = sender_img;
//         notification.read = false;
//         notification.receiver_ids = who_sent == 'user' ? admin_ids : guest_user_id ? admin_ids : [other_user_id];
//         notification.timestamp = timestamp;
//         notification.is_deleted = false;
        
//         notification = await notification.save();

//         if(who_sent == 'admin' && which_user == 'delivery_agent'){
//             // send notification to specific user's device 
//             const subTitle = `Help & Feedback: ${content}`;
//             setTimeout(handleNotification, 1000, false, user_id, '', process.env.APP_NAME, subTitle, notification, [], which_user);
//         }
        
//         if(who_sent == 'admin' && which_user == 'user'){
//             // send notification to specific user's device 
//             const subTitle = `Help & Feedback: ${content}`;
//             setTimeout(handleNotification, 1000, true, user_id, '', process.env.APP_NAME, subTitle, notification, [], which_user);
//         }

//         // maybe handle notification sending to admins when they are messaged also
        

//         return res.status(200).send({status: 'ok', msg: 'Message sent', message: nMessage});
        
//     }catch(e){
//         console.log(e);
//         return res.status(403).json({status: 'error', msg: e});
//     }

// });

// get messages for a specific conversation
// router.post('/get_messages', async (req, res) => {
//     const {token, conv_id, pagec} = req.body;

//     if(!token || !conv_id || !pagec){
//         return res.status(400).json({status: 'error', msg: 'All fields must be entered'});
//     }

//     // get timestamp
//     const timestamp = Date.now();
//     try{
//         const user = jwt.verify(token, process.env.JWT_SECRET);

//         const resultsPerPage = 10;
//         let page = pagec >= 1 ? pagec : 1;
//         page = page -1;

//         const messages = await Message.find({conversation_id: conv_id}).sort({timestamp: "asc"}).limit(resultsPerPage).skip(resultsPerPage * page).lean();
//         return res.status(200).send({status: 'ok', msg: 'Success', count: messages.length, messages});
        
//     }catch(e){
//         console.log(e);
//         return res.status(400).json({status: 'error', msg: e});
//     }

// });

// endpoint to check if user has started conversation with a user/delivery agent before
router.post('/check_convers', async (req, res) => {
    const {token} = req.body;

    if(!token){
        return res.status(400).json({status: 'error', msg: 'All fields must be entered'});
    }

    // get timestamp
    try{

        const user = jwt.verify(token, process.env.JWT_SECRET);
        // const timestamp = Date.now();

        // check if previous conversation exists
        const conversation = await Conversation.findOne(
            {conv_type: 'help_feedback', members: user._id}
        ).lean();

        if(conversation){
            // // check for the current designated help_feedback admins
            // const admin = await Admin.find({roles: 'Agents Support' || 'Users Customer care'}).lean();

            // // if the id of the current help_feedback admin is not equal
            // // to the admin_id in the found conversation, then that means
            // // the admin has changed since the last conversation
            // if(admin._id != conversation.members[1]){

            //     // delete the old conversation
            //     await Conversation.deleteOne(
            //         {
            //             conv_type: 'help_feedback',
            //             members: {$all: [user._id, conversation.members[1]]
            //         }}
            //     ).lean();

            //     // create a new conversation
            //     const mConversation = new Conversation;
            //     mConversation.members = [user._id, admin._id];
            //     mConversation.timestamp = timestamp;
            //     mConversation.conv_type = 'help_feedback';

            //     const nConv = await mConversation.save();

            //     return res.status(200).send({
            //         status: 'ok',
            //         msg: 'Help feedback admin changed, new conversation created',
            //         conversation_id: nConv._id,
            //         old_conversation_id: conversation._id});

            // }

            return res.status(200).send({status: 'ok', msg: 'Old conversation', conversation_id: conversation._id});
        }

        return res.status(200).send({status: 'ok', msg: 'No conversation found'});
        
    }catch(e){
        console.log(e);
        return res.status(400).json({status: 'error', msg: e});
    }

});

// endpoint to generate guest user token
router.post('/generate_guest_user_token', async (req, res) => {
    try{
        // generate token
        const token = jwt.sign({
            _id: 'guest user id',
            email: 'guest user email'
        }, process.env.JWT_SECRET);

        return res.status(200).send({status: 'ok', msg: 'success', token});
        
    }catch(e){
        console.log(e);
        return res.status(400).json({status: 'error', msg: e});
    }

});

module.exports = router;