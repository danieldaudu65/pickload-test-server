const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
    timestamp: Number,
    conversation_id: String,
    sender_name: String,
    sender_id: String,
    content: String
}, {collection: 'Messages'});

const model = mongoose.model('Message', messageSchema);
module.exports = model;