const express = require('express');
const jwt = require('jsonwebtoken');

const Admin = require('../models/admin');
const User = require('../models/user');
const Delivery_agent = require('../models/delivery_agent');
const Statistics = require('../models/statistics');

const { FsDeliveryAgent, FsUser, FsStatistics, FieldValue } = require('../services/firebase_service_config');

const router = express.Router();

// Endpoint to delete a user
router.post('/delete_user', async (req, res) => {
    const { token, user_id } = req.body;

    if (!token || !user_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let user = await User.findOne({ _id: user_id }).lean();

        if (user.is_deleted == true) {
            return res.status(400).send({ status: 'error', msg: 'User is already deleted' });
        }

        user = await User.findOneAndUpdate(
            { _id: user_id, is_deleted: false },
            { $set: { phone_no: `${user.phone_no}_deleted_${Date.now()}`, is_deleted: true } },
            { new: true }
        ).lean();

        // Update statistics document
        await Statistics.updateOne(
            { doc_type: 'admin' },
            {
                $inc: { no_of_users: -1, no_of_active_users: -1 }
            },
            { upsert: true }
        );

        await FsStatistics.doc('statistics').update({
            no_of_users: FieldValue.increment(-1),
            no_of_active_users: FieldValue.increment(-1)
        });

        await FsUser.doc(user_id.toString()).update({
            is_deleted: true
        });

        return res.status(200).send({ status: 'error', msg: 'success', user });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to delete a delivery_agent
router.post('/delete_delivery_agent', async (req, res) => {
    const { token, delivery_agent_id } = req.body;

    if (!token || !delivery_agent_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let delivery_agent = await Delivery_agent.findOne({ _id: delivery_agent_id }).lean();

        if (delivery_agent.is_deleted == true) {
            return res.status(400).send({ status: 'error', msg: 'Agent is already deleted' });
        }

        delivery_agent = await Delivery_agent.findOneAndUpdate(
            { _id: delivery_agent_id },
            { is_deleted: true, phone_no: `${delivery_agent.phone_no}_deleted_${Date.now()}` },
            { new: true }
        ).lean();

        // update is_deleted on firestore for normal delivery agent
        await FsDeliveryAgent.doc(delivery_agent_id.toString()).update({ is_deleted: true });

        // Remove from list of agents under flet_manager
        if (delivery_agent.fleet_manager_id != null) {
            let fleet_manager = await Delivery_agent.findOne({ _id: delivery_agent.fleet_manager_id });

            const index = fleet_manager.fleet_manager_delivery_agents.findIndex(agent => agent.delivery_agent_id == delivery_agent_id);

            fleet_manager.fleet_manager_delivery_agents.splice(index, 1);

            // Decreasing fleet_size
            await Delivery_agent.updateOne(
                { _id: delivery_agent.fleet_manager_id },
                { $inc: { fleet_size: -1 } }
            );
        }

        // Update statistics document
        await Statistics.updateOne(
            { doc_type: 'admin' },
            {
                $inc: { no_of_delivery_agents: -1, no_of_active_delivery_agents: -1 }
            },
            { upsert: true }
        );

        await FsStatistics.doc('statistics').update({
            no_of_delivery_agents: FieldValue.increment(-1),
            no_of_active_delivery_agents: FieldValue.increment(-1)
        });

        return res.status(200).send({ status: 'error', msg: 'success', delivery_agent });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to delete a fleet manager
router.post('/delete_fleet_manager', async (req, res) => {
    const { token, fleet_manager_id } = req.body;

    if (!token || !fleet_manager_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        const fleet_manager = await Delivery_agent.findOne({ _id: fleet_manager_id }).lean();

        if (fleet_manager.is_deleted == true) {
            return res.status(400).send({ status: 'error', msg: 'Fleet manager has already been deleted' });
        }

        const fleet_managerM = await Delivery_agent.findOneAndUpdate(
            { _id: fleet_manager_id },
            { is_deleted: true, phone_no: `${fleet_manager.phone_no}_deleted_${Date.now()}`, fleet_name: `${fleet_manager.fleet_name}_deleted` },
            { new: true }
        ).lean();

        // update is_deleted on firestore for fleet manager
        await FsDeliveryAgent.doc(fleet_manager_id.toString()).update({ is_deleted: true });

        // blocking delivery agents under fleet_manager
        let delivery_agents = await Delivery_agent.updateMany(
            { fleet_manager_id: fleet_manager_id },
            { $set: { status: 'blocked', is_blocked_via: 'fleet' } }
        );

        await FsDeliveryAgent.where('fleet_manager_id', '==', fleet_manager_id.toString())
            .get()
            .then(snapshots => {
                if (snapshots.size > 0) {
                    snapshots.forEach(d_agent => {
                        FsDeliveryAgent.doc(d_agent._id).update({ status: 'blocked' });
                    })
                }
            });

        let count = delivery_agents.matchedCount;

        // Update statistics document
        await Statistics.updateOne(
            { doc_type: 'admin' },
            {
                $inc: {
                    no_of_fleet_managers: -1,
                    no_of_active_fleet_managers: -1,
                    no_of_active_delivery_agents: -count,
                    no_of_blocked_delivery_agents: count
                }
            },
            { upsert: true }
        );

        await FsStatistics.doc('statistics').update({
            no_of_fleet_managers: FieldValue.increment(-1),
            no_of_active_fleet_managers: FieldValue.increment(-1),
            no_of_active_delivery_agents: FieldValue.increment(-count),
            no_of_blocked_delivery_agents: FieldValue.increment(count)
        });

        return res.status(200).send({ status: 'error', msg: 'success', fleet_manager: fleet_managerM });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

module.exports = router