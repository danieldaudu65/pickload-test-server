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
router.post('/report_delivery', upload.array('delivery_reports', 5), async (req, res) => {
  const { body, delivery_id, delivery_type, delivery_code, user_id, user_name, user_email, delivery_agent_email, delivery_agent_name, delivery_agent_code, token, reporter, delivery_agent_img_url, delivery_img_urls } = req.body;

  //check for required fields  migiht add req.files later to my condition
  if(!body || !delivery_id || !delivery_type || !delivery_code || !user_id || !user_name || !delivery_agent_name || !delivery_agent_code || !token || !delivery_agent_email || !user_email)
    return res.status(400).send({status: 'error', msg: 'All fields must be filled'});

  try{
    //verify token
    const delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

    // check if delivery exists
    const delivery = await Delivery.findById({_id: delivery_id}).lean();
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
    report.user_email = user_email;
    report.delivery_agent_code = delivery_agent_code;
    report.delivery_agent_id = delivery_agent._id;
    report.delivery_agent_img_url = delivery_agent_img_url;
    report.delivery_agent_email = delivery_agent_email;
    report.delivery_agent_name = delivery_agent_name;
    report.timestamp = Date.now();
    report.delivery_id = delivery_id;
    report.delivery_type = delivery_type;
    report.delivery_code = delivery_code;
    report.delivery_img_urls = delivery_img_urls;
    report.body = body;
    report.report_img_urls = img_urls;
    report.report_img_ids = img_ids,
    report.reporter = reporter;
    report.is_resolved = false;

    report = await report.save();

    //increment statistics document accordingly
    const stats = await Stats.findOneAndUpdate(
      {doc_type: 'admin'},
      {'$inc': {total_delivery_agent_reports: 1, total_reports: 1, total_pending_reports: 1}},
      {upsert: true}
    ).lean(); 

    await FsStatistics.doc('statistics').update({
      total_delivery_agent_reports: FieldValue.increment(1),
      total_reports: FieldValue.increment(1),
      total_pending_reports: FieldValue.increment(1)
    });

    return res.status(200).send({status: 'ok', msg: 'delivery reported successfully', report});

  }catch(e) {
    console.log(e);
    return res.status(403).send({status: 'error', msg: 'some error occurred', e});
  }
});

// //endpont to view reports
// router.post('/view_reports', async (req, res) => {
//   const {  token, pagec } = req.body;

//   // check for required fields
//   if(!token || !pagec)
//     return res.status(400).send({status: 'error', msg: 'all fields must be fille'});

//   try{
//     // verify token
//     const delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

//     const resultsPerPage = 10;
//     let page = pagec >= 1 ? pagec : 1;
//     page = page -1;

//     const reports = await Report.find({delivery_agent_id: delivery_agent._id})
//     .select(['user_name', 'user_id', 'delivery_code', 'delivery_id', 'delivery_agent_img_url', 'user_img_url', 'delivery_agent_name']) // add other neccessary fields later on
//     .sort({timestamp: 'desc'})
//     .limit(resultsPerPage)
//     .skip(resultsPerPage * page)
//     .lean();

//     // check if report document exists
//     if(!reports)
//       return res.status(200).send({status: 'error', msg: 'you have not made a report yet'});

//     return res.status(200).send({status: 'ok', msg: 'reports gotten successfully', reports});

    
//   }catch(e) {
//     console.log(e);
//     return res.status(403).send({status: 'error', msg: 'some error occurred', e});
//   }
// });

// // endpoint to view a single report
// router.post('/view_single_report', async (req, res) => {
//   const { token, report_id } = req.body;

//   // check for required fields
//   if(!token)
//     return res.status(400).send({status: 'error', msg: 'all fields must be fille'});

//   try{
//     // verify token
//     const delivery_agent = jwt.verify(token, process.env.JWT_SECRET);
    
//     const report = await Report.findById({_id: report_id}).lean();

//     // check if report document exists
//     if(!report)
//       return res.status(404).send({status: 'error', msg: 'report not found'});

//     return res.status(200).send({status: 'ok', msg: 'report gotten successfully', report});

    
//   }catch(e) {
//     console.log(e);
//     return res.status(403).send({status: 'error', msg: 'some error occurred', e});
//   }
// });
module.exports = router;