const mongoose = require('mongoose');
const transactionSchema = new mongoose.Schema({
    user_id: String,
    user_name: String,
    delivery_id: String,
    delivery_agent_id: String,
    delivery_agent_name: String,
    delivery_medium: String,
    delivery_type: String,
    delivery_agent_code: String,
    parcel_code: String,
    parcel_name: String,
    timestamp: Number,
    year: Number,
    month: Number,
    week: Number,
    day: Number,
    amt: Number,
    completed_year: {type: Number, default: 0},
    completed_month: {type: Number, default: 0},
    completed_week: {type: Number, default: 0},
    completed_day: {type: Number, default: 0},
    amt_for_delivery_agent: Number,
    to_fleet: Boolean,
    ref: String,
    method: String,
    fleet_manager_id: String,
    status: {type: String, enum: ['Success', 'Pending', 'Failed']},
    is_completed: {type: Boolean, default: false} // field to check if the delivery that was paid for has been completed
}, {collection: 'transactions'});

const model = mongoose.model('Transaction', transactionSchema);
module.exports = model