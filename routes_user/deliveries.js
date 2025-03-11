const express = require('express');
const jwt = require('jsonwebtoken');
const cloudinary = require('../utils/cloudinary');
const upload = require('../utils/multer');
const { FsDeliveryRequest, FsDeliveryAgent, FsStatistics, FieldValue } = require('../services/firebase_service_config');

const Statistics = require('../models/statistics');
const Review = require("../models/review");
// const Percentage = require('../models/percentage');
// const Transaction = require('../models/transaction');
const Notification = require('../models/notification');
const Delivery = require('../models/delivery');
const User = require('../models/user');
const DeliveryAgent = require('../models/delivery_agent');

const router = express.Router();



const { sendNotificationToDevice } = require('../controllers/push_notification_controller');
const getWeekNumber = require('../functions/get_week_no');

const handleNotification = async (toUser, receiver_id, img, notiTitle, notiSubtitle, notificationData, agent_device_tokens, os_type, notiType) => {
    console.log('here', agent_device_tokens);
    let user;
    if (toUser == true) {
        user = await User.findOne({ _id: receiver_id }).lean();
    }
    sendNotificationToDevice(toUser, toUser == true ? [user.device_token] : agent_device_tokens, img, notiTitle, notiSubtitle, notificationData, os_type, "order");
}

// Maximum distance in meters for a delivery agent to get notified of a delivery request
//const MAXIMUM_DISTANCE_METERS = 400;

// function to check wether or not the delivery agent is within a particular distance
/**
 * 
 * @param {latitude of delivery agent} lat1 
 * @param {latitude of pickup location} lat2 
 * @param {longitude of delivery agent} lon1 
 * @param {longitude of pickup location} lon2 
 * @returns true if the delivery agent is within range, returns false if the delivery agent is not wihin range of pickup location
 */
const checkDistance = (lat1, lat2, lon1, lon2, MAXIMUM_DISTANCE_METERS) => {

    // The math module contains a function
    // named toRadians which converts from
    // degrees to radians.
    lon1 = lon1 * Math.PI / 180;
    lon2 = lon2 * Math.PI / 180;
    lat1 = lat1 * Math.PI / 180;
    lat2 = lat2 * Math.PI / 180;

    // Haversine formula
    let dlon = lon2 - lon1;
    let dlat = lat2 - lat1;
    let a = Math.pow(Math.sin(dlat / 2), 2)
        + Math.cos(lat1) * Math.cos(lat2)
        * Math.pow(Math.sin(dlon / 2), 2);

    let c = 2 * Math.asin(Math.sqrt(a));

    // Radius of earth in kilometers. Use 3956
    // for miles
    let r = 6371;

    // calculate the distance in km
    const kmDistance = c * r;
    // calculate distance in m
    const mDistance = kmDistance * 1000;

    if (mDistance <= MAXIMUM_DISTANCE_METERS) {
        return true;
    } else {
        return false;
    }
}

//delivery endpoint
router.post('/new_delivery', upload.array('delivery_files', 5), async (req, res) => {
    const { token, distance, fullname, phone_no, email, delivery_type, delivery_medium, pickup_location, pickup_address, drop_off_address, drop_off_location, reciever_name, reciever_phone_no, parcel_name, parcel_description, delivery_instructions, scheduled_delivery_pickup_timestamp, parcel_type, delivery_cost, state, delivery_agent_id, schParsedDateTime } = req.body;
    let Mnotification = '';

    //Verification of fields
    if (!token || !distance || !fullname || !email || !phone_no || !delivery_type || !delivery_medium || !pickup_location || !pickup_address || !drop_off_address || !drop_off_location || !reciever_name || !reciever_phone_no || !parcel_name || !parcel_description || !delivery_instructions || !parcel_type || !delivery_cost || !state) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be filled' });
    }

    // response for  the request timeout duration
    const response = await fetch('https://serverpickload.wl.r.appspot.com/admin_settings/get_request_timeout_duration');

    if (!response.ok) {
        console.error('Failed to fetch request timeout duration:', response.status, response.statusText);
        return res.status(400).send({ status: 'error', msg: 'Failed to fetch timeout duration' });
    }

    const data = await response.json();
    if (data.status !== 'ok' || !data.request_timeout_duration) {
        console.error('Unexpected request timeout response:', data);
        return res.status(400).send({ status: 'error', msg: 'Invalid timeout duration response' });
    }



    // request for the payment timeout duration

    try {

        //jwt verification
        let user = jwt.verify(token, process.env.JWT_SECRET);

        //uploading file
        let imgs_urls = [];
        let img_ids = [];

        if (req.files) {
            if (req.files.length != 0) {
                for (let i = 0; i < req.files.length; i++) {
                    let result = await cloudinary.uploader.upload(req.files[i].path, { folder: 'delivery_packages', quality: 'auto', fetch_format: "auto" });

                    imgs_urls.push(result.secure_url);
                    img_ids.push(result.public_id);
                }
            }
        }

        const timestamp = Date.now();
        const sUser = await User.findOne({ _id: user._id }).lean();

        //creating new delivery request document
        let parcel_code = Date.now();
        let delivery = new Delivery;

        const drop_off_location_populated = drop_off_location.map((item, index) => ({
            no: item.no || index + 1,
            location: item.location ||  ''
        }))
        const drop_off_address_populated = drop_off_address.map((item, index) => ({
            no: item.no || index + 1,
            location: item.location ||  ''
        }))

        const date = new Date();

        delivery.delivery_type = delivery_type;
        delivery.delivery_medium = delivery_medium;
        //delivery.delivery_code = body;
        delivery.pickup_location = pickup_location;
        delivery.pickup_address = pickup_address;
        delivery.pickup_time = timestamp;
        delivery.day = date.getDate();
        delivery.month = date.getMonth();
        delivery.year = date.getFullYear();
        delivery.drop_off_address = drop_off_address_populated;
        delivery.drop_off_location = drop_off_location_populated;
        delivery.current_location = pickup_location;
        delivery.distance = distance;
        delivery.timestamp = timestamp;
        delivery.reciever_name = reciever_name;
        delivery.reciever_phone_no = reciever_phone_no;
        delivery.incident_report = '';
        delivery.delivery_status.is_accepted = false;
        delivery.delivery_status.is_accepted_at = 0;
        delivery.delivery_status.is_completed = false;
        delivery.delivery_status.is_completed_at = 0;
        delivery.delivery_status.is_successful = false;
        delivery.delivery_status.is_successful_at = 0;
        delivery.delivery_status.is_cancelled = false;
        delivery.delivery_status.is_cancelled_at = 0;
        delivery.delivery_status.scheduled_delivery_pickup_timestamp = delivery_type == 'scheduled' ? scheduled_delivery_pickup_timestamp : 0;
        delivery.delivery_status.is_booked = false;
        delivery.delivery_status.is_paid = false;
        delivery.sender_id = user._id;
        delivery.sender_fullname = fullname;
        delivery.sender_phone_no = phone_no;
        delivery.sender_email = email;
        delivery.sender_img = sUser.img || '';
        delivery.parcel_code = parcel_code.toString();
        delivery.parcel_name = parcel_name;
        delivery.parcel_description = parcel_description;
        delivery.delivery_instructions = delivery_instructions;
        delivery.delivery_cost_user = delivery_cost; // later on estimate the actual delivery cost
        delivery.transaction_id = '';
        delivery.imgs = imgs_urls;
        delivery.img_ids = img_ids;
        delivery.parcel_type = parcel_type;
        delivery.cancel_reason = '';
        delivery.delivery_agent_id = '';
        delivery.delivery_agent_name = '';
        delivery.delivery_agent_vehicle_type = '';
        delivery.delivery_agent_plate_no = '';
        delivery.delivery_agent_phone_no = '';
        delivery.delivery_agent_code = '';
        delivery.delivery_agent_img = '';
        delivery.delivery_agent_img_id = '';
        delivery.delivery_agent_vehicle_imgs_urls = '';
        delivery.delivery_accept_request_notification_id = '';

        delivery.delivery_confirmation_proof_urls = [];
        delivery.delivery_confirmation_proof_ids = [];
        delivery.delivered_in = 0;
        console.log(getWeekNumber(delivery.year, delivery.month, delivery.day));
        delivery.week = getWeekNumber(delivery.year, delivery.month, delivery.day);

        // estimate cost of delivery
        let delivery_cost_delivery_agent;
        const pStats = await Statistics.findOne({ doc_type: 'admin' }).select(['pickload_percent', 'pickup_radius']).lean();

        // console.log(pStats);
        // console.log(delivery);
        let delivery_percentage = pStats.pickload_percent;
        // console.log(delivery.delivery_cost_delivery_agent, delivery_cost, delivery_percentage)

        if (delivery_type == 'instant') {
            delivery_cost_delivery_agent = delivery.delivery_cost_delivery_agent = delivery_cost - ((delivery_percentage / 100) * delivery_cost);
        } else {
            delivery_cost_delivery_agent = delivery.delivery_cost_delivery_agent = delivery_cost - ((delivery_percentage / 100) * delivery_cost);
        }


        // save new delivery
        delivery = await delivery.save();

        //Updating stats on the user document
        user = await User.findOneAndUpdate(
            { _id: user._id },
            {
                "$inc": {
                    "stats.total_delivery_requests": 1,
                    "stats.total_instant_deliveries": delivery_type == 'instant' ? 1 : 0,
                    "stats.total_scheduled_deliveries": delivery_type == 'scheduled' ? 1 : 0
                }
            },
            { new: true }
        ).lean();

        //Updating stats on the statistics document
        await Statistics.updateOne(
            { doc_type: 'admin' },
            {
                $inc: {
                    total_deliveries: 1,
                    total_instant_deliveries: delivery_type == 'instant' ? 1 : 0,
                    total_scheduled_deliveries: delivery_type == 'scheduled' ? 1 : 0
                }
            },
            { upsert: true }
        );


        await FsStatistics.doc('statistics').update({
            total_deliveries: FieldValue.increment(1),
            total_instant_deliveries: FieldValue.increment(delivery_type == 'instant' ? 1 : 0),
            total_scheduled_deliveries: FieldValue.increment(delivery_type == 'scheduled' ? 1 : 0),
        });

        const dynamic_time = data.request_timeout_duration
        const now = new Date();
        const expiresAt = new Date(now.getTime() + dynamic_time * 60 * 1000);



        // create delivery document on firestore
        await FsDeliveryRequest.doc(delivery._id.toString()).set({
            delivery_id: delivery._id.toString(),
            delivery_type: delivery_type,
            delivery_medium: delivery_medium,
            pickup_location: pickup_location,
            pickup_address: pickup_address,
            pickup_time: timestamp,
            drop_off_address: drop_off_address_populated,
            drop_off_location: drop_off_location_populated,
            current_location: pickup_location,
            distance: distance,
            timestamp: timestamp,
            reciever_name: reciever_name,
            reciever_phone_no: reciever_phone_no,
            incident_report: '',
            'delivery_status_is_accepted': false,
            'delivery_status_is_accepted_at': 0,
            'delivery_status_is_started': false,
            'delivery_status_is_started_at': 1,
            'delivery_status_is_completed': false,
            'delivery_status_is_completed_at': 0,
            'delivery_status_is_successful': false,
            'delivery_status_is_successful_at': 0,
            'delivery_status_is_cancelled': false,
            'delivery_status_is_cancelled_at': 0,
            'delivery_status_is_cancelled_by': '',
            'delivery_status_scheduled_delivery_pickup_timestamp': delivery_type == 'scheduled' ? scheduled_delivery_pickup_timestamp : 0,
            'delivery_status_is_booked': false,
            'delivery_status_is_paid': false,
            'delivery_status_arrived_pickup_location': false,
            'delivery_status_arrived_dropoff_location': false,
            'timed_out': false,
            user_payment_timed_out: false,
            sender_id: user._id.toString(),
            sender_img: sUser.img,
            sender_img_id: sUser.img_id,
            sender_fullname: fullname,
            sender_phone_no: phone_no,
            sender_email: email,
            parcel_code: parcel_code.toString(),
            parcel_name: parcel_name,
            parcel_description: parcel_description,
            delivery_instructions: delivery_instructions,
            delivery_cost_user: delivery_cost, // later on estimate the actual delivery cost
            transaction_id: '',
            imgs: imgs_urls,
            img_ids: img_ids,
            parcel_type: parcel_type,
            cancel_reason: '',
            delivery_agent_id: '',
            delivery_agent_name: '',
            delivery_agent_vehicle_type: '',
            delivery_agent_plate_no: '',
            delivery_agent_phone_no: '',
            delivery_agent_code: '',
            delivery_agent_img: '',
            delivery_agent_img_id: '',
            delivery_cost_delivery_agent: delivery_cost_delivery_agent,
            delivery_confirmation_proof_urls: [],
            delivery_confirmation_proof_ids: [],
            delivered_in: 0,

            search_timed_out: false,
            created_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),


            pay_created_at: null,
            pay_expires_at: null,
            pay_timed_out: false,
            status_updated_at: now.toISOString(),

            all_time_out: null
        });


        const search_interval = setInterval(async () => {
            const currentTime = new Date();
            try {
                const deliveryId = delivery._id.toString();
                console.log(deliveryId);

                const deliveryDoc = await FsDeliveryRequest.doc(deliveryId).get();

                if (!deliveryDoc.exists) {
                    console.log(`Delivery with ID ${deliveryId} not found in Firestore.`);
                    clearInterval(payment_interval); // Stop the interval if the delivery doesn't exist
                    return;
                }

                const delivery_fire = deliveryDoc.data();

                // 1. Check if the delivery is not accepted and handle search timeout
                if (!delivery_fire.delivery_status_is_accepted) {
                    if (currentTime >= expiresAt) {
                        await FsDeliveryRequest.doc(deliveryId).update({
                            search_timed_out: true,
                            delivery_status_is_cancelled: false,
                            delivery_status_is_cancelled_at: currentTime,
                            delivery_status_is_cancelled_by: 'user'

                        });
                        console.log(`Search timed out for delivery ${deliveryId}`);
                        clearInterval(search_interval);
                    }
                } else {
                    clearInterval(search_interval);
                }
            } catch (error) {
                console.error(`Error in payment interval: ${error.message}`);
                clearInterval(search_interval);
            }
        }, 1 * 60 * 1000); // Runs every minute


        // Logic for handling the acceptance of the delivery



        // get current location of the delivery agents to send delivery requests notifications to

        //creating arrays for storing delivery agent ids and
        //delivery agents device tokens      

        // delay a 2 minute and then ad to the firebase 

        const agent_ids = [];
        //const agent_device_tokens = [];
        const ios_agents_device_tokens = [];
        const android_agents_device_tokens = [];

        if (delivery_type == 'instant') {
            const snapshot = await FsDeliveryAgent.where('state', '==', state).where('vehicle_type', '==', delivery_medium).where('is_available_for_work', '==', true).where('status', '==', 'active').where('is_deleted', '==', false).get();

            if (snapshot.empty) {
                return res.status(200).send({ status: 'ok', msg: 'No delivery agents found at this time, please try making your request again' });
            }

            snapshot.forEach(doc => {
                const d_agent_lat = parseFloat(doc.data().loca_lat);
                const d_agent_long = parseFloat(doc.data().loca_long);

                const p_loca_lat = parseFloat(pickup_location.split(',')[0]);
                const p_loca_long = parseFloat(pickup_location.split(',')[1]);

                if (checkDistance(d_agent_lat, p_loca_lat, d_agent_long, p_loca_long, pStats.pickup_radius)) {
                    agent_ids.push(doc.data()._id);
                    if (doc.data().os_type == 'iOS' && doc.data().device_token !== "") {
                        console.log(doc.data());
                        ios_agents_device_tokens.push(doc.data().device_token);
                    } else if (doc.data().os_type == 'android' && doc.data().device_token !== "") {
                        console.log("android user found");
                        android_agents_device_tokens.push(doc.data().device_token);
                    }
                }
            });
        } else {
            const dAgent = await DeliveryAgent.findOne({ _id: delivery_agent_id }, { device_token: 1, os_type: 1 }).lean();
            agent_ids.push(delivery_agent_id);
            // if (dAgent.os_type == 'iOS' && dAgent.device_token !== "") {
            //     ios_agents_device_tokens.push(dAgent.device_token);
            // } else if(dAgent.os_type == 'android' && dAgent.device_token !== "") {
            //     android_agents_device_tokens.push(dAgent.device_token);
            // }

            console.log("DEBUG dAgent:", dAgent);

            if (dAgent?.device_token && typeof dAgent.device_token === 'string' && dAgent.device_token.trim() !== "") {
                if (dAgent.os_type === 'iOS') {
                    ios_agents_device_tokens.push(dAgent.device_token);
                } else if (dAgent.os_type === 'android') {
                    android_agents_device_tokens.push(dAgent.device_token);
                }
            }

            // Remove empty values before logging
            console.log('_______++++++++++++++++=============');

            console.log("iOS Tokens:", ios_agents_device_tokens.filter(token => token.trim() !== ""));
            console.log("Android Tokens:", android_agents_device_tokens.filter(token => token.trim() !== ""));
        }


        // create new notification document which will have the agent ids as an array
        if (delivery_type == 'instant') {
            let notification = new Notification;

            notification.noti_type = 'delivery_request';
            notification.delivery_id = delivery._id;
            notification.user_id = user._id;
            notification.to_id = '';
            notification.delivery_agent_ids = agent_ids;
            notification.parcel_code = parcel_code;
            notification.content = `${fullname} just requested a delivery from ${pickup_address} to ${drop_off_address}`;
            notification.user_name = fullname;
            notification.pickup_location = pickup_location;
            notification.drop_off_location = drop_off_location_populated;
            notification.delivery_agent_name = '';
            notification.delivery_agent_img = '';
            notification.delivery_agent_img_id = '';
            notification.is_accepted = false;
            notification.timestamp = timestamp;

            Mnotification = notification._id;

            notification = await notification.save();

            // Save notification id in delivery document
            delivery = await Delivery.findOneAndUpdate(
                { _id: delivery._id },
                { delivery_accept_request_notification_id: notification._id },
                { new: true }
            ).lean()

            //console.log('NOTIFICATION ID STORAGE TEST:....', delivery._id, delivery, notification._id);

            //send notification to the delivery agents to accept a delivery request

            // Send notifications to all relevant delivery agents (push notifications using device tokens)


            const subTitle = `${fullname} just requested a delivery from ${pickup_address} to ${drop_off_address}`;
            if (ios_agents_device_tokens.length !== 0) {
                setTimeout(handleNotification, 1000, false, 'receiver_id', '', process.env.APP_NAME, subTitle, { noti_type: 'delivery_request', delivery_id: delivery._id.toString() }, ios_agents_device_tokens, 'iOS');
            }
            if (android_agents_device_tokens.length !== 0) {
                setTimeout(handleNotification, 2000, false, 'receiver_id', '', process.env.APP_NAME, subTitle, { noti_type: 'delivery_request', delivery_id: delivery._id.toString() }, android_agents_device_tokens, 'android', 'order');
            }
        } else {
            let notification = new Notification;

            notification.noti_type = 'delivery_request';
            notification.delivery_id = delivery._id;
            notification.user_id = user._id;
            notification.to_id = '';
            notification.delivery_agent_ids = agent_ids;
            notification.parcel_code = parcel_code;
            notification.content = `${fullname} just requested a scheduled delivery from ${pickup_address} to ${drop_off_address} on ${schParsedDateTime}`;
            notification.user_name = fullname;
            notification.pickup_location = pickup_location;
            notification.drop_off_location = drop_off_location_populated;
            notification.delivery_agent_name = '';
            notification.delivery_agent_img = '';
            notification.delivery_agent_img_id = '';
            notification.is_accepted = false;
            notification.timestamp = timestamp;

            Mnotification = notification._id;

            notification = await notification.save();

            // Save notification id in delivery document
            delivery = await Delivery.findOneAndUpdate(
                { _id: delivery._id },
                { delivery_accept_request_notification_id: notification._id },
                { new: true }
            ).lean()

            //  console.log('NOTIFICATION ID STORAGE TEST:....', delivery._id, delivery, notification._id);

            //send notification to the delivery agents to accept a delivery request

            // Send notifications to all relevant delivery agents (push notifications using device tokens)

            console.log("ANDROID TOKENS", android_agents_device_tokens);
            console.log("iOS TOKENS", ios_agents_device_tokens);
            const subTitle = `${fullname} just requested a scheduled delivery from ${pickup_address} to ${drop_off_address} on ${schParsedDateTime}`;
            setTimeout(handleNotification, 1000, false, 'receiver_id', '', process.env.APP_NAME, subTitle, { noti_type: 'delivery_request', delivery_id: delivery._id.toString() }, ios_agents_device_tokens, 'iOS');
            setTimeout(handleNotification, 2000, false, 'receiver_id', '', process.env.APP_NAME, subTitle, { noti_type: 'delivery_request', delivery_id: delivery._id.toString() }, android_agents_device_tokens, 'android', 'order');
        }
        console.log(delivery);
        return res.status(200).send({ status: 'ok', msg: 'Delivery created', delivery, notification_id: Mnotification });

    } catch (e) {
        console.log(e);
        return res.status(400).send({ status: 'error', msg: 'An error occured' });
    }

});

// view delivery requests of any particular user
router.post('/user_deliveries', async (req, res) => {
    //request for fields
    const { token, user_id, pagec } = req.body;

    //verification of fields
    if (!token || !user_id || !pagec) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {

        //jwt verification
        let user;
        if (token) {
            user = jwt.verify(token, process.env.JWT_SECRET);
        }

        //paginating the delivery requests
        const resultsPerPage = 10;
        let page = pagec >= 1 ? pagec : 1;
        page = page - 1;

        //finding all delivery requests made by a particular user
        const deliveries = await Delivery.find({ sender_id: user._id }).sort({ timestamp: "desc" }).limit(resultsPerPage).skip(resultsPerPage * page).lean();

        if (deliveries.length === 0) {
            return res.status(200).send({ status: 'ok', msg: 'No delivery requests found', count: deliveries.length, deliveries });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count: deliveries.length, deliveries });
    } catch (e) {
        console.log(e);
        return res.status(400).send({ status: 'error', msg: e });
    }
});

// getting single delivery for a user
router.post('/single_delivery', async (req, res) => {

    //request for fields
    const { token, delivery_id } = req.body;

    //verification of fields
    if (!token || !delivery_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {

        //jwt verification
        let user;
        if (token) {
            user = jwt.verify(token, process.env.JWT_SECRET);
        }


        //finding a single delivery request for a particular user
        const delivery = await Delivery.findOne({ _id: delivery_id }).lean();

        if (!delivery) {
            return res.status(400).send({ status: 'error', msg: `No delivery request with ${delivery_id} found` });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', delivery });
    } catch (e) {
        console.log(e);
        return res.status(400).send({ status: 'error', msg: e });
    }
});

// cancel a delivery
router.post('/cancel_delivery', async (req, res) => {

    //request for fields
    const { token, delivery_id, cancel_reason } = req.body;

    //verification of fields
    if (!token || !delivery_id || !cancel_reason) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {

        //jwt verification
        const user = jwt.verify(token, process.env.JWT_SECRET);

        //searching for the particular delivery request to be cancelled
        const delivery = await Delivery.findOne({ _id: delivery_id });

        if (!delivery) {
            return res.status(400).send({ status: 'error', msg: `No Delivery with id: ${delivery_id} found` });
        }

        const timestamp = Date.now()

        //cancelling the delivery request
        const cDelivery = await Delivery.findOneAndUpdate(
            { _id: delivery_id },
            {
                'delivery_status.is_cancelled': true,
                'delivery_status.is_cancelled_at': timestamp,
                'cancel_reason': cancel_reason,
                'delivery_status.is_cancelled_by': 'user'
            },
            { new: true }
        ).lean();

        //updating the user document
        const aUser = await User.findOneAndUpdate(
            { _id: user._id },
            { "$inc": { "stats.total_cancelled_deliveries": 1 } },
            { new: true }
        );

        //updating the statisticss document
        await Statistics.updateOne(
            { doc_type: 'admin' },
            {
                $inc: {
                    total_cancelled_deliveries: 1,
                    total_cancelled_deliveries_by_users: 1
                }
            },
            { upsert: true }
        );

        await FsStatistics.doc('statistics').update({
            total_cancelled_deliveries: FieldValue.increment(1),
            total_cancelled_deliveries_by_users: FieldValue.increment(1)
        });

        // send a notification to the delivery agent who is already attached to this delivery

        let notification = new Notification;

        notification.noti_type = 'cancel_delivery';
        notification.delivery_id = delivery._id;
        notification.user_id = user._id;
        notification.to_id = '';
        notification.delivery_agent_ids = [cDelivery.delivery_agent_id];
        notification.parcel_code = delivery.parcel_code;
        notification.content = `${cDelivery.sender_fullname} cancelled the delivery of ${cDelivery.parcel_name}`;
        notification.user_name = cDelivery.sender_fullname;
        notification.delivery_agent_name = '';
        notification.delivery_agent_img = '';
        notification.delivery_agent_img_id = '';
        notification.is_accepted = false;
        notification.timestamp = timestamp;

        notification = await notification.save();


        // get delivery agent device token
        const singleDelAgent = await DeliveryAgent.findOne({ _id: cDelivery.delivery_agent_id }).lean();;

        const subTitle = `${cDelivery.sender_fullname} cancelled the delivery of ${cDelivery.parcel_name}`;
        setTimeout(handleNotification, 1000, false, 'receiver_id', cDelivery.imgs[0], process.env.APP_NAME, subTitle, notification, [singleDelAgent.device_token], singleDelAgent.os_type);

        return res.status(200).send({ status: 'ok', msg: 'Cancelled Delivery Successfully', delivery: cDelivery });

    } catch (e) {
        console.log(e);
        return res.status(400).send({ status: 'error', msg: e });
    }

});

// endpoint to get completed delivery history
router.post('/completed_history', async (req, res) => {
    //requesting for fields
    const { token, user_id, pagec } = req.body;

    //verification of fields
    if (!token || !user_id || !pagec) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        //jwt verification
        let user;
        if (token) {
            user = jwt.verify(token, process.env.JWT_SECRET);
        }

        //paginatimg the completed delivery history
        const resultsPerPage = 10;
        let page = pagec >= 1 ? pagec : 1;
        page = page - 1;

        // get total number of completed delivery from the database
        const count = await Delivery.find(
            {
                sender_id: user._id,
                'delivery_status.is_completed': true
            }).lean().lenght;

        //finding completed delivery history for a particular user
        const deliveries = await Delivery.find(
            {
                sender_id: user._id,
                'delivery_status.is_completed': true
            })
            .sort({ timestamp: "desc" })
            .limit(resultsPerPage)
            .skip(resultsPerPage * page)
            .lean();

        if (deliveries.length === 0) {
            return res.status(200).send({ status: 'ok', msg: 'No delivery requests found', count: deliveries.length, deliveries });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count: deliveries.length, deliveries, pageCount: count });
    } catch (e) {
        console.log(e);
        return res.status(400).send({ status: 'error', msg: e });
    }
});

// endpoint to get cancelled delivery request
router.post('/cancel_history', async (req, res) => {
    //requesting for fields
    const { token, user_id, pagec } = req.body;

    //verification of fields
    if (!token || !user_id || !pagec) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        //jwt verification
        let user;
        if (token) {
            user = jwt.verify(token, process.env.JWT_SECRET);
        }

        //paginatimg the  cancelled delivery history
        const resultsPerPage = 10;
        let page = pagec >= 1 ? pagec : 1;
        page = page - 1;

        // get total number of cancelled deliveries from the database
        const count = await Delivery.find(
            {
                sender_id: user._id,
                'delivery_status.is_cancelled': true
            }
        ).lean().length;

        //finding cancelled delivery history for a particular user
        const deliveries = await Delivery.find(
            {
                sender_id: user._id,
                'delivery_status.is_cancelled': true
            })
            .sort({ timestamp: "desc" })
            .limit(resultsPerPage)
            .skip(resultsPerPage * page)
            .lean();

        if (deliveries.length === 0) {
            return res.status(200).send({ status: 'ok', msg: 'No delivery requests found', count: deliveries.length, deliveries });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count: deliveries.length, deliveries, pageCount: count });
    } catch (e) {
        console.log(e);
        return res.status(400).send({ status: 'error', msg: e });
    }
});

// view pending delivery of any particular user
router.post('/pending_delivery', async (req, res) => {
    //requesting for fields
    const { token, user_id, pagec } = req.body;

    //verification of fields
    if (!token || !user_id || !pagec) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {

        //jwt verification
        let user;
        if (token) {
            user = jwt.verify(token, process.env.JWT_SECRET);
        }

        //paginating  the pending deliveries
        const resultsPerPage = 10;
        let page = pagec >= 1 ? pagec : 1;
        page = page - 1;

        // get the total number of pending deliveires from the database
        const count = await Delivery.find(
            {
                sender_id: user._id,
                'delivery_status.is_cancelled': false,
                'delivery_status.is_completed': false,
                'delivery_status.is_paid': true
            }
        ).lean().lenght;

        //finding pending deliveries for a particular users
        const deliveries = await Delivery.find(
            {
                sender_id: user._id,
                'delivery_status.is_cancelled': false,
                'delivery_status.is_completed': false,
                'delivery_status.is_paid': true
            })
            .sort({ timestamp: "desc" })
            .limit(resultsPerPage)
            .skip(resultsPerPage * page)
            .lean();

        if (deliveries.length === 0) {
            return res.status(200).send({ status: 'ok', msg: 'No delivery requests found', count: deliveries.length, deliveries });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count: deliveries.length, deliveries, pageCount: count });
    } catch (e) {
        console.log(e);
        return res.status(400).send({ status: 'error', msg: e });
    }
});



//delivery price endpoint
router.post('/delivery_price', async (req, res) => {
    // Requesting fields
    const { token, pickup_location, drop_off_locations, distances, delivery_medium, delivery_duration } = req.body;

    // Validate fields
    if (!token || !pickup_location || !Array.isArray(drop_off_locations) || drop_off_locations.length === 0 || !Array.isArray(distances) || distances.length === 0 || !delivery_medium || !delivery_duration) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be filled properly' });
    }

    try {
        // JWT verification
        let user = jwt.verify(token, process.env.JWT_SECRET);

        // Get rates from statistics
        const stats = await Statistics.findOne({ doc_type: 'admin' }).lean();

        if (!stats) {
            return res.status(400).send({ status: 'error', msg: 'Rate statistics not found' });
        }

        // Base fares
        let baseFare = stats.base_fare[delivery_medium];
        let kmRate = stats.km_rate[delivery_medium];
        let timeRate = stats.time_rate[delivery_medium];
        let minPrice = stats.min_price[delivery_medium];

        if (baseFare === undefined || kmRate === undefined || timeRate === undefined || minPrice === undefined) {
            return res.status(400).send({ status: 'error', msg: 'Invalid delivery medium' });
        }

        let totalPrice = baseFare;  // Start with the base fare
        let priceBreakdown = [];
        let cumulativeDistance = 0;

        // Calculate price for each drop-off
        for (let i = 0; i < drop_off_locations.length; i++) {
            let distanceValue = distances[i]?.distance_km || 0; // Extract distance_km
            cumulativeDistance += distanceValue;

            let segmentPrice = (kmRate * distanceValue) + (timeRate * Number(delivery_duration));

            priceBreakdown.push({
                drop_off: drop_off_locations[i],
                segment_distance: distanceValue, // Now it's just a number
                segment_price: roundUpToNearest100(segmentPrice),
                total_distance_so_far: cumulativeDistance,
                total_price_so_far: roundUpToNearest100(totalPrice)
            });

        }

        // Ensure total price meets minimum price threshold
        if (totalPrice < minPrice) {
            totalPrice = minPrice;
        }

        return res.status(200).send({
            status: 'ok',
            msg: 'Success',
            total_price: roundUpToNearest100(totalPrice),
            breakdown: priceBreakdown
        });

    } catch (e) {
        console.error(e);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred' });
    }
});


function roundUpToNearest100(num) {
    return Math.ceil(num / 100) * 100;
}



// ENDPOINT TO FETCH DELIVERY AGENTS FOR SCHEDULED DELIVERIES
router.post('/delivery_agents', async (req, res) => {
    //requesting fields
    const { token, pagec, delivery_medium, state } = req.body;

    //fields verification
    if (!token || !pagec || !delivery_medium || !state) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' })
    }

    try {
        //jwt verification
        let user;
        if (token) {
            user = jwt.verify(token, process.env.JWT_SECRET);
        }

        //paginating
        const resultsPerPage = 10;
        let page = pagec >= 1 ? pagec : 1;
        page = page - 1;

        //finding available delivery agents
        const delivery_agents = await DeliveryAgent.find(
            {
                'is_available': true,
                'vehicle_details.type': delivery_medium,
                state
            }).select(['fullname', 'no_completed_deliveries', 'vehicle_details', 'phone_no', 'rating', 'img_url'])
            .limit(resultsPerPage)
            .skip(resultsPerPage * page)
            .lean();

        for (let i = 0; i < delivery_agents.length; i++) {
            delivery_agents[i].average_rating = (delivery_agents[i].total_rating / delivery_agents[i].rating_count);
        }

        //if no delivery agent was available
        if (delivery_agents === 0) {
            return res.status(200).send({ status: 'Ok', msg: ' No Delivery Agents found', count: delivery_agents.length, delivery_agents });
        }

        return res.status(200).send({ status: 'Ok', msg: 'Success', count: delivery_agents.length, delivery_agents });
    } catch (e) {
        console.log(e);
        return res.status(400).send({ status: 'error', msg: e });
    }
});

// ENDPOINT TO FETCH DELIVERY AGENTS AGAIN AFTER A FAILED DELIVERY AGENT REQUEST 
// FOR SCHEDULED DELIVERY

router.post('/more_delivery_agents', async (req, res) => {
    //requesting fields
    const { token, pagec, delivery_medium, delivery_agent_ids, state } = req.body;


    //fields verification
    if (!token || !pagec || !delivery_medium || !delivery_agent_ids || !state) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' })
    }

    try {
        //jwt verification
        let user;
        if (token) {
            user = jwt.verify(token, process.env.JWT_SECRET);
        }

        //paginating
        const resultsPerPage = 10;
        let page = pagec >= 1 ? pagec : 1;
        page = page - 1;

        //creating an array for excluded delivery agents
        let exclusions = [];
        for (let i = 0; i < delivery_agent_ids.length; i++) {
            exclusions.push({
                _id: delivery_agent_ids[i]
            })
        }

        //finding available delivery agents
        const delivery_agents = await DeliveryAgent.find(
            {
                'is_available': true,
                'vehicle_details.type': delivery_medium,
                state,
                '$nor': exclusions
            }).select(['fullname', 'no_completed_deliveries', 'vehicle_details', 'phone_no', 'rating', 'img_url'])
            .limit(resultsPerPage)
            .skip(resultsPerPage * page)
            .lean();
        //no delivery agents found
        if (delivery_agents === 0) {
            return res.status(200).send({ status: 'Ok', msg: ' No Delivery Agents found', count: delivery_agents.length, delivery_agents });
        }

        return res.status(200).send({ status: 'Ok', msg: 'Success', count: delivery_agents.length, delivery_agents })
    } catch (e) {
        console.log(e);
        return res.status(400).send({ status: 'error', msg: e });
    }
});


// endpoint to fire when delivery times out after a delivery agent accepts it
router.post('/timeout', async (req, res) => {
    const { token, delivery_id } = req.body;

    // check for required fields
    if (!token || !delivery_id)
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

        // update data on firestore
        await FsDeliveryRequest.doc(delivery_id.toString()).update({
            timed_out: true,
            user_payment_timed_out: true
        });

        let notification = new Notification;

        notification.noti_type = 'timed_out';
        notification.delivery_id = delivery._id;
        notification.user_id = user._id;
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
        const singleDelAgent = await DeliveryAgent.findOne({ _id: delivery.delivery_agent_id }).lean();;

        const subTitle = `Delivery request for ${delivery.parcel_name} timed out`;
        setTimeout(handleNotification, 1000, false, 'receiver_id', delivery.imgs[0], process.env.APP_NAME, subTitle, notification, [singleDelAgent.device_token], singleDelAgent.os_type);

        return res.status(200).send({ status: 'ok', msg: 'Delivery timed out successfully' });

    } catch (e) {
        console.log(e);
        return res.status(403).send({ status: 'error', msg: 'Some error occurred', e });
    }
});

// enpoint to timeout a delivery before a delivery agent accepts it
router.post('/timeout_before_acceptance', async (req, res) => {
    // the notification_id is the id of the notification document that was generated when the delivery request was made
    const { token, delivery_id, notification_id } = req.body;

    // check for required fields
    if (!token || !delivery_id)
        return res.status(400).send({ status: 'error', msg: 'All fields must be filled' });

    try {
        //  const timestamp = Date.now()
        // verify token
        const user = jwt.verify(token, process.env.JWT_SECRET);

        const delivery = await Delivery.findOneAndUpdate(
            { _id: delivery_id },
            { 'delivery_status.timed_out': true },
            { new: true }
        ).lean();

        // update data on firestore
        await FsDeliveryRequest.doc(delivery_id.toString()).update({
            timed_out: true
        });

        // delete notification of the delivery request
        await Notification.deleteOne({ _id: notification_id }).lean();

        return res.status(200).send({ status: 'ok', msg: 'Delivery timed out successfully' });

    } catch (e) {
        console.log(e);
        return res.status(403).send({ status: 'error', msg: 'Some error occurred', e });
    }
});


// Endpoint to get refund days
router.post('/get_refund_days', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        jwt.verify(token, process.env.JWT_SECRET);

        let stats = await Statistics.findOne(
            { doc_type: 'admin' },
            { refund_days: 1 }
        ).lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', stats });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});


//Loading endpoint
// router.post('/get_loading', async (req, res) => {
//     const {token, delivery_id} = req.body;
//     if(!token || !delivery_id){
//         return res.status(400).send({status: error, msg: 'All fields must be filled'})
//     }

//     try{
//         let user;
//         if(token){
//             user = jwt.verify(token, process.env.JWT_SECRET);
//         }

//     }catch(e){

//     }


// })



// router.post('/delivery', async (req, res) => {
//     const {token, fullname, phone_no, delivery_type, delivery_medium, pickup_location, destination, reciever_name, reciever_phone_no, parcel_name, parcel_description, delivery_instructions, scheduled_delivery_pickup_timestamp,parcel_type } = req.body;

//     if(!token || !fullname || !phone_no || !delivery_type || !delivery_medium || !pickup_location || !destination || !reciever_name || !reciever_phone_no || !parcel_name || !parcel_description || !delivery_instructions || !parcel_type){
//         return res.status(400).send({status: 'error', msg: 'All fields must be filled'});
//     }

//     try{
//         const timestamp = Date.now();
//         let user = jwt.verify(token, process.env.JWT_SECRET)


//         // let imgs_urls = [];
//         // let img_ids = [];

//         // if(req.files){
//         //     if(req.files.length != 0){
//         //         for(let i = 0; i < req.files.length; i++){
//         //             let result = await cloudinary.uploader.upload(req.files[i].path, {folder: 'delivery_packages'});
//         //             console.log(result);
//         //             imgs_urls.push(result.secure_url);
//         //             img_ids.push(result.public_id);
//         //         }
//         //     }
//         // }

//         let parcel_code = Date.now();
//         let delivery = new Delivery;

//         delivery.delivery_type = delivery_type;
//         delivery.delivery_medium = delivery_medium;
//         //delivery.delivery_code = body;
//         delivery.pickup_location = pickup_location;
//         delivery.pickup_time = timestamp;
//         delivery.destination = destination;
//         delivery.timestamp= timestamp;
//         delivery.reciever_name = reciever_name;
//         delivery.reciever_phone_no = reciever_phone_no;
//         delivery.incident_report = '';
//         delivery.delivery_status.is_accepted = true;
//         delivery.delivery_status.is_accepted_at = 0;
//         delivery.delivery_status.is_completed = false;
//         delivery.delivery_status.is_completed_at = 0;
//         delivery.delivery_status.is_successful = false;
//         delivery.delivery_status.is_successful_at = 0;
//         delivery.delivery_status.is_cancelled = false;
//         delivery.delivery_status.is_cancelled_at = 0;
//         delivery.delivery_status.scheduled_delivery_pickup_timestamp = delivery_type == 'scheduled'?scheduled_delivery_pickup_timestamp:0;
//         delivery.delivery_status.is_booked = true;
//         delivery.delivery_status.is_paid = true;
//         delivery.sender_id = user._id;
//         delivery.sender_fullname = fullname;
//         delivery.sender_phone_no = phone_no;
//         delivery.parcel_code = parcel_code.toString();
//         delivery.parcel_name = parcel_name;
//         delivery.parcel_description = parcel_description;
//         delivery.delivery_instructions = delivery_instructions;
//         delivery.delivery_cost = '';
//         transaction_id = '';
//         // delivery.imgs = imgs_urls;
//         // delivery.img_ids= img_ids;
//         delivery.parcel_type = parcel_type;
//         delivery.cancel_reason = '';
//         delivery.delivery_agent_id = '';
//         delivery.delivery_agent_name  = '';
//         delivery.delivery_agent_vehicle_type = '';
//         delivery.delivery_agent_plate_no = '';
//         delivery.delivery_agent_phone_no = '';
//         delivery.delivery_agent_code = '';
//         delivery.delivery_agent_img = '';
//         delivery.delivery_agent_img_id = ''

//         delivery = await delivery.save();

//         user = await User.findOneAndUpdate(
//             {_id: user._id},
//             {
//                 "$inc": {
//                     "stats.total_delivery_requests": 1,
//                     "stats.total_instant_deliveries": delivery_type == 'instant'? 1:0,
//                     "stats.total_scheduled_deliveries": delivery_type == 'scheduled'? 1:0
//                 }
//             },
//             {new: true}
//         );

//         await Statistics.updateOne(
//             {doc_type: 'admin'},
//             {$inc: {
//                 total_deliveries: 1,
//                 total_instant_deliveries: delivery_type == 'instant'? 1:0,
//                 total_scheduled_deliveries: delivery_type == 'scheduled'? 1:0
//             }},
//             {upsert: true}
//         );
//         return res.status(200).send({status: 'ok', msg: 'Success', delivery});
//     }catch(e){
//         console.log(e);
//         return res.status({status: 'error', msg: 'An error occured'});
//     }

//});

router.post('/get_discount_status', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).send({ status: 'error', msg: 'Token is required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded._id;

        const user = await User.findOne({ _id: userId, doc_type: 'user' }).lean();
        if (!user) {
            return res.status(404).send({ status: 'error', msg: 'User not found' });
        }

        const stats = await Statistics.findOne({ doc_type: 'admin' })
            .select(['discount_enabled', 'discount_percentage'])
            .lean();

        if (!stats) {
            return res.status(404).send({ status: 'error', msg: 'Discount settings not found' });
        }

        return res.status(200).send({
            status: 'ok', discount_status: stats.discount_enabled, discount_percentage: stats.discount_percentage,
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).send({
            status: 'error', msg: 'Internal server error', error: error.message,
        });
    }
});

module.exports = router;

// completed, pending, cancelled, notifications pageCount for users
// delivery history pageCount for agents