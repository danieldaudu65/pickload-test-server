const mongoose = require('mongoose');

const percentageSchema = mongoose.Schema({
    doc_type: {type: String, default: 'percentage'},
    delivery_percentage: {type: Number, default: 10},
    cancel_delivery_refund_percentage: {type: Number, default: 25}
}, { collections: 'percentages' });

const model = mongoose.model('Percentage', percentageSchema);
module.exports = model