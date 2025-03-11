const express = require('express');
const jwt = require('jsonwebtoken');

const Admin = require('../models/admin');
const Delivery = require('../models/delivery');
const Delivery_agent = require('../models/delivery_agent');
const Notification = require('../models/notification');
const User = require('../models/user');

const { sendNotificationToDevice } = require('../controllers/push_notification_controller');

const { FsDeliveryRequest } = require('../services/firebase_service_config');

const router = express.Router();

//importing 'node-fetch' module
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Endpoint to view all deliveries
router.post('/all_deliveries', async (req, res) => {
    const { token, pageCount, resultPerPage } = req.body;

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

        let all_deliveries = await Delivery.find({
            $or: [
                { 'delivery_type': 'instant' },
                { 'delivery_type': 'scheduled' }
            ]
        })
            .select(['sender_id', '_id', 'delivery_agent_img', 'sender_fullname', 'sender_phone_no', 'delivery_agent_name', 'parcel_code', 'delivery_type', 'timestamp', 'delivery_status'])
            .sort({ timestamp: -1 })
            .limit(resultPerPage)
            .skip(page * resultPerPage)
            .lean();

        let countAllDeliveries = await Delivery.find({
            $or: [
                { 'delivery_type': 'instant' },
                { 'delivery_type': 'scheduled' }
            ]
        }).select(['_id']).lean();

        let count = countAllDeliveries.length;

        if (count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No deliveries available yet' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, all_deliveries });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view all instant deliveries
router.post('/instant_deliveries', async (req, res) => {
    const { token, pageCount, resultPerPage } = req.body;

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

        let instant_deliveries = await Delivery.find({
            delivery_type: 'instant'
        })
            .select(['sender_fullname', 'delivery_status', 'sender_phone_no', 'delivery_agent_name', 'parcel_code', 'delivery_type', 'timestamp'])
            .sort({ timestamp: -1 })
            .limit(resultPerPage)
            .skip(page * resultPerPage)
            .lean();

        let countInstantDeliveries = await Delivery.find({
            delivery_type: 'instant'
        }).select(['_id']).lean();

        let count = countInstantDeliveries.length;

        if (count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No instant deliveries available yet' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, instant_deliveries });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view all scheduled deliveries
router.post('/scheduled_deliveries', async (req, res) => {
    const { token, pageCount, resultPerPage } = req.body;

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

        let scheduled_deliveries = await Delivery.find({
            delivery_type: 'scheduled'
        })
            .select(['sender_fullname', 'sender_phone_no', 'delivery_agent_name', 'parcel_code', 'delivery_type', 'timestamp', 'delivery_status'])
            .sort({ timestamp: -1 })
            .limit(resultPerPage)
            .skip(page * resultPerPage)
            .lean();

        let countScheduledDeliveries = await Delivery.find({
            delivery_type: 'scheduled'
        }).select(['_id']).lean();

        let count = countScheduledDeliveries.length;

        if (count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No scheduled deliveries available yet' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, scheduled_deliveries });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view all pending deliveries
router.post('/pending_deliveries', async (req, res) => {
    const { token, pageCount, resultPerPage } = req.body;

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

        let pending_deliveries = await Delivery.find({
            'delivery_status.is_accepted': true,
            'delivery_status.is_started': false,
            'delivery_status.is_cancelled': false
        })
            .select(['sender_fullname', 'sender_phone_no', 'delivery_agent_name', 'parcel_code', 'delivery_type', 'timestamp', 'delivery_status'])
            .limit(resultPerPage)
            .skip(page * resultPerPage)
            .lean();

        let countPendingDeliveries = await Delivery.find({
            'delivery_status.is_accepted': true,
            'delivery_status.is_started': false,
            'delivery_status.is_cancelled': false
        }).select(['_id']).lean();

        let count = countPendingDeliveries.length;

        if (count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No pending deliveries available at the moment' });
        }

        return res.status(200).send({ status: 'error', msg: 'Success', count, pending_deliveries });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view all ongoing deliveries
router.post('/ongoing_deliveries', async (req, res) => {
    const { token, pageCount, resultPerPage } = req.body;

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

        let ongoing_deliveries = await Delivery.find({
            'delivery_status.is_started': true,
            'delivery_status.is_completed': false
        })
            .select(['sender_fullname', 'sender_phone_no', 'delivery_agent_name', 'parcel_code', 'delivery_type', 'timestamp', 'delivery_status'])
            .limit(resultPerPage)
            .skip(page * resultPerPage)
            .lean();

        let countOngoingDeliveries = await Delivery.find({
            'delivery_status.is_started': true,
            'delivery_status.is_completed': false
        }).select(['_id']).lean();

        let count = countOngoingDeliveries.length;

        if (count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No ongoing deliveries available at the moment' });
        }

        return res.status(200).send({ status: 'error', msg: 'Success', count, ongoing_deliveries });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view cancelled deliveries
router.post('/cancelled_deliveries', async (req, res) => {
    const { token, pageCount, resultPerPage } = req.body;

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

        let cancelled_deliveries = await Delivery.find({ 'delivery_status.is_cancelled': true })
            .sort({ timestamp: -1 })
            .select(['sender_fullname', 'sender_phone_no', 'parcel_code', 'delivery_agent_name', 'delivery_agent_phone_no', 'delivery_type', 'timestamp', 'delivery_status'])
            .limit(resultPerPage)
            .skip(page * resultPerPage)
            .lean();

        let countCancelledDeliveries = await Delivery.find({ 'delivery_status.is_cancelled': true }).select(['_id']).lean();

        let count = countCancelledDeliveries.length;

        if (count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No cancelled deliveries available' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, cancelled_deliveries });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view user cancelled deliveries
router.post('/user_cancelled_deliveries', async (req, res) => {
    const { token, pageCount, resultPerPage } = req.body;

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

        let cancelled_deliveries = await Delivery.find({ 'delivery_status.is_cancelled': true, 'delivery_status.is_cancelled_by': 'user' })
            .sort({ timestamp: -1 })
            .select(['sender_fullname', 'sender_phone_no', 'parcel_code', 'delivery_agent_name', 'delivery_agent_phone_no', 'delivery_type', 'timestamp', 'delivery_status', 'is_refunded'])
            .limit(resultPerPage)
            .skip(page * resultPerPage)
            .lean();

        let countCancelledDeliveries = await Delivery.find({ 'delivery_status.is_cancelled': true }).select(['_id']).lean();

        let count = countCancelledDeliveries.length;

        if (count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No cancelled deliveries available' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, cancelled_deliveries });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view delivery agent cancelled deliveries
router.post('/delivery_agent_cancelled_deliveries', async (req, res) => {
    const { token, pageCount, resultPerPage } = req.body;

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

        let cancelled_deliveries = await Delivery.find({ 'delivery_status.is_cancelled': true, 'delivery_status.is_cancelled_by': 'delivery agent' })
            .sort({ timestamp: -1 })
            .select(['sender_fullname', 'sender_phone_no', 'parcel_code', 'delivery_agent_name', 'delivery_agent_phone_no', 'delivery_type', 'timestamp', 'delivery_status'])
            .limit(resultPerPage)
            .skip(page * resultPerPage)
            .lean();

        let countCancelledDeliveries = await Delivery.find({ 'delivery_status.is_cancelled': true }).select(['_id']).lean();

        let count = countCancelledDeliveries.length;

        if (count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No cancelled deliveries available' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, cancelled_deliveries });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view completed deliveries
router.post('/completed_deliveries', async (req, res) => {
    const { token, pageCount, resultPerPage } = req.body;

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

        let completed_deliveries = await Delivery.find({ 'delivery_status.is_completed': true })
            .select(['sender_fullname', 'sender_phone_no', 'delivery_agent_name', 'delivery_agent_phone_no', 'delivery_type', 'timestamp', 'delivery_status'])
            .sort({ timestamp: -1 })
            .limit(resultPerPage)
            .skip(page * resultPerPage)
            .lean();

        let countCompletedDeliveries = await Delivery.find({ 'delivery_status.is_completed': true }).select(['_id']).lean();

        let count = countCompletedDeliveries.length;

        if (count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No completed deliveries available' });
        }

        return res.status(200).send({ status: 'error', msg: 'Success', count, completed_deliveries });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view all deliveries cancelled by delivery_agents
router.post('/cancelled_deliveries_by_agents', async (req, res) => {
    const { token, pageCount, resultPerPage } = req.body;

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

        let cancelled_deliveries = await Delivery.find({
            'delivery_status.is_cancelled': true,
            'delivery_status.is_cancelled_by': 'delivery agent'
        })
            .sort({ timestamp: -1 })
            .select(['sender_fullname', 'sender_phone_no', 'delivery_agent_name', 'delivery_agent_phone_no', 'parcel_code', 'timestamp', 'delivery_status'])
            .limit(resultPerPage)
            .skip(page * resultPerPage)
            .lean();

        let countCancelledDeliveries = await Delivery.find({
            'delivery_status.is_cancelled': true,
            'delivery_status.is_cancelled_by': 'delivery agent'
        }).select(['_id']).lean();

        let count = countCancelledDeliveries.length;

        if (count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No cancelled deliveries by agents available' });
        }

        return res.status(200).send({ status: 'error', msg: 'Success', count, cancelled_deliveries });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view delivery history for a user
router.post('/user_deliveries', async (req, res) => {
    const { token, user_id, pageCount, resultPerPage } = req.body;

    if (!token || !user_id || !pageCount || !resultPerPage) {
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

        let user_deliveries = await Delivery.find({ sender_id: user_id })
            .select(['parcel_name', 'delivery_status', 'delivery_type', 'timestamp', 'delivery_cost_user'])
            .sort({ timestamp: -1 })
            .limit(resultPerPage)
            .skip(page * resultPerPage)
            .lean();

        let countUserDeliveries = await Delivery.find({ sender_id: user_id }).select(['_id']).lean();

        let count = countUserDeliveries.length;

        if (count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No deliveries available' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, user_deliveries });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view a specific delivery
router.post('/delivery', async (req, res) => {
    const { token, delivery_id } = req.body;

    if (!token || !delivery_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let delivery = await Delivery.findOne({ _id: delivery_id }).lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', delivery });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view recent delivery requests based on the 2 minute time range
router.post('/recent_requests', async (req, res) => {
    const { token, pageCount, resultPerPage } = req.body;

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

        const currentTime = Date.now();
        const twoMinutesAgo = currentTime - 2 * 60 * 1000;

        let recent_requests = await Delivery.find({
            'delivery_status.is_started': false,
            'delivery_status.timed_out': false,
            'delivery_status.is_cancelled': false,
            'order_expiry': { $gte: currentTime },
            'order_placed_at': { $gte: twoMinutesAgo }
        })
            .select(['sender_fullname', 'sender_phone_no', 'delivery_agent_name', 'delivery_agent_phone_no', 'delivery_type', 'timestamp', 'delivery_status'])
            .sort({ order_placed_at: -1 })
            .limit(resultPerPage)
            .skip(page * resultPerPage)
            .lean();

        if (recent_requests.length == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No recent delivery requests available' });
        }
        console.log('Recent requests:', recent_requests);

        return res.status(200).send({ status: 'ok', msg: 'Success', count: recent_requests.length, recent_requests });
    } catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});


// Endpoint to assign delivery to a delivery agent
router.post('/assign_delivery', async (req, res) => {
    const { token, delivery_agent_id, delivery_id } = req.body;

    console.log('>>>>>>> Request >>>>>>>');
    console.log(token, delivery_agent_id, delivery_id)
    console.log('>>>>>>> Request >>>>>>>');


    if (!token || !delivery_agent_id || !delivery_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        // Making a request to accept_delivery endpoint in delivery agent route

        // Fetching delivery agent details
        let delivery_agent = await Delivery_agent.findOne({ _id: delivery_agent_id }).lean();

        let fleet_manager;

        if (delivery_agent.delivery_agent_type == 'fleet manager') {
            fleet_manager = true
        }

        else {
            fleet_manager = false
        }

        // Fetching delivery details
        let delivery = await Delivery.findOne({ _id: delivery_id }).lean();

        const url = "https://serverpickload.wl.r.appspot.com/delivery_agent_delivery/accept_delivery";

        const options = {
            method: "POST",

            body: JSON.stringify({
                admin_id: admin._id,
                delivery_agent_id: delivery_agent_id,
                delivery_id: delivery_id,
                notification_id: delivery.delivery_accept_request_notification_id,
                vehicle_details: delivery_agent.vehicle_details,
                img_url: delivery_agent.img_url,
                img_id: delivery_agent.img_id,
                fullname: delivery_agent.fullname,
                delivery_agent_code: delivery_agent.delivery_agent_code,
                is_fleet_manager: fleet_manager,
                delivery_type: delivery.delivery_type
            }),

            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json, text/plain, */*"
            }
        }

        let response = await fetch(url, options);
        response = await response.json();

        // if(response.msg == `your account is ${delivery_agent.status}`) {
        //     return res.status(400).send({ status: 'error', msg: `The agent you are trying to assign this delivery to is ${delivery_agent.status}`})
        // }

        // else if(response.msg == `Delivery Request not found`) {
        //     return res.status(400).send({ status: 'error', msg: `The delivery you are tying to assign does not exist`})
        // }

        // else if(response.msg == 'Delivery timed out') {
        //     return res.status(400).send({ status: 'error', msg: 'This delivery is timed out'})
        // }

        // else if(response.msg == 'User payment timed out') {
        //     return res.status(400).send({ status: 'error', msg: 'User payment for this delivery timed out'})
        // }

        // else if(response.msg == 'delivery has been accepted by another delivery agent') {
        //     return res.status(400).send({ status: 'error', msg: 'This delivery has been accepted already'})
        // }

        // else if(response.msg == 'Delivery accepted successfully') {
        //     return res.status(200).send({ status: 'ok', msg: 'Delivery successfully assigned'})
        // }

        // else if(response.msg == 'all fields must be filled') {
        //     return res.status(400).send({ status: 'error', msg: 'accept delivery endpoint is not receiving all it\'s required fields'})
        // }

        // else {
        //     return res.status(400).send({ status: 'error', msg: 'Internal error'})
        // }

        let message = response.msg;
        let statusCode, status, statusMessage;

        switch (message) {
            case 'all fields must be filled':
                statusCode = 400, status = 'error', statusMessage = 'accept delivery endpoint is not receiving all it\'s required fields'
                break;

            case `your account is ${delivery_agent.status}`:
                statusCode = 400, status = 'error', statusMessage = 'The agent you are trying to assign this delivery to is ${delivery_agent.status}'
                break;

            case `Delivery Request not found`:
                statusCode = 400, status = 'error', statusMessage = 'The delivery you are tying to assign does not exist'
                break;

            case 'Delivery timed out':
                statusCode = 400, status = 'error', statusMessage = 'This delivery is timed out'
                break;

            case 'User payment timed out':
                statusCode = 400, status = 'error', statusMessage = 'User payment for this delivery timed out'
                break;

            case 'delivery has been accepted by another delivery agent':
                statusCode = 400, status = 'error', statusMessage = 'This delivery has been accepted already'
                break;

            case 'Delivery accepted successfully':
                statusCode = 200, status = 'ok', statusMessage = 'Delivery successfully assigned'
                break;

            default:
                statusCode = 400, status = 'error', statusMessage = message;
                break;
        }

        const timestamp = Date.now();
        if (statusCode == 200) {

            // send notification to delivery agent
            let notification = new Notification;

            notification.noti_type = 'system_message';
            notification.content = `Pickload: A pickup request has been assigned to you`;
            notification.user_name = 'Pickload';
            notification.sender_id = admin._id;
            notification.sender_img_url = ''; // add a url to pickload icon
            notification.read = false;
            notification.receiver_ids = [delivery_agent_id];
            notification.timestamp = timestamp;
            notification.is_deleted = false;

            notification = await notification.save();

            const subTitle = `Pickload: A pickup request has been assigned to you`;
            setTimeout(handleNotification, 1000, delivery_agent_id, '', process.env.APP_NAME, subTitle, notification);

            console.log(status, statusMessage, delivery, delivery_agent);
            return res.status(statusCode).send({ status: status, msg: statusMessage, delivery, delivery_agent })
        }

        else {
            console.log(status, statusMessage);
            return res.status(statusCode).send({ status: status, msg: statusMessage })
        }

        //response = await response.json();
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});


// endpoint to fire when delivery times out after a delivery agent accepts it
router.post('/force_delivery_timeout', async (req, res) => {
    const { token, delivery_id, user_id } = req.body;

    // check for required fields
    if (!token || !delivery_id || !user_id)
        return res.status(400).send({ status: 'error', msg: 'All fields must be filled' });

    try {

        const timestamp = Date.now()
        // verify token
        const user = jwt.verify(token, process.env.JWT_SECRET);

        const delivery = await Delivery.findOneAndUpdate(
            { _id: delivery_id },
            { 'delivery_status.timed_out': true },
            { new: true }
        ).lean();
        console.log('>>>>>>>Delivery Part of things >>>>>>');

        console.log(delivery);


        // update data on firestore
        await FsDeliveryRequest.doc(delivery_id.toString()).update({
            timed_out: true,
            user_payment_timed_out: true
        });

        let notification = new Notification;

        notification.noti_type = 'timed_out';
        notification.delivery_id = delivery._id;
        notification.user_id = user_id;
        notification.to_id = '';
        notification.delivery_agent_ids = [delivery.delivery_agent_id];
        notification.parcel_code = delivery.parcel_code;
        notification.content = `Delivery request for ${delivery.parcel_name} timed out`;
        notification.user_name = delivery.sender_fullname;
        notification.delivery_agent_name = '';
        notification.delivery_agent_img = '';
        notification.delivery_agent_img_id = '';
        notification.is_accepted = false;
        notification.timestamp = timestamp;

        notification = await notification.save();


        // get delivery agent device token
        const singleDelAgent = await Delivery_agent.findOne({ _id: delivery.delivery_agent_id }).lean();

        const subTitle = `Delivery request for ${delivery.parcel_name} timed out`;
        setTimeout(handleNotification2, 1000, false, delivery.delivery_agent_id, delivery.imgs[0], process.env.APP_NAME, subTitle, notification, [singleDelAgent.device_token], singleDelAgent.os_type);

        return res.status(200).send({ status: 'ok', msg: 'Delivery timed out successfully' });

    } catch (e) {
        console.log(e);
        return res.status(403).send({ status: 'error', msg: 'Some error occurred', e });
    }
});

// endpoint to fire a max time out delivery for a delivery agent after the delivery has been accepted
router.post('/max_timeout_delivery', async (req, res) => {
    const { token, delivery_agent_id } = req.body;

    if (!token || !delivery_agent_id) {
        return res.status(400).send({ status: 'error', msg: 'Token and delivery agent ID are required' });
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);

        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        const twoDaysAgoISO = twoDaysAgo.toISOString();


        console.log('<<<<< Start Debugging >>>>>');
        console.log('delivery_agent_id:', delivery_agent_id);
        console.log('twoDaysAgo:', twoDaysAgoISO);

        // Fetch all deliveries for this agent to debug
        // const agentDeliveries = await FsDeliveryRequest
        //     .where('delivery_agent_id', '==', delivery_agent_id.toString())
        //     .get();

        // console.log('Total documents for agent:', agentDeliveries.size);
        // agentDeliveries.forEach(doc => {
        //     const data = doc.data();
        //     console.log('Document ID:', doc.id, 'Data:', data);
        // });

        // Main query for timeout deliveries
        const delivery_in_firebase = await FsDeliveryRequest
            .where('delivery_agent_id', '==', delivery_agent_id.toString())
            .where('created_at', '<', twoDaysAgoISO)
            .orderBy('created_at', 'desc')
            .get();

        console.log('Filtered documents (older than 2 days):', delivery_in_firebase.size);

        if (delivery_in_firebase.empty) {
            return res.status(400).send({ status: 'error', msg: 'No deliveries found for this agent' });
        }

        let updatedApplied = 0;

        const update = delivery_in_firebase.docs.map(async (doc) => {
            const delivery = doc.data();

            console.log('Checking delivery:', delivery.delivery_id);
            console.log('timed_out:', delivery.timed_out, 'user_payment_timed_out:', delivery.user_payment_timed_out);

            if (!delivery.timed_out || !delivery.user_payment_timed_out) {
                console.log('Updating delivery:', delivery.delivery_id);

                await FsDeliveryRequest.doc(doc.id).update({
                    timed_out: true,
                    user_payment_timed_out: true
                });

                await Delivery.findOneAndUpdate(
                    { _id: delivery.delivery_id },
                    {
                        'delivery_status.timed_out': true,
                    },
                    { new: true }
                );

                updatedApplied++;
            }
        });

        await Promise.all(update);

        console.log('Total deliveries updated:', updatedApplied);

        return res.status(200).send({
            status: 'success',
            msg: updatedApplied > 0
                ? `${updatedApplied} deliveries updated successfully`
                : `No updates were necessary`
        });

    } catch (error) {
        console.error('Error occurred:', error);
        return res.status(500).send({ status: 'error', msg: 'An error occurred', error });
    }
});



const handleNotification = async (receiver_id, img, notiTitle, notiSubtitle, notificationData, notiType) => {
    const deliveryAgent = await Delivery_agent.findOne({ _id: receiver_id }).lean();
    sendNotificationToDevice(false, [deliveryAgent.device_token], img, notiTitle, notiSubtitle, notificationData, notiType || "");
}

const handleNotification2 = async (toUser, receiver_id, img, notiTitle, notiSubtitle, notificationData, agent_device_tokens, os_type, notiType) => {
    // console.log('here', agent_device_tokens, img);
    let user;
    if (toUser == true) {
        user = await User.findOne({ _id: receiver_id }).lean();
    }
    sendNotificationToDevice(toUser, toUser == true ? [user.device_token] : agent_device_tokens, img, notiTitle, notiSubtitle, notificationData, os_type, "order");
}
module.exports = router