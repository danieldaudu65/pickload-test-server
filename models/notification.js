const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    noti_type: String, //delivery_request, instant_delivery_request, scheduled_delivery_request, accepted_delivery_request, canceled_delivery, user_payment, arrived_location, timed_out, call, started_delivery, completed_delivery, msg, system_message, paid_noti, refund_noti
    delivery_id: String,
    user_id: String,
    to_id: {type: String, default: ''},
    delivery_agent_ids: [String],
    receiver_ids: [String],
    parcel_code: String,
    user_name: String,
    delivery_agent_name: String,
    delivery_agent_img: String,
    delivery_agent_img_id: String,
    pickup_location : String,
    drop_off_location: String,
    timestamp: Number,
    content: String,
    is_accepted: {type: Boolean, default: false},
    is_accepted_by_id: String,
    is_deleted: {type: Boolean, default: false}
}, {collection: 'notifications'});

const model = mongoose.model('Notification', notificationSchema);
module.exports = model;