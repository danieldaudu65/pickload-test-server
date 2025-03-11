const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    doc_type: {type: String, default: 'user'},
    fullname: String,
    email: {type: String, required: true},
    phone_no: {type: String, required: true},
    // nin: {type: Number},
    img: String,
    img_id: String,
    account_status: { type: String, default: 'active'},
    stats: {
        total_expenditure: {type: Number, default: 0},
        total_delivery_requests: {type: Number, default: 0},
        total_transactions: {type: Number, default: 0},
        total_instant_deliveries: {type: Number, default: 0},
        total_scheduled_deliveries: {type: Number, default: 0},
        total_cancelled_deliveries: {type: Number, default: 0},
        total_successful_deliveries: {type: Number, default: 0},
        total_pending_deliveries: {type: Number, default: 0},
        total_user_reports: {type: Number, default: 0}
    },
    referral_code: String,
    referee_code: String,
    no_of_referrals: {type: Number, default: 0},
    created_at: Number,
    last_login: Number,
    last_logout: Number, 
    device_token: String,
    is_deleted: {type: Boolean, default: false},
    is_blocked: {type: Boolean, default: false},
    os_type: {type: String, default: ''}
}, {collection: 'users'});

const model = mongoose.model('User', userSchema);
module.exports = model;