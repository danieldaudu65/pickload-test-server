const mongoose = require('mongoose');

const AdminIdsSchema = mongoose.Schema({
    doc_type: {type: String, default: 'admin_ids'},
    ids: [String],
    count : {type: Number, defualt: 0}
}, {collection: 'admin_ids'});

const model = mongoose.model('AdminIds', AdminIdsSchema);
module.exports = model;