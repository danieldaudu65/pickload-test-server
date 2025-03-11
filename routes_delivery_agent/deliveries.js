const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const upload = require('../utils/multer');
const cloudinary = require('../utils/cloudinary');
const Delivery_agent = require('../models/delivery_agent');
const Delivery = require('../models/delivery');
const Referral = require("../models/referral");
const Stats = require('../models/statistics');
const User = require('../models/user');
const Report = require('../models/report');
const Admin = require('../models/admin');
const Transaction = require('../models/transaction');
const Statistics = require('../models/statistics');
const { FsDeliveryRequest, FsStatistics, FieldValue, db } = require('../services/firebase_service_config');
const Notification = require('../models/notification');
dotenv.config();
const router = express.Router();

const { getWeekNumber } = require('../utils/weekNoGetter');
const { sendNotificationToDevice } = require('../controllers/push_notification_controller');
const { hasOneHourElapsed } = require("../functions/timestampChecker");

const handleNotification = async (toUser, receiver_id, img, notiTitle, notiSubtitle, notificationData, agent_device_tokens, os_type, notiType) => {
  let user;
  if (toUser == true) {
    user = await User.findOne({ _id: receiver_id }).lean();
  }
  sendNotificationToDevice(toUser, toUser == true ? [user.device_token] : agent_device_tokens, img, notiTitle, notiSubtitle, notificationData, os_type, notiType || "");
}

let cancelHandle;

//endpoint to accept a delivery
router.post('/accept_delivery', async (req, res) => {
  const { delivery_id, token, delivery_type, notification_id, vehicle_details, fullname, delivery_agent_code, img_url, img_id, device_token, fleet_manager_id, is_fleet_manager, fleet_manager_code, admin_id, delivery_agent_id } = req.body;

  // check for delivery agent profile image
  if (!img_url)
    return res.status(400).send({ status: 'error', msg: 'delivery agent must have a profile image to accept a delivery' });

  // check if it is an assigned deivery
  if (admin_id) {
    // check for required fields for assigned deliveries
    if (!delivery_agent_id || !delivery_id || !notification_id || !vehicle_details || !img_url || !img_id || !fullname || !delivery_agent_code || !delivery_type || is_fleet_manager == undefined || is_fleet_manager == null)
      return res.status(400).send({ status: 'error', msg: 'all fields must be filled' });
  } else {
    //test for required fields
    if (!delivery_id || !token || !notification_id || !vehicle_details || !img_url || !img_id || !fullname || !delivery_agent_code || !delivery_type || is_fleet_manager == undefined || is_fleet_manager == null)
      return res.status(400).send({ status: 'error', msg: 'all fields must be filled' });
  }

  const pay_response = await fetch('https://serverpickload.wl.r.appspot.com/admin_settings/get_payment_timeout_duration');

  if (!pay_response.ok) {
    console.error('Failed to fetch payment timeout duration:', pay_response.status, pay_response.statusText);
    return res.status(400).send({ status: 'error', msg: 'Failed to fetch time duration' });
  }

  const pay_data = await pay_response.json();
  if (pay_data.status !== 'ok' || !pay_data.payment_timeout_duration) {
    console.error('Unexpected payment timeout response:', pay_data);
    return res.status(400).send({ status: 'error', msg: 'Invalid payment timeout response' });
  }


  try {

    const timestamp = Date.now();

    let delivery_agent = '';

    // check if it is an assigned delivery
    if (admin_id) {


      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      const oneHourAgoISO = oneHourAgo.toISOString();


      const deliveriesQuery = FsDeliveryRequest
        .where("delivery_agent_id", "==", delivery_agent_id.toString())
        .where("delivery_status_is_completed", "==", false)
        .where("delivery_status_is_accepted", "==", true)
        .where("delivery_status_is_cancelled", "==", false)
        .where("delivery_status_is_started", "==", false)
        .where("timed_out", "==", false);
      // .where("delivery_status_user_payment_timed_out", "==", false);

      const querySnapshot = await deliveriesQuery.get();

      // Process the results
      const pendingDeliveries = [];
      querySnapshot.forEach((doc) => {
        const delivery = doc.data();
        if (delivery.created_at <= oneHourAgoISO) {
          pendingDeliveries.push({ id: doc.id, ...doc.data() });
        }
      });
      console.log('<>>>>>>><>>>>>>>>>><>>>>>>>>')
      console.log('<>>>>>>><>>>>>>>>>><>>>>>>>>')
      console.log('<>>>>>>><>>>>>>>>>><>>>>>>>>')
      console.log('<>>>>>>><>>>>>>>>>><>>>>>>>>')
      console.log(`Pending deliveries older than 1 hour: ${pendingDeliveries.length}`);

      // check if payment time has elapsed for more than an hour and set user payment timetamp field
      // const delivery_ids = [];
      // const batch = db.batch();
      // for (const delivery of deliveries) {
      //   if (hasOneHourElapsed(delivery.timetamp)) {
      //     delivery_ids.push(delivery._id);
      //     // Add Firestore update to the batch
      //     const docRef = FsDeliveryRequest.doc(delivery._id.toString());
      //     batch.update(docRef, {
      //       timed_out: true,
      //       user_payment_timed_out: true,
      //     });
      //   }
      // };


      if (pendingDeliveries.length > 5) {
        // update delivery documents
        console.log(`Max deliveries reached: ${pendingDeliveries.length}`);
        return res.status(400).send({ status: 'error', msg: 'Max deliveries reached' });
      } else {
        console.log("No elapsed payments")
      }


      console.log(`______>> deliveries: ${pendingDeliveries.length}`);
      // console.log(`______>> delivery_ids: ${delivery_ids.length}`);

      // const no_of_pending_deliveries = deliveries.length - delivery_ids.length;
      // if (no_of_pending_deliveries > 5) {
      //   console.log(`____________>>> ${no_of_pending_deliveries}`);
      //   return res.status(400).send({ status: 'error', msg: "max deliveries reached" });
      // }

      // check delivery agent account status
      delivery_agent = await Delivery_agent.findById({ _id: delivery_agent_id });
      if (delivery_agent.status !== 'active')
        return res.status(400).send({ status: 'error', msg: `your account is ${delivery_agent.status}` });
    } else {
      //verify 
      
      
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      const oneHourAgoISO = oneHourAgo.toISOString();
      delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

      // // fetch delivery agent pending deliveries 
      const deliveriesM = await Delivery.find({
        delivery_agent_id: delivery_agent._id,
        'delivery_status.is_completed': false,
        'delivery_status.is_accepted': true,
        'delivery_status.is_cancelled': false,
        'delivery_status.is_started': false,
        'delivery_status.user_payment_timed_out': false,
      }, { delivery_status: 1, delivery_agent_id: 1, delivery_type: 1, timestamp: 1 }).lean();

      console.log(`>>>>>>>>>>>>>>>>>>>>>>>deliveriesM: ${deliveriesM.length}`);

      const deliveriesQuery = FsDeliveryRequest
        .where("delivery_agent_id", "==", delivery_agent._id.toString())
        .where("delivery_status_is_completed", "==", false)
        .where("delivery_status_is_accepted", "==", true)
        .where("delivery_status_is_cancelled", "==", false)
        .where("delivery_status_is_started", "==", false)
        .where("timed_out", "==", false);

      // .where("delivery_status_user_payment_timed_out", "==", false);

      const querySnapshot = await deliveriesQuery.get();

      // Process the results
      const pendingDeliveries = [];
      querySnapshot.forEach((doc) => {
        const delivery = doc.data();
        if (delivery.created_at <= oneHourAgoISO) {
            pendingDeliveries.push({ id: doc.id, ...delivery });
        }
    });

      // check if payment time has elapsed for more than an hour and set user payment timetamp fiel


      console.log(`______>> deliveries: ${pendingDeliveries.length}`)

      if (pendingDeliveries.length > 5) {
        console.log(`Max deliveries reached: ${pendingDeliveries.length}`);
        return res.status(400).send({ status: 'error', msg: 'Max deliveries reached' });
    }

      // check delivery agent account status
      delivery_agent = await Delivery_agent.findById({ _id: delivery_agent._id });
      if (delivery_agent.status !== 'active')
        return res.status(400).send({ status: 'error', msg: `your account is ${delivery_agent.status}` });
    }
    let delivery = await Delivery.findById({ _id: delivery_id });

    //check if delivery exists
    if (!delivery)
      return res.status(400).send({ status: 'error', msg: `Delivery Request not found` });

    // check if delivery has timed out
    if (delivery.delivery_status.timed_out)
      return res.status(400).send({ status: 'error', msg: 'Delivery timed out', delivery });

    // check if delivery timed out on user payment
    if (delivery.delivery_status.user_payment_timed_out)
      return res.status(400).send({ status: 'error', msg: 'User payment timed out', delivery });

    // check if delivery has been accepted
    if (delivery.delivery_agent_id !== '' && !admin_id)
      return res.status(400).send({ status: 'error', msg: 'delivery has been accepted by another delivery agent' });

    // //get the paticular vehicle in the vehicles array
    // const [vehicle] = vehicle_details.filter((vehicle) => {
    //   return vehicle.type === delivery.delivery_medium;
    // });
    // console.log(vehicle);

    // check delivery type and edit delivery document accordingly
    if (delivery_type === 'scheduled') {
      delivery.delivery_status.is_booked = true;

      // update delivery agent document
      delivery_agent.no_of_scheduled_deliveries += 1;
    } else {
      delivery_agent.no_of_instant_deliveries += 1;
    }

    // check if delivery agent is under a fleet manager
    if (fleet_manager_code) {
      delivery.fleet_manager_code = fleet_manager_code;
    }

    // update former delivery agent doc and related docs if delivery had a delivery agent
    if (delivery.delivery_agent_id) {
      const delivery_agentM = await Delivery_agent.findOneAndUpdate({ _id: delivery.delivery_agent_id }, {
        $inc: { no_accepted_deliveries: -1 }
      }).lean();
      if (delivery_agentM.fleet_manager_id) {
        // fetch update the fleet manager document accordinly
        await Delivery_agent.updateOne(
          { _id: delivery_agentM.fleet_manager_id },
          {
            '$inc': {
              'fleet_manager_delivery_agents_deliveries.no_accepted_deliveries': -1,
              'total_deliveries_stats.total_no_accepted_deliveries': -1
            }
          },
          { new: true }
        );
      }
      // check if delivery agent is a fleet manager
      if (delivery_agentM.fleet_name) {
        // fetch update the fleet manager document accordinly
        await Delivery_agent.updateOne(
          { _id: delivery_agent._id },
          { '$inc': { 'total_deliveries_stats.total_no_accepted_deliveries': -1 } }
        );
      }

      // update transaction document
      await Transaction.updateOne({ delivery_id: delivery._id }, {
        delivery_agent_id: delivery_agent_id,
        delivery_agent_name: fullname,
        delivery_medium: delivery_agent.vehicle_details.type
      });

      //update statistics document accordingly
      await Stats.updateOne(
        { doc_type: 'admin' },
        { '$inc': { total_deliveries: -1 } },
        { new: true }
      );

      await FsStatistics.doc('statistics').update({
        total_deliveries: FieldValue.increment(-1)
      });
    }

    //edit delivery document accordingly 
    delivery.delivery_status.is_accepted = true;
    delivery.delivery_status.is_accepted_at = Date.now();
    delivery.delivery_agent_id = delivery_agent._id;
    delivery.delivery_agent_plate_no = delivery_agent.vehicle_details.plate_no;
    delivery.delivery_agent_name = fullname;
    delivery.delivery_agent_vehicle_type = delivery_agent.vehicle_details.type;
    delivery.delivery_agent_phone_no = delivery_agent.phone_no;
    delivery.delivery_agent_code = delivery_agent_code;
    delivery.delivery_agent_vehicle_color = delivery_agent.vehicle_details.color;
    delivery.delivery_agent_vehicle_imgs_urls = delivery_agent.vehicle_details.img_urls;
    delivery.delivery_agent_img = img_url;
    delivery.delivery_agent_img_id = img_id;
    delivery.delivery_agent_email = delivery_agent.email;

    delivery = await delivery.save();

    //edit delivery_agent document accordingly
    delivery_agent.no_accepted_deliveries += 1;

    delivery_agent = await delivery_agent.save();

    // check if delivery agent is under a fleet manager
    if (fleet_manager_id) {
      // fetch update the fleet manager document accordinly
      const fleet_manager = await Delivery_agent.findByIdAndUpdate(
        { _id: fleet_manager_id },
        {
          '$inc': {
            'fleet_manager_delivery_agents_deliveries.no_accepted_deliveries': 1,
            'total_deliveries_stats.total_no_accepted_deliveries': 1
          }
        },
        { new: true }
      ).lean();
      console.log(fleet_manager);
    }

    // check if delivery agent is a fleet manager
    if (is_fleet_manager) {
      // fetch update the fleet manager document accordinly
      const fleet_manager = await Delivery_agent.findByIdAndUpdate(
        { _id: delivery_agent._id },
        { '$inc': { 'total_deliveries_stats.total_no_accepted_deliveries': 1 } }
      ).lean();
    }

    //update statistics document accordingly
    const stats = await Stats.findOneAndUpdate(
      { doc_type: 'admin' },
      { '$inc': { total_deliveries: 1 } },
      { new: true }
    ).lean();

    await FsStatistics.doc('statistics').update({
      total_deliveries: FieldValue.increment(1)
    });

    // alter the fields in the notification document correspondilg to this accepted delivery
    let notification = await Notification.findOneAndUpdate(
      { id: notification_id },
      {
        is_accepted: true,
        is_accepted_by_id: delivery_agent._id,
        delivery_agent_name: fullname,
        delivery_agent_img: img_url,
        delivery_agent_img_id: img_id
      },
      { new: true }
    ).lean();

    const dynamic_pay_data = pay_data.payment_timeout_duration

    const now = new Date()
    const pay_expires = new Date(now.getTime() + dynamic_pay_data * 60 * 1000);



    // update delivery_request document on firestore
    await FsDeliveryRequest.doc(delivery_id.toString()).update({
      'delivery_status_is_accepted': true,
      'delivery_status_is_accepted_at': Date.now(),
      delivery_agent_id: delivery_agent._id.toString(),
      delivery_agent_plate_no: delivery_agent.vehicle_details.plate_no,
      delivery_agent_name: fullname,
      delivery_agent_vehicle_type: delivery.delivery_medium,
      delivery_agent_phone_no: delivery_agent.phone_no,
      delivery_agent_code: delivery_agent_code,
      delivery_agent_vehicle_color: delivery_agent.vehicle_details.color,
      delivery_agent_img: img_url,
      delivery_agent_img_id: img_id,

      pay_created_at: now.toISOString(),
      pay_expires_at: pay_expires.toISOString(),
      pay_timed_out: false,
      status_updated_at: now.toISOString(),
      all_time_out: false,
    });


    const payment_interval = setInterval(async () => {
      const current = new Date();

      try {
        const deliveryId = delivery._id.toString();
        console.log(deliveryId);

        const deliveryDoc = await FsDeliveryRequest.doc(deliveryId).get();

        if (!deliveryDoc.exists) {
          console.log(`Delivery with ID ${deliveryId} not found in Firestore.`);
          clearInterval(payment_interval);
          return;
        }

        const delivery_fire = deliveryDoc.data();

        // Check if the current time is greater than pay_expires_at and mark pay_timed_out if true
        if ((current >= delivery_fire.pay_expires_at) || (delivery_fire.delivery_status_is_paid)) {
          await FsDeliveryRequest.doc(deliveryId).update({
            pay_timed_out: true,
          });
          console.log(`Payment timed out for delivery ID ${deliveryId}`);
        }

        // Check if the delivery has started, then set all_time_out to true
        if (delivery_fire.delivery_status_is_started) {
          await FsDeliveryRequest.doc(deliveryId).update({
            all_time_out: true,
            pay_timed_out: true,
          });
          console.log(`All timeout marked for delivery ID ${deliveryId}`);
        }

        if (current >= new Date(delivery_fire.pay_expires_at.seconds * 1000) || delivery_fire.delivery_status_is_started) {
          clearInterval(payment_interval);
        }

      } catch (error) {
        console.error(`Error in payment interval: ${error.message}`);
        clearInterval(payment_interval);
      }
    }, 1 * 60 * 1000);



    // send push notification to the user who's delivery request you accepted

    notification = new Notification;

    notification.noti_type = 'accepted_delivery_request';
    notification.delivery_id = delivery._id.toString();
    notification.user_id = delivery.sender_id;
    notification.to_id = delivery.sender_id;
    notification.delivery_agent_ids = [];
    notification.parcel_code = delivery.parcel_code;
    notification.content = `${delivery.delivery_agent_name} accepted the delivery of ${delivery.parcel_name}`;
    notification.user_name = delivery.sender_fullname;
    notification.pickup_location = delivery.pickup_location;
    notification.drop_off_location = delivery.drop_off_location;
    notification.delivery_agent_name = delivery.delivery_agent_name;
    notification.delivery_agent_img = delivery.delivery_agent_img;
    notification.delivery_agent_img_id = delivery.delivery_agent_img_id;
    notification.is_accepted = false;
    notification.timestamp = timestamp;

    notification = await notification.save();

    const noti = {};

    noti._id = notification._id;
    noti.noti_type = 'accepted_delivery_request';
    noti.delivery_id = delivery._id.toString();
    noti.user_id = delivery.sender_id;
    noti.to_id = delivery.sender_id;
    noti.delivery_agent_ids = [];
    noti.parcel_code = delivery.parcel_code;
    noti.content = `${delivery.delivery_agent_name} accepted the delivery of ${delivery.parcel_name}`;
    noti.user_name = delivery.sender_fullname;
    noti.pickup_location = delivery.pickup_location;
    noti.drop_off_location = delivery.drop_off_location;
    noti.delivery_agent_name = delivery.delivery_agent_name;
    noti.delivery_agent_img = delivery.delivery_agent_img;
    noti.delivery_agent_img_id = delivery.delivery_agent_img_id;
    noti.is_accepted = false;
    noti.timestamp = timestamp;

    //send notification to the delivery agents to accept a delivery request

    // Send notifications to all relevant delivery agents (push notifications using device tokens)

    // const subTitle = `${delivery.delivery_agent_name} accepted the delivery of ${delivery.parcel_name}`;
    const subTitle = `A delivery agent has been assigned to you. Kindly proceed to make payment`;
    setTimeout(handleNotification, 1000, true, delivery.sender_id, '', process.env.APP_NAME, subTitle, noti, 'user');

    const mStat = await Statistics.findOne({ doc_type: 'admin' }).select(['payment_timeout_duration']).lean();

    // handle cancel notification
    setTimeout(handleCancel, (((mStat.payment_timeout_duration * 60) + 15) * 1000), delivery._id, delivery.sender_id, delivery.delivery_agent_id, delivery.parcel_code, delivery.parcel_name, delivery.sender_fullname);
    // console.log(delivery);
    return res.status(200).send({ status: 'ok', msg: 'Delivery accepted successfully', delivery, delivery_agent });
  } catch (e) {
    console.log(e);
    return res.status(403).send({ status: 'error', msg: 'some error occurred' });
  }
});

const handleCancel = async (delivery_id, sender_id, delivery_agent_id, parcel_code, parcel_name, sender_fullname) => {
  // check if the user has made payment
  const { delivery_status } = await Delivery.findOne({ _id: delivery_id }).select(['delivery_status']).lean();
  if (delivery_status.is_paid == false) {

    const delivery = await Delivery.findOneAndUpdate(
      { _id: delivery_id },
      { 'delivery_status.timed_out': true },
      { new: true }
    ).lean();

    // update data on firestore
    await FsDeliveryRequest.doc(delivery_id.toString()).update({
      timed_out: true,
      user_payment_timed_out: true
    });

    const timestamp = Date.now();

    let notification = new Notification;

    notification.noti_type = 'timed_out';
    notification.delivery_id = delivery._id;
    notification.user_id = sender_id;
    notification.to_id = '';
    notification.delivery_agent_ids = [delivery_agent_id];
    notification.parcel_code = parcel_code;
    notification.content = `Delivery request for ${parcel_name} timed out`;
    notification.user_name = sender_fullname;
    notification.delivery_agent_name = '';
    notification.delivery_agent_img = '';
    notification.delivery_agent_img_id = '';
    notification.is_accepted = false;
    notification.timestamp = timestamp;

    notification = await notification.save();

    // get delivery agent device token
    const singleDelAgent = await Delivery_agent.findOne({ _id: delivery_agent_id }).lean();;

    const subTitle = `Delivery request for ${delivery.parcel_name} timed out`;
    setTimeout(handleNotification, 1000, false, 'receiver_id', delivery.imgs[0], process.env.APP_NAME, subTitle, notification, [singleDelAgent.device_token], singleDelAgent.os_type);
  }
}

//endpoint to start a delivery
router.post('/start_delivery', async (req, res) => {
  const { delivery_id, token } = req.body;

  //check for required fields
  if (!delivery_id || !token)
    return res.status(400).send({ status: 'error', msg: 'delivery id and token needed' });

  try {
    //verify token
    let delivery = jwt.verify(token, process.env.JWT_SECRET);

    const timestamp = Date.now();

    //check if delivery exists
    delivery = await Delivery.findById({ _id: delivery_id });
    if (!delivery)
      return res.status(404).send({ status: 'error', msg: `Delivery Request not found` });

    //update delivery document accordingly
    delivery.delivery_status.is_started = true;
    delivery.delivery_status.is_started_at = timestamp

    await delivery.save();

    //update user document
    const sender_id = delivery.sender_id;
    let user = await User.findByIdAndUpdate(
      { _id: sender_id },
      { '$inc': { 'stats.total_pending_deliveries': 1 } },
      { new: true }
    ).lean();

    await FsDeliveryRequest.doc(delivery._id.toString()).update({
      delivery_status_is_started: true,
      delivery_status_is_started_at: timestamp,


    });

    // // check if user exists
    // if(!user)
    //   return res.status(404).send({status: 'error', msg: 'user not found'});

    let notification = new Notification;

    notification.noti_type = 'started_delivery';
    notification.delivery_id = delivery._id;
    notification.user_id = user._id.toString();
    notification.to_id = user._id.toString();
    notification.delivery_agent_ids = [delivery.sender_id];
    notification.parcel_code = delivery.parcel_code;
    notification.content = `${delivery.delivery_agent_name} has picked up your delivery of ${delivery.parcel_name}`;
    notification.user_name = delivery.sender_fullname;
    notification.delivery_agent_name = delivery.delivery_agent_name;
    notification.delivery_agent_img = delivery.delivery_agent_img;
    notification.delivery_agent_img_id = delivery.delivery_agent_img_id;
    notification.is_accepted = false;
    notification.timestamp = timestamp;

    notification = await notification.save();

    const subTitle = `${delivery.delivery_agent_name} has picked up your delivery of ${delivery.parcel_name}`;
    setTimeout(handleNotification, 1000, true, delivery.sender_id, '', process.env.APP_NAME, subTitle, { content: notification.content, delivery_id: delivery._id, is_accepted: false, timestamp }, 'user');

    return res.status(200).send({ status: 'ok', msg: 'Ride started successfully', delivery });

  } catch (e) {
    console.log(e);
    return res.status(403).send({ status: 'error', msg: 'some error occurred' });
  }
});

//endpoint to cancel a delivery
// send in fleet_manager_id if the delivery agent is under a fleet manager
router.post('/cancel_delivery', async (req, res) => {
  const { delivery_id, token, cancel_reason, fleet_manager_id, is_fleet_manager, device_token, notification_id } = req.body;

  //check for required fields
  if (!delivery_id || !token || is_fleet_manager == undefined || is_fleet_manager == null)
    return res.status(400).send({ status: 'error', msg: 'all fields must be filled' });

  try {
    //verify token
    const delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

    //check if delivery exists
    let delivery = await Delivery.findById({ _id: delivery_id });
    if (!delivery)
      return res.status(404).send({ status: 'error', msg: `Delivery Request not found` });

    const timestamp = Date.now();
    //edit delivery_agent document accordingly
    await Delivery_agent.findByIdAndUpdate(
      { _id: delivery_agent._id },
      { '$inc': { no_cancelled_deliveries: 1 } },
      { new: true }
    ).lean();

    //update delivery document accordingly
    delivery.delivery_status.is_cancelled = true;
    delivery.delivery_status.is_cancelled_by = 'delivery agent';
    delivery.delivery_status.is_cancelled_at = timestamp;
    delivery.delivery_agent_cancel_reason = cancel_reason;

    delivery = await delivery.save();

    await FsDeliveryRequest.doc(delivery._id.toString()).update({
      delivery_status_is_cancelled: true,
      delivery_status_is_cancelled_at: timestamp,
      delivery_status_is_cancelled_by: 'delivery agent'
    });

    // check if delivery agent is under a fleet manager
    if (fleet_manager_id) {
      // fetch update the fleet manager document accordinly
      const fleet_manager = await Delivery_agent.findByIdAndUpdate(
        { _id: fleet_manager_id },
        {
          '$inc': {
            'fleet_manager_delivery_agents_deliveries.no_cancelled_deliveries': 1,
            'total_deliveries_stats.total_no_cancelled_deliveries': 1
          }
        }
      ).lean();
    }

    // check if delivery agent is a fleet manager
    if (is_fleet_manager) {
      // fetch update the fleet manager document accordinly
      const fleet_manager = await Delivery_agent.findByIdAndUpdate(
        { _id: delivery_agent._id },
        { '$inc': { 'total_deliveries_stats.total_no_cancelled_deliveries': 1 } }
      ).lean();
    }

    //update user document accordingly
    let user = await User.findByIdAndUpdate(
      { _id: delivery.sender_id },
      { '$inc': { 'stats.total_cancelled_deliveries': 1 } },
      { new: true }
    ).lean();

    // // check if user document exists
    // if(!user)
    //   return res.status(404).send({status: 'error', msg: 'user not found'});

    //update statistics document accordingly
    const stats = await Stats.findOneAndUpdate(
      { doc_type: 'admin' },
      { '$inc': { total_cancelled_deliveries: 1, total_cancelled_deliveries_by_delivery_agents: 1 } },
      { new: true }
    ).lean();

    await FsStatistics.doc('statistics').update({
      total_cancelled_deliveries: FieldValue.increment(1),
      total_cancelled_deliveries_by_delivery_agents: FieldValue.increment(1)
    });


    let notification = new Notification;

    notification.noti_type = 'canceled_delivery';
    notification.delivery_id = delivery._id;
    notification.user_id = user._id.toString();
    notification.to_id = user._id.toString();
    notification.delivery_agent_ids = [delivery.sender_id];
    notification.parcel_code = delivery.parcel_code;
    notification.content = `${delivery.delivery_agent_name} cancelled the delivery of ${delivery.parcel_name}`;
    notification.user_name = delivery.sender_fullname;
    notification.delivery_agent_name = delivery.delivery_agent_name;
    notification.delivery_agent_img = delivery.delivery_agent_img;
    notification.delivery_agent_img_id = delivery.delivery_agent_img_id;
    notification.is_accepted = false;
    notification.timestamp = timestamp;

    notification = await notification.save();

    const subTitle = `${delivery.delivery_agent_name} cancelled the delivery of ${delivery.parcel_name}`;
    setTimeout(handleNotification, 1000, true, delivery.sender_id, '', process.env.APP_NAME, subTitle, notification, 'user');

    return res.status(200).send({ status: 'ok', msg: 'delivery canceled successfully', delivery });
  } catch (e) {
    console.log(e);
    return res.status(403).send({ status: 'error', msg: 'some error occurred' });
  }
});

// endpoint to authomatically cancel a delivery after a period of time if the driver dosen't start the delivery
// send in fleet_manager_id if the delivery agent is under a fleet manager
router.post('/auto_cancel_delivery', async (req, res) => {
  const { delivery_id, body, delivery_code, user_id, user_name, delivery_agent_code, reporter, token, fleet_manager_id, is_fleet_manager, device_token, notification_id } = req.body;

  // check for required fields
  if (!delivery_id || !token || !delivery_code || !user_id || !user_name || !body || !delivery_agent_code || is_fleet_manager == undefined || is_fleet_manager == null)
    return res.status(400).send({ status: 'error', msg: 'all fields must be filled' });

  try {
    // verify token
    let delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

    //check if delivery exists
    let delivery = await Delivery.findById({ _id: delivery_id });
    if (!delivery)
      return res.status(404).send({ status: 'error', msg: `Delivery Request not found` });

    //edit delivery_agent document accordingly
    await Delivery_agent.findByIdAndUpdate(
      { _id: delivery_agent._id },
      { '$inc': { no_cancelled_deliveries: 1 } },
      { new: true }
    ).lean();

    //update delivery document accordingly
    delivery.delivery_status.is_cancelled = true;
    delivery.delivery_status.is_cancelled_by = 'delivery agent';
    delivery.delivery_status.is_cancelled_at = Date.now();
    delivery.delivery_agent_cancel_reason = cancel_reason;

    delivery = await delivery.save();

    // check if delivery agent is under a fleet manager
    if (fleet_manager_id) {
      // fetch update the fleet manager document accordinly
      const fleet_manager = await Delivery_agent.findByIdAndUpdate(
        { _id: fleet_manager_id },
        {
          '$inc': {
            'fleet_manager_delivery_agents_deliveries.no_cancelled_deliveries': 1,
            'total_deliveries_stats.total_no_cancelled_deliveries': 1
          }
        }
      ).lean();
    }

    // check if delivery agent is a fleet manager
    if (is_fleet_manager) {
      // fetch update the fleet manager document accordinly
      const fleet_manager = await Delivery_agent.findByIdAndUpdate(
        { _id: delivery_agent._id },
        { '$inc': { 'total_deliveries_stats.total_no_cancelled_deliveries': 1 } }
      ).lean();
    }

    //update user document accordingly
    let user = await User.findByIdAndUpdate(
      { _id: delivery.sender_id },
      { '$inc': { 'stats.total_cancelled_deliveries': 1 } },
      { new: true }
    ).lean();

    // // check if user document exists
    // if(!user)
    //   return res.status(404).send({status: 'error', msg: 'user not found'});

    // create a report document and populate accordingly
    let report = new Report;
    report.user_name = user_name;
    report.user_id = user_id;
    report.delivery_agent_code = delivery_agent_code;
    report.delivery_agent_id = delivery_agent._id;
    report.timestamp = Date.now();
    report.delivery_id = delivery_id;
    report.delivery_code = delivery_code;
    report.body = body;
    report.report_img_urls = img_urls;
    report.report_img_ids = img_ids;
    report.reporter = reporter;
    report.is_resolved = false;

    report = await report.save();

    //update statistics document accordingly
    const stats = await Stats.findOneAndUpdate(
      { doc_type: 'admin' },
      { '$inc': { total_cancelled_deliveries: 1, total_cancelled_deliveries_by_delivery_agents: 1, total_delivery_agent_reports: 1, total_reports: 1, total_pending_reports: 1 } },
      { new: true }
    ).lean();

    await FsStatistics.doc('statistics').update({
      total_cancelled_deliveries: FieldValue.increment(1),
      total_cancelled_deliveries_by_delivery_agents: FieldValue.increment(1),
      total_delivery_agent_reports: FieldValue.increment(1),
      total_reports: FieldValue.increment(1),
      total_pending_reports: FieldValue.increment(1)
    });

    return res.status(200).send({ status: 'ok', msg: 'delivery canceled and reported successfully', delivery, report });
  } catch (e) {
    console.log(e);
    return res.status(403).send({ status: 'error', msg: 'some error occurred' });
  }
});


//endpoint to complete a delivery
router.post('/complete_delivery', upload.array('delivery_confirmation_proof_images', 10), async (req, res) => {
  const { delivery_id, token, fleet_manager_id, is_fleet_manager } = req.body;
  const timestamp = Date.now();

  //check for required fields
  if (!delivery_id || req.files.length === 0 || !token || is_fleet_manager == undefined || is_fleet_manager == null)
    return res.status(400).send({ status: 'error', msg: 'all fields must be filled' });

  try {
    //verify token
    let delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

    //check if delivery exists
    let delivery = await Delivery.findById({ _id: delivery_id });
    if (!delivery)
      return res.status(404).send({ status: 'error', msg: 'Delivery Request not found' });

    //edit delivery_agent document accordingly
    delivery_agent = await Delivery_agent.findByIdAndUpdate(
      { _id: delivery_agent._id },
      { '$inc': { no_completed_deliveries: 1, total_earnings: delivery.delivery_cost_delivery_agent } },
      { new: true }
    ).lean();

    // edit users document accordingly
    const user = await User.findOneAndUpdate(
      { _id: delivery.sender_id },
      { '$inc': { 'stats.total_successful_deliveries': 1 } },
      { new: true, referee_code: 1 }
    ).lean();

    // update users referral document
    await Referral.updateOne({ user_id: user._id }, { $inc: { no_of_completed_deliveries: 1 } });

    // fetch stats and referral document and update accordingly
    if (user.referee_code) {
      const { no_of_referees, no_completed_orders_per_referee } = await Statistics.findOne({}, { no_completed_orders_per_referee: 1, no_of_referees: 1 }).lean();

      // fetch all the documents that the referee has referred
      const referrals = await Referral.find({ referee_code: user.referee_code }, { no_of_completed_deliveries: 1, referee_code: 1 }).lean();

      // filter referral documents that have passed the prerequisite number of completed orders
      const passedReferrals = referrals.filter(referral => {
        return referral.no_of_completed_deliveries >= no_completed_orders_per_referee;
      });

      // conditionally update the referee document if the prerequisite is met
      if (passedReferrals.length >= no_of_referees) await Referral.updateOne({ referral_code: user.referee_code }, { is_qualified: true });
    }

    // check if delivery agent is under a fleet manager
    if (fleet_manager_id) {
      // fetch update the fleet manager document accordinly
      const fleet_manager = await Delivery_agent.findByIdAndUpdate(
        { _id: fleet_manager_id },
        {
          '$inc': {
            'fleet_manager_delivery_agents_deliveries.no_completed_deliveries': 1,
            'total_deliveries_stats.total_no_completed_deliveries': 1,
            total_earnings: delivery.delivery_cost_delivery_agent
          }
        },
        { new: true }
      ).lean();
      console.log(fleet_manager);
    }

    // check if delivery agent is a fleet manager
    if (is_fleet_manager) {
      // fetch update the fleet manager document accordinly
      const fleet_manager = await Delivery_agent.findByIdAndUpdate(
        { _id: delivery_agent._id },
        { '$inc': { 'total_deliveries_stats.total_no_completed_deliveries': 1 } }
      ).lean();
    }


    //upload receivers images with the package
    let img_urls = [];
    let img_ids = [];
    for (let i = 0; i < req.files.length; i++) {
      const result = await cloudinary.uploader.upload(req.files[i].path, { folder: 'pick_load_project' });
      img_urls.push(result.secure_url);
      img_ids.push(result.public_id);
    }

    //update delivery document accordingly
    delivery.delivery_status.is_completed = true;
    delivery.delivery_status.is_completed_at = Date.now();
    delivery.delivered_in = delivery.delivery_status.is_completed_at - delivery.delivery_status.is_started_at;
    delivery.delivery_confirmation_proof_urls = img_urls;
    delivery.delivery_confirmation_proof_ids = img_ids;

    delivery = await delivery.save();

    //Get year, month and week
    const completed_year = new Date().getFullYear();
    const completed_month = new Date().getMonth();
    const completed_day = new Date().getDate();
    const completed_week = getWeekNumber(completed_year, completed_month, new Date().getDate());

    // update transaction document accordingly
    await Transaction.updateOne({ _id: delivery.transaction_id }, {
      is_completed: true, completed_day: completed_day, completed_month: completed_month,
      completed_week: completed_week, completed_year: completed_year
    }).lean();

    // update fields on firestore
    await FsDeliveryRequest.doc(delivery._id.toString()).update({
      delivery_status_is_completed: true,
      delivery_status_is_completed_at: Date.now(),
      delivered_in: delivery.delivery_status.is_completed_at - delivery.delivery_status.is_started_at,
      delivery_confirmation_proof_urls: img_urls,
      delivery_confirmation_proof_ids: img_ids
    });

    // update statistics document
    await Statistics.updateOne({ doc_type: 'admin' }, { total_completed_deliveries: 1 }).lean();

    let notification = new Notification;

    notification.noti_type = 'completed_delivery';
    notification.delivery_id = delivery._id;
    notification.user_id = delivery.sender_id;
    notification.to_id = delivery.sender_id;
    notification.delivery_agent_ids = [delivery.sender_id];
    notification.parcel_code = delivery.parcel_code;
    notification.content = `${delivery.delivery_agent_name} successfully completed the delivery of ${delivery.parcel_name}`;
    notification.user_name = delivery.sender_fullname;
    notification.delivery_agent_name = delivery.delivery_agent_name;
    notification.delivery_agent_img = delivery.delivery_agent_img;
    notification.delivery_agent_img_id = delivery.delivery_agent_img_id;
    notification.is_accepted = false;
    notification.timestamp = timestamp;

    notification = await notification.save();

    const subTitle = `${delivery.delivery_agent_name} successfully completed the delivery of ${delivery.parcel_name}`;
    setTimeout(handleNotification, 1000, true, delivery.sender_id, '', process.env.APP_NAME, subTitle, notification, 'user');


    return res.status(200).send({ status: 'ok', msg: 'delivery completed successfully', delivery, delivery_agent });
  } catch (e) {
    console.log(e);
    return res.status(403).send({ status: 'error', msg: 'some error occurred' });
  }
});

// endpoint to reasign a cancelled delivery
router.post('/assign_cancelled_delivery', async (req, res) => {
  const { token, delivery_id, delivery_agent_id, delivery_agent_img_id } = req.body;

  if (!token || !delivery_id || !delivery_agent_img_id)
    return res.status(400).send({ status: 'error', msg: 'all fields must be filled' });

  try {
    const timestamp = Date.now();

    //verify token
    let admin = jwt.verify(token, process.env.JWT_SECRET);

    // check for admin status
    admin = await Admin.findOne({ _id: admin._id }).select(['-password']).lean();

    if (admin.status != true) {
      return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
    }

    // check delivery agent account status
    let delivery_agent = await Delivery_agent.findById({ _id: delivery_agent_id });
    if (delivery_agent.status !== 'active')
      return res.status(400).send({ status: 'error', msg: `your account is ${delivery_agent.status}` });

    let delivery = await Delivery.findById({ _id: delivery_id });

    //check if delivery exists
    if (!delivery)
      return res.status(400).send({ status: 'error', msg: `Delivery Request not found` });

    // check delivery type and edit delivery document accordingly
    if (delivery.delivery_type === 'scheduled') {
      delivery.delivery_status.is_booked = true;

      // update delivery agent document
      delivery_agent.no_of_scheduled_deliveries += 1;
    } else {
      delivery_agent.no_of_instant_deliveries += 1;
    }

    // check if delivery agent is under a fleet manager
    if (delivery_agent.fleet_manager_code) {
      delivery.fleet_manager_code = delivery_agent.fleet_manager_code;
    }

    //edit delivery document accordingly 
    delivery.delivery_status.is_accepted = true;
    delivery.delivery_status.is_accepted_at = Date.now();
    delivery.delivery_agent_id = delivery_agent._id;
    delivery.delivery_agent_plate_no = delivery_agent.vehicle_details.plate_no;
    delivery.delivery_agent_name = delivery_agent.fullname;
    delivery.delivery_agent_vehicle_type = delivery.delivery_medium;
    delivery.delivery_agent_phone_no = delivery_agent.phone_no;
    delivery.delivery_agent_code = delivery_agent.delivery_agent_code;
    delivery.delivery_agent_vehicle_color = delivery_agent.vehicle_details.color;
    delivery.delivery_agent_vehicle_imgs_urls = delivery_agent.vehicle_details.img_urls;
    delivery.delivery_agent_img = delivery_agent.img_url;
    delivery.delivery_agent_img_id = delivery_agent.img_id;
    delivery.delivery_agent_email = delivery_agent.email;
    delivery.delivery_status.is_started = false;
    delivery.delivery_status.is_started_at = '';
    delivery.delivery_status.arrived_pickup_location = false;
    delivery.delivery_status.delivery_status_arrived_dropoff_location = false;
    delivery.delivery_status.is_cancelled = false;
    delivery.delivery_status.is_cancelled_by = '';
    delivery.delivery_status.is_cancelled_at = '';
    delivery.delivery_agent_cancel_reason = '';

    delivery = await delivery.save();

    //edit delivery_agent document accordingly
    delivery_agent.no_accepted_deliveries += 1;

    await delivery_agent.save();

    // check if delivery agent is under a fleet manager
    if (delivery_agent.fleet_manager_id) {
      // fetch update the fleet manager document accordinly
      const fleet_manager = await Delivery_agent.findByIdAndUpdate(
        { _id: delivery_agent.fleet_manager_id },
        {
          '$inc': {
            'fleet_manager_delivery_agents_deliveries.no_accepted_deliveries': 1,
            'total_deliveries_stats.total_no_accepted_deliveries': 1
          }
        }
      ).lean();
    }

    //update statistics document accordingly
    const stats = await Stats.findOneAndUpdate(
      { doc_type: 'admin' },
      { '$inc': { total_deliveries: 1 } },
      { new: true }
    ).lean();

    await FsStatistics.doc('statistics').update({
      total_deliveries: FieldValue.increment(1)
    });

    // alter the fields in the notification document correspondilg to this accepted delivery
    let notification = await Notification.findOneAndUpdate(
      { id: delivery.delivery_accept_request_notification_id },
      {
        is_accepted: true,
        is_accepted_by_id: delivery_agent._id,
        delivery_agent_name: delivery_agent.fullname,
        delivery_agent_img: delivery_agent.img_url,
        delivery_agent_img_id: delivery_agent.img_id
      },
      { new: true }
    ).lean();

    // update delivery_request document on firestore
    await FsDeliveryRequest.doc(delivery_id.toString()).update({
      'delivery_status_is_accepted': true,
      'delivery_status_is_accepted_at': Date.now(),
      delivery_agent_id: delivery_agent._id.toString(),
      delivery_agent_plate_no: delivery_agent.vehicle_details.plate_no,
      delivery_agent_name: delivery_agent.fullname,
      delivery_agent_vehicle_type: delivery.delivery_medium,
      delivery_agent_phone_no: delivery_agent.phone_no,
      delivery_agent_code: delivery_agent.delivery_agent_code,
      delivery_agent_vehicle_color: delivery_agent.vehicle_details.color,
      delivery_agent_img: delivery_agent.img_url,
      delivery_agent_img_id: delivery_agent.img_id,
      'delivery_status_is_started': false,
      'delivery_status_is_started_at': 1,
      'delivery_status_arrived_pickup_location': false,
      'delivery_status_delivery_status_arrived_dropoff_location': false,
      'delivery_status_is_cancelled': false,
      'delivery_status_is_cancelled_by': '',
      'delivery_status_is_cancelled_at': 0
    });

    // send push notification to the user who's delivery request you accepted

    notification = new Notification;

    notification.noti_type = 'accepted_delivery_request';
    notification.delivery_id = delivery._id.toString();
    notification.user_id = delivery.sender_id;
    notification.to_id = delivery.sender_id;
    notification.delivery_agent_ids = [];
    notification.parcel_code = delivery.parcel_code;
    notification.content = `${delivery.delivery_agent_name} accepted the delivery of ${delivery.parcel_name}`;
    notification.user_name = delivery.sender_fullname;
    notification.pickup_location = delivery.pickup_location;
    notification.drop_off_location = delivery.drop_off_location;
    notification.delivery_agent_name = delivery.delivery_agent_name;
    notification.delivery_agent_img = delivery.delivery_agent_img;
    notification.delivery_agent_img_id = delivery.delivery_agent_img_id;
    notification.is_accepted = false;
    notification.timestamp = timestamp;

    notification = await notification.save();

    const noti = {};

    noti._id = notification._id;
    noti.noti_type = 'accepted_delivery_request';
    noti.delivery_id = delivery._id.toString();
    noti.user_id = delivery.sender_id;
    noti.to_id = delivery.sender_id;
    noti.delivery_agent_ids = [];
    noti.parcel_code = delivery.parcel_code;
    noti.content = `${delivery.delivery_agent_name} accepted the delivery of ${delivery.parcel_name}`;
    noti.user_name = delivery.sender_fullname;
    noti.pickup_location = delivery.pickup_location;
    noti.drop_off_location = delivery.drop_off_location;
    noti.delivery_agent_name = delivery.delivery_agent_name;
    noti.delivery_agent_img = delivery.delivery_agent_img;
    noti.delivery_agent_img_id = delivery.delivery_agent_img_id;
    noti.is_accepted = false;
    noti.timestamp = timestamp;

    //send notification to the delivery agents to accept a delivery request

    // Send notifications to all relevant delivery agents (push notifications using device tokens)

    // const subTitle = `${delivery.delivery_agent_name} accepted the delivery of ${delivery.parcel_name}`;
    const subTitle = `A delivery agent has been assigned to you. Kindly proceed to make payment`;
    setTimeout(handleNotification, 1000, true, delivery.sender_id, '', process.env.APP_NAME, subTitle, noti, 'user');

    // handle cancel notification
    // setTimeout(handleCancel, 600000);
    // console.log(delivery);
    return res.status(200).send({ status: 'ok', msg: 'Delivery accepted successfully', delivery, delivery_agent });
  } catch (e) {
    console.log(e);
    return res.status(403).send({ status: 'error', msg: 'some error occurred' });
  }
});

// endpoint to decline a delivery
// send in fleet_manager_id if the delivery agent is under a fleet manager
router.post('/decline_delivery', async (req, res) => {
  const { delivery_id, token, fleet_manager_id, is_fleet_manager } = req.body;

  //check for required fields
  if (!delivery_id || !token || is_fleet_manager == undefined || is_fleet_manager == null)
    return res.status(400).send({ status: 'error', msg: 'all fields must be filled' });

  try {
    //verify token
    let delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

    //edit delivery_agent document accordingly
    delivery_agent = await Delivery_agent.findByIdAndUpdate(
      { _id: delivery_agent._id },
      { '$inc': { no_declined_deliveries: 1 } },
      { new: true }
    ).lean();

    // check if delivery agent is under a fleet manager
    if (fleet_manager_id) {
      // fetch update the fleet manager document accordinly
      const fleet_manager = await Delivery_agent.findByIdAndUpdate(
        { _id: fleet_manager_id },
        {
          '$inc': {
            'fleet_manager_delivery_agents_deliveries.no_declined_deliveries': 1,
            'total_deliveries_stats.total_no_declined_deliveries': 1
          }
        }
      ).lean();
    }

    // check if delivery agent is a fleet manager
    if (is_fleet_manager) {
      // fetch update the fleet manager document accordinly
      const fleet_manager = await Delivery_agent.findByIdAndUpdate(
        { _id: delivery_agent._id },
        { '$inc': { 'total_deliveries_stats.total_no_declined_deliveries': 1 } }
      ).lean();
    }

    //update statistics document accordingly
    const stats = await Stats.findOneAndUpdate(
      { doc_type: 'admin' },
      { '$inc': { total_declined_deliveries_by_delivery_agents: 1 } },
      { new: true }
    ).lean();

    await FsStatistics.doc('statistics').update({
      total_declined_deliveries_by_delivery_agents: FieldValue.increment(1)
    });

    return res.status(200).send({ status: 'ok', msg: 'delivery declined successfully', delivery_agent });
  } catch (e) {
    console.log(e);
    return res.status(403).send({ status: 'error', msg: 'some error occurred' });
  }
});

//endpoint to view a single delivery
router.post('/view_single_delivery', async (req, res) => {
  const { delivery_id, token } = req.body;

  // check for required fields
  if (!delivery_id || !token)
    return res.status(400).send({ status: 'error', msg: 'All fields must be fille' });

  try {
    //verify token
    jwt.verify(token, process.env.JWT_SECRET);

    //check if delivery exists
    const delivery = await Delivery.findById({ _id: delivery_id }).lean();
    if (!delivery)
      return res.status(400).send({ status: 'error', msg: 'Delivery not found' });

    return res.status(200).send({ status: 'ok', msg: 'delivery gotten successfully', delivery });

  } catch (e) {
    console.log(e);
    return res.status(403).send({ status: 'error', msg: 'some error occurred', e });
  }
});

// endpoint to view delivery history
router.post('/view_delivery_history', async (req, res) => {
  const { token, pagec, fleet_manager_code } = req.body;

  // check for required fields
  if (!token || !pagec)
    return res.status(400).send({ status: 'error', msg: 'All fields must be filled' });

  try {
    //verify token
    const delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

    const resultsPerPage = 10;
    let page = pagec >= 1 ? pagec : 1;
    page = page - 1;

    // check if delivery agent is a fleet manager and fetch the deliveries accordingly
    if (fleet_manager_code) {
      const deliveries = await Delivery.find(
        {
          fleet_manager_code: fleet_manager_code,
          $or: [{ 'delivery_status.is_completed': true },
          { 'delivery_status.is_cancelled': true }
          ]
        }
      )
        .select(['parcel_name', '_id', 'parcel_code', 'imgs', 'delivery_type'])
        .sort({ timestamp: 'desc' })
        .limit(resultsPerPage)
        .skip(resultsPerPage * page)
        .lean(); // couldn't fetch a single img url
      const count = deliveries.length;
      if (deliveries.length === 0)
        return res.status(200).send({ status: 'ok', msg: 'no deliveries made yet for this delivery agent' });

      return res.status(200).send({ status: 'ok', msg: 'deliveries gotten successfully', count, deliveries });
    } else {
      // fetch deliveries for otherwise the above condition
      const deliveries = await Delivery.find(
        {
          delivery_agent_id: delivery_agent._id,
          $or: [{ 'delivery_status.is_completed': true },
          { 'delivery_status.is_cancelled': true }
          ]
        }
      )
        .select(['parcel_name', '_id', 'parcel_code', 'imgs', 'delivery_type'])
        .sort({ timestamp: 'desc' })
        .limit(resultsPerPage)
        .skip(resultsPerPage * page)
        .lean(); // couldn't fetch a single img url
      const count = deliveries.length;
      if (deliveries.length === 0)
        return res.status(200).send({ status: 'ok', msg: 'no deliveries made yet for this delivery agent' });

      return res.status(200).send({ status: 'ok', msg: 'deliveries gotten successfully', count, deliveries });
    }
  } catch (e) {
    console.log(e);
    return res.status(403).send({ status: 'error', msg: 'some error occurred', e });
  }
});

// endpoint to view pending pickup deliveries
router.post('/view_pending_pickup_deliveries', async (req, res) => {
  const { token, pagec, fleet_manager_code } = req.body;

  // check for required fields
  if (!token || !pagec)
    return res.status(400).send({ status: 'error', msg: 'All fields must be filled' });

  try {
    // verify token
    const delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

    // paginate
    const resultsPerPage = 10;
    let page = pagec >= 1 ? pagec : 1;
    page = page - 1;

    // check if delivery agent is a fleet manager and fetch deliveries accordingly
    if (fleet_manager_code) {
      const deliveries = await Delivery.find(
        {
          fleet_manager_code: fleet_manager_code,
          'delivery_status.is_accepted': true,
          'delivery_status.is_completed': false,
          'delivery_status.is_started': false,
          'delivery_status.is_cancelled': false
        }
      )
        .select(['parcel_name', '_id', 'parcel_code', 'imgs', 'pickup_location', 'drop_off_location', 'delivery_type'])
        .sort({ timestamp: 'desc' })
        .limit(resultsPerPage)
        .skip(resultsPerPage * page)
        .lean(); // couldn't fetch a single img url
      const count = deliveries.length;
      if (deliveries.length === 0)
        return res.status(200).send({ status: 'ok', msg: 'no pending pickup deliveries for this delivery agent' });
      return res.status(200).send({ status: 'ok', msg: 'Pending pickup deliveries gotten successfully', count, deliveries });

    } else {
      // fetch deliveries if the above condition is otherwise
      const deliveries = await Delivery.find(
        {
          delivery_agent_id: delivery_agent._id,
          'delivery_status.is_accepted': true,
          'delivery_status.is_completed': false,
          'delivery_status.is_started': false,
          'delivery_status.is_cancelled': false
        }
      )
        .select(['parcel_name', '_id', 'parcel_code', 'imgs', 'pickup_location', 'drop_off_location', 'delivery_type'])
        .sort({ timestamp: 'desc' })
        .limit(resultsPerPage)
        .skip(resultsPerPage * page)
        .lean(); // couldn't fetch a single img url
      const count = deliveries.length;
      if (deliveries.length === 0)
        return res.status(200).send({ status: 'ok', msg: 'no pending pickup deliveries for this delivery agent' });
      return res.status(200).send({ status: 'ok', msg: 'Pending pickup deliveries gotten successfully', count, deliveries });
    }

  } catch (e) {
    console.log(e);
    return res.status(403).send({ status: 'error', msg: 'Some error occurred' }); s
  }
});

// endpoint to view pending drop off deliveries
router.post('/view_pending_drop_off_deliveries', async (req, res) => {
  const { token, pagec, fleet_manager_code } = req.body;

  // check for required fields
  if (!token || !pagec)
    return res.status(400).send({ status: 'error', msg: 'All fields must be filled' });

  try {
    // verify token
    const delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

    // fetch deliveries
    const resultsPerPage = 10;
    let page = pagec >= 1 ? pagec : 1;
    page = page - 1;

    // check if the delivery agent is a fleet manager fetch deliveries accordingly
    if (fleet_manager_code) {
      const deliveries = await Delivery.find(
        {
          fleet_manager_code: fleet_manager_code,
          'delivery_status.is_accepted': true,
          'delivery_status.is_completed': false,
          'delivery_status.is_started': true,
          'delivery_status.is_cancelled': false
        })
        .select(['parcel_name', '_id', 'parcel_code', 'imgs', 'pickup_location', 'drop_off_location', 'delivery_type'])
        .sort({ timestamp: 'desc' })
        .limit(resultsPerPage)
        .skip(resultsPerPage * page)
        .lean(); // couldn't fetch a single img url
      if (deliveries.length === 0)
        return res.status(200).send({ status: 'ok', msg: 'no pending drop off deliveries for this delivery agent' });
      return res.status(200).send({ status: 'ok', msg: 'Pending drop off deliveries gotten successfully', deliveries });
    } else {
      // fetch deliveries if the above condition is otherwise
      const deliveries = await Delivery.find(
        {
          delivery_agent_id: delivery_agent._id,
          'delivery_status.is_accepted': true,
          'delivery_status.is_completed': false,
          'delivery_status.is_started': true,
          'delivery_status.is_cancelled': false
        })
        .select(['parcel_name', '_id', 'parcel_code', 'imgs', 'pickup_location', 'drop_off_location', 'delivery_type'])
        .sort({ timestamp: 'desc' })
        .limit(resultsPerPage)
        .skip(resultsPerPage * page)
        .lean(); // couldn't fetch a single img url
      if (deliveries.length === 0)
        return res.status(200).send({ status: 'ok', msg: 'no pending drop off deliveries for this delivery agent' });
      return res.status(200).send({ status: 'ok', msg: 'Pending drop off deliveries gotten successfully', deliveries });
    }

  } catch (e) {
    console.log(e);
    return res.status(403).send({ status: 'error', msg: 'Some error occurred' });
  }
});


// endpoint for when the delivery agent has arrived at the pickup location
router.post('/arrived_pickup_location', async (req, res) => {
  const { token, delivery_id } = req.body;

  // check for required fields
  if (!token || !delivery_id)
    return res.status(400).send({ status: 'error', msg: 'All fields must be filled' });

  try {
    // verify token
    const delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

    const delivery = Delivery.findOneAndUpdate(
      { _id: delivery_id },
      { 'delivery_status.arrived_pickup_location': true },
      { new: true }
    ).lean();
    //const deliveryAgent = Delivery_agent.findOne({_id: delivery_agent._id}).lean();

    // update data on firestore
    await FsDeliveryRequest.doc(delivery_id.toString()).update({
      delivery_status_arrived_pickup_location: true
    });

    let notification = new Notification;

    notification.noti_type = 'arrived_location';
    notification.delivery_id = delivery._id;
    notification.user_id = delivery.sender_id;
    notification.to_id = delivery.sender_id;
    notification.delivery_agent_ids = [];
    notification.parcel_code = delivery.parcel_code;
    notification.content = `${delivery.delivery_agent_name} has arrived at the pickup location`;
    notification.user_name = delivery.sender_fullname;
    notification.delivery_agent_name = delivery.delivery_agent_name;
    notification.delivery_agent_img = delivery.delivery_agent_img;
    notification.delivery_agent_img_id = delivery.delivery_agent_img_id;
    notification.is_accepted = false;
    notification.timestamp = timestamp;

    notification = await notification.save();

    const subTitle = `${delivery.delivery_agent_name} has arrived at the pickup location`;
    setTimeout(handleNotification, 1000, true, delivery.sender_id, '', process.env.APP_NAME, subTitle, notification, 'user');

  } catch (e) {
    console.log(e);
    return res.status(403).send({ status: 'error', msg: 'Some error occurred', e });
  }
});


// endpoint for when the delivery agent has arrived at the drop off location
router.post('/arrived_drop_off_location', async (req, res) => {
  const { token, delivery_id } = req.body;

  // check for required fields
  if (!token || !delivery_id)
    return res.status(400).send({ status: 'error', msg: 'All fields must be filled' });

  try {
    // verify token
    const delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

    const delivery = Delivery.findOneAndUpdate(
      { _id: delivery_id },
      { 'delivery_status.arrived_dropoff_location': true },
      { new: true }
    ).lean();
    //const deliveryAgent = Delivery_agent.findOne({_id: delivery_agent._id}).lean();

    // update data on firestore
    await FsDeliveryRequest.doc(delivery_id.toString()).update({
      delivery_status_arrived_dropoff_location: true
    });

    let notification = new Notification;

    notification.noti_type = 'arrived_location';
    notification.delivery_id = delivery._id;
    notification.user_id = delivery.sender_id;
    notification.to_id = delivery.sender_id;
    notification.delivery_agent_ids = [];
    notification.parcel_code = delivery.parcel_code;
    notification.content = `${delivery.delivery_agent_name} has arrived at the drop off location`;
    notification.user_name = delivery.sender_fullname;
    notification.delivery_agent_name = delivery.delivery_agent_name;
    notification.delivery_agent_img = delivery.delivery_agent_img;
    notification.delivery_agent_img_id = delivery.delivery_agent_img_id;
    notification.is_accepted = false;
    notification.timestamp = timestamp;

    notification = await notification.save();

    const subTitle = `${delivery.delivery_agent_name} has arrived at the drop off location`;
    setTimeout(handleNotification, 1000, true, delivery.sender_id, '', process.env.APP_NAME, subTitle, notification, 'user');

  } catch (e) {
    console.log(e);
    return res.status(403).send({ status: 'error', msg: 'Some error occurred', e });
  }

});


module.exports = router;