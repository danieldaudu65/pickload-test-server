const mongoose = require('mongoose');

const Delivery_agentSchema = new mongoose.Schema({
    is_firebase_account_created: {type: Boolean, default: false},
    fullname: {type: String, required: true},
    phone_no: {type: String, required: true},
    email: {type: String, required: true},
    //password: {type: String, required: true},// not being used again
    address: {type: String, required: true},
    state: {type: String, required: true},
    city: {type: String, required: true},
    gender: {type: String},
    location: String,
    nin: {type: Number, required: true},
    company_name: String,
    cac_reg_no: String,
    approval_status: { type: String, enum: [ 'pending', 'approved', 'declined' ] },
    registration_stage: String,
    delivery_agent_code: {type: String},
    fleet_size: {type: Number, default: 0},
    fleet_name: String,
    fleet_manager_id: String,
    fleet_manager_code: String,
    img_url: {type: String},
    img_id: {type: String},
    is_online: {type: Boolean, default: false},
    is_available_for_work: {type: Boolean, default: false},
    status: {type: String, enum: ['active', 'pending', 'blocked', 'inactive'], default: 'pending'},
    is_blocked_via: String,
    is_blocked: {type: Boolean, default: false},
    confirmation_code: {type: String, unique: true},
    delivery_agent_type: {type: String, enum: ['delivery agent', 'fleet manager'], default: 'delivery agent'},
    no_of_vehicles: {type: Number, default: 0},
    no_accepted_deliveries: {type: Number, default: 0},
    no_completed_deliveries: {type: Number, default: 0}, 
    no_successful_deliveries: {type: Number, default: 0},
    no_cancelled_deliveries: {type: Number, default: 0},
    no_declined_deliveries: {type: Number, default: 0},
    no_of_instant_deliveries: {type: Number, default: 0},
    no_of_scheduled_deliveries: {type: Number, default: 0},
    vehicle_details: {
        plate_no: {type: String, default: 'nil'},
        color: {type: String, default: 'nil'},
        type: {type: String, default: 'nil'},
        name: {type: String, default: 'nil'},
        driver_license_expiry_date: {type: String, default: 'nil'},
        img_urls: [String],
        img_ids: [String],
    },
    fleet_manager_delivery_agents: [{
        delivery_agent_id: String,
        img_url: String,
        fullname: String,
        ratings: Number,
        no_successful_deliveries: Number,
        email: String,
        phone_no: String,
        vehicle_type: String
    }],
    // delivery agent under fleet manager deliveries statistics
    fleet_manager_delivery_agents_deliveries: {
        no_accepted_deliveries: {type: Number, default: 0},
        no_completed_deliveries: {type: Number, default: 0}, 
        no_successful_deliveries: {type: Number, default: 0},
        no_cancelled_deliveries: {type: Number, default: 0},
        no_declined_deliveries: {type: Number, default: 0},
        no_of_instant_deliveries: {type: Number, default: 0},
        no_of_scheduled_deliveries: {type: Number, default: 0},
    },
    //  delivery agent under fleet manager deliveries stats plus personal stats
    total_deliveries_stats: {
        total_no_accepted_deliveries: {type: Number, default: 0},
        total_no_completed_deliveries: {type: Number, default: 0}, 
        total_no_successful_deliveries: {type: Number, default: 0},
        total_no_cancelled_deliveries: {type: Number, default: 0},
        total_no_declined_deliveries: {type: Number, default: 0},
        no_of_instant_deliveries: {type: Number, default: 0},
        no_of_scheduled_deliveries: {type: Number, default: 0},
    },
    fleet_manager_vehicles: {
        no_of_cars: {type: Number, default: 0},
        no_of_trucks: {type: Number, default: 0},
        no_of_bikes: {type: Number, default: 0},
        no_of_vans: {type: Number, default: 0}
    },
    bank_details: {
        bank_name: String,
        account_no: String,
        account_name: String,
        account_type: String,
        bvn: String
    },
    total_earnings: {type: Number, default: 0},
    registration_time: Number,
    last_login: Number,
    rating: {
        total_rating: {type: Number, default: 0},
        average_rating: {type: Number, default: 0}, // this should be removed when it is confirmed that there are no usages already
        rating_count: {type: Number, default: 0}
    },
    reviews: {},
    payable_amount: {type: Number, default: 0},
    non_payable_amount: {type: Number, default: 0},
    device_token: String,
    is_deleted: {type: Boolean, default: false},
    no_of_referrals: {type: Number, default: 0},
    os_type: {type: String, default: ''},
    phone_recharge: {type: String, default: ''},
    service_provider: {type: String, default: ''},
    ref_account_no: {type: String, default: ''},
    ref_bank: {type: String, default: ''},
    ref_account_name: {type: String, default: ""}
}, {collection: 'delivery_agents'});

const model = mongoose.model('Delivery_agent', Delivery_agentSchema);
module.exports = model;