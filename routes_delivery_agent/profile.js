const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const upload = require('../utils/multer');
const cloudinary = require('../utils/cloudinary');
const Delivery_agent = require('../models/delivery_agent');
const {FsDeliveryAgent, FsUser} = require('../services/firebase_service_config');

dotenv.config();
const router = express.Router();

//endpoint to view a single profile
router.post('/view_single_profile', async (req, res) => {
  const { token } = req.body;

  //check for required fields
  if(!token)
    return res.status(400).send({status: 'error', msg: 'all fields must be filled'});

  try{
    // verify token
    let delivery_agent = jwt.verify(token, process.env.JWT_SECRET); 

    //check if delivery_agent exists
    delivery_agent = await Delivery_agent.findById({_id: delivery_agent._id}).lean();
    if(!delivery_agent)
      return res.status(200).send({status: 'error', msg: 'delivery agent not found'});

    return res.status(200).send({status: 'ok', msg: 'delivery agent gotten successfully', delivery_agent});
  }catch(e) {
    console.log(e);
    return res.status(403).send({status: 'error', msg: 'some error occurred'});
  }
});

// //enpoint to view all profiles
// router.post('/view_all_profiles', async (req, res) => {

// });

//endpoint to edit profile
router.post('/edit_profile', upload.single('profile_img', 1), async (req, res) => {
  const { fullname, address, state, city, token, driver_license_expiry_date, plate_no} = req.body;

  //check for required fields
  if(!token) //add token later
    return res.status(400).send({status: 'error', msg: 'All fields must be filled'});

  try{
    // verify token
    let delivery_agent = jwt.verify(token, process.env.JWT_SECRET);
    const fsdoc_id = delivery_agent._id;
    
    // fetch delivery agent
    delivery_agent = await Delivery_agent.findById({_id: delivery_agent._id});
    // upload delivery_agent profile picture
    let img_url;
    let img_id;
    if(req.file) {
      //check if delivery_agent has a profile picture
      if(delivery_agent.img_id != ""){
        await cloudinary.uploader.destroy(delivery_agent.img_id);
      }
        const result = await cloudinary.uploader.upload(req.file.path, {folder: 'pick_load_project'});
        img_url = result.secure_url;
        img_id = result.public_id;
      
    }

    // // check for driver license expiry date
    // if(driver_license_expiry_date) {
    //   // check for required field
    //   if(!plate_no)
    //     return res.status(400).send({status: 'error', msg: 'plate number needed to edit driver license expiry date'});

    //   let position = -1;
    //   //get the paticular vehicle in the vehicles array
    //   const [vehicle] = delivery_agent.vehicle_details.filter((vehicle) => {
    //     position++;
    //     return vehicle.plate_no === plate_no;
    //   });

    //   // edit the vehicle details
    //   vehicle.driver_license_expiry_date = driver_license_expiry_date;

    //   // delete former and add the new vehicle from the vehicle details field in the delivery agent document
    //   delivery_agent.vehicle_details.splice(position, 1, vehicle);

    // }

    //populate delivery_agent document accordingly
    delivery_agent.vehicle_details.driver_license_expiry_date = driver_license_expiry_date || delivery_agent.vehicle_details.driver_license_expiry_date;
    delivery_agent.plate_no = plate_no || delivery_agent.plate_no;
    delivery_agent.fullname = fullname || delivery_agent.fullname;
    delivery_agent.address = address || delivery_agent.address;
    delivery_agent.state = state || delivery_agent.state;
    delivery_agent.city = city || delivery_agent.city;
    delivery_agent.img_url = img_url || delivery_agent.img_url;
    delivery_agent.img_id = img_id || delivery_agent.img_id;

    // update data on firestore
    const fsState = state || delivery_agent.state;
    const fsCity = city || delivery_agent.city;

    await FsDeliveryAgent.doc(fsdoc_id.toString()).update({
      state: fsState,
      city: fsCity,
      fullname: fullname || delivery_agent.fullname,
      img_url: img_url || delivery_agent.img_url
    });

    await FsUser.doc(fsdoc_id.toString()).update({
      fullname: fullname || delivery_agent.fullname,
      img_url: img_url || delivery_agent.img_url
    });

    delivery_agent = await delivery_agent.save();

    return res.status(200).send({status: 'ok', msg: 'Profile edited successfully', delivery_agent});

  }catch(e) {
    console.log(e);
    return res.status(403).send({status: 'error', msg: 'some error occurred'});
  }
});

// // set location endpoint
// router.post('/set_location', async (req, res) => {
//   const {token, location} = req.body;
  
//   // check for required fields
//   if(!token || !location)
//     return res.status(400).send({status: 'error', msg: 'All fields must be filled'});

//   // verify token
//   let delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

//   try{
//     // fetch and update delivery agent document
//     delivery_agent = await Delivery_agent.findByIdAndUpdate(
//       {_id: delivery_agent._id},
//       {location},
//       {new: true}
//     ).lean();

//     return res.status(200).send({status: 'ok', msg: 'Location set successfully', delivery_agent});

//   }catch(e) {
//     console.log(e);
//     return res.status(403).send({status: 'error', msg: 'some error occurred'});
//   }
// });

// endpoint to set device token
router.post('/set_device_token', async (req, res) => {
  const { token, device_token } = req.body;

  // check for required fields
  if(!token || !device_token) 
    return res.status(400).send({status: 'error', msg: 'all fields must be filled'});

  try{
    // verify token
    let delivery_agent = jwt.verify(token, process.env.JWT_SECRET);
    let fsDA = delivery_agent;

    delivery_agent = await Delivery_agent.findOneAndUpdate(
      {_id: delivery_agent._id},
      {device_token: device_token},
      {new: true}
    ).lean();

    // update device token on firestore
    await FsDeliveryAgent.doc(fsDA._id.toString()).update({device_token});

    return res.status(200).send({status: 'ok', msg: 'device token set successfully', delivery_agent});

  }catch(e) {
    console.log(e);
    return res.status(403).send({status: 'error', msg: 'some error occurred'});
  }
});

// endpoint to set delivery agent available for work
router.post('/set_available_for_work', async (req, res) => {
  const {token, is_available_for_work} = req.body;

  // check for required fields
  if(!token || is_available_for_work == undefined || is_available_for_work == null)
    return res.status(400).send({status: 'error', msg: 'all fields must be filled'});

  try{
    // verify token
    let delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

    // update delivery agent document
    delivery_agent = await Delivery_agent.findByIdAndUpdate(
      {_id: delivery_agent._id},
      {is_available_for_work: !is_available_for_work},
      {new: true}
    ).lean();

    // update available_for_work on firestore
    await FsDeliveryAgent.doc(delivery_agent._id.toString()).update({
      is_available_for_work: !is_available_for_work
    });

    return res.status(200).send({status: 'ok', msg: 'is available for work set successfully', delivery_agent});
  }catch(e) {
    console.log(e);
    return res.status(403).send({status: 'error', msg: 'some error occurred'});
  }
});

module.exports = router;