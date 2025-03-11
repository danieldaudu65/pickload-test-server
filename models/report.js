const mongoose = require('mongoose');

const ReportsSchema = mongoose.Schema({
    user_name: String, 
    user_id: String,
    user_img_url: String,
    user_email: String,
    delivery_agent_name: String,
    delivery_agent_id: String,
    delivery_agent_img_url: String,
    delivery_agent_code: String,
    delivery_agent_email: String,
    body: String, 
    report_img_urls: [String],
    report_img_ids: [String],
    timestamp: Number, 
    delivery_id: String, 
    delivery_type: String,
    delivery_img_urls: String,
    delivery_code: String, 
    is_resolved: Boolean, 
    resolved_timestamp: Number,
    reporter: {type: String, enum: ['delivery agent', 'user']}
}, {collection: 'reports'});

const model = mongoose.model('Report', ReportsSchema)
module.exports = model;