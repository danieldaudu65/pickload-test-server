const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Delivery = require('../models/delivery');
const {FsUser} = require('../services/firebase_service_config');

const cloudinary = require('../utils/cloudinary');
const upload = require('../utils/multer');

const router = express.Router();

// edit profile
router.post('/edit', upload.single('image'), async (req, res) => {
    const {token, fullname, email} = req.body;

    if(!token){
        return res.status(400).send({status: 'error', msg: 'All fields must be entered'});
    }

    try{
        const user = jwt.verify(token, process.env.JWT_SECRET);

        const fsdoc_id = user._id;

        let found = await User.findOne({_id: user._id});
        // //check if user has a previous profile image or cover image
        let result;
        if(req.file){
            if(found.img_id != ""){
                await cloudinary.uploader.destroy(found.img_id);
            }
            result = await cloudinary.uploader.upload(req.file.path, {folder: 'profile_imgs', quality: 'auto', fetch_format: "auto"});
        }
        
        const data = {
            fullname: fullname || found.fullname,
            email: email || found.email,
            img: req.file ? result.secure_url : found.img,
            img_id: req.file ? result.public_id : found.img_id,
        };

        found = await User.findOneAndUpdate({_id: user._id}, data, {new: true});

        await FsUser.doc(fsdoc_id.toString()).update({
            fullname: fullname || found.fullname,
            img_url: req.file ? result.secure_url : found.img
        });

        // update details in delivery request
        await Delivery.updateMany(
            {sender_id: user._id},
            {
                sender_name: `${found.fullname}`
            }
        );

        return res.status(200).send({status: 'ok', msg: 'Edit Successful', user: found});

    }catch(e){
        console.log(e);
        return res.status(400).send({status: 'error', msg: e});
    }
});

// endpoint to get all user statistics
router.post('/user_stats', async (req, res) => {
    const {token} = req.body;

    if(!token){
        return res.status(400).send({status: 'error', msg: 'All fields must be entered'});
    }

    try{
        let user = jwt.verify(token, process.env.JWT_SECRET);

        user = await User.findOne({_id: user._id}).select(['stats']).lean();

        return res.status(200).send({status: 'ok', msg: 'Success', stats: user.stats});

    }catch(e){
        console.log(e);
        return res.status(400).send({status: 'error', msg: e});
    }
});


// endpoint to get user profile
router.post('/user_profile', async (req, res) => {
    const {token} = req.body;

    if(!token){
        return res.status(400).send({status: 'error', msg: 'All fields must be entered'});
    }

    try{
        let user = jwt.verify(token, process.env.JWT_SECRET);

        user = await User.findOne({_id: user._id}).lean();

        return res.status(200).send({status: 'ok', msg: 'Success', user});

    }catch(e){
        console.log(e);
        return res.status(400).send({status: 'error', msg: e});
    }
});


// endpoint to set device token for the user
router.post('/set_device_token', async (req, res) => {
    const { token, device_token } = req.body;
  
    // check for required fields
    if(!token || !device_token) 
      return res.status(400).send({status: 'error', msg: 'all fields must be filled'});
  
    try{
      // verify token
      let user = jwt.verify(token, process.env.JWT_SECRET);
  
      user = await User.findOneAndUpdate(
        {_id: user._id},
        {device_token: device_token},
        {new: true}
      ).lean();
  
      return res.status(200).send({status: 'ok', msg: 'device token set successfully', user});
  
    }catch(e) {
      console.log(e);
      return res.status(403).send({status: 'error', msg: 'some error occurred'});
    }
  });


  // endpoint to get user blocked state
// router.post('/user_blocked', async (req, res) => {
//     const {token} = req.body;

//     if(!token){
//         return res.status(400).send({status: 'error', msg: 'All fields must be entered'});
//     }

//     try{
//         let user = jwt.verify(token, process.env.JWT_SECRET);

//         user = await User.findOne({_id: user._id}).select(['']).lean();

//         return res.status(200).send({status: 'ok', msg: 'Success', user});

//     }catch(e){
//         console.log(e);
//         return res.status(400).send({status: 'error', msg: e});
//     }
// });

module.exports = router;