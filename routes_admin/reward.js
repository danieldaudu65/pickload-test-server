const express = require('express');
const jwt = require('jsonwebtoken');

const Admin = require('../models/admin');
const DeliveryAgent = require('../models/delivery_agent');
const Delivery = require("../models/delivery");
const User = require("../models/user");
const Statistics = require("../models/statistics");
const Referral = require("../models/referral");
const Review = require("../models/review");

const router = express.Router();

// endpoint to view daily qualified delivery agents
router.post('/view_daily_qualified_agents', async (req, res) => {
    const { token, day, month, year } = req.body;

    if (!token || !day || month === undefined || month === null || !year)
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

    try {
        // token verification
        // const verify = jwt.verify(token, process.env.JWT_SECRET);

        // // check if admin has been blocked
        // const admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        // if (admin.status != true)
        //     return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });

        // fetch reward statistics
        const { target_daily_deliveries } = await Statistics.findOne({ doc_type: 'admin' }, {
            target_daily_deliveries: 1
        }).lean();

        // Get the start and end of the day in timestamps
        const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
        const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

        const deliveries = await Delivery.find(
            {
                timestamp: { $gte: startOfDay, $lte: endOfDay },
                'delivery_status.is_completed': true,
                daily_is_rewarded: false
            },
            {
                day: 1, month: 1, year: 1, delivery_status: 1,
                daily_rewarded_timestamp: 1, daily_reward_notifier: 1,
                daily_is_rewarded: 1, delivery_agent_id: 1, timestamp: 1
            }
        ).lean();

        console.log(deliveries)
        // check if deliveries exists
        if (deliveries.length === 0)
            return res.status(200).send({ status: 'ok', msg: 'no qualified daily agents', delivery_agents: 0, count: 0 })

        // extract the delivery agent ids
        const delivery_agent_ids = deliveries.map((delivery) => delivery.delivery_agent_id);

        // fetch delivery agent documents
        const delivery_agents = await DeliveryAgent.find({ _id: { $in: delivery_agent_ids } }, {
            ref_account_no: 1, ref_bank: 1, service_provider: 1, phone_recharge: 1, fullname: 1, phone_no: 1
        }).lean();

        // extract the delivery agents that are qualified
        const delivery_agentsM = [];
        const deliveryCountMap = new Map();

        deliveries.forEach(delivery => {
            deliveryCountMap.set(delivery.delivery_agent_id, (deliveryCountMap.get(delivery.delivery_agent_id) || 0) + 1);
        });

        // grouping
        delivery_agents.forEach(delivery_agent => {
            delivery_agent.no_of_deliveries = 0;
            deliveries.forEach(delivery => {
                if (delivery_agent._id == delivery.delivery_agent_id) {
                    delivery_agent.no_of_deliveries += 1;
                }
            });
            if (delivery_agent.no_of_deliveries >= target_daily_deliveries) {
                delivery_agentsM.push(delivery_agent);
            }
        });

        // check if there were delivery agents
        if (delivery_agentsM.length === 0)
            return res.status(200).send({ status: 'ok', msg: 'no qualified daily agents', delivery_agents: 0, count: 0 })

        return res.status(200).send({ status: 'ok', msg: 'Success', delivery_agents: delivery_agentsM, count: delivery_agentsM.length });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// endpoint to view weekly qualified agents
router.post('/view_weekly_qualified_agents', async (req, res) => {
    const { token, week, month, year } = req.body;

    if (!token || !week || month === undefined || month === null || !year)
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

    try {
        // token verification
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // check if admin has been blocked
        const admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true)
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });

        // fetch reward statistics
        const { target_weekly_deliveries } = await Statistics.findOne({ doc_type: 'admin' }, {
            target_weekly_deliveries: 1
        }).lean();

        // Get the start and end timestamps for the given week
        const startOfWeek = new Date(year, 0, 1); // Start from January 1st of the given year
        startOfWeek.setDate(startOfWeek.getDate() + (week - 1) * 7); // Move to the correct week
        startOfWeek.setHours(0, 0, 0, 0); // Set to midnight

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6); // Move to the end of the week
        endOfWeek.setHours(23, 59, 59, 999); // End of the week

        const deliveries = await Delivery.find(
            {
                timestamp: { $gte: startOfWeek.getTime(), $lte: endOfWeek.getTime() },
                'delivery_status.is_completed': true,
                weekly_is_rewarded: false
            },
            {
                week: 1, month: 1, year: 1, delivery_status: 1,
                weekly_rewarded_timestamp: 1, weekly_reward_notifier: 1,
                weekly_is_rewarded: 1, timestamp: 1
            }
        ).lean();

        // check if there were deliveries
        if (deliveries.length === 0)
            return res.status(200).send({ status: 'ok', msg: 'no weekly qualified agents', delivery_agents: 0, count: 0 })

        // extract the delivery agent ids
        const delivery_agent_ids = deliveries.map((delivery) => delivery.delivery_agent_id);

        // fetch delivery agent documents
        const delivery_agents = await DeliveryAgent.find({ _id: { $in: delivery_agent_ids } }, {
            ref_account_no: 1, ref_bank: 1, service_provider: 1, phone_recharge: 1, fullname: 1, phone_no: 1
        }).lean();

        // check if there were delivery agents
        if (delivery_agentsM.length === 0)
            return res.status(200).send({ status: 'ok', msg: 'no weekly qualified agents', delivery_agents: 0, count: 0 })

        // extract the delivery agents that are qualified
        const delivery_agentsM = [];
        const deliveryCountMap = new Map();

        deliveries.forEach(delivery => {
            deliveryCountMap.set(delivery.delivery_agent_id, (deliveryCountMap.get(delivery.delivery_agent_id) || 0) + 1);
        });

        delivery_agents.forEach(delivery_agent => {
            const no_of_deliveries = deliveryCountMap.get(delivery_agent._id) || 0;
            if (no_of_deliveries >= target_weekly_deliveries) {
                delivery_agent.no_of_deliveries = no_of_deliveries;
                delivery_agentsM.push(delivery_agent);
            }
        });

        // unoptimized implementation of above code
        // delivery_agents.forEach(delivery_agent => {
        //     delivery_agent.no_of_deliveries = 0;
        //     deliveries.forEach(delivery => {
        //         if (delivery_agent._id == delivery.delivery_agent_id) {
        //             delivery_agent.no_of_deliveries += 1;
        //         }
        //     });
        //     if (delivery_agent.no_of_deliveries >= target_weekly_deliveries) {
        //         delivery_agentsM.push(delivery_agent)
        //     }
        // });

        return res.status(200).send({ status: 'ok', msg: 'Success', delivery_agents: delivery_agentsM });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// endpoint to view a single devlivery agent rewards
router.post('/view_single_delivery_agent_reward', async (req, res) => {
    const { token, week, month, year, delivery_agent_id } = req.body;

    if (!token || !week || month === undefined || month === null || !year || !delivery_agent_id)
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

    try {
        // token verification
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // check if admin has been blocked
        const admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true)
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });

        // fetch reward statistics
        const { target_daily_deliveries, target_weekly_deliveries } = await Statistics.findOne({ doc_type: 'admin' }, {
            target_daily_deliveries: 1, target_weekly_deliveries: 1
        }).lean();

        // fetch delivery documents
        const deliveries = await Delivery.find(
            { week: week, month: month, year: year, 'delivery_status.is_completed': true },
            { week: 1, month: 1, year: 1, delivery_status: 1, weekly_rewarded_timestamp: 1, weekly_reward_notifier: 1, weekly_is_rewarded: 1 }).lean();

        // fetch delivery agent document
        const delivery_agent = await DeliveryAgent.findOne({ _id: delivery_agent_id }).lean();

        // fetch review document
        const reviews = await Review.find({ delivery_agent_id: delivery_agent_id }).lean();

        // check if there were deliveries
        if (deliveries.length === 0)
            return res.status(200).send({ status: 'ok', msg: 'no weekly qualified agents', delivery_agent, reviews })

        // 
        const days = {};
        for (let i = 1; i < 32; i++) {
            days[i] = {
                no_of_completed_deliveries: 0,
                is_paid: false,
                delivery_ids: []
            };
        };

        deliveries.forEach(delivery => {
            days[delivery.day].no_of_completed_deliveries += 1;
            days[delivery.day].is_rewarded = delivery.daily_is_rewarded;
            days[delivery.day].delivery_ids.push(delivery._id.toString())
        });


        return res.status(200).send({ status: 'ok', msg: 'Success', delivery_agent, weekly_is_rewarded: deliveries[0].weekly_is_rewarded, weekly_completed_deliveries: deliveries.length, reviews, target_daily_deliveries, target_weekly_deliveries, days });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// endpoint to view deliveries
router.post('/view_deliveries', async (req, res) => {
    const { token, delivery_ids } = req.body;
    if (!token || !delivery_ids)
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

    try {
        // token verification
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // check if admin has been blocked
        const admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true)
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });

        // fetch delivery documents
        const deliveries = await Delivery.find(
            { _id: { $in: delivery_ids } },
            { sender_fullname: 1, pickup_address: 1, drop_off_address: 1, sender_phone_no: 1 }).lean();

        // check if there were deliveries
        if (deliveries.length === 0)
            return res.status(200).send({ status: 'ok', msg: 'no weekly qualified agents', deliveries, count: 0 })

        return res.status(200).send({ status: 'ok', msg: 'Success', deliveries, count: deliveries.length });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// reward daily delivery agent
router.post('/reward_daily_agent', async (req, res) => {
    const { token, day, month, year, delivery_agent_id, reward_notifier, fullname } = req.body;

    if (!token || !day || month === undefined || month === null || !year || !delivery_agent_id || !reward_notifier || !fullname)
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

    try {
        // token verification
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // check if admin has been blocked
        const admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true)
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });

        const delivery_agent = await DeliveryAgent.findOne({ _id: delivery_agent_id }).lean();

        // update delivery documents
        const { matchedCount } = await Delivery.updateMany(
            { day: day, month: month, year: year, 'delivery_status.is_completed': true, daily_is_rewarded: false, delivery_agent_id: delivery_agent_id },
            { daily_is_rewarded: true, daily_rewarded_timestamp: Date.now() }).lean();

        // fetch reward notifier from the statistics document
        const { reward_notifier } = await Statistics.findOne({}, { reward_notifier: 1, _id: 0 }).lean();

        // create referral doc for delivery agent
        const referral = new Referral();
        referral.user_id = delivery_agent_id;
        referral.fullname = fullname;
        referral.phone_no = delivery_agent.phone_no;
        referral.phone_recharge = delivery_agent.phone_recharge;
        referral.service_provider = delivery_agent.service_provider;
        referral.ref_bank = delivery_agent.ref_bank;
        referral.ref_account_no = delivery_agent.ref_account_no;
        referral.ref_account_name = delivery_agent.ref_account_name;
        referral.no_of_completed_deliveries = matchedCount;
        referral.is_daily = true;
        referral.is_rewarded = true;
        referral.is_qualified = true;
        referral.is_claimed = true;
        referral.reward_notifier = reward_notifier;
        referral.rewarded_timestamp = Date.now();
        referral.timestamp = referral.rewarded_timestamp;
        referral.ref_for = "delivery agent";

        await referral.save();

        return res.status(200).send({ status: 'ok', msg: 'Success' });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// reward weekly delivery agent
router.post('/reward_weekly_agent', async (req, res) => {
    const { token, week, month, year, delivery_agent_id, reward_notifier, fullname } = req.body;

    if (!token || !week || month === undefined || month === null || !year || !delivery_agent_id || !reward_notifier || !fullname)
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

    try {
        // token verification
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // check if admin has been blocked
        const admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true)
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });

        // fetch a single delivery agent document that will be rewarded
        const delivery_agent = await DeliveryAgent.findOne({ _id: delivery_agent_id }).lean();

        // update delivery documents
        const { matchedCount } = await Delivery.updateMany(
            { week: week, month: month, year: year, 'delivery_status.is_completed': true, weekly_is_rewarded: false, delivery_agent_id: delivery_agent_id },
            { weekly_is_rewarded: true, weekly_rewarded_timestamp: Date.now() }).lean();


        // fetch reward notifier from the statistics document
        const { reward_notifier } = await Statistics.findOne({}, { reward_notifier: 1, _id: 0 }).lean();

        // create referral doc for delivery agent
        const referral = new Referral();
        referral.user_id = delivery_agent_id;
        referral.fullname = fullname;
        referral.phone_no = delivery_agent.phone_no;
        referral.phone_recharge = delivery_agent.phone_recharge;
        referral.service_provider = delivery_agent.service_provider;
        referral.ref_bank = delivery_agent.ref_bank;
        referral.ref_account_no = delivery_agent.ref_account_no;
        referral.no_of_completed_deliveries = matchedCount;
        referral.is_daily = false;
        referral.is_rewarded = true;
        referral.is_qualified = true;
        referral.is_claimed = true;
        referral.reward_notifier = reward_notifier;
        referral.rewarded_timestamp = Date.now();
        referral.timestamp = referral.rewarded_timestamp;
        referral.ref_for = "delivery agent";

        await referral.save();

        return res.status(200).send({ status: 'ok', msg: 'Success' });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// endpoint to view rewarded delivery_agents
router.post('/view_rewarded_delivery_agents', async (req, res) => {
    const { token } = req.body;

    if (!token)
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

    try {
        // token verification
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // check if admin has been blocked
        const admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true)
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });

        // update referral documents
        const referrals = await Referral.find({ is_rewarded: true, ref_for: "delivery agent" }).lean();

        if (referrals.length === 0)
            return res.status(200).send({ status: 'ok', msg: 'no rewarded users found', referrals, count: 0 })

        return res.status(200).send({ status: 'ok', msg: 'Success', referrals, count: referrals.length });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// endpoint to view qualified users
router.post('/view_qualified_users', async (req, res) => {
    const { token } = req.body;

    if (!token)
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

    try {
        // token verification
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // check if admin has been blocked
        const admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true)
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });

        // fetch referral documents
        const referrals = await Referral.find({ is_qualified: true, is_rewarded: false, ref_for: "user" }).lean();

        if (referrals.length === 0)
            return res.status(200).send({ status: 'ok', msg: 'no rewarded users found', referrals, count: 0 })

        // Gather user IDs
        const user_ids = referrals.map(referral => referral.user_id);

        // Fetch delivery documents of users
        const deliveries = await Delivery.find({ user_id: { $in: user_ids } }, { timestamp: 1, user_id: 1, delivery_cost_user: 1 }).lean();

        // calculate total deliveries for each referral doc
        referrals.forEach(referral => {
            referral.no_of_deliveries = 0;
            deliveries.forEach(delivery => {
                if (referral.user_id === delivery.user_id) {
                    referral.no_of_deliveries += 1;
                }
            });
        });

        // calculate the no of referrals and sum total deliveries for each referral
        referrals.forEach(referral => {
            referral.no_of_qualified_referrals = 0;
            referrals.forEach(referralx => {
                if (referral.referral_code === referralx.referee_code) {
                    referral.no_of_deliveries += referralx.no_of_deliveries;
                    if (referralx.is_qualified === true) {
                        referral.no_of_qualified_referrals += 1;
                    }
                }
            });
        });

        return res.status(200).send({ status: 'ok', msg: 'Success', referrals, count: referrals.length });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// endpoint to view a particular users referral
router.post('/view_user_referrals', async (req, res) => {
    const { token, referral_code } = req.body;

    if (!token || !referral_code)
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

    try {
        // Token verification
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // Check if admin has been blocked
        const admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();
        if (!admin || admin.status !== true)
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });

        // Fetch user referral documents
        const referrals = await Referral.find({ referee_code: referral_code, ref_for: "user" }).lean();

        if (!referrals.length)
            return res.status(200).send({ status: 'ok', msg: 'No rewarded users found', referrals: [], count: 0 });

        // Gather user IDs
        const user_ids = referrals.map(referral => referral.user_id);

        // Fetch delivery documents of users
        const deliveries = await Delivery.find({ sender_id: { $in: user_ids } }, { timestamp: 1, sender_id: 1, delivery_cost_user: 1 }).lean();

        // Map user deliveries to user IDs for quick lookup
        const userDeliveriesMap = deliveries.reduce((acc, delivery) => {
            if (!acc[delivery.sender_id]) acc[delivery.sender_id.toString()] = [];
            acc[delivery.sender_id.toString()].push(delivery);
            return acc;
        }, {});

        // Process referrals with delivery data
        referrals.forEach(referral => {
            referral.total_no_of_deliveries = userDeliveriesMap[referral.user_id]?.length || 0;
            referral.deliveries = userDeliveriesMap[referral.user_id] || [];
        });

        // Separate referrals based on qualification
        const targets_met = referrals.filter(referral => referral.is_qualified);
        const targets_not_met = referrals.filter(referral => !referral.is_qualified);

        return res.status(200).send({
            status: 'ok',
            msg: 'Success',
            total_deliveries: deliveries.length,
            targets_met,
            targets_not_met,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({ status: 'error', msg: 'An error occurred', error: error.message });
    }
});

// endpoint to view unqualified users
router.post('/view_unqualified_users', async (req, res) => {
    const { token } = req.body;

    if (!token)
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

    try {
        // token verification
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // check if admin has been blocked
        const admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true)
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });

        // update referral documents
        const referrals = await Referral.find({ is_qualified: false, ref_for: "user" }).lean();

        if (referrals.length === 0)
            return res.status(200).send({ status: 'ok', msg: 'no unqualified users found', referrals, count: 0 })
        // Gather user IDs
        const user_ids = referrals.map(referral => referral.user_id);

        // Fetch delivery documents of users
        const deliveries = await Delivery.find({ user_id: { $in: user_ids } }, { timestamp: 1, user_id: 1, delivery_cost_user: 1, is_qualified: 1 }).lean();

        // calculate total deliveries for each referral doc
        referrals.forEach(referral => {
            referral.no_of_deliveries = 0;
            deliveries.forEach(delivery => {
                if (referral.user_id === delivery.user_id) {
                    referral.no_of_deliveries += 1;
                }
            });
        });

        // calculate the no of referrals and sum total deliveries for each referral
        referrals.forEach(referral => {
            referral.no_of_qualified_referrals = 0;
            referrals.forEach(referralx => {
                if (referral.referral_code === referralx.referee_code) {
                    referral.no_of_deliveries += referralx.no_of_deliveries;
                    if (referralx.is_qualified === true) {
                        referral.no_of_qualified_referrals += 1;
                    }
                }
            });
        });

        return res.status(200).send({ status: 'ok', msg: 'Success', referrals, count: referrals.length });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// endpoint to view all users (both qualifed and unqualified)
router.post('/view_all_users', async (req, res) => {
    const { token } = req.body;

    if (!token)
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

    try {
        // token verification
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // check if admin has been blocked
        const admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true)
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });

        // update referral documents
        const referrals = await Referral.find({ is_rewarded: false, ref_for: "user" }).lean();

        if (referrals.length === 0)
            return res.status(200).send({ status: 'ok', msg: 'no unqualified users found', referrals, count: 0 })
        // Gather user IDs
        const user_ids = referrals.map(referral => referral.user_id);

        // Fetch delivery documents of users
        const deliveries = await Delivery.find({ user_id: { $in: user_ids } }, { timestamp: 1, user_id: 1, delivery_cost_user: 1, is_qualified: 1 }).lean();

        // calculate total deliveries for each referral doc
        referrals.forEach(referral => {
            referral.no_of_deliveries = 0;
            deliveries.forEach(delivery => {
                if (referral.user_id === delivery.user_id) {
                    referral.no_of_deliveries += 1;
                }
            });
        });

        // calculate the no of referrals and sum total deliveries for each referral
        referrals.forEach(referral => {
            referral.no_of_qualified_referrals = 0;
            referrals.forEach(referralx => {
                if (referral.referral_code === referralx.referee_code) {
                    referral.no_of_deliveries += referralx.no_of_deliveries;
                    if (referralx.is_qualified === true) {
                        referral.no_of_qualified_referrals += 1;
                    }
                }
            });
        });

        return res.status(200).send({ status: 'ok', msg: 'Success', referrals, count: referrals.length });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// endpoint to view rewarded users
router.post('/view_rewarded_users', async (req, res) => {
    const { token } = req.body;

    if (!token)
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

    try {
        // token verification
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // check if admin has been blocked
        const admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true)
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });

        // update referral documents
        const referrals = await Referral.find({ is_rewarded: true, ref_for: "user" }).lean();

        if (referrals.length === 0)
            return res.status(200).send({ status: 'ok', msg: 'no rewarded users found', referrals, count: 0 })

        return res.status(200).send({ status: 'ok', msg: 'Success', referrals, count: referrals.length });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// endpoint to reward a user
router.post('/reward_user', async (req, res) => {
    const { token, referral_id } = req.body;

    if (!token || !referral_id)
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

    try {
        // token verification
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // check if admin has been blocked
        const admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true)
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });

        // update referral documents
        const referral = await Referral.findOneAndUpdate(
            { _id: referral_id },
            { is_rewarded: true, rewarded_timestamp: Date.now() }).lean();

        return res.status(200).send({ status: 'ok', msg: 'Success' });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// endpoint to view daily rewarded delivery agents
router.post('/view_daily_rewarded_agents', async (req, res) => {
    const { token, day, month, year } = req.body;

    if (!token || !day || month === undefined || month === null || !year)
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

    try {
        // token verification
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // check if admin has been blocked
        const admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true)
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });

        // fetch delivery documents
        const deliveries = await Delivery.find(
            { day: day, month: month, year: year, 'delivery_status.is_completed': true, daily_is_rewarded: true },
            { week: 1, month: 1, year: 1, delivery_status: 1, daily_rewarded_timestamp: 1, daily_reward_notifier: 1, daily_is_rewarded: 1 }
        ).lean();

        // check if there were deliveries
        if (deliveries.length === 0)
            return res.status(200).send({ status: 'ok', msg: 'no rewarded daily agents', delivery_agents: 0, count: 0 })

        // extract the delivery agent ids
        const delivery_agent_ids = deliveries.map((delivery) => delivery.delivery_agent_id);

        // fetch delivery agent documents
        const delivery_agents = await DeliveryAgent.find({ _id: { $in: delivery_agent_ids } }, {
            ref_account_no: 1, ref_bank: 1, service_provider: 1, phone_recharge: 1, fullname: 1, phone_no: 1
        }).lean();

        // check if there were delivery agents
        if (delivery_agents.length === 0)
            return res.status(200).send({ status: 'ok', msg: 'no daily rewarded agents', delivery_agents: 0, count: 0 })

        // populate delivery agent document
        const deliveryMap = new Map();
        deliveries.forEach(delivery => {
            if (!deliveryMap.has(delivery.delivery_agent_id)) {
                deliveryMap.set(delivery.delivery_agent_id, []);
            }
            deliveryMap.get(delivery.delivery_agent_id).push(delivery);
        });

        delivery_agents.forEach(agent => {
            const agentDeliveries = deliveryMap.get(agent._id) || [];
            if (agentDeliveries.length) {
                // agent.daily_reward_notifier = agentDeliveries[0].daily_reward_notifier; // assuming one reward notifier per week
                agent.daily_reward_timestamp = agentDeliveries[0].daily_rewarded_timestamp;
            }
        });

        const { reward_notifier } = await Statistics.findOne(
            { doc_type: 'admin' },
            { target_weekly_deliveries: 1, no_completed_orders_per_referee: 1, target_daily_deliveries: 1, no_of_referees: 1, reward_notifier: 1 }
        ).lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', delivery_agents, count: delivery_agents.length, reward_notifier });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// endpoint to view weekly rewarded agents
router.post('/view_weekly_rewarded_agents', async (req, res) => {
    const { token, week, month, year } = req.body;

    if (!token || !week || month === undefined || month === null || !year)
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

    try {
        // token verification
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // check if admin has been blocked
        const admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

        if (admin.status != true)
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });

        // fetch delivery documents
        const deliveries = await Delivery.find(
            { week: week, month: month, year: year, 'delivery_status.is_completed': true, weekly_is_rewarded: true },
            { week: 1, month: 1, year: 1, delivery_status: 1, weekly_rewarded_timestamp: 1, weekly_reward_notifier: 1, weekly_is_rewarded: 1 }).lean();

        // check if there were deliveries
        if (deliveries.length === 0)
            return res.status(200).send({ status: 'ok', msg: 'no rewarded weekly agents', delivery_agents: 0, count: 0 })

        // extract the delivery agent ids
        const delivery_agent_ids = deliveries.map((delivery) => delivery.delivery_agent_id);

        // fetch delivery agent documents
        const delivery_agents = await DeliveryAgent.find({ _id: { $in: delivery_agent_ids } }, {
            ref_account_no: 1, ref_bank: 1, service_provider: 1, phone_recharge: 1, fullname: 1, phone_no: 1
        }).lean();

        // check if there were delivery agents
        if (delivery_agents.length === 0)
            return res.status(200).send({ status: 'ok', msg: 'no weekly rewarded agents', delivery_agents: 0, count: 0 })

        // populate delivery agent document
        const deliveryMap = new Map();
        deliveries.forEach(delivery => {
            if (!deliveryMap.has(delivery.delivery_agent_id)) {
                deliveryMap.set(delivery.delivery_agent_id, []);
            }
            deliveryMap.get(delivery.delivery_agent_id).push(delivery);
        });

        delivery_agents.forEach(agent => {
            const agentDeliveries = deliveryMap.get(agent._id) || [];
            if (agentDeliveries.length) {
                // agent.weekly_reward_notifier = agentDeliveries[0].weekly_reward_notifier; // assuming one reward notifier per week
                agent.weekly_reward_timestamp = agentDeliveries[0].weekly_rewarded_timestamp;
            }
        });

        const { reward_notifier } = await Statistics.findOne(
            { doc_type: 'admin' },
            { target_weekly_deliveries: 1, no_completed_orders_per_referee: 1, target_daily_deliveries: 1, no_of_referees: 1, reward_notifier: 1 }
        ).lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', delivery_agents, count: delivery_agents.length, reward_notifier });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// // endpoint to set user reward notifier
// router.post('/set_user_reward_notifier', async (req, res) => {
//     const { token, referral_id, reward_notifier } = req.body;

//     if (!token || !referral_id || !reward_notifier)
//         return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

//     try {
//         // token verification
//         const verify = jwt.verify(token, process.env.JWT_SECRET);

//         // check if admin has been blocked
//         const admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

//         if (admin.status != true)
//             return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });

//         // update referral documents
//         const referral = await Referral.findOneAndUpdate(
//             { _id: referral_id },
//             { reward_notifier: reward_notifier }).lean();

//         return res.status(200).send({ status: 'ok', msg: 'Success', referral });
//     }

//     catch (error) {
//         console.log(error);
//         return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
//     }
// });

// // set delivery agent daily reward notifier
// router.post('/set_agent_daily_reward_notifier', async (req, res) => {
//     const { token, day, month, year, delivery_agent_id, reward_notifier } = req.body;

//     if (!token || !day || month === undefined || month === null || !year || !delivery_agent_id || !reward_notifier)
//         return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

//     try {
//         // token verification
//         const verify = jwt.verify(token, process.env.JWT_SECRET);

//         // check if admin has been blocked
//         const admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

//         if (admin.status != true)
//             return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });

//         // fetch delivery documents
//         await Delivery.updateMany(
//             { day: day, month: month, year: year, 'delivery_status.is_completed': true, delivery_agent_id: delivery_agent_id },
//             { daily_reward_notifier: reward_notifier }).lean();

//         return res.status(200).send({ status: 'ok', msg: 'Success' });
//     }

//     catch (error) {
//         console.log(error);
//         return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
//     }
// });

// // set delivery agent weekly reward notifier
// router.post('/set_agent_weekly_reward_notifier', async (req, res) => {
//     const { token, week, month, year, delivery_agent_id, reward_notifier } = req.body;

//     if (!token || !week || month === undefined || month === null || !year || !delivery_agent_id || !reward_notifier)
//         return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

//     try {
//         // token verification
//         const verify = jwt.verify(token, process.env.JWT_SECRET);

//         // check if admin has been blocked
//         const admin = await Admin.findOne({ _id: verify._id }).select(['-password']).lean();

//         if (admin.status != true)
//             return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });

//         // fetch delivery documents
//         await Delivery.updateMany(
//             { week: week, month: month, year: year, 'delivery_status.is_completed': true, delivery_agent_id: delivery_agent_id },
//             { weekly_reward_notifier: reward_notifier }).lean();

//         return res.status(200).send({ status: 'ok', msg: 'Success' });
//     }

//     catch (error) {
//         console.log(error);
//         return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
//     }
// });

module.exports = router;