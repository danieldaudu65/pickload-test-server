const mongoose = require('mongoose');

const paymentCheckSchema = mongoose.Schema({
    transaction_date: String,
    transaction_type: String,
    vehicle_type: String,
    not_paids: [{
        agent_id: String,
        status: {type: String, default: 'not_paid'}
    }]
}, {collection: 'payment_checks'});

const model = mongoose.model('PaymentCheck', paymentCheckSchema);
module.exports = model;