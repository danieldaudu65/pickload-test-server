const mongoose = require('mongoose');

const Bank_account_change_requestSchema = mongoose.Schema({
    delivery_agent_id: String,
    delivery_agent_name: String,
    old_bank_name: String,
    old_account_no: String,
    old_account_name: String,
    old_accont_type: String,
    old_bvn: String,
    new_bank_name: String,
    new_account_no: String,
    new_account_name: String,
    new_accont_type: String,
    new_bvn: String,
    status: {type: String, enum: ['pending', 'approved', 'declined'], default: 'pending'}
}, {collection: 'bank_account_change_request'});

const model = mongoose.model('Request', Bank_account_change_requestSchema);
module.exports = model;