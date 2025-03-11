const mongoose = require('mongoose');

const requestSchema = mongoose.Schema({   
    delivery_agent_name: String,
    delivery_agent_id: String,
    fleet_manager_code: String, //for single delivery_agent registered under a fleet
    img_url: String,
    type_of_delivery_agent: {type: String, enum: ['delivery agent', 'fleet manager']},
    time_of_registration: Number,
    approval_status: { type: String, enum: [ 'pending', 'approved', 'declined' ] },
    vehicle_details: {
        plate_no: {type: String, default: 'nil'},
        color: {type: String, default: 'nil'},
        type: {type: String, default: 'nil'},
        name: {type: String, default: 'nil'},
        img_urls: [String]
    }
}, {collection: 'delivery_agent_reg_requests'})

const model = mongoose.model('delivery_agentRegRequest', requestSchema);
module.exports = model;