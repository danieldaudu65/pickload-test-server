const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
    ref_for: {type: String, default: "user"}, // the account type of the ref document. either user or delivery agent
    referee_code: String, // code of the account that reffered this user
    referral_code: String, // code of this user
    user_id: String,
    fullname: String,
    phone_no: String, // the accounts phone number
    phone_recharge: {type: String, default: ""}, // phone number to recharge
    service_provider: {type: String, default: ""},
    ref_account_no: {type: String, default: ""},
    ref_bank: {type: String, default: ""},
    ref_account_name: {type: String, default: ""},
    no_of_completed_deliveries: {type: Number, default: 0},
    no_of_referrals: {type: Number, default: 0},
    is_rewarded: { type: Boolean, default: false },
    is_qualified: {type: Boolean, default: false},
    is_claimed: {type: Boolean, default: false},
    reward_notifier: { type: String, default: "" },
    is_daily: {type: Boolean, default: null}, // set for the delivery agent reward. true when it's daily and false when it's weekly
    rewarded_timestamp: Number,
    week: Number, // the week the deliveries was made for the da reward
    day: Number, // the day the deliveries was made for the da reward
    timestamp: Number
}, { collection: 'referrals' });

const model = mongoose.model('Referral', referralSchema);
module.exports = model;