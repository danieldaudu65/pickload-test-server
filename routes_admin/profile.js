const express = require('express');
const jwt = require('jsonwebtoken');

const cloudinary = require('../utils/cloudinary');
const upload = require('../utils/multer');

const Admin = require('../models/admin');

const router = express.Router();

// Endpoint for admin to view his profile
router.post('/view_profile', async (req, res) => {
    const { token } = req.body;

    if(!token) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select(['-password']).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', admin });
    }

    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to edit profile
router.post('/edit_profile', upload.single('img'), async (req, res) => {
    const { token ,fullname, username, phone_no } = req.body;
    console.log(req.body);

    if(!token) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);
        
        admin = await Admin.findOne({ _id: admin._id });

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let result;
        if(req.file) {
            await cloudinary.uploader.destroy(admin.img_id);
            result = await cloudinary.uploader.upload(req.file.path, {folder: 'Pickload_project'});
        }

        if(phone_no) {
            const found = await Admin.findOne({ phone_no });

            if(found) {
                return res.status(400).send({ status: 'error', msg: 'Phone number already in use by another admin' })
            }
        }

        /*
        Email checks; Could be useful in case feature is added later

        if(email) {
            const found = await Admin.findOne({ email });

            if(found) {
                return res.status(400).send({ status: 'error', msg: 'email already in use by another admin' })
            }

            if(typeof email !== 'string') {
                return res.status(400).send({ status: 'error', msg: 'Invalid email' });
            }
        
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if(!regex.test(String(email).toLocaleLowerCase())){
                return res.status(400).send({ status: 'error', msg: 'Please enter a valid email' });
            }
        }

        */

        admin = await Admin.findOneAndUpdate(
            { _id: admin._id },
            { 
            fullname: fullname || admin.fullname,
            username: username || admin.username,
            phone_no: phone_no || admin.phone_no,
            img: (req.file) ? result.secure_url : admin.img,
            img_id: (req.file) ? result.public_id : admin.img_id
            },
            { new: true }
        ).select([ '-password' ]).lean();

        return res.status(200).send({ status: 'ok', msg: 'Successfully updated profile', admin });
    }
    
    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
})

module.exports = router