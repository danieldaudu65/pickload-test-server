const mongoose = require('mongoose');

// add fields to track unread messages for each user
const convoSchema = mongoose.Schema({
    doc_type: {type: String, default: 'conversations'},
    members: [String],
    timestamp: Number,
    conv_type: {type: String, default: 'chat'}, // chat, help_feedback,
    which_user: {type: String, default: 'nil'},
    latest_message: {
        _id: String,
        timestamp: Number,
        conversation_id: String,
        sender_name: String,
        sender_id: String,
        sender_img: String,
        content: String
    },

}, {collection: 'Conversations'});

const model = mongoose.model('Conversation', convoSchema);
module.exports = model;