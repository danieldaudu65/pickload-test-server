const express = require('express');
const jwt = require('jsonwebtoken');

const Admin = require('../models/admin');
const User = require('../models/user');
const Delivery_agent = require('../models/delivery_agent');
const Statistics = require('../models/statistics');
const {FsDeliveryAgent, FsStatistics, FieldValue, FsUser} = require('../services/firebase_service_config');


const router = express.Router();

// Endpoint to block a user
router.post('/block_user', async (req, res) => {
    const { token, user_id } = req.body;

    if(!token || !user_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();


        let user = await User.findOne({ _id: user_id }).lean();

        if(!user) {
            return res.status(400).send({ status: 'error', msg: 'Cannot find user' });
        }

        // Checking if user has been blocked
        if(user.account_status == 'blocked') {
            return res.status(400).send({ status: 'error', msg: 'Account is already blocked, cannot block a user twice bruv, lol' });
        }

        user = await User.findOneAndUpdate(
            { _id: user_id },
            { account_status: 'blocked', is_blocked: true },
            { new: true }
        ).lean();

        // Update statistics document
        await Statistics.updateOne(
            { doc_type: 'admin' },
            {
                $inc: { no_of_active_users: -1, no_of_blocked_users: 1 }
            },
            { upsert: true }
        );

        await FsStatistics.doc('statistics').update({
            no_of_active_users: FieldValue.increment(-1), 
            no_of_blocked_users: FieldValue.increment(1)
        });

        await FsUser.doc(user_id.toString()).update({
            is_blocked: true
        });

        return res.status(200).send({ status: 'error', msg: 'Successfully blocked user, happy now?', user });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to unblock a user
router.post('/unblock_user', async (req, res) => {
    const { token, user_id } = req.body;

    if(!token || !user_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let user = await User.findOne({ _id: user_id }).lean();

        if(!user) {
            return res.status(400).send({ status: 'error', msg: 'Cannot find user' });
        }

        // Checking if user has been blocked
        if(user.account_status == 'active') {
            return res.status(400).send({ status: 'error', msg: 'Sorry dear, the user you\'re trying to unblock is in fact, not blocked' });
        }

        user = await User.findOneAndUpdate(
            { _id: user_id },
            { account_status: 'active', is_blocked: false },
            { new: true }
        ).lean();

        // Update statistics document
        await Statistics.updateOne(
            { doc_type: 'admin' },
            {
                $inc: { no_of_active_users: 1, no_of_blocked_users: -1 }
            },
            { upsert: true }
        );

        await FsStatistics.doc('statistics').update({
            no_of_active_users: FieldValue.increment(1), 
            no_of_blocked_users: FieldValue.increment(-1)
        });

        await FsUser.doc(user_id.toString()).update({
            is_blocked: false
        });

        return res.status(200).send({ status: 'error', msg: 'Oh yeah!! you\'ve successfully unblocked that user. Let\'s hope he\'ll be of good behaviour from now on', user });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to block a delivery_agent
router.post('/block_delivery_agent', async (req, res) => {
    const { token, delivery_agent_id } = req.body;

    if(!token || !delivery_agent_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let delivery_agent = await Delivery_agent.findOne({ _id: delivery_agent_id }).select([ 'status' ]).lean();

        // Checking if delivery_agent has been blocked
        if(delivery_agent.status == 'blocked') {
            return res.status(400).send({ status: 'error', msg: 'Account is already blocked, cannot block a delivery_agent twice bruv, lol' });
        }

        delivery_agent = await Delivery_agent.findOneAndUpdate(
            { _id: delivery_agent_id },
            { status: 'blocked', is_blocked_via: 'agent', is_blocked: true },
            { new: true }
        ).lean();

        // Update statistics document
        await Statistics.updateOne(
            { doc_type: 'admin' },
            {
                $inc: { no_of_active_delivery_agents: -1, no_of_blocked_delivery_agents: 1 }
            },
            { upsert: true }
        );

        await FsStatistics.doc('statistics').update({
            no_of_active_delivery_agents: FieldValue.increment(-1), 
            no_of_blocked_delivery_agents: FieldValue.increment(1)
        });

        // update status on firestore
        await FsDeliveryAgent.doc(delivery_agent_id.toString()).update({status: 'blocked', is_blocked: true});

        return res.status(200).send({ status: 'error', msg: 'Successfully blocked delivery_agent, happy now?', delivery_agent });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to unblock a delivery_agent
router.post('/unblock_delivery_agent', async (req, res) => {
    const { token, delivery_agent_id } = req.body;

    if(!token || !delivery_agent_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let delivery_agent = await Delivery_agent.findOne({ _id: delivery_agent_id }).select([ 'status' ]).lean();

        // Checking if delivery_agent has been blocked
        if(delivery_agent.status == 'Active') {
            return res.status(400).send({ status: 'error', msg: 'Sorry dear, the delivery_agent you\'re trying to unblock is in fact, not blocked' });
        }

        delivery_agent = await Delivery_agent.findOneAndUpdate(
            { _id: delivery_agent_id },
            { status: 'active', is_blocked_via: null, is_blocked: false },
            { new: true }
        ).lean();

        // Update statistics document
        await Statistics.updateOne(
            { doc_type: 'admin' },
            {
                $inc: { no_of_active_delivery_agents: 1, no_of_blocked_delivery_agents: -1 }
            },
            { upsert: true }
        );

        await FsStatistics.doc('statistics').update({
            no_of_active_delivery_agents: FieldValue.increment(1), 
            no_of_blocked_delivery_agents: FieldValue.increment(-1)
        });

        // update status on firestore
        await FsDeliveryAgent.doc(delivery_agent_id.toString()).update({status: 'active', is_blocked: false});

        return res.status(200).send({ status: 'error', msg: 'Oh yeah!! you\'ve successfully unblocked that agent. Let\'s hope he\'ll be of good behaviour from now on', delivery_agent });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to block a fleet manager
router.post('/block_fleet_manager', async (req, res) => {
    const { token, fleet_manager_id } = req.body;

    if(!token || !fleet_manager_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let fleet_manager = await Delivery_agent.findOne({ _id: fleet_manager_id }).select([ 'status' ]).lean();

        // Checking if fleet manager has been blocked
        if(fleet_manager.status == 'blocked') {
            return res.status(400).send({ status: 'error', msg: 'Account is already blocked, cannot block a fleet manager twice bruv, lol' });
        }

        fleet_manager = await Delivery_agent.findOneAndUpdate(
            { _id: fleet_manager_id },
            { status: 'blocked' },
            { new: true }
        ).lean();

        // blocking delivery agents under fleet_manager
        let delivery_agents = await Delivery_agent.updateMany(
            { fleet_manager_id: fleet_manager_id, status: 'active' },
            { $set: { status: 'blocked', is_blocked_via: 'fleet' } }
        );

        let count = delivery_agents.matchedCount;

        // Update statistics document
        await Statistics.updateOne(
            { doc_type: 'admin' },
            {
                $inc: {
                    no_of_active_fleet_managers: -1,
                    no_of_blocked_fleet_managers: 1,
                    no_of_active_delivery_agents: -count,
                    no_of_blocked_delivery_agents: count
                }
            },
            { upsert: true }
        );

        await FsStatistics.doc('statistics').update({
            no_of_active_fleet_managers: FieldValue.increment(-1), 
            no_of_blocked_fleet_managers: FieldValue.increment(1),
            no_of_active_delivery_agents: FieldValue.increment(-count), 
            no_of_blocked_delivery_agents: FieldValue.increment(count)
        });

        //update status on firestore
        await FsDeliveryAgent.doc(fleet_manager_id.toString()).update({status: 'blocked'});

        await FsDeliveryAgent.where('fleet_manager_id', '==', fleet_manager_id.toString())
            .get()
            .then(snapshots => {
                if(snapshots.size > 0){
                    snapshots.forEach(d_agent => {
                        FsDeliveryAgent.doc(d_agent.data()._id).update({status: 'blocked'});
                    })
                }
            });
        

        return res.status(200).send({ status: 'error', msg: 'Successfully blocked fleet manager, happy now?', fleet_manager });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to unblock a fleet manager
router.post('/unblock_fleet_manager', async (req, res) => {
    const { token, fleet_manager_id } = req.body;

    if(!token || !fleet_manager_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);
        
        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let fleet_manager = await Delivery_agent.findOne({ _id: fleet_manager_id }).select([ 'status' ]).lean();

        // Checking if fleet manager has been blocked
        if(fleet_manager.status == 'active') {
            return res.status(400).send({ status: 'error', msg: 'Sorry dear, the fleet manager you\'re trying to unblock is in fact, not blocked' });
        }

        fleet_manager = await Delivery_agent.findOneAndUpdate(
            { _id: fleet_manager_id },
            { status: 'active' },
            { new: true }
        ).lean();
        
        // unblocking delivery agents under fleet_manager
        let delivery_agents = await Delivery_agent.updateMany(
            { fleet_manager_id: fleet_manager_id, is_blocked_via: 'fleet' },
            { $set: { status: 'active', is_blocked_via: null } }
        );

        let count = delivery_agents.matchedCount;

        // Update statistics document
        await Statistics.updateOne(
            { doc_type: 'admin' },
            {
                $inc: {
                    no_of_active_fleet_managers: 1,
                    no_of_blocked_fleet_managers: -1,
                    no_of_active_delivery_agents: count,
                    no_of_blocked_delivery_agents: -count
                }
            },
            { upsert: true }
        );

        await FsStatistics.doc('statistics').update({
            no_of_active_fleet_managers: FieldValue.increment(1), 
            no_of_blocked_fleet_managers: FieldValue.increment(-1),
            no_of_active_delivery_agents: FieldValue.increment(count), 
            no_of_blocked_delivery_agents: FieldValue.increment(-count)
        });

        // update status on firestore
        await FsDeliveryAgent.doc(fleet_manager_id.toString()).update({status: 'active'});

        await FsDeliveryAgent.where('fleet_manager_id', '==', fleet_manager_id.toString())
            .get()
            .then(snapshots => {
                if(snapshots.size > 0){
                    snapshots.forEach(d_agent => {
                        FsDeliveryAgent.doc(d_agent.data()._id).update({status: 'active'});
                    })
                }
            });

        return res.status(200).send({ status: 'error', msg: 'Successfully unblocked fleet manager', fleet_manager });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});
 
module.exports = router