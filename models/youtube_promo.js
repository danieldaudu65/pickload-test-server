const mongoose  = require('mongoose');

const promoSchema = mongoose.Schema({
    doc_type: {type: String, required: true}, //user, rider, promo
    clip_url: {type: String, default: 'o', required: true},
    // thumbnail_id: {type: String, default: 'o'},
    // thumbnail_url: {type: String, default: 'o'},
    posted_by: {type: String, default: 'Admin'},//just using this to get the doc
}, {collection: 'youtube_promo'});

const model = mongoose.model('Promo', promoSchema);
module.exports = model