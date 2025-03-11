const express = require('express');
const jwt = require('jsonwebtoken');

const User = require("../models/user");
const Referral = require("../models/referral");
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
        const referral = await Referral.findOne({ user_id: verify._id });
        referral.phone_recharge = phone_recharge || referral.phone_recharge;
        referral.service_provider = service_provider || referral.service_provider;
        referral.ref_account_no = ref_account_no || referral.ref_account_no;
        referral.ref_bank = ref_bank || referral.ref_bank;
        referral.is_claimed = true;
        referral.ref_account_name = ref_account_name || referral.ref_account_name;

        await referral.save();

        return res.status(200).send({ status: 'ok', msg: 'Success', referral });
    }

    catch (error) {
        console.log(error);
        return res.status(500).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// check if user is eligible to claim awards
router.post('/check_reward_eligibility', async (req, res) => {
    const { token } = req.body;

    if (!token)
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });

    try {
        // token verification
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // fetch referrala document
        const referral = await Referral.findOne({ user_id: verify._id }, { is_rewarded: 1, is_qualified: 1, is_claimed: 1 }).lean();

        // check if he has not claimed the reward he is eligible for
        if (referral.is_claimed === false && referral.is_qualified === true)
            return res.status(200).send({ status: "ok", msg: "your're eligible to claim rewards", reward_notifier: referral.reward_notifier });

        // check if user has claimed a reward and pickload has not rewarded him yet
        if (referral.is_claimed === true && referral.is_rewarded === false)
            return res.status(200).send({ status: "ok", msg: "your reward is on the way", reward_notifier: referral.reward_notifier });

        // check if pickload has rewarded him
        if (referral.is_rewarded === true)
            return res.status(200).send({ status: "ok", msg: "you have benefited already", reward_notifier: referral.reward_notifier });

        return res.status(200).send({ status: 'ok', msg: 'Success' });
    }

    catch (error) {
        console.log(error);
        return res.status(500).send({ status: 'error', msg: 'Some error occurred', error });
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
        // check if user with this email exists
        const user = await User.findOne({ phone_no: phone_no, is_deleted: false }, { _id: 1, email: 1 }).lean();
        if (!user)
            return res.status(400).send({ status: 'error', msg: `user not found` });
        OTP = '';
        for (let i = 0; i < 6; i++) {
            OTP += process.env.TWILIO_DIGITS[Math.floor(Math.random() * 10)];
        }

        // get the email attached to the account
        sendOTP(user.email, OTP);

        // const result = await africastalking.SMS.send(process.env.AFRICASTALKING_SENDER_NAME == 'a' ? {
        //   to: phone_no,
        //   message: `Pickload: Your OTP verification code is ${OTP}`
        // } : {
        //   to: phone_no,
        //   message: `Pickload: Your OTP verification code is ${OTP}`,
        //   from: `${process.env.AFRICASTALKING_SENDER_NAME}`
        // });

        //console.log(result);
        return res.status(200).send({ status: 'ok', msg: 'Success', email: user.email });

    } catch (e) {
        console.log(e);
        return res.status(500).send({ status: "error", msg: "An error occured", e });
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

        // fetch user details
        const user = await User.findOne({ email: email }, { phone_no: 1, referral_code: 1 }).lean();

        const token = jwt.sign(
            {
                _id: user._id,
                phone_no: user.phone_no,
            },
            process.env.JWT_SECRET
        );

        return res.status(200).send({ status: 'ok', msg: 'Success', token, referral_code: user.referral_code });
    } catch (e) {
        console.log(e);
        return res.status(500).send({ status: "error", msg: "An error occured", e });
    }
});


// // create user referral documents
// router.post("/create", async (req, res) => {
//     try {
//         const users = await User.find({}).lean();

//         const timestamp = Date.now();

//         const referrals = users.map((user) => ({
//             user_id: user._id,
//             fullname: user.fullname,
//             phone_no: user.phone_no,
//             no_of_completed_deliveries: user.stats.total_successful_deliveries,
//             reward_notifier: "cash",
//             rewarded_timestamp: 1,
//             timestamp: timestamp,
//             ref_for: "user",
//             referral_code: user.referral_code
//         }));

//         const res1 = await Referral.insertMany(referrals);


//         return res.status(200).send({ status: 'ok', msg: 'success', res1 });
//     } catch (e) {
//         console.log(e);
//         return res.status(500).send({ status: "error", msg: "An error occured", e });
//     }
// });

module.exports = router;