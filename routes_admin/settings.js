const express = require('express');
const jwt = require('jsonwebtoken');

const Admin = require('../models/admin');
const Statistics = require('../models/statistics');
const Referral = require("../models/referral");

const User = require("../models/user");


const router = express.Router();

// endpoint to view settings
router.post('/settings', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        let admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let stats = await Statistics.findOne({ doc_type: 'admin' })
            .select(['active_delivery_mediums', 'pickup_radius', 'base_fare', 'km_rate', 'time_rate', 'min_price', 'refund_percent', 'refund_percent_delivery_agent', 'refund_days', 'pickload_percent', 'request_timeout_duration', 'payment_timeout_duration'])
            .lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', stats });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// endpoint to enable delivery mediums
/**
 * which_medium: bike, car, van, van
 */
router.post('/enable_delivery_medium', async (req, res) => {
    const { token, which_medium } = req.body;

    if (!token || !which_medium) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        let admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let update;
        switch (which_medium) {
            case 'bike':
                update = { 'active_delivery_mediums.bike': true };
                break;

            case 'car':
                update = { 'active_delivery_mediums.car': true };
                break;

            case 'van':
                update = { 'active_delivery_mediums.van': true };
                break;

            case 'truck':
                update = { 'active_delivery_mediums.truck': true };
                break;

            default:
                return res.status(400).send({ status: 'error', msg: 'Invalid delivery medium' });
        }

        let stats = await Statistics.findOneAndUpdate(
            { doc_type: 'admin' },
            update,
            { new: true }
        ).select(['active_delivery_mediums']).lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', stats });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});


// endpoint to disable delivery mediums
/**
 * which_medium: bike, car, van, van
 */
router.post('/disable_delivery_medium', async (req, res) => {
    const { token, which_medium } = req.body;

    if (!token || !which_medium) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        let admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let update;
        switch (which_medium) {
            case 'bike':
                update = { 'active_delivery_mediums.bike': false };
                break;

            case 'car':
                update = { 'active_delivery_mediums.car': false };
                break;

            case 'van':
                update = { 'active_delivery_mediums.van': false };
                break;

            case 'truck':
                update = { 'active_delivery_mediums.truck': false };
                break;

            default:
                return res.status(400).send({ status: 'error', msg: 'Invalid delivery medium' });
        }

        let stats = await Statistics.findOneAndUpdate(
            { doc_type: 'admin' },
            update,
            { new: true }
        ).select(['active_delivery_mediums']).lean();
        return res.status(200).send({ status: 'ok', msg: 'Success', stats });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});


// endpoint to set pickup radius for new delivery requests
router.post('/set_pickup_radius', async (req, res) => {
    const { token, pickup_radius } = req.body;

    if (!token || !pickup_radius) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        let admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let stats = await Statistics.findOneAndUpdate({ doc_type: 'admin' }, { pickup_radius }, { new: true }).select(['pickup_radius']).lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', stats });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// endpoint to set pickload percent profit on every delivery
router.post('/set_pickload_percent', async (req, res) => {
    const { token, pickload_percent } = req.body;

    if (!token || !pickload_percent) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        let admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let stats = await Statistics.findOneAndUpdate(
            { doc_type: 'admin' },
            { pickload_percent },
            { new: true }
        ).select(['pickload_percent']).lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', stats });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// endpoint to set refund percent for when scheduled deliveries are cancelled
/*
entity: 'user', 'delivery agent'
*/
router.post('/set_refund_percent', async (req, res) => {
    const { token, entity, refund_percent } = req.body;
    console.log(entity, refund_percent);

    if (!token || !entity || !refund_percent) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        let admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let stats;

        if (entity == 'user') {
            stats = await Statistics.findOneAndUpdate(
                { doc_type: 'admin' },
                { refund_percent },
                { new: true }
            ).select(['refund_percent']).lean();
        }

        else if (entity == 'delivery agent') {
            stats = await Statistics.findOneAndUpdate(
                { doc_type: 'admin' },
                { refund_percent_delivery_agent: refund_percent },
                { new: true }
            ).select(['refund_percent_delivery_agent']).lean();
        }

        else {
            return res.status(400).send({ status: 'error', msg: 'Invalid entity' })
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', stats });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to set number of working days for refund
router.post('/set_refund_days', async (req, res) => {
    const { token, refund_days } = req.body;

    if (!token || !refund_days) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        let admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let stats = await Statistics.findOneAndUpdate(
            { doc_type: 'admin' },
            { refund_days },
            { new: true }
        ).select(['refund_days']).lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', stats });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});


// Endpoint to set base fares
router.post('/set_base_fare', async (req, res) => {
    const { token, delivery_medium, base_fare } = req.body;

    if (!token || !delivery_medium || !base_fare) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        let admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let update;
        switch (delivery_medium) {
            case 'bike':
                update = { 'base_fare.bike': base_fare };
                break;

            case 'car':
                update = { 'base_fare.car': base_fare };
                break;

            case 'van':
                update = { 'base_fare.van': base_fare };
                break;

            case 'truck':
                update = { 'base_fare.truck': base_fare };
                break;

            default:
                return res.status(400).send({ status: 'error', msg: 'Invalid delivery medium' });
        }

        let stats = await Statistics.findOneAndUpdate(
            { doc_type: 'admin' },
            update,
            { new: true }
        )
            .select(['base_fare'])
            .lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', stats });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to set km rates
router.post('/set_km_rate', async (req, res) => {
    const { token, delivery_medium, km_rate } = req.body;

    if (!token || !delivery_medium || !km_rate) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        let admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let update;
        switch (delivery_medium) {
            case 'bike':
                update = { 'km_rate.bike': km_rate };
                break;

            case 'car':
                update = { 'km_rate.car': km_rate };
                break;

            case 'van':
                update = { 'km_rate.van': km_rate };
                break;

            case 'truck':
                update = { 'km_rate.truck': km_rate };
                break;

            default:
                return res.status(400).send({ status: 'error', msg: 'Invalid delivery medium' });
        }

        let stats = await Statistics.findOneAndUpdate(
            { doc_type: 'admin' },
            update,
            { new: true }
        )
            .select(['km_rate'])
            .lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', stats });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to set time rates
router.post('/set_time_rate', async (req, res) => {
    const { token, delivery_medium, time_rate } = req.body;

    if (!token || !delivery_medium || !time_rate) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        let admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let update;
        switch (delivery_medium) {
            case 'bike':
                update = { 'time_rate.bike': time_rate };
                break;

            case 'car':
                update = { 'time_rate.car': time_rate };
                break;

            case 'van':
                update = { 'time_rate.van': time_rate };
                break;

            case 'truck':
                update = { 'time_rate.truck': time_rate };
                break;

            default:
                return res.status(400).send({ status: 'error', msg: 'Invalid delivery medium' });
        }

        let stats = await Statistics.findOneAndUpdate(
            { doc_type: 'admin' },
            update,
            { new: true }
        )
            .select(['time_rate'])
            .lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', stats });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});


// Endpoint to set delivery rates
router.post('/set_min_price', async (req, res) => {
    const { token, delivery_medium, min_price } = req.body;

    if (!token || !delivery_medium || !min_price) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        let admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let update;
        switch (delivery_medium) {
            case 'bike':
                update = { 'min_price.bike': min_price };
                break;

            case 'car':
                update = { 'min_price.car': min_price };
                break;

            case 'van':
                update = { 'min_price.van': min_price };
                break;

            case 'truck':
                update = { 'min_price.truck': min_price };
                break;

            default:
                return res.status(400).send({ status: 'error', msg: 'Invalid delivery medium' });
        }

        let stats = await Statistics.findOneAndUpdate(
            { doc_type: 'admin' },
            update,
            { new: true }
        )
            .select(['min_price'])
            .lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', stats });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to set request timeout duration
router.post('/set_request_timeout_duration', async (req, res) => {
    const { token, duration } = req.body;

    if (!token || !duration) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        let admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let stats = await Statistics.findOneAndUpdate(
            { doc_type: 'admin' },
            { request_timeout_duration: duration },
            { new: true }
        )
            .select(['request_timeout_duration'])
            .lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', stats });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to get request timeout duration
router.get('/get_request_timeout_duration', async (req, res) => {
    try {
        const stats = await Statistics.findOne({ doc_type: 'admin' })
            .select(['request_timeout_duration'])
            .lean();

        if (!stats) {
            return res.status(404).send({ statud: 'error', msg: 'Discount duration not found' })
        }

        return res.status(200).send({
            status: 'ok', request_timeout_duration: stats.request_timeout_duration
        })
    }
    catch (error) {
        console.error('Error:', error);
        return res.status(500).send({
            status: 'error', msg: 'Internal server error', error: error.message,
        });
    }
})

// Endpoint to set payment timeout duration
router.post('/set_payment_timeout_duration', async (req, res) => {
    const { token, duration } = req.body;

    if (!token || !duration) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        let admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let stats = await Statistics.findOneAndUpdate(
            { doc_type: 'admin' },
            { payment_timeout_duration: duration },
            { new: true }
        )
            .select(['payment_timeout_duration'])
            .lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', stats });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to get payment timeout duration
router.get('/get_payment_timeout_duration', async (req, res) => {
    try {
        const stats = await Statistics.findOne({ doc_type: 'admin' })
            .select(['payment_timeout_duration'])
            .lean()

        if (!stats) {
            return res.status(404).send({ status: 'error', msg: 'Payment Timeout not found' });
        }
        return res.status(200).send({
            status: 'ok', payment_timeout_duration: stats.payment_timeout_duration,
        });

    }
    catch (error) {
        console.error('Error:', error);
        return res.status(500).send({
            status: 'error', msg: 'Internal server error', error: error.message,
        });
    }
})

// Endpoint to view reward settings
router.post('/view_reward_settings', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        const admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        const stats = await Statistics.findOne(
            { doc_type: 'admin' },
            { target_weekly_deliveries: 1, no_completed_orders_per_referee: 1, target_daily_deliveries: 1, no_of_referees: 1, reward_notifier: 1 }
        ).lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', stats });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to set reward settings
router.post('/set_reward_settings', async (req, res) => {
    const { token, no_of_referees, target_daily_deliveries, no_completed_orders_per_referee, target_weekly_deliveries, reward_notifier } = req.body;

    if (!token || !no_of_referees || !target_daily_deliveries || !no_completed_orders_per_referee || !target_weekly_deliveries || !reward_notifier)
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        const admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        const stats = await Statistics.findOneAndUpdate(
            { doc_type: 'admin' },
            {
                $set: {
                    reward_notifier, target_weekly_deliveries, no_completed_orders_per_referee, target_daily_deliveries, no_of_referees
                }
            },
            { new: true, reward_notifier: 1, target_weekly_deliveries: 1, no_completed_orders_per_referee: 1, target_daily_deliveries: 1, no_of_referees: 1 }
        ).lean();

        // update all unrewarded referral docs
        await Referral.updateMany({ is_rewarded: false }, {
            reward_notifier: reward_notifier
        });

        return res.status(200).send({ status: 'ok', msg: 'Success', stats });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to set discount settings
router.post('/set_discount_setting', async (req, res) => {
    const { token, discount_percent } = req.body

    if (!token || !discount_percent) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }
    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        const admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        const stats = await Statistics.findOneAndUpdate(
            { doc_type: 'admin' },
            { discount_percentage: discount_percent },
            { new: true }

        )
            .select(['discount_percentage'])
            .lean()

        return res.status(200).send({ status: 'ok', msg: 'Success', stats })

    }
    catch {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
})

// Endpoint to enable/disable the discount 
router.post('/toggle_discount', async (req, res) => {

    const { token, discount_enabled } = req.body

    if (typeof discount_enabled !== 'boolean') {
        return res.status(400).send({ status: 'error', msg: 'Invalid value for discount_enabled' });
    }
    if (!token) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (!admin || !admin.status) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        const stats = await Statistics.findOneAndUpdate(
            { doc_type: 'admin' },
            { discount_enabled },
            { new: true }
        )
            .select(['discount_enabled'])
            .lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', stats });
    } catch (error) {
        console.error(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
})

// Endpoint to get Discount Status
router.get('/get_discount_status', async (req, res) => {
    try {
        const stats = await Statistics.findOne({ doc_type: 'admin' })
            .select(['discount_enabled', 'discount_percentage'])
            .lean();

        if (!stats) {
            return res.status(404).send({ status: 'error', msg: 'Discount settings not found' });
        }

        return res.status(200).send({
            status: 'ok', discount_status: stats.discount_enabled, discount_percentage: stats.discount_percentage,
        });
    }
    catch (error) {
        console.error('Error:', error);
        return res.status(500).send({
            status: 'error', msg: 'Internal server error', error: error.message,
        });
    }
});



module.exports = router