const express = require('express');
const jwt = require('jsonwebtoken');

const Conversation = require('../models/conversation');
const Admin = require('../models/admin');
const User = require('../models/user');
const DeliveryAgent = require('../models/delivery_agent');

const router = express.Router();

// get conversations for an admin with users
router.post('/get_conversations_users', async (req, res) => {
    const {token} = req.body;

    if(!token){
        return res.status(400).json({status: 'error', msg: 'All fields must be entered'});
    }

    try{
        const user = jwt.verify(token, process.env.JWT_SECRET);

        const admin = await Admin.findOne({_id: user._id}).lean();

        if((admin.status != true) && admin){
            return res.status(400).send({status: 'error', msg: 'This admin account has been disabled, please contact the master admin'});
        }

        const conversations = await Conversation.find(
            {which_user: 'user', members: user._id}
        ).sort({timestamp: "asc"}).lean();

        for(let i = 0; i < conversations.length; i++){

            // let other_user_id;
            // conversations[i].members.map(id => {
            //     if(id != user._id){
            //         other_user_id = id;
            //     }
            // });

            for(let j = 0; j < conversations[i].members.length; j++){
                // confirm that the other user is a user and another admin
                const users = await User.find({_id: conversations[i].members[j]}).lean();

                if(users.length != 0){
                    conversations[i].other_username = users[0].fullname;
                    conversations[i].other_user_img = users[0].img;
                    conversations[i].other_user_email = users[0].email;
                    conversations[i].other_user_phone = users[0].phone_no;
                }
            }
        }
        
        return res.status(200).send({status: 'ok', msg: 'Success', count: conversations.length, conversations});
        
    }catch(e){
        console.log(e);
        return res.status(400).json({status: 'error', msg: e});
    }

});

// get conversations for an admin with delivery agents
router.post('/get_conversations_deli_agents', async (req, res) => {
    const {token} = req.body;

    if(!token){
        return res.status(400).json({status: 'error', msg: 'All fields must be entered'});
    }

    try{
        const user = jwt.verify(token, process.env.JWT_SECRET);

        const admin = await Admin.findOne({_id: user._id}).lean();

        if((admin.status != true) && admin){
            return res.status(400).send({status: 'error', msg: 'This admin account has been disabled, please contact the master admin'});
        }

        const conversations = await Conversation.find(
            {which_user: 'delivery_agent', members: user._id}
        ).sort({timestamp: "asc"}).lean();

        for(let i = 0; i < conversations.length; i++){

            // let other_user_id;
            // conversations[i].members.map(id => {
            //     if(id != user._id){
            //         other_user_id = id;
            //     }
            // });

            for(let j = 0; j < conversations[i].members.length; j++){
                // confirm that the other user is a user and another admin
                const users = await DeliveryAgent.find({_id: conversations[i].members[j]}).lean();

                if(users.length != 0){
                    conversations[i].other_username = users[0].fullname;
                    conversations[i].other_user_img = users[0].img_url;
                    conversations[i].other_user_email = users[0].email;
                    conversations[i].other_user_phone = users[0].phone_no;
                }
            }
        }
        
        return res.status(200).send({status: 'ok', msg: 'Success', count: conversations.length, conversations});
        
    }catch(e){
        console.log(e);
        return res.status(400).json({status: 'error', msg: e});
    }

});


// get conversations for an admin with admins
router.post('/get_conversations_admins', async (req, res) => {
    const {token} = req.body;

    if(!token){
        return res.status(400).json({status: 'error', msg: 'All fields must be entered'});
    }

    try{
        const user = jwt.verify(token, process.env.JWT_SECRET);

        const admin = await Admin.findOne({_id: user._id}).lean();

        if((admin.status != true) && admin){
            return res.status(400).send({status: 'error', msg: 'This admin account has been disabled, please contact the master admin'});
        }

        const conversations = await Conversation.find(
            {which_user: 'admin', members: user._id}
        ).sort({timestamp: "asc"}).lean();

        for(let i = 0; i < conversations.length; i++){

            // let other_user_id;
            // conversations[i].members.map(id => {
            //     if(id != user._id){
            //         other_user_id = id;
            //     }
            // });

            for(let j = 0; j < conversations[i].members.length; j++){
                // confirm that the other user is a user and another admin
                const users = await Admin.find({_id: conversations[i].members[j]}).lean();

                if(users.length != 0){
                    conversations[i].other_username = users[0].fullname;
                    conversations[i].other_user_img = users[0].img;
                    conversations[i].other_user_email = users[0].email;
                    conversations[i].other_user_phone = users[0].phone_no;
                }
            }
        }
        
        return res.status(200).send({status: 'ok', msg: 'Success', count: conversations.length, conversations});
        
    }catch(e){
        console.log(e);
        return res.status(400).json({status: 'error', msg: e});
    }

});


// check if a conversation exists already between the admin and the user
router.post('/check_convers', async (req, res) => {
    const {token, receiver_id} = req.body;
    console.log(req.body);

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