const express = require('express');
const jwt = require('jsonwebtoken');

const Admin = require('../models/admin');
const User = require('../models/user');
const Delivery_agent = require('../models/delivery_agent');
const AdminIds = require('../models/admin_ids');

const router = express.Router();

// Endpoint to view all users
router.post('/users', async (req, res) => {
    const { token, pageCount, resultPerPage } = req.body;

    if(!token || !pageCount || !resultPerPage) {
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
            account_status: 'active'
        })
        .select([ 'fullname', 'email', 'img', 'phone_no', 'stats.total_expenditure' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countUsers = await User.find({
            is_deleted: false,
            account_status: 'active'
        }).select([ '_id' ]).lean();

        let count = countUsers.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No user found, come back later buddy' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, users });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view a specific user
router.post('/user', async (req, res) => {
    const { token, user_id } = req.body;

    if(!token || !user_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let user = await User.findOne({ _id: user_id }).lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', user });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view blocked users
router.post('/blocked_users', async (req, res) => {
    const { token, pageCount, resultPerPage } = req.body;

    if(!token || !pageCount || !resultPerPage) {
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

        let blocked_users = await User.find({
            is_deleted: false,
            account_status: 'blocked'
        })
        .select([ 'fullname', 'email', 'phone_no', 'img' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countBlockedUsers = await User.find({
            is_deleted: false,
            account_status: 'blocked'
        }).select([ '_id' ]).lean();

        let count = countBlockedUsers.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No blocked user found' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, blocked_users });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view all delivery_agents
router.post('/delivery_agents', async (req, res) => {
    const { token, pageCount, resultPerPage } = req.body;

    if(!token || !pageCount || !resultPerPage) {
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
            delivery_agent_type: 'delivery agent'
        })
        .select([ 'fullname', 'img_url', 'delivery_agent_code', 'email', 'phone_no', 'total_earnings', 'fleet_manager_code', 'is_firebase_account_created', 'is_online', 'is_available_for_work' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countDeliveryAgents = await Delivery_agent.find({
            is_deleted: false,
            approval_status: 'approved',
            status: 'active',
            delivery_agent_type: 'delivery agent'
        }).select([ '_id' ]).lean();

        let count = countDeliveryAgents.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No delivery agent found, come back later buddy' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, delivery_agents });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view a specific delivery_agent
router.post('/delivery_agent', async (req, res) => {
    const { token, delivery_agent_id } = req.body;

    if(!token || !delivery_agent_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let delivery_agent = await Delivery_agent.findOne({ _id: delivery_agent_id }).lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', delivery_agent });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view blocked delivery_agents
router.post('/blocked_delivery_agents', async (req, res) => {
    const { token, pageCount, resultPerPage } = req.body;

    if(!token || !pageCount || !resultPerPage) {
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

        let blocked_delivery_agents = await Delivery_agent.find({
            is_deleted: false,
            delivery_agent_type: 'delivery agent',
            status: 'blocked'
        })
        .select([ 'delivery_agent_code', 'fullname', 'email', 'phone_no', 'img_url' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countBlockedAgents = await Delivery_agent.find({
            is_deleted: false,
            delivery_agent_type: 'delivery agent',
            status: 'blocked'
        }).select([ '_id' ]).lean();

        let count = countBlockedAgents.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No blocked delivery agent found' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, blocked_delivery_agents });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view all fleet managers
router.post('/view_fleet_managers', async (req, res) => {
    const { token, pageCount, resultPerPage } = req.body;

    if(!token || !pageCount || !resultPerPage) {
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
            delivery_agent_type: 'fleet manager'
        })
        .select([ 'fleet_name', 'img_url', 'fleet_manager_code', 'email', 'phone_no', 'total_earnings', 'img_url', 'fullname', 'is_firebase_account_created', 'is_online', 'is_available_for_work' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countFleetManagers = await Delivery_agent.find({
            is_deleted: false,
            approval_status: 'approved',
            status: 'active',
            delivery_agent_type: 'fleet manager'
        }).select([ '_id' ]).lean();

        let count = countFleetManagers.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No fleet manager found' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, fleet_managers });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view a specific fleet manager
router.post('/view_fleet_manager', async (req, res) => {
    const { token, fleet_manager_id } = req.body;

    if(!token || !fleet_manager_id) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let fleet_manager = await Delivery_agent.findOne({ _id: fleet_manager_id }).lean();

        return res.status(200).send({ status: 'ok', msg: 'Success', fleet_manager });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view blocked fleet managers
router.post('/blocked_fleet_managers', async (req, res) => {
    const { token, pageCount, resultPerPage} = req.body;

    if(!token || !pageCount || !resultPerPage) {
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

        let blocked_fleet_managers = await Delivery_agent.find({
            is_deleted: false,
            delivery_agent_type: 'fleet manager',
            status: 'blocked'
        })
        .select([ 'fleet_manager_code', 'fleet_name', 'email', 'phone_no', 'img_url', 'is_available_for_work', 'is_online' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countBlockedManagers = await Delivery_agent.find({
            is_deleted: false,
            delivery_agent_type: 'fleet manager',
            status: 'blocked'
        }).select([ '_id' ]).lean();

        let count = countBlockedManagers.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No blocked fleet manager found' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, blocked_fleet_managers });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view delivery_agents under a fleet_manager
router.post('/view_delivery_agents', async (req, res) => {
    const { token, fleet_manager_id, pageCount, resultPerPage } = req.body;

    if(!token || !fleet_manager_id || !pageCount || !resultPerPage) {
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
            fleet_manager_id: fleet_manager_id,
        })
        .select([ 'fullname', 'img_url', 'delivery_agent_code', 'email', 'phone_no', 'total_earnings', 'fleet_manager_code', 'is_online', 'is_available_for_work' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        let countDeliveryAgents = await Delivery_agent.find({
            is_deleted: false,
            approval_status: 'approved',
            status: 'active',
            delivery_agent_type: 'delivery agent',
            fleet_manager_id: fleet_manager_id,
        }).select([ '_id' ]).lean();

        let count = countDeliveryAgents.length;

        if(count == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No delivery agent under this fleet manager' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count, delivery_agents });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view pickload delivery_agents
router.post('/pickload_delivery_agents', async (req, res) => {
    const { token, pageCount, resultPerPage } = req.body;

    if(!token || !pageCount || !resultPerPage) {
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
        })
        .select([ 'fullname', 'img_url', 'delivery_agent_code', 'email', 'phone_no', 'total_earnings', 'is_available_for_work', 'is_online' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        if(pickload_agents.length == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No pickload delivery agent presently' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count: pickload_agents.length, pickload_agents });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view non-pickload delivery_agents
router.post('/non-pickload_delivery_agents', async (req, res) => {
    const { token, pageCount, resultPerPage } = req.body;

    if(!token || !pageCount || !resultPerPage) {
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
        })
        .select([ 'fullname', 'img_url', 'delivery_agent_code', 'email', 'phone_no', 'total_earnings', 'is_available_for_work', 'is_online', 'is_available_for_work' ])
        .limit(resultPerPage)
        .skip(page * resultPerPage)
        .lean();

        if(delivery_agents.length == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No non-pickload delivery agent presently' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count: delivery_agents.length, delivery_agents });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// endpoint to fecth help and feedback admin ids
router.post('/help_feedback_admin_ids', async (req, res) => {
    const {token} = req.body;

    // check for required fields
    if(!token)
      return res.status(400).send({status: 'error', msg: 'all fields must be filled'});

    try {
        // verify token
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        // check for admin status
        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        // get admin ids
        const admin_ids = await AdminIds.findOne({doc_type: 'admin_ids'}).select(['ids']).lean();

        return res.status(200).send({status: 'ok', msg: 'Success', admin_ids: admin_ids.ids, count: admin_ids.ids.length});

    }catch(e) {
        console.log(e);
        return res.status(403).send({status: 'error', msg: 'some error occurred', e});
    }
});

// Endpoint to view all delivery_agents without pagination
router.post('/view_all_delivery_agents', async (req, res) => {
    const { token } = req.body;

    if(!token) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        const delivery_agents = await Delivery_agent.find({
            is_deleted: false,
            approval_status: 'approved',
            status: 'active',
            delivery_agent_type: 'delivery agent'
        })
        .select([ 'fullname', 'img_url', 'delivery_agent_code', 'email', 'phone_no', 'total_earnings', 'fleet_manager_code', 'is_firebase_account_created', 'is_online', 'is_available_for_work' ])
        .lean();

        if(delivery_agents.length == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No delivery agent found, come back later buddy', count: 0, delivery_agents: [] });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count: delivery_agents.length, delivery_agents });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view all pickload delivery_agents without pagination
router.post('/view_all_pickload_delivery_agents', async (req, res) => {
    const { token } = req.body;

    if(!token) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        const delivery_agents = await Delivery_agent.find({
            is_deleted: false,
            approval_status: 'approved',
            status: 'active',
            delivery_agent_type: 'delivery agent',
            fleet_manager_code: process.env.PICKLOAD_FLEET_ID
        })
        .select([ 'fullname', 'img_url', 'delivery_agent_code', 'email', 'phone_no', 'total_earnings', 'fleet_manager_code', 'is_firebase_account_created', 'is_online', 'is_available_for_work' ])
        .lean();

        if(delivery_agents.length == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No delivery agent found presently', count: 0, delivery_agents: [] });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count: delivery_agents.length, delivery_agents });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view all fleet managers without pagination
router.post('/view_all_fleet_managers', async (req, res) => {
    const { token } = req.body;

    if(!token) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        const fleet_managers = await Delivery_agent.find({
            is_deleted: false,
            approval_status: 'approved',
            status: 'active',
            delivery_agent_type: 'fleet manager'
        })
        .select([ 'fleet_name', 'img_url', 'fleet_manager_code', 'email', 'phone_no', 'total_earnings', 'img_url', 'fullname', 'is_firebase_account_created', 'is_online' ])
        .lean();

        if(fleet_managers.length == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No fleet manager found', fleet_managers: [], count: 0 });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count: fleet_managers.length, fleet_managers });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// endpoint to view all users without pagination
router.post('/view_all_users', async (req, res) => {
    const { token } = req.body;

    if(!token) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        const users = await User.find({
            is_deleted: false,
            account_status: 'active'
        })
        .select([ 'fullname', 'email', 'img', 'phone_no', 'stats.total_expenditure', 'is_online' ])
        .lean();

        if(users.length == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No user found, come back later buddy', count: 0, users: [] });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count: users.length, users });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view all admins without pagination
router.post('/view_all_admins', async (req, res) => {
    const { token } = req.body;

    //Checks
    if(!token) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);

        // Checking that admin is master admin
        const master = await Admin.findOne({ _id: verify._id }).lean();

        if(!(master.role.some(role => role == 'master'))) {
            return res.status(400).send({ status: 'error', msg: 'Please login with master admin account' });
        }

        const admins = await Admin.find({ status: true, is_deleted: false })
        .select([ 'email', 'fullname', 'role', 'img', 'phone_no', 'is_online' ])
        .lean();

        if(admins.length == 0) {
            return res.status(400).send({ status: 'error', msg: 'No admin at the moment', count: 0, admins: [] });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', count: admins.length, admins });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

module.exports = router