const mongoose  = require('mongoose');

const adminSchema = new mongoose.Schema({
    doc_type: {type: String, default: 'Admin'},
    email: {type: String, required: true, unique: true},
    fullname: {type: String, required: true},
    phone_no: {type: String},
    username: {type: String, unique: true},
    password: String,
    activity_pin: String,
    role: [String],
    status: {type: Boolean, default: true},
    img: String,
    img_id: String,
    is_deleted: {type: Boolean, default: false}
}, {collection: 'admins'});

const model = mongoose.model('Admin', adminSchema);
module.exports = model