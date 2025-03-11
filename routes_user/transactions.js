const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const Transaction = require('../models/transaction');
const Delivery = require('../models/delivery');
const DeliveryAgent = require('../models/delivery_agent');
const User = require('../models/user');
const Stats = require('../models/statistics');
const { FsDeliveryRequest, FsDeliveryAgent, FsStatistics, FieldValue } = require('../services/firebase_service_config');
const Notification = require('../models/notification');

const { createPayment } = require("../payment");
const { getWeekNumber } = require('../utils/weekNoGetter');

const { sendNotificationToDevice } = require('../controllers/push_notification_controller');

// Helper function to verify Paystack signature
function verifyPaystackSignature(signature, requestBody, secretKey) {
    const hash = crypto.createHmac('sha512', secretKey).update(requestBody).digest('hex');
    return hash === signature;
}

const router = express.Router();

const handleNotification = async (toUser, receiver_id, img, notiTitle, notiSubtitle, notificationData, agent_device_tokens, os_type, notiType) => {
    let user;
    if (toUser) {
        user = await User.findOne({ _id: receiver_id }).lean();
    }
    sendNotificationToDevice(toUser, toUser == true ? [user.device_token] : agent_device_tokens, img, notiTitle, notiSubtitle, notificationData, toUser == true ? user.os_type : os_type, notiType || "");
}

//getting week number of month of date
const getWeekNumOfMonthOfDate = (d) => {
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
    return Math.ceil((d.getDate() + (firstDay - 1)) / 7);
}

//make payment endpoint
router.post('/new_transaction', async (req, res) => {
    //requesting for fields
    const { token, fullname, delivery_id, delivery_medium, delivery_agent_id, delivery_agent_name, amt, ref, to_fleet, method, status, fleet_manager_id, parcel_code, parcel_name } = req.body;

    console.log(req.body);

    // check for required fields
    // if(!delivery_medium || !token || !fullname || !delivery_agent_id || !delivery_agent_name || !amt || !ref || to_fleet === undefined || to_fleet === null || !parcel_code || !parcel_name)
    //   return res.status(400).send({status: 'error', msg: 'all fields must be filled'});


    try {

        //jwt verification
        let user = jwt.verify(token, process.env.JWT_SECRET);

        const timestamp = Date.now();

        //Get year, month and week
        let year = new Date().getFullYear();
        let month = new Date().getMonth();
        let day = new Date().getDate();
        let week = getWeekNumber(year, month, new Date().getDate());

        // calculate percentage for delivery agent earning
        const { pickload_percent } = await Stats.findOne({ doc_type: 'admin' }).lean();

        const pickload_earning = amt * (pickload_percent / 100);
        const amt_for_delivery_agent = amt - pickload_earning;

        //creating a new transaction document
        let transaction = new Transaction;

        transaction.user_id = user._id;
        transaction.user_name = fullname;
        transaction.delivery_id = delivery_id;
        transaction.delivery_agent_id = delivery_agent_id;
        transaction.delivery_agent_name = delivery_agent_name;
        transaction.delivery_medium = delivery_medium;
        transaction.year = year;
        transaction.month = month;
        transaction.week = week;
        transaction.day = day;
        transaction.amt = amt;
        transaction.amt_for_delivery_agent = amt_for_delivery_agent;
        transaction.to_fleet = to_fleet;
        transaction.ref = ref;
        transaction.method = method;
        transaction.fleet_manager_id = fleet_manager_id || '';
        transaction.status = status;
        transaction.timestamp = timestamp;

        transaction = await transaction.save();

        // update user document
        const user1 = await User.findByIdAndUpdate(
            { _id: user._id },
            { '$inc': { 'stats.total_expenditure': amt } },
            { new: true }
        ).lean();

        // // update delivery agent document
        // const delivery_agent = await DeliveryAgent.findByIdAndUpdate(
        //     {_id: delivery_agent_id},
        //     {'$inc':{total_earnings: amt_for_delivery_agent}},
        //     {new: true}
        // ).lean();

        // // update fleet manager document if the delivery agent is under a fleet manager
        // if(to_fleet) {
        //     const fleet_manager = await DeliveryAgent.findByIdAndUpdate(
        //         {_id: fleet_manager_id},
        //         {'$inc':{total_earnings: amt_for_delivery_agent}},
        //         {new: true}
        //     ).lean();
        // }

        // update statistics document
        let stats;
        if (fleet_manager_id === '0') {
            stats = await Stats.findOneAndUpdate(
                { doc_type: 'admin' },
                {
                    '$inc': {
                        total_pickload_earnings: pickload_earning, //formerly amt - pickload_earning
                        total_revenue: amt,
                        total_individual_agent_earnings: amt_for_delivery_agent,
                        total_delivery_agent_earnings: amt_for_delivery_agent
                    }
                },
                { new: true }
            ).lean();

            await FsStatistics.doc('statistics').update({
                total_pickload_earnings: FieldValue.increment(pickload_earning),
                total_revenue: FieldValue.increment(amt),
                total_individual_agent_earnings: FieldValue.increment(amt_for_delivery_agent),
                total_delivery_agent_earnings: FieldValue.increment(amt_for_delivery_agent)
            });
        } else {
            stats = await Stats.findOneAndUpdate(
                { doc_type: 'admin' },
                {
                    '$inc': {
                        total_pickload_earnings: pickload_earning,
                        total_revenue: amt,
                        total_fleet_manager_earnings: amt_for_delivery_agent,
                        total_delivery_agent_earnings: amt_for_delivery_agent
                    }
                },
                { new: true }
            ).lean();

            await FsStatistics.doc('statistics').update({
                total_pickload_earnings: FieldValue.increment(pickload_earning),
                total_revenue: FieldValue.increment(amt),
                total_fleet_manager_earnings: FieldValue.increment(amt_for_delivery_agent),
                total_delivery_agent_earnings: FieldValue.increment(amt_for_delivery_agent)
            });
        }

        // update delivery document such that the document can get amongst the pending deliveries and such
        await Delivery.updateOne({ _id: delivery_id }, { 'delivery_status.is_paid': true, transaction_id: transaction._id });

        await FsDeliveryRequest.doc(delivery_id.toString()).update({
            'delivery_status_is_paid': true,
        });

        // send push notification to delivery agent that user has made payment

        // create new notification document which will have the agent id as an array

        const dAgent = await DeliveryAgent.findOne({ _id: delivery_agent_id }).lean();

        let notification = new Notification;

        notification.noti_type = 'user_payment';
        notification.delivery_id = delivery_id;
        notification.user_id = user._id;
        notification.delivery_agent_ids = [delivery_agent_id];
        notification.parcel_code = parcel_code;
        notification.content = `${fullname} just made payment for ${parcel_name} delivery`;
        notification.user_name = fullname;
        notification.pickup_location = '';
        notification.drop_off_location = '';
        notification.delivery_agent_name = delivery_agent_name;
        notification.delivery_agent_img = '';
        notification.delivery_agent_img_id = '';
        notification.is_accepted = false;
        notification.timestamp = timestamp;

        notification = await notification.save();

        //send notification to the delivery agents to accept a delivery request

        // Send notifications to all relevant delivery agents (push notifications using device tokens)

        const subTitle = `${fullname} just made payment for ${parcel_name} delivery`;
        setTimeout(handleNotification, 1000, false, 'receiver_id', '', process.env.APP_NAME, subTitle, notification, [dAgent.device_token], dAgent.os_type, 'payment');

        return res.status(200).send({ status: 'ok', msg: 'Success', transaction });
    } catch (e) {
        console.log(e);
        return res.status(403).send({ status: 'error', msg: 'some error occurred' });
    }
});

//make payment endpoint (paystack implementation)
router.post('/new_transaction2', async (req, res) => {
    //requesting for fields
    const { token, fullname, email, delivery_id, delivery_medium, delivery_agent_id, delivery_agent_name, amt, ref, to_fleet, fleet_manager_id, parcel_code, parcel_name } = req.body;

    // check for required fields
    if (!delivery_medium || !email || !token || !fullname || !delivery_agent_id || !delivery_agent_name || !amt || !ref || to_fleet === undefined || to_fleet === null || !parcel_code || !parcel_name)
        return res.status(400).send({ status: 'error', msg: 'all fields must be filled' });


    try {

        //jwt verification
        const user = jwt.verify(token, process.env.JWT_SECRET);

        const timestamp = Date.now();

        //Get year, month and week
        const year = new Date(timestamp).getFullYear();
        const month = new Date(timestamp).getMonth();
        const day = new Date(timestamp).getDate();
        const week = getWeekNumber(year, month, new Date(timestamp).getDate());


        // calculate percentage for delivery agent earning
        const { pickload_percent } = await Stats.findOne({ doc_type: 'admin' }).lean();

        const pickload_earning = amt * (pickload_percent / 100);
        const amt_for_delivery_agent = amt - pickload_earning;

        //creating a new transaction document
        const transaction = new Transaction();

        transaction.user_id = user._id;
        transaction.user_name = fullname;
        transaction.delivery_id = delivery_id;
        transaction.delivery_agent_id = delivery_agent_id;
        transaction.delivery_agent_name = delivery_agent_name;
        transaction.delivery_medium = delivery_medium;
        transaction.year = year;
        transaction.parcel_code = parcel_code;
        transaction.parcel_name = parcel_name;
        transaction.month = month;
        transaction.week = week;
        transaction.day = day;
        transaction.amt = amt;
        transaction.amt_for_delivery_agent = amt_for_delivery_agent;
        transaction.to_fleet = to_fleet;
        transaction.ref = ref;
        transaction.method = "";
        transaction.fleet_manager_id = fleet_manager_id || '';
        transaction.timestamp = timestamp;

        try {
            const response = await createPayment(email, amt, transaction.ref);
            if (response.status) {
                transaction.status = 'Pending';
                transaction.ref = response.data.reference;
                await transaction.save();

                return res.status(200).send({ status: 'ok', msg: 'Success', transaction, response });

            } else {
                transaction.status = 'Failed';
                await transaction.save();
                return res.status(500).send({ status: "error", msg: "payment initiation failed", transaction, response });
            }
        } catch (e) {
            console.error(e)
            transaction.status = 'Failed';
            await transaction.save();
            return res.status(500).send({ status: "error", msg: "payment initiation failed", transaction, response: {} });
        }


    } catch (e) {
        console.log(e);
        return res.status(403).send({ status: 'error', msg: 'some error occurred' });
    }
});

/**
 * Webhook for payments
 * This endpoint is not to be consumed by the mobile app dev but is consumed authomatically when a payment is made
 */
router.post('/confirm_payment', async (req, res) => {
    const event = req.body;
    try {
        // Extract Paystack signature and event data from the request headers
        const paystackSignature = req.headers['x-paystack-signature'];

        // Verify the Paystack signature
        const isValidSignature = verifyPaystackSignature(paystackSignature, JSON.stringify(req.body), process.env.PAYSTACK_SECRET_KEY);

        if (!isValidSignature) {
            console.error('Invalid Paystack signature');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const ref = event.data.reference;
        // Respond to Paystack to acknowledge receipt of the event
        res.status(200).json({ message: 'Event received successfully' });

        const timestamp = Date.now();

        // Handle different types of Paystack events
        if (event.event === 'charge.success') {
            //update payment document
            const transaction = await Transaction.findOneAndUpdate({ ref }, { status: "Success", method: event.data.channel }, { new: true }).lean();

            // update user document
            const user1 = await User.findByIdAndUpdate(
                { _id: transaction.user_id },
                { '$inc': { 'stats.total_expenditure': transaction.amt } },
                { new: true }
            ).lean();

            // update statistics document
            let stats;
            if (transaction.fleet_manager_id === '0') {
                stats = await Stats.findOneAndUpdate(
                    { doc_type: 'admin' },
                    {
                        '$inc': {
                            total_pickload_earnings: transaction.amt - transaction.amt_for_delivery_agent, //formerly amt - pickload_earning
                            total_revenue: transaction.amt,
                            total_individual_agent_earnings: transaction.amt_for_delivery_agent,
                            total_delivery_agent_earnings: transaction.amt_for_delivery_agent
                        }
                    },
                    { new: true }
                ).lean();

                await FsStatistics.doc('statistics').update({
                    total_pickload_earnings: FieldValue.increment(transaction.amt - transaction.amt_for_delivery_agent),
                    total_revenue: FieldValue.increment(transaction.amt),
                    total_individual_agent_earnings: FieldValue.increment(transaction.amt_for_delivery_agent),
                    total_delivery_agent_earnings: FieldValue.increment(transaction.amt_for_delivery_agent)
                });
            } else {
                stats = await Stats.findOneAndUpdate(
                    { doc_type: 'admin' },
                    {
                        '$inc': {
                            total_pickload_earnings: transaction.amt - transaction.amt_for_delivery_agent,
                            total_revenue: transaction.amt,
                            total_fleet_manager_earnings: transaction.amt_for_delivery_agent,
                            total_delivery_agent_earnings: transaction.amt_for_delivery_agent
                        }
                    },
                    { new: true }
                ).lean();

                await FsStatistics.doc('statistics').update({
                    total_pickload_earnings: FieldValue.increment(transaction.amt - transaction.amt_for_delivery_agent),
                    total_revenue: FieldValue.increment(transaction.amt),
                    total_fleet_manager_earnings: FieldValue.increment(transaction.amt_for_delivery_agent),
                    total_delivery_agent_earnings: FieldValue.increment(transaction.amt_for_delivery_agent)
                });
            }

            // update delivery document such that the document can get amongst the pending deliveries and such
            await Delivery.updateOne({ _id: transaction.delivery_id }, { 'delivery_status.is_paid': true, transaction_id: transaction._id });

            await FsDeliveryRequest.doc(transaction.delivery_id.toString()).update({
                'delivery_status_is_paid': true,
            });

            // send push notification to delivery agent that user has made payment

            // create new notification document which will have the agent id as an array

            const dAgent = await DeliveryAgent.findOne({ _id: transaction.delivery_agent_id }).lean();

            const notification = new Notification();

            notification.noti_type = 'user_payment';
            notification.delivery_id = transaction.delivery_id;
            notification.user_id = transaction.user_id;
            notification.delivery_agent_ids = [transaction.delivery_agent_id];
            notification.parcel_code = transaction.parcel_code;
            notification.content = `${transaction.user_name} just made payment for ${transaction.parcel_name} delivery`;
            notification.user_name = transaction.user_name;
            notification.pickup_location = '';
            notification.drop_off_location = '';
            notification.delivery_agent_name = transaction.delivery_agent_name;
            notification.delivery_agent_img = '';
            notification.delivery_agent_img_id = '';
            notification.is_accepted = false;
            notification.timestamp = timestamp;

            await notification.save();

            // // update delivery agent document
            // const delivery_agent = await DeliveryAgent.findByIdAndUpdate(
            //     {_id: delivery_agent_id},
            //     {'$inc':{total_earnings: amt_for_delivery_agent}},
            //     {new: true}
            // ).lean();

            // // update fleet manager document if the delivery agent is under a fleet manager
            // if(to_fleet) {
            //     const fleet_manager = await DeliveryAgent.findByIdAndUpdate(
            //         {_id: fleet_manager_id},
            //         {'$inc':{total_earnings: amt_for_delivery_agent}},
            //         {new: true}
            //     ).lean();
            // }

            //send notification to the delivery agents to accept a delivery request

            // Send notifications to all relevant delivery agents (push notifications using device tokens)

            const subTitle = `${transaction.user_name} just made payment for ${transaction.parcel_name} delivery`;
            setTimeout(handleNotification, 1000, false, transaction.delivery_agent_id, '', process.env.APP_NAME, subTitle, notification, [dAgent.device_token], dAgent.os_type, 'payment');

            return;

        } else if (event.event === 'charge.failed') {
            // Handle failed charge event
            console.log('Payment failed:', event.data.reference);

            //update payment document
            const transaction = await Transaction.findOneAndUpdate({ ref }, { payment_status: "Failed" }, { new: true }).lean();

            const notification = new Notification();

            notification.noti_type = 'user_payment';
            notification.delivery_id = transaction.delivery_id;
            notification.user_id = transaction.user_id;
            notification.delivery_agent_ids = [transaction.delivery_agent_id];
            notification.parcel_code = transaction.parcel_code;
            notification.content = `Payment for ${transaction.parcel_name} failed`;
            notification.user_name = transaction.user_name;
            notification.pickup_location = '';
            notification.drop_off_location = '';
            notification.delivery_agent_name = transaction.delivery_agent_name;
            notification.delivery_agent_img = '';
            notification.delivery_agent_img_id = '';
            notification.is_accepted = false;
            notification.timestamp = timestamp;

            await notification.save();

            const subTitle = `Payment for ${transaction.parcel_name} failed`;
            setTimeout(handleNotification, 1000, true, transaction.user_id, '', process.env.APP_NAME, subTitle, notification, [], "", 'payment');

            return;
        } else {
            console.log('Unhandled Paystack event:', event.event);
            // Handle failed charge event
            console.log('Payment failed:', event.data.reference);
            //update payment document
            const transaction = await Transaction.findOneAndUpdate({ ref }, { payment_status: "Failed" }, { new: true }).lean();

            const notification = new Notification();

            notification.noti_type = 'user_payment';
            notification.delivery_id = transaction.delivery_id;
            notification.user_id = transaction.user_id;
            notification.delivery_agent_ids = [transaction.delivery_agent_id];
            notification.parcel_code = transaction.parcel_code;
            notification.content = `Payment for ${transaction.parcel_name} failed`;
            notification.user_name = transaction.user_name;
            notification.pickup_location = '';
            notification.drop_off_location = '';
            notification.delivery_agent_name = transaction.delivery_agent_name;
            notification.delivery_agent_img = '';
            notification.delivery_agent_img_id = '';
            notification.is_accepted = false;
            notification.timestamp = timestamp;

            await notification.save();

            const subTitle = `Payment for ${transaction.parcel_name} failed`;
            setTimeout(handleNotification, 1000, true, transaction.user_id, '', process.env.APP_NAME, subTitle, notification, [], "", 'payment');

            return;
        }
    } catch (error) {
        console.error('Error handling Paystack webhook:', error.message);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router