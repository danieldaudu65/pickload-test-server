const mongoose  = require('mongoose');

const youtubechema = mongoose.Schema({
    doc_type: String, //user, rider, gen
    video_url: String,
    thumbnail_url: String,
    thumbnail_id: String,
    place: String,
}, {collection: 'youtube'});

const model = mongoose.model('Youtube', youtubechema);
module.exports = model