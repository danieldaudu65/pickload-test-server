const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const Admin = require('../models/admin');
const Delivery_agent = require('../models/delivery_agent');
const Transaction = require('../models/transaction');
const Delivery = require('../models/delivery');
const PaymentCheck = require('../models/payment_check');
const DeliveryAgent = require('../models/delivery_agent');
const User = require('../models/user');
const Stats = require('../models/statistics');

const moment = require('moment');
const { parseISO, getISOWeek, startOfISOWeek, endOfISOWeek, addWeeks, setISOWeek, format, startOfMonth, startOfWeek, endOfWeek } = require('date-fns');

const Notification = require('../models/notification');

const { sendNotificationToDevice } = require('../controllers/push_notification_controller');

const handleNotification = async (toUser, img, notiTitle, notiSubtitle, notificationData, device_tokens, os_type, notiType) => {
    sendNotificationToDevice(toUser, device_tokens, img, notiTitle, notiSubtitle, notificationData, os_type, notiType || "");
}

const router = express.Router();

// Endpoint to view weekly payment records for all individual agents
router.post('/individual_agents', async (req, res) => {
    const { token, week, month, year, vehicle_type, pageCount, resultPerPage } = req.body;

    if (!token || !week || !year || !vehicle_type || !pageCount || !resultPerPage) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let delivery_agents = await Delivery_agent.find({
            is_deleted: false,
            approval_status: 'approved',
            status: 'active',
            delivery_agent_type: 'delivery agent',
            fleet_manager_code: "",
            'vehicle_details.type': vehicle_type.toLowerCase()
        })
            .select(['fullname', 'delivery_agent_code', 'phone_no', 'bank_details'])
            .lean();

        let individual_agents_earnings = [];
        let total = 0;

        // Get transaction documents for each delivery agents
        for (let i = 0; i < delivery_agents.length; i++) {
            total = 0;

            let transactions = await Transaction.find(
                {
                    delivery_agent_id: delivery_agents[i]._id,
                    completed_week: week,
                    completed_month: month,
                    completed_year: year,
                    is_completed: true
                }
            )
                .select(['amt_for_delivery_agent', 'timestamp', 'week'])
                .lean();

            transactions.forEach((transaction) => {
                total += transaction.amt_for_delivery_agent
            });

            if (total > 0) {
                let details = {
                    delivery_agent_details: delivery_agents[i],
                    total_weeekly_earnings: total
                };

                individual_agents_earnings.push(details);
            }
        }

        let count = individual_agents_earnings.length;

        if (count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No individual agent made any earnings this week' });

        }
        // Apply pagination to the final result
        const page = Math.max(0, pageCount - 1); // Ensure page starts from 0
        const paginatedEarnings = individual_agents_earnings.slice(
            page * resultPerPage,
            (page + 1) * resultPerPage
        );

        console.log(paginatedEarnings);
        return res.status(200).send({ status: 'ok', msg: 'delivery agents weekly transactions gotten successfully', count: paginatedEarnings.length, individual_agents_earnings: paginatedEarnings });

    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view a specific agent's weekly earnings
router.post('/agent', async (req, res) => {
    const { token, week, month, year, delivery_agent_id } = req.body;

    if (!token || !week || !year || !delivery_agent_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let delivery_agent = await Delivery_agent.findOne({ _id: delivery_agent_id })
            .select(['img_url', 'fullname', 'delivery_agent_code', 'vehicle_details', 'phone_no', 'bank_details'])
            .lean();

        // Get transaction documents for agent
        let transactions = await Transaction.find(
            {
                delivery_agent_id,
                completed_week: week,
                completed_month: month,
                completed_year: year,
                is_completed: true
            }
        )
            .select(['amt_for_delivery_agent', 'timestamp', 'week'])
            .sort({ timestamp: -1 })
            .lean();

        // Get total earning for the week
        let total_weeekly_earnings = 0;

        transactions.forEach((transaction) => {
            total_weeekly_earnings += transaction.amt_for_delivery_agent
        });

        return res.status(200).send({ status: 'ok', msg: 'delivery agents weekly transactions gotten successfully', delivery_agent, transactions, total_weeekly_earnings });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view payment records for all fleet managers

// Endpoint to get all fleet managers' weekly earnings
router.post("/fleet_managers", async (req, res) => {
    const { token, week, month, year, pageCount, resultPerPage } = req.body;

    if (!token || !week || !year || !pageCount || !resultPerPage) {
        return res.status(400).send({ status: "error", msg: "All fields must be entered" });
    }

    try {
        // Verify and fetch admin details
        let admin = jwt.verify(token, process.env.JWT_SECRET);
        admin = await Admin.findOne({ _id: admin._id }).select(["-password"]).lean();

        if (admin.status !== true) {
            return res.status(400).send({
                status: "error",
                msg: "Account has been blocked, please contact master admin",
            });
        }

        // Calculate the week range
        const baseDate = new Date(year, month); // Start of the given month
        const firstDayOfMonth = new Date(year, month, 1);
        const startOfRequestedWeek = startOfWeek(addWeeks(firstDayOfMonth, week - 1), { weekStartsOn: 0 });
        const endOfRequestedWeek = endOfWeek(addWeeks(firstDayOfMonth, week - 1), { weekStartsOn: 0 });

        const startTimestamp = startOfRequestedWeek.getTime();
        const endTimestamp = endOfRequestedWeek.getTime();

        console.log("Start of Week:", startOfRequestedWeek.toISOString());
        console.log("End of Week:", endOfRequestedWeek.toISOString());

        // Pagination setup
        let page = pageCount > 1 ? pageCount : 1;
        page -= 1;

        // Fetch fleet managers
        let fleet_managers = await Delivery_agent.find({
            is_deleted: false,
            approval_status: "approved",
            status: "active",
            delivery_agent_type: "fleet manager",
        })
            .select(["fleet_name", "fleet_manager_code", "phone_no", "bank_details"])
            .limit(resultPerPage)
            .skip(page * resultPerPage)
            .lean();

        let fleet_managers_earnings = [];
        for (let i = 0; i < fleet_managers.length; i++) {
            let total = 0;

            // Fetch transactions for the current fleet manager within the week range
            let transactions = await Transaction.find({
                fleet_manager_id: fleet_managers[i]._id,
                timestamp: { $gte: startTimestamp, $lte: endTimestamp },
                is_completed: true,
            })
                .select(["amt_for_delivery_agent", "timestamp"])
                .lean();

            // Calculate the total weekly earnings for this fleet manager
            transactions.forEach((transaction) => {
                total += transaction.amt_for_delivery_agent;
            });

            // Only include fleet managers with earnings
            if (total > 0) {
                fleet_managers_earnings.push({
                    fleet_manager_details: fleet_managers[i],
                    total_weekly_earnings: total,
                });
            }
        }

        // Return results
        let count = fleet_managers_earnings.length;
        if (count === 0) {
            return res.status(200).send({ status: "ok", msg: "No fleet manager made any earnings this week" });
        }

        return res.status(200).send({
            status: "ok",
            msg: "Fleet managers' weekly transactions retrieved successfully",
            count,
            fleet_managers_earnings,
        });
    } catch (error) {
        console.error(error);
        return res.status(400).send({ status: "error", msg: "Some error occurred", error });
    }
});


// Endpoint to view a specific fleet manager's weekly earnings
router.post("/fleet_manager", async (req, res) => {
    const { token, week, month, year, fleet_manager_id, vehicle_type } = req.body;

    if (!token || !week || !year || !fleet_manager_id || !vehicle_type) {
        return res.status(400).send({ status: "error", msg: "All fields must be entered" });
    }

    console.log(">>> Input Data >>>", { week, month, year });

    const type = vehicle_type.toLowerCase();

    if (!["bike", "car", "van", "truck"].includes(type)) {
        return res.status(400).send({ status: "error", msg: "Invalid vehicle type" });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select(["-password"]).lean();

        if (admin.status !== true) {
            return res.status(400).send({ status: "error", msg: "Account has been blocked, please contact master admin", });
        }

        const baseDate = new Date(year, month); 
        const firstDayOfMonth = new Date(year, month, 1); 

        const startOfRequestedWeek = startOfWeek(addWeeks(firstDayOfMonth, week - 1), { weekStartsOn: 0 });
        const endOfRequestedWeek = endOfWeek(addWeeks(firstDayOfMonth, week - 1), { weekStartsOn: 0 });

        const startTimestamp = startOfRequestedWeek.getTime();
        const endTimestamp = endOfRequestedWeek.getTime();

        console.log("Start of Week:", startOfRequestedWeek.toISOString());
        console.log("End of Week:", endOfRequestedWeek.toISOString());

        let fleet_manager = await Delivery_agent.findOne({ _id: fleet_manager_id })
            .select(["img_url", "fleet_name", "fleet_manager_code", "vehicle_details", "phone_no", "bank_details", "fleet_manager_vehicles",])
            .lean();

        let transactions = await Transaction.find({
            fleet_manager_id,
            timestamp: { $gte: startTimestamp, $lte: endTimestamp },
            is_completed: true,
        })
            .select([
                "amt_for_delivery_agent",
                "timestamp",
                "week",
                "delivery_medium",
                "delivery_agent_name",
                "delivery_agent_id",
            ])
            .sort({ timestamp: -1 })
            .lean();

        if (transactions.length === 0) {
            return res
                .status(200)
                .send({ status: "no transaction made yet for this fleet manager" });
        }

        let trx = [];
        let total_weekly_earnings = 0;

        console.log('>>>>Transaction>>>>');
        console.log(transactions)
        console.log('>>>>Transaction>>>>');
        

        transactions.forEach((transaction) => {
            total_weekly_earnings += transaction.amt_for_delivery_agent;

            if (transaction.delivery_medium.toLowerCase() === type) {
                trx.push(transaction);
            }
        });

        return res.status(200).send({
            status: "ok",
            msg: "Delivery agents weekly transactions retrieved successfully",
            fleet_manager,
            total_weekly_earnings,
            trx,
        });
    } catch (error) {
        console.error(error);
        return res.status(400).send({ status: "error", msg: "Some error occurred", error });
    }
});


router.post('/get_not_paids', async (req, res) => {
    const { token, week, month, year, transaction_type, vehicle_type } = req.body;

    if (!token || !week || !year || !transaction_type) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }


    let type = '';
    // optional check for vehicle type
    if (transaction_type === 'individual') {
        if (!vehicle_type) {
            return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
        }
        // convert type to lowercase
        type = vehicle_type.toLowerCase();

        // check for valid type
        if (type != 'bike' && type != 'car' && type != 'van' && type != 'truck') {
            return res.status(400).send({ status: 'error', msg: 'Invalid vehicle type' });
        }
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        const transaction_date = `${week}/${month}/${year}`;
        const paymentCheck = await PaymentCheck.findOne({ transaction_date, transaction_type, vehicle_type: type }).lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', paymentCheck });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// enpoint to update the not-paids of a particular week
router.post('/update_not_paids', async (req, res) => {
    const { token, week, month, year, transaction_type, vehicle_type, not_paids, paids, paid_reversals, noti_data, noti_data_reverse } = req.body;
    console.log(req.body);

    if (!token || !week || !year || !not_paids) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    let type = '';
    // optional check for vehicle type
    if (transaction_type === 'individual') {
        if (!vehicle_type) {
            return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
        }
        // convert type to lowercase
        type = vehicle_type.toLowerCase();

        // check for valid type
        if (type != 'bike' && type != 'car' && type != 'van' && type != 'truck') {
            return res.status(400).send({ status: 'error', msg: 'Invalid vehicle type' });
        }
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        const transaction_date = `${week}/${month}/${year}`;
        const paymentCheck = await PaymentCheck.findOneAndUpdate({ transaction_date, transaction_type, vehicle_type: type }, { not_paids }, { new: true }).lean();

        const timestamp = Date.now();

        if (paids && paids.length > 0) {
            // send notifications to those that were paid
            let notification = new Notification;

            notification.noti_type = 'paid_noti';
            notification.delivery_id = '';
            notification.user_id = '';
            notification.to_id = '';
            notification.delivery_agent_ids = paids;
            notification.parcel_code = '';
            notification.content = noti_data;
            notification.user_name = '';
            notification.pickup_location = '';
            notification.drop_off_location = '';
            notification.delivery_agent_name = '';
            notification.delivery_agent_img = '';
            notification.delivery_agent_img_id = '';
            notification.is_accepted = false;
            notification.timestamp = timestamp;

            notification = await notification.save();

            let noti = {};

            noti._id = notification._id;
            noti.noti_type = 'paid_noti';
            noti.delivery_id = '';
            noti.user_id = '';
            noti.to_id = '';
            noti.delivery_agent_ids = paids;
            noti.parcel_code = '';
            noti.content = noti_data;
            noti.user_name = '';
            noti.pickup_location = '';
            noti.drop_off_location = '';
            noti.delivery_agent_name = '';
            noti.delivery_agent_img = '';
            noti.delivery_agent_img_id = '';
            noti.is_accepted = false;
            noti.timestamp = timestamp;

            const ios_agents_device_tokens = [];
            const android_agents_device_tokens = [];

            const dAgent = await DeliveryAgent.find({ _id: { $in: paids } }, { device_token: 1, os_type: 1 }).lean();
            dAgent.map(agent => {
                if (agent.os_type == 'iOS') {
                    ios_agents_device_tokens.push(agent.device_token);
                } else {
                    android_agents_device_tokens.push(agent.device_token);
                }
            });

            setTimeout(handleNotification, 1000, false, '', process.env.APP_NAME, noti_data, noti, ios_agents_device_tokens, 'iOS');
            setTimeout(handleNotification, 2000, false, '', process.env.APP_NAME, noti_data, noti, android_agents_device_tokens, 'android');
        }

        if (paid_reversals && paid_reversals.length > 0) {
            // send notifications to those that were paid
            let notification = new Notification;

            notification.noti_type = 'paid_noti';
            notification.delivery_id = '';
            notification.user_id = '';
            notification.to_id = '';
            notification.delivery_agent_ids = paid_reversals;
            notification.parcel_code = '';
            notification.content = noti_data_reverse;
            notification.user_name = '';
            notification.pickup_location = '';
            notification.drop_off_location = '';
            notification.delivery_agent_name = '';
            notification.delivery_agent_img = '';
            notification.delivery_agent_img_id = '';
            notification.is_accepted = false;
            notification.timestamp = timestamp;

            notification = await notification.save();

            let noti = {};

            noti._id = notification._id;
            noti.noti_type = 'paid_noti';
            noti.delivery_id = '';
            noti.user_id = '';
            noti.to_id = '';
            noti.delivery_agent_ids = paid_reversals;
            noti.parcel_code = '';
            noti.content = noti_data_reverse;
            noti.user_name = '';
            noti.pickup_location = '';
            noti.drop_off_location = '';
            noti.delivery_agent_name = '';
            noti.delivery_agent_img = '';
            noti.delivery_agent_img_id = '';
            noti.is_accepted = false;
            noti.timestamp = timestamp;

            const ios_agents_device_tokens = [];
            const android_agents_device_tokens = [];

            const dAgent = await DeliveryAgent.find({ _id: { $in: paid_reversals } }, { device_token: 1, os_type: 1 }).lean();
            dAgent.map(agent => {
                if (agent.os_type == 'iOS') {
                    ios_agents_device_tokens.push(agent.device_token);
                } else {
                    android_agents_device_tokens.push(agent.device_token);
                }
            });

            setTimeout(handleNotification, 1000, false, '', process.env.APP_NAME, noti_data_reverse, noti, ios_agents_device_tokens, 'iOS');
            setTimeout(handleNotification, 2000, false, '', process.env.APP_NAME, noti_data_reverse, noti, android_agents_device_tokens, 'android');
        }

        return res.status(200).send({ status: 'ok', msg: 'Update Success', paymentCheck });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// enpoint to verify activity pin
router.post('/verify_activity_pin', async (req, res) => {
    const { token, activity_pin } = req.body;

    if (!activity_pin || !token) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select(['-password']).lean();

        // check for admin status
        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        // check for activity pin
        if (await bcrypt.compare(activity_pin, admin.activity_pin)) {
            return res.status(200).send({ status: 'ok', msg: 'activity pin correct' });
        }

        return res.status(400).send({ status: 'error', msg: 'activity pin incorrect' });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// endpoint to refund transactions
router.post('/refund_transaction', async (req, res) => {
    const { token, delivery_id } = req.body;

    if (!delivery_id || !token) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select(['-password']).lean();

        // check for admin status
        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        // check if delivery has been refunded
        let delivery = await Delivery.findById({ _id: delivery_id }).select(['is_refunded', 'sender_id', 'delivery_cost_user', 'parcel_name', 'parcel_code']).lean();
        if (delivery.is_refunded === true)
            return res.status(400).send({ status: 'error', msg: 'this delivery has already been refunded' });

        // update delivery document
        await Delivery.updateOne({ _id: delivery._id }, { is_refunded: true }).lean();

        // update user document
        await User.updateOne({ _id: delivery.sender_id }, { '$inc': { 'stats.total_expenditure': -delivery.delivery_cost_user } }).lean();

        // update statistics document
        await Stats.updateOne({ doc_type: 'admin' }, { '$inc': { total_refunded_amount: delivery.delivery_cost_user } }).lean();


        const noti_data = `Your refund of ${delivery.delivery_cost_user} for ${delivery.parcel_name}: ${delivery.parcel_code} has been made`;

        const timestamp = Date.now();

        let notification = new Notification;

        notification.noti_type = 'refund_noti';
        notification.delivery_id = delivery._id;
        notification.user_id = '';
        notification.to_id = delivery.sender_id;
        notification.delivery_agent_ids = [];
        notification.parcel_code = '';
        notification.content = noti_data;
        notification.user_name = '';
        notification.pickup_location = '';
        notification.drop_off_location = '';
        notification.delivery_agent_name = '';
        notification.delivery_agent_img = '';
        notification.delivery_agent_img_id = '';
        notification.is_accepted = false;
        notification.timestamp = timestamp;

        notification = await notification.save();

        let noti = {};

        noti._id = notification._id;
        noti.noti_type = 'refund_noti';
        noti.delivery_id = delivery._id;
        noti.user_id = '';
        noti.to_id = delivery.sender_id;
        noti.delivery_agent_ids = [];
        noti.parcel_code = '';
        noti.content = noti_data;
        noti.user_name = '';
        noti.pickup_location = '';
        noti.drop_off_location = '';
        noti.delivery_agent_name = '';
        noti.delivery_agent_img = '';
        noti.delivery_agent_img_id = '';
        noti.is_accepted = false;
        noti.timestamp = timestamp;

        const pUser = await User.findOne({ _id: delivery.sender_id }, { device_token: 1, os_type: 1 }).select(['device_token', 'os_type']).lean();

        setTimeout(handleNotification, 1000, true, '', process.env.APP_NAME, noti_data, noti, [pUser.device_token], pUser.os_type, 'user');

        return res.status(200).send({ status: 'ok', msg: 'Success', delivery });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});


module.exports = router