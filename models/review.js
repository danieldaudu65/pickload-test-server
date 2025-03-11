const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user_img: String,
    user_id: String,
    user_img_id: String,
    user_name: String,
    review: String,
    timestamp: Number,
    stars: Number,
    delivery_agent_id: String,
    critical: {type: Boolean, default: false},
    delivery_id: {type: String, default: ""}
}, {collection: 'reviews'});

const model = mongoose.model('Review', reviewSchema);
module.exports = model;