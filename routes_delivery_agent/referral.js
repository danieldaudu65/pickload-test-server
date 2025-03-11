const express = require('express');
const jwt = require('jsonwebtoken');

const DeliveryAgent = require("../models/delivery_agent");
const Delivery = require("../models/delivery");
const Statistics = require("../models/statistics");

const { sendOTP } = require('../utils/nodemailer');

const router = express.Router();

let OTP;
// endpoint to set referral reward details
router.post('/set_referral_reward_details', async (req, res) => {
    const { token, phone_recharge, service_provider, ref_account_no, ref_bank, ref_account_name } = req.body;

    if (!token)
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

    try {
        // token verification
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // fetch and update referral document
        const delivery_agent = await DeliveryAgent.findOne({ _id: verify._id }, {
            phone_recharge: 1, service_provider: 1, ref_account_no: 1, ref_bank: 1, ref_account_name: 1
        });
        delivery_agent.phone_recharge = phone_recharge || delivery_agent.phone_recharge;
        delivery_agent.service_provider = service_provider || delivery_agent.service_provider;
        delivery_agent.ref_account_no = ref_account_no || delivery_agent.ref_account_no;
        delivery_agent.ref_bank = ref_bank || delivery_agent.ref_bank;
        delivery_agent.ref_account_name = ref_account_name || delivery_agent.ref_account_name;

        await delivery_agent.save();

        return res.status(200).send({ status: 'ok', msg: 'Success', delivery_agent });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// endpoint to request for referral otp
router.post("/request_for_referral_otp", async (req, res) => {
    const { phone_no } = req.body;

    if (!phone_no) {
        return res
            .status(400)
            .send({ status: "error", msg: "Please enter Phone number or email" });
    }

    try {
        // check if delivery_agent with this phone number exists
        const delivery_agent = await DeliveryAgent.findOne({ phone_no: phone_no, is_deleted: false }, { _id: 1, email: 1 }).lean();
        if (!delivery_agent)
            return res.status(400).send({ status: 'error', msg: `user not found` });
        OTP = '';
        for (let i = 0; i < 6; i++) {
            OTP += process.env.TWILIO_DIGITS[Math.floor(Math.random() * 10)];
        }
        console.log(OTP);

        // get the email attached to the account
        sendOTP(delivery_agent.email, OTP);

        // const result = await africastalking.SMS.send(process.env.AFRICASTALKING_SENDER_NAME == 'a' ? {
        //   to: phone_no,
        //   message: `Pickload: Your OTP verification code is ${OTP}`
        // } : {
        //   to: phone_no,
        //   message: `Pickload: Your OTP verification code is ${OTP}`,
        //   from: `${process.env.AFRICASTALKING_SENDER_NAME}`
        // });

        //console.log(result);
        return res.status(200).send({ status: 'ok', msg: 'Success', email: delivery_agent.email });

    } catch (e) {
        console.log(e);
        return res.status(403).send({ status: "error", msg: "An error occured", e });
    }
});

// endpoint to verify otp for referral feature (has the login feature)
router.post("/verify_otp_for_referral", async (req, res) => {
    const { otp, email } = req.body;

    if (!otp || !email) {
        return res
            .status(400)
            .send({ status: "error", msg: "all fields must be filled" });
    }
    try {
        if (otp != OTP) {
            return res.status(400).send({ status: 'error', msg: 'Incorrect OTP' });
        }
        OTP = '';

        // fetch delivery_agent details
        const delivery_agent = await DeliveryAgent.findOne({ email: email }, { phone_no: 1 }).lean();

        const token = jwt.sign(
            {
                _id: delivery_agent._id,
                phone_no: delivery_agent.phone_no,
            },
            process.env.JWT_SECRET
        );

        return res.status(200).send({ status: 'ok', msg: 'Success', token });
    } catch (e) {
        console.log(e);
        return res.status(403).send({ status: "error", msg: "An error occured", e });
    }
});

// endpoint to view daily qualified delivery agent
router.post('/view_daily_qualified_agent', async (req, res) => {
    const { token, day, month, year } = req.body;

    if (!token || !day || month === undefined || month === null || !year)
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

    try {
        // token verification
        const {_id} = jwt.verify(token, process.env.JWT_SECRET);

        // fetch delivery documents
        const deliveries = await Delivery.find(
            { delviery_agent_id: _id, day: day, month: month, year: year, 'delivery_status.is_successful': true, daily_is_rewarded: false },
            { week: 1, month: 1, year: 1, delivery_status: 1, weekly_rewarded_timestamp: 1, weekly_reward_notifier: 1, weekly_is_rewarded: 1 }
        ).lean();

        // fetch reward statistics
        const { target_daily_deliveries } = Statistics.findOne({ doc_type: 'admin' }, {
            target_daily_deliveries: 1
        }).lean();

        // check if deliveries exists
        if (deliveries.length < target_daily_deliveries)
            return res.status(200).send({ status: 'ok', msg: 'not qualified for this day' })

        const {reward_notifier} = await Statistics.findOne(
            { doc_type: 'admin' },
            { target_weekly_deliveries: 1, no_completed_orders_per_referee: 1, target_daily_deliveries: 1, no_of_referees: 1, reward_notifier: 1 }
        ).lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', deliveries, reward_notifier });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// endpoint to view weekly qualified delivery agent
router.post('/view_weekly_qualified_agent', async (req, res) => {
    const { token, week, month, year } = req.body;

    if (!token || !week || month === undefined || month === null || !year)
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

    try {
        // token verification
        const {_id} = jwt.verify(token, process.env.JWT_SECRET);

        // fetch delivery documents
        const deliveries = await Delivery.find(
            { delviery_agent_id: _id, week: week, month: month, year: year, 'delivery_status.is_successful': true, weekly_is_rewarded: false },
            { week: 1, month: 1, year: 1, delivery_status: 1, weekly_rewarded_timestamp: 1, weekly_reward_notifier: 1, weekly_is_rewarded: 1 }
        ).lean();

        // fetch reward statistics
        const { target_weekly_deliveries } = Statistics.findOne({ doc_type: 'admin' }, {
            target_weekly_deliveries: 1
        }).lean();

        // check if deliveries exists
        if (deliveries.length < target_weekly_deliveries)
            return res.status(200).send({ status: 'ok', msg: 'not qualified for this day' })

        const {reward_notifier} = await Statistics.findOne(
            { doc_type: 'admin' },
            { target_weekly_deliveries: 1, no_completed_orders_per_referee: 1, target_daily_deliveries: 1, no_of_referees: 1, reward_notifier: 1 }
        ).lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', deliveries, reward_notifier });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// // endpoint to set delivery agent documents
// router.post("/update", async (req, res) => {

//     try {
//         await DeliveryAgent.updateMany({}, {
//             $set: {
//                 phone_recharge: "",
//                 service_provider: "",
//                 ref_account_name: "",
//                 ref_account_no: "",
//                 ref_bank: ""
//             }
//         })

//         return res.status(200).send({ status: 'ok', msg: 'Success' });
//     } catch (e) {
//         console.log(e);
//         return res.status(500).send({ status: "error", msg: "An error occured", e });
//     }
// });

module.exports = router;