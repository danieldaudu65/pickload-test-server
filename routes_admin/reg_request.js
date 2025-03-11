const express = require('express');
const jwt = require('jsonwebtoken');
const Stats = require('../models/statistics');

const Admin = require('../models/admin');
const Delivery_agent = require('../models/delivery_agent');

const {FsDeliveryAgent, FsUser, FsStatistics, FieldValue} = require('../services/firebase_service_config');
const {sendRegRequestAcceptedToDeliveryAgent, sendRegRequestAcceptedToFleetManager, sendRegDeclinedMail} = require('../utils/nodemailer');

const router = express.Router();

// Endpoint to view all registration requests
// Endpoint to view all registration requests
router.post('/reg_requests', async (req, res) => {
    const { token, pageCount, resultPerPage, search } = req.body;

    if (!token || !pageCount || !resultPerPage) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let page = (pageCount > 1) ? pageCount : 1;
        page -= 1;

        // Build the search query
        let query = { approval_status: 'pending', registration_stage: 'four', is_deleted: false };

        if (search) {
            query.name = { $regex: search, $options: 'i' }; // Case-insensitive search
        }

        const delivery_agents = await Delivery_agent.find(query)
            .limit(resultPerPage)
            .skip(page * resultPerPage)
            .lean();

        const count = await Delivery_agent.countDocuments(query);

        if (count === 0) {
            return res.status(200).send({ status: 'ok', msg: 'No registration requests available presently' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, delivery_agents });
    } catch (error) {
        console.log(error);
        return res.status(403).send({ status: 'error', msg: 'Some error occurred', error });
    }
});


// Endpoint to view a specific reqistration request
router.post('/reg_request', async (req, res) => {
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

        // fetch delivery agent document
        let delivery_agent = await Delivery_agent.findOne({ _id: delivery_agent_id }, {
            fullname: 1, phone_no: 1, email: 1, img_url: 1, address: 1, state: 1, gender: 1, vehicle_details: 1, bank_details: 1, city: 1, nin: 1, registration_time: 1, cac_reg_no: 1, company_name: 1
        })
        .lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', delivery_agent });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to accept registration request
router.post('/accept_request', async (req, res) => {
    const { token, delivery_agent_id, gender } = req.body;

    if(!token || !delivery_agent_id || !gender) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    let errorSTATE = "";

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true)  {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let delivery_agent = await Delivery_agent.findOneAndUpdate(
            { _id: delivery_agent_id },
            { approval_status: 'approved', status: 'active', gender },
            { new: true }
        ).lean();

        errorSTATE = "past 1";

        // create firestore delivery_agent document
        await FsDeliveryAgent.doc(delivery_agent_id.toString()).set({
            _id: delivery_agent_id,
            fleet_manager_id: (delivery_agent.fleet_manager_id == undefined) || (delivery_agent.fleet_manager_id == undefined) ? '' : delivery_agent.fleet_manager_id,
            loca_long: '111',
            loca_lat: '111',
            state: (delivery_agent.state == undefined) || (delivery_agent.state == undefined) ? '' : delivery_agent.state,
            city: (delivery_agent.city == undefined) || (delivery_agent.city == undefined) ? '' : delivery_agent.city,
            vehicle_type: delivery_agent.vehicle_details.type,
            device_token: '',
            is_online: false,
            is_available_for_work: true,
            is_deleted: false,
            is_blocked: false,
            os_type: '',
            status: 'active',
            fullname: delivery_agent.fullname,
            img_url: delivery_agent.img_url
        });

        errorSTATE = "past 2";

        await FsUser.doc(delivery_agent_id.toString()).set({
            _id: delivery_agent_id,
            is_calling: false,
            is_online: false,
            call_in_progress: false,
            token: '',
            channel_name: '',
            fullname: delivery_agent.fullname,
            img_url: delivery_agent.img_url,
            designation: 'delivery_agent',
            is_deleted: false,
            is_blocked: false,
        });

        errorSTATE = "past 3";

        // update fleet manager document if the delivery agent is under one
        if(delivery_agent.fleet_manager_id !== "" && delivery_agent.delivery_agent_type !== 'fleet manager') {
            let agent_detail = {
                delivery_agent_id: delivery_agent_id,
                img_url: delivery_agent.img_url,
                fullname: delivery_agent.fullname,
                ratings: delivery_agent.ratings,
                no_successful_deliveries: delivery_agent.no_successful_deliveries,
                vehicle_type: delivery_agent.vehicle_details.type
            }

            let vehicleKey = `fleet_manager_vehicles.no_of_${delivery_agent.vehicle_details.type}s`;
            const updateData = {
                'fleet_size': 1
            };
            updateData[vehicleKey] = 1;
            console.log(updateData);

            await Delivery_agent.updateOne(
                { _id: delivery_agent.fleet_manager_id },
                { 
                    $push: { fleet_manager_delivery_agents: agent_detail },
                    $inc: updateData
                }
            );
        }

        errorSTATE = "past 4";


        // update statistics document
        if(delivery_agent.delivery_agent_type === 'delivery agent') {
            await Stats.updateOne(
                {doc_type: 'admin'},
                {'$inc': {no_of_active_delivery_agents: 1, total_pending_registrations: -1}},
                {new: true}
              ).lean();

              await FsStatistics.doc('statistics').update({
                no_of_active_delivery_agents: FieldValue.increment(1), 
                total_pending_registrations: FieldValue.increment(-1)
            });

            // send email
            sendRegRequestAcceptedToDeliveryAgent(delivery_agent.email);

        } else {
            await Stats.updateOne(
                {doc_type: 'admin'},
                {'$inc': {no_of_active_fleet_managers: 1, total_pending_registrations: -1}},
                {new: true}
              ).lean();

              await FsStatistics.doc('statistics').update({
                no_of_active_fleet_managers: FieldValue.increment(1), 
                total_pending_registrations: FieldValue.increment(-1)
            });

            // send email
            sendRegRequestAcceptedToFleetManager(delivery_agent.email);

        }
       

        return res.status(200).send({ status: 'ok', msg: 'Success', delivery_agent });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error, errorSTATE });
    }
});

// Endpoint to decline registration request
router.post('/decline_request', async (req, res) => {
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

        //mrp added this to get the delivery agent email
        let delivery_agent = await Delivery_agent.findOne(
            { _id: delivery_agent_id },
        );


        await Delivery_agent.updateOne({
            _id: delivery_agent_id,
            is_deleted: false,
          }, {
            // phone_no: `declined_${Date.now()}`,
            phone_no: `declined_${Date.now()}`, is_deleted: true
          }, { upsert: true }).lean();

        // update statistcs document accordingly
        await Stats.updateOne(
            {doc_type: 'admin'},
            {'$inc': {total_pending_registrations: -1}},
            {new: true}
          ).lean();

          await FsStatistics.doc('statistics').update({
            total_pending_registrations: FieldValue.increment(-1)
        });

        console.log(`-------> ${delivery_agent.email}`)

        sendRegDeclinedMail(delivery_agent.email);

        return res.status(200).send({ status: 'ok', msg: 'Success'});
    }

    catch(error) {
        console.log(error);
        return res.status(403).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

module.exports = router