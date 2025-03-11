const express = require('express');
const jwt = require('jsonwebtoken');

const DeliveryAgent = require('../models/delivery_agent');

const cloudinary = require("../utils/cloudinary");
const upload = require("../utils/multer");
const router = express.Router();

// endpoint to edit delivery agent gender
router.post('/edit_delivery_agent_gender', async (req, res) => {
    const { token, delivery_agent_id, gender } = req.body;

    if (!token || !delivery_agent_id || !gender) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        jwt.verify(token, process.env.JWT_SECRET);

        const deliver_agent = await DeliveryAgent.findOneAndUpdate(
            { _id: delivery_agent_id },
            { gender },
            { new: true }
        ).lean();

        return res.status(200).send({ status: 'error', msg: 'Success', deliver_agent });
    }

    catch (error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// endpoint to edit delivery agent vehicle details
router.post('/edit_vehicle_details', upload.array('vehicle_details'), async (req, res) => {
    const { delivery_agent_id, token, driver_license_expiry_date } = req.body;

    //check for required fields
    if (!token || !delivery_agent_id)
        return res.status(400).send({ status: 'error', msg: 'All fields must be filled' });

    try {
        // verify token
        jwt.verify(token, process.env.JWT_SECRET);
       
        // fetch delivery agent
        const delivery_agent = await DeliveryAgent.findById({ _id: delivery_agent_id });
        // upload delivery_agent profile picture
        const img_urls = [];
        const img_ids = [];
        if (req.files) {
            // delete old vehicle details if any
            if(delivery_agent.vehicle_details.img_urls.length !== 0) {
                for(let i = 0; i < delivery_agent.vehicle_details.img_ids.length; i++) {
                    await cloudinary.uploader.destroy(delivery_agent.vehicle_details.img_ids[i])
                }
            }
            // upload
            for(let i = 0; i < req.files.length; i++) {
                const {secure_url, public_id} = await cloudinary.uploader.upload(req.files[i].path, {folder: "vehicle_details"});
                img_ids.push(public_id);
                img_urls.push(secure_url);
            }
            delivery_agent.vehicle_details.img_urls = img_urls;
            delivery_agent.vehicle_details.img_ids = img_ids;
        }

        // populate delivery_agent document accordingly
        delivery_agent.vehicle_details.driver_license_expiry_date = driver_license_expiry_date || delivery_agent.vehicle_details.driver_license_expiry_date;

        await delivery_agent.save();

        return res.status(200).send({ status: 'ok', msg: 'success', delivery_agent });

    } catch (e) {
        console.log(e);
        return res.status(403).send({ status: 'error', msg: 'some error occurred' });
    }
});

module.exports = router;