const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const upload = require('../utils/multer');
const cloudinary = require('../utils/cloudinary');
const Delivery = require('../models/delivery');
const Stats = require('../models/statistics');
const Report = require('../models/report');

const {FsStatistics, FieldValue} = require('../services/firebase_service_config');
dotenv.config();

const router = express.Router();


//endpoint to report a delivery
// reporter field: can be 'user' or 'delivery agent'
router.post('/report_delivery', upload.array('delivery_reports', 5), async (req, res) => {
  const { body, delivery_type, delivery_id, parcel_code, delivery_img_urls, user_id, user_name, user_img_url, delivery_agent_name, delivery_agent_email, user_email, delivery_agent_code, delivery_agent_id, delivery_agent_img_url, token, reporter } = req.body;

  //check for required fields  migiht add req.files later to my condition
  if(!body || !delivery_id || !delivery_type || !parcel_code || !delivery_img_urls || !user_id || !user_name || !user_img_url || !delivery_agent_name || !delivery_agent_code || !delivery_agent_id || !delivery_agent_img_url || !token || !reporter || !delivery_agent_email || !user_email){
    return res.status(400).send({status: 'error', msg: 'All fields must be filled'})
  }

  try{

    const timestamp = Date.now();

    //verify token
    let delivery = jwt.verify(token, process.env.JWT_SECRET);

    // check if delivery exists
    delivery = await Delivery.findById({_id: delivery_id}).lean();
    if(!delivery)
      return res.status(404).send({status: 'error', msg: `delivery with delivery id ${delivery_id}could not be found`});

    //upload your report images
    let img_urls = [];
    let img_ids = [];
    if(req.files) {
      for(let i = 0; i < req.files.length; i++){
        const result = await cloudinary.uploader.upload(req.files[i].path, {folder: 'pick_load_project'});
        console.log(result);
        img_urls.push(result.secure_url);
        img_ids.push(result.public_id);
      }
    }
    

    // create a report document and populate accordingly
    let report = new Report;
    report.user_name = user_name;
    report.user_id = user_id;
    report.user_img_url = user_img_url;
    report.user_email = user_email;
    report.delivery_agent_code = delivery_agent_code;
    report.delivery_agent_id = delivery_agent_id;
    report.delivery_agent_email = delivery_agent_email;
    report.delivery_agent_img_url = delivery_agent_img_url;
    report.timestamp = timestamp;
    report.delivery_id = delivery_id;
    report.delivery_type = delivery_type;
    report.delivery_img_urls = delivery_img_urls;
    report.parcel_code = parcel_code;
    report.body = body;
    report.report_img_urls = img_urls;
    report.report_img_ids = img_ids,
    report.reporter = reporter;
    report.is_resolved = false;

    report = await report.save();

    //increment statistics document accordingly
    const stats = await Stats.findOneAndUpdate(
      {doc_type: 'admin'},
      {'$inc': {total_user_reports: 1, total_reports: 1, total_pending_reports: 1}},
      {upsert: true}
    ).lean();

    await FsStatistics.doc('statistics').update({
      total_user_reports: FieldValue.increment(1), 
      total_reports: FieldValue.increment(1),
      total_pending_reports: FieldValue.increment(1)
    });

    return res.status(200).send({status: 'ok', msg: 'delivery reported successfully', report});

  }catch(e) {
    console.log(e);
    return res.status(403).send({status: 'error', msg: 'some error occurred', e});
  }
});

//endpont to view reports
// router.post('/view_reports', async (req, res) => {
//   const { token, pagec } = req.body;

//   // check for required fields
//   if(!token || !pagec)
//     return res.status(400).send({status: 'error', msg: 'all fields must be filled'});


//   try{

//     const user = jwt.verify(token, process.env.JWT_SECRET);

//     const resultsPerPage = 10;
//     let page = pagec >= 1 ? pagec : 1;
//     page = page -1;

//     const reports = await Report.find({user_id: user._id})
//     .select(['delivery_agent_name', 'delivery_agent_id', 'reporter', 'body', 'timestamp', 'is_resolved', 'delivery_code', 'delivery_id']) // add other neccessary fields later on
//     .sort({timestamp: 'desc'})
//     .limit(resultsPerPage)
//     .skip(resultsPerPage * page)
//     .lean();

//     return res.status(200).send({status: 'ok', msg: 'reports gotten successfully', reports});

    
//   }catch(e) {
//     console.log(e);
//     return res.status(403).send({status: 'error', msg: 'some error occurred', e});
//   }
// });

// // endpoint to view a single report
// router.post('/view_single_report', async (req, res) => {
//   const {token, report_id} = req.body;

//   // check for required fields
//   if( !token || !report_id){
//     return res.status(400).send({status: 'error', msg: 'all fields must be fille'})
//   }
   
//   try{

//     const user = jwt.verify(token, process.env.JWT_SECRET);

//     // check if report document exists
//     const report = await Report.findOne({_id: report_id}).lean();

//     if(!report){
//       return res.status(400).send({status: 'error', msg: `No report with ${report_id} found`});
//   }
//     return res.status(200).send({status: 'ok', msg: 'report gotten successfully', report});

    
//   }catch(e) {
//     console.log(e);
//     return res.status(403).send({status: 'error', msg: 'some error occurred', e});
//   }
// });

module.exports = router;