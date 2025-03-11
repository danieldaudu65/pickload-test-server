const express = require('express');
const jwt = require('jsonwebtoken');

const Admin = require('../models/admin');
const User = require('../models/user');
const Delivery_agent = require('../models/delivery_agent');
const Delivery = require('../models/delivery');

const router = express.Router();

// Endpoint to search all active users
router.post('/users', async (req, res) => {
    const { token, search, pageCount, resultPerPage } = req.body;

    if(!token || !search || !pageCount || !resultPerPage) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }
        
        let page = (pageCount > 1) ? pageCount : 1;
        page -= 1;

        let users = await User.find({
            is_deleted: false,
            account_status: 'active',
            $or: [
                { fullname: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { phone_no: new RegExp(search, 'i') },
            ]
        }) 
        .select([ 'fullname', 'email', 'img', 'phone_no', 'stats.total_expenditure' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let usersCount = await User.find({
            is_deleted: false,
            account_status: 'active',
            $or: [
                { fullname: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { phone_no: new RegExp(search, 'i') },
            ]
        }).select([ '_id' ]).lean();

        let count = usersCount.length;
        
        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No user found, try another search' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, users });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to search all active delivery_agents
router.post('/delivery_agents', async (req, res) => {
    const { token, search, pageCount, resultPerPage } = req.body;

    if(!token || !search ||!pageCount || !resultPerPage) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }
        
        let page = (pageCount > 1) ? pageCount : 1;
        page -= 1;

        let delivery_agents = await Delivery_agent.find({
            is_deleted: false,
            approval_status: 'approved',
            status: 'active',
            delivery_agent_type: 'delivery agent',
            $or: [
                { fullname: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { phone_no: new RegExp(search, 'i') },
            ]
        })
        .select([ 'fullname', 'img_url', 'delivery_agent_code', 'email', 'phone_no', 'total_earnings' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countDeliveryAgents = await Delivery_agent.find({
            is_deleted: false,
            approval_status: 'approved',
            status: 'active',
            delivery_agent_type: 'delivery agent',
            $or: [
                { fullname: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { phone_no: new RegExp(search, 'i') },
            ]
        }).select([ '_id' ]).lean();

        let count = countDeliveryAgents.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No delivery agent found, try another search' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, delivery_agents });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to search all active fleet_managers
router.post('/fleet_managers', async (req, res) => {
    const { token, search, pageCount, resultPerPage } = req.body;

    if(!token || !search || !pageCount || !resultPerPage) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }
        
        let page = (pageCount > 1) ? pageCount : 1;
        page -= 1;

        let fleet_managers = await Delivery_agent.find({
            is_deleted: false,
            approval_status: 'approved',
            status: 'active',
            delivery_agent_type: 'fleet manager',
            $or: [
                { fleet_name: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { phone_no: new RegExp(search, 'i') }
            ]
        })
        .select([ 'fleet_name', 'img_url', 'fleet_manager_code', 'email', 'phone_no', 'total_earnings' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countFleetManagers = await Delivery_agent.find({
            is_deleted: false,
            approval_status: 'approved',
            status: 'active',
            delivery_agent_type: 'fleet manager',
            $or: [
                { fleet_name: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { phone_no: new RegExp(search, 'i') },
            ]
        }).select([ '_id' ]).lean();

        let count = countFleetManagers.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No fleet manager found, try another search' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, fleet_managers });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to search all pickload delivery_agents
router.post('/pickload_delivery_agents', async (req, res) => {
    const { token, search, pageCount, resultPerPage } = req.body;

    if(!token || !search ||!pageCount || !resultPerPage) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }
        
        let page = (pageCount > 1) ? pageCount : 1;
        page -= 1;

        let pickload_agents = await Delivery_agent.find({
            is_deleted: false,
            approval_status: 'approved',
            status: 'active',
            delivery_agent_type: 'delivery agent',
            fleet_manager_code: process.env.PICKLOAD_FLEET_ID,
            $or: [
                { fullname: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { phone_no: new RegExp(search, 'i') },
            ]
        })
        .select([ 'fullname', 'img_url', 'delivery_agent_code', 'email', 'phone_no', 'total_earnings' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        if(pickload_agents.length == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No delivery agent found, try another search' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count: pickload_agents.length, pickload_agents });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to search all non-pickload delivery_agents
router.post('/non-pickload_delivery_agents', async (req, res) => {
    const { token, search, pageCount, resultPerPage } = req.body;

    if(!token || !search ||!pageCount || !resultPerPage) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }
        
        let page = (pageCount > 1) ? pageCount : 1;
        page -= 1;

        let delivery_agents = await Delivery_agent.find({
            is_deleted: false,
            approval_status: 'approved',
            status: 'active',
            delivery_agent_type: 'delivery agent',
            fleet_manager_code: { $ne: process.env.PICKLOAD_FLEET_ID },
            $or: [
                { fullname: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { phone_no: new RegExp(search, 'i') },
            ]
        })
        .select([ 'fullname', 'img_url', 'delivery_agent_code', 'email', 'phone_no', 'total_earnings' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        if(delivery_agents.length == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No delivery agent found, try another search' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count: delivery_agents.length, delivery_agents });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

/* Endpoint to search all active admins
   This endpoint can only be assessed by the master admin */   
router.post('/admins', async (req, res) => {
    const { token, search, pageCount, resultPerPage } = req.body;

    if(!token || !search || !pageCount || !resultPerPage) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let master = jwt.verify(token, process.env.JWT_SECRET);

        master = await Admin.findOne({ _id: master._id }).select([ '-password' ]).lean();

        if(!(master.role.some(role => role == 'master'))) {
            return res.status(400).send({ status: 'error', msg: 'Please login with master admin account' });
        }
        
        let page = (pageCount > 1) ? pageCount : 1;
        page -= 1;

        let admins = await Admin.find({
            is_deleted: false,
            status: true,
            $or: [
                { fullname: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { phone_no: new RegExp(search, 'i') }
            ]
        })
        .select([ 'fullname', 'img', 'role', 'email', 'phone_no' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countAdmins = await Admin.find({
            is_deleted: false,
            status: true,
            $or: [
                { fullname: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { phone_no: new RegExp(search, 'i') }
            ]
        }).select([ '_id' ]).lean();

        let count = countAdmins.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No admin found, try another search' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, admins });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

//Endpoint to search all deliveries
router.post('/deliveries', async (req, res) => {
    const { token, search, pageCount, resultPerPage } = req.body;

    if(!token || !search || !pageCount || !resultPerPage) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }
        
        let page = (pageCount > 1) ? pageCount : 1;
        page -= 1;

        let deliveries = await Delivery.find({
            $or: [
                { delivery_medium: new RegExp(search, 'i') },
                { sender_fullname: new RegExp(search, 'i') },
                { parcel_name: new RegExp(search, 'i') },
                { parcel_code: new RegExp(search, 'i') },
                { delivery_agent_name: new RegExp(search, 'i') },
                { delivery_agent_phone_no: new RegExp(search, 'i') },
                { sender_phone_no: new RegExp(search, 'i') }
            ]
        })
        .select(['sender_id', 'sender_fullname', 'sender_phone_no', 'delivery_agent_name', 'delivery_agent_phone_no', 'delivery_type', 'timestamp', 'delivery_status', 'parcel_name', 'parcel_code', 'delivery_medium' ])
        .sort({ timestamp: -1 })
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countDeliveries = await Delivery.find({
            $or: [
                { delivery_medium: new RegExp(search, 'i') },
                { sender_fullname: new RegExp(search, 'i') },
                { parcel_name: new RegExp(search, 'i') },
                { parcel_code: new RegExp(search, 'i') },
                { delivery_agent_name: new RegExp(search, 'i') },
                { delivery_agent_phone_no: new RegExp(search, 'i') },
                { sender_phone_no: new RegExp(search, 'i') }
            ]
        }).select([ 'sender_fullname' ]).lean();

        let count = countDeliveries.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No deliveries available, please try another search' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, deliveries });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

//Endpoint to search all instant deliveries
router.post('/instant_deliveries', async (req, res) => {
    const { token, search, pageCount, resultPerPage } = req.body;
    console.log(search, typeof search);

    if(!token || !search || !pageCount || !resultPerPage) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(200).send({ status: 'ok', msg: 'Account has been blocked, please contact master admin' });
        }
        
        let page = (pageCount > 1) ? pageCount : 1;
        page -= 1;

        let deliveries = await Delivery.find({
            delivery_type: 'instant',
            $or: [
                { delivery_medium: new RegExp(search, 'i') },
                { sender_fullname: new RegExp(search, 'i') },
                { parcel_name: new RegExp(search, 'i') },
                { parcel_code: new RegExp(search, 'i') },
                { delivery_agent_name: new RegExp(search, 'i') },
                { delivery_agent_phone_no: new RegExp(search, 'i') },
                { sender_phone_no: new RegExp(search, 'i') }
            ]
        })
        .select([ 'sender_fullname', 'sender_phone_no', 'delivery_agent_name', 'delivery_agent_phone_no', 'delivery_type', 'timestamp', 'delivery_status', 'parcel_name', 'parcel_code', 'delivery_medium' ])
        .sort({ timestamp: -1 })
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countDeliveries = await Delivery.find({
            delivery_type: 'instant',
            $or: [
                { delivery_medium: new RegExp(search, 'i') },
                { sender_fullname: new RegExp(search, 'i') },
                { parcel_name: new RegExp(search, 'i') },
                { parcel_code: new RegExp(search, 'i') },
                { delivery_agent_name: new RegExp(search, 'i') },
                { delivery_agent_phone_no: new RegExp(search, 'i') },
                { sender_phone_no: new RegExp(search, 'i') }
            ]
        }).select([ '_id' ]).lean();

        let count = countDeliveries.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No deliveries available, please try another search' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, deliveries });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

//Endpoint to search all scheduled deliveries
router.post('/scheduled_deliveries', async (req, res) => {
    const { token, search, pageCount, resultPerPage } = req.body;

    if(!token || !search || !pageCount || !resultPerPage) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);
        
        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }
        
        let page = (pageCount > 1) ? pageCount : 1;
        page -= 1;

        let deliveries = await Delivery.find({
            delivery_type: 'scheduled',
            $or: [
                { delivery_medium: new RegExp(search, 'i') },
                { sender_fullname: new RegExp(search, 'i') },
                { parcel_name: new RegExp(search, 'i') },
                { parcel_code: new RegExp(search, 'i') },
                { delivery_agent_name: new RegExp(search, 'i') },
                { delivery_agent_phone_no: new RegExp(search, 'i') },
                { sender_phone_no: new RegExp(search, 'i') }
            ]
        })
        .select([ 'sender_fullname', 'sender_phone_no', 'delivery_agent_name', 'delivery_agent_phone_no', 'delivery_type', 'timestamp', 'delivery_status', 'parcel_name', 'parcel_code', 'delivery_medium' ])
        .sort({ timestamp: -1 })
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countDeliveries = await Delivery.find({
            delivery_type: 'scheduled',
            $or: [
                { delivery_medium: new RegExp(search, 'i') },
                { sender_fullname: new RegExp(search, 'i') },
                { parcel_name: new RegExp(search, 'i') },
                { parcel_code: new RegExp(search, 'i') },
                { delivery_agent_name: new RegExp(search, 'i') },
                { delivery_agent_phone_no: new RegExp(search, 'i') },
                { sender_phone_no: new RegExp(search, 'i') }
            ]
        }).select([ '_id' ]).lean();

        let count = countDeliveries.length;


        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No deliveries available, please try another search' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, deliveries });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

//Endpoint to search all cancelled deliveries
router.post('/cancelled_deliveries', async (req, res) => {
    const { token, search, pageCount, resultPerPage } = req.body;

    if(!token || !search || !pageCount || !resultPerPage) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);
        
        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }
        
        let page = (pageCount > 1) ? pageCount : 1;
        page -= 1;

        let deliveries = await Delivery.find({
            'delivery_status.is_cancelled': true,
            $or: [
                { delivery_medium: new RegExp(search, 'i') },
                { sender_fullname: new RegExp(search, 'i') },
                { parcel_name: new RegExp(search, 'i') },
                { parcel_code: new RegExp(search, 'i') },
                { delivery_agent_name: new RegExp(search, 'i') },
                { delivery_agent_phone_no: new RegExp(search, 'i') },
                { sender_phone_no: new RegExp(search, 'i') }
            ]
        })
        .select([ 'sender_fullname', 'sender_phone_no', 'delivery_agent_name', 'delivery_agent_phone_no', 'delivery_type', 'timestamp', 'delivery_status', 'parcel_name', 'parcel_code', 'delivery_medium' ])
        .sort({ timestamp: -1 })
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countDeliveries = await Delivery.find({
            'delivery_status.is_cancelled': true,
            $or: [
                { delivery_medium: new RegExp(search, 'i') },
                { sender_fullname: new RegExp(search, 'i') },
                { parcel_name: new RegExp(search, 'i') },
                { parcel_code: new RegExp(search, 'i') },
                { delivery_agent_name: new RegExp(search, 'i') },
                { delivery_agent_phone_no: new RegExp(search, 'i') },
                { sender_phone_no: new RegExp(search, 'i') }
            ]
        }).select([ '_id' ]).lean();

        let count = countDeliveries.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No deliveries available, please try another search' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, deliveries });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

//Endpoint to search all user cancelled deliveries
router.post('/user_cancelled_deliveries', async (req, res) => {
    const { token, search, pageCount, resultPerPage } = req.body;

    if(!token || !search || !pageCount || !resultPerPage) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);
        
        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }
        
        let page = (pageCount > 1) ? pageCount : 1;
        page -= 1;

        let deliveries = await Delivery.find({
            'delivery_status.is_cancelled': true,
            'delivery_status.is_cancelled_by': 'user',
            $or: [
                { delivery_medium: new RegExp(search, 'i') },
                { sender_fullname: new RegExp(search, 'i') },
                { parcel_name: new RegExp(search, 'i') },
                { parcel_code: new RegExp(search, 'i') },
                { delivery_agent_name: new RegExp(search, 'i') },
                { delivery_agent_phone_no: new RegExp(search, 'i') },
                { sender_phone_no: new RegExp(search, 'i') }
            ]
        })
        .select([ 'sender_fullname', 'sender_phone_no', 'delivery_agent_name', 'delivery_agent_phone_no', 'delivery_type', 'timestamp', 'delivery_status', 'parcel_name', 'parcel_code', 'delivery_medium' ])
        .sort({ timestamp: -1 })
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countDeliveries = await Delivery.find({
            'delivery_status.is_cancelled': true,
            $or: [
                { delivery_medium: new RegExp(search, 'i') },
                { sender_fullname: new RegExp(search, 'i') },
                { parcel_name: new RegExp(search, 'i') },
                { parcel_code: new RegExp(search, 'i') },
                { delivery_agent_name: new RegExp(search, 'i') },
                { delivery_agent_phone_no: new RegExp(search, 'i') },
                { sender_phone_no: new RegExp(search, 'i') }
            ]
        }).select([ '_id' ]).lean();

        let count = countDeliveries.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No deliveries available, please try another search' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, deliveries });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

//Endpoint to search all delivery agent cancelled deliveries
router.post('/delivery_agent_cancelled_deliveries', async (req, res) => {
    const { token, search, pageCount, resultPerPage } = req.body;

    if(!token || !search || !pageCount || !resultPerPage) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);
        
        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }
        
        let page = (pageCount > 1) ? pageCount : 1;
        page -= 1;

        let deliveries = await Delivery.find({
            'delivery_status.is_cancelled': true,
            'delivery_status.is_cancelled_by': 'delivery agent',
            $or: [
                { delivery_medium: new RegExp(search, 'i') },
                { sender_fullname: new RegExp(search, 'i') },
                { parcel_name: new RegExp(search, 'i') },
                { parcel_code: new RegExp(search, 'i') },
                { delivery_agent_name: new RegExp(search, 'i') },
                { delivery_agent_phone_no: new RegExp(search, 'i') },
                { sender_phone_no: new RegExp(search, 'i') }
            ]
        })
        .select([ 'sender_fullname', 'sender_phone_no', 'delivery_agent_name', 'delivery_agent_phone_no', 'delivery_type', 'timestamp', 'delivery_status', 'parcel_name', 'parcel_code', 'delivery_medium' ])
        .sort({ timestamp: -1 })
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countDeliveries = await Delivery.find({
            'delivery_status.is_cancelled': true,
            $or: [
                { delivery_medium: new RegExp(search, 'i') },
                { sender_fullname: new RegExp(search, 'i') },
                { parcel_name: new RegExp(search, 'i') },
                { parcel_code: new RegExp(search, 'i') },
                { delivery_agent_name: new RegExp(search, 'i') },
                { delivery_agent_phone_no: new RegExp(search, 'i') },
                { sender_phone_no: new RegExp(search, 'i') }
            ]
        }).select([ '_id' ]).lean();

        let count = countDeliveries.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No deliveries available, please try another search' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, deliveries });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to search all blocked users
router.post('/blocked_users', async (req, res) => {
    const { token, search, pageCount, resultPerPage } = req.body;

    if(!token || !search || !pageCount || !resultPerPage) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }
        
        let page = (pageCount > 1) ? pageCount : 1;
        page -= 1;

        let users = await User.find({
            is_deleted: false,
            account_status: 'blocked',
            $or: [
                { fullname: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { phone_no: new RegExp(search, 'i') },
            ]
        }) 
        .select([ 'fullname', 'email', 'img', 'phone_no', 'stats.total_expenditure' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countUsers = await User.find({
            is_deleted: false,
            account_status: 'blocked',
            $or: [
                { fullname: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { phone_no: new RegExp(search, 'i') },
            ]
        }) 
        .select([ '_id' ]).lean();

        let count = countUsers.length;
        
        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No user found, try another search' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, users });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to search all blocked delivery_agents
router.post('/blocked_delivery_agents', async (req, res) => {
    const { token, search, pageCount, resultPerPage } = req.body;

    if(!token || !search ||!pageCount || !resultPerPage) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }
        
        let page = (pageCount > 1) ? pageCount : 1;
        page -= 1;

        let delivery_agents = await Delivery_agent.find({
            is_deleted: false,
            approval_status: 'approved',
            status: 'blocked',
            delivery_agent_type: 'delivery agent',
            $or: [
                { fullname: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { phone_no: new RegExp(search, 'i') },
            ]
        })
        .select([ 'fullname', 'img_url', 'delivery_agent_code', 'email', 'phone_no', 'total_earnings' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countDeliveryAgents = await Delivery_agent.find({
            is_deleted: false,
            approval_status: 'approved',
            status: 'blocked',
            delivery_agent_type: 'delivery agent',
            $or: [
                { fullname: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { phone_no: new RegExp(search, 'i') },
            ]
        }).select([ '_id' ]).lean();

        let count = countDeliveryAgents.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No delivery agent found, try another search' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, delivery_agents });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to search all blocked fleet_managers
router.post('/blocked_fleet_managers', async (req, res) => {
    const { token, search, pageCount, resultPerPage } = req.body;

    if(!token || !search || !pageCount || !resultPerPage) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }
        
        let page = (pageCount > 1) ? pageCount : 1;
        page -= 1;

        let fleet_managers = await Delivery_agent.find({
            is_deleted: false,
            approval_status: 'approved',
            status: 'blocked',
            delivery_agent_type: 'fleet manager',
            $or: [
                { fleet_name: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { phone_no: new RegExp(search, 'i') }
            ]
        })
        .select([ 'fleet_name', 'img_url', 'fleet_manager_code', 'email', 'phone_no', 'total_earnings' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countFleetManagers = await Delivery_agent.find({
            is_deleted: false,
            approval_status: 'approved',
            status: 'blocked',
            delivery_agent_type: 'fleet manager',
            $or: [
                { fleet_name: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { phone_no: new RegExp(search, 'i') },
            ]
        }).select([ '_id' ]).lean();

        let count = countFleetManagers.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No fleet manager found, try another search' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, fleet_managers });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

/* Endpoint to search all blocked admins
   This endpoint can only be assessed by the master admin */   
   router.post('/blocked_admins', async (req, res) => {
    const { token, search, pageCount, resultPerPage } = req.body;

    if(!token || !search || !pageCount || !resultPerPage) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let master = jwt.verify(token, process.env.JWT_SECRET);

        master = await Admin.findOne({ _id: master._id }).select([ '-password' ]).lean();

        if(!(master.role.some(role => role == 'master'))) {
            return res.status(400).send({ status: 'error', msg: 'Please login with master admin account' });
        }
        
        let page = (pageCount > 1) ? pageCount : 1;
        page -= 1;

        let admins = await Admin.find({
            is_deleted: false,
            status: false,
            $or: [
                { fullname: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { phone_no: new RegExp(search, 'i') }
            ]
        })
        .select([ 'fullname', 'img', 'role', 'email', 'phone_no' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countAdmins = await Admin.find({
            is_deleted: false,
            status: false,
            $or: [
                { fullname: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { phone_no: new RegExp(search, 'i') }
            ]
        }).select([ '_id' ]).lean();

        let count = countAdmins.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No admin found, try another search' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, admins });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

module.exports = router;