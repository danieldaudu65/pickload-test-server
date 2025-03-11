const express = require("express");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const Delivery_agent = require("../models/delivery_agent");
const User = require("../models/user.js");
const Statistics = require("../models/statistics.js");
const Delivery = require("../models/delivery");
const Request = require("../models/delivery_agent_reg_request.js");
const upload = require("../utils/multer");
const cloudinary = require("../utils/cloudinary");
const {
  sendRecoverAccount1,
  sendDeleteAccount1,
  sendPasswordReset1,
  sendConfirmationEmail,
  sendOTP,
} = require("../utils/nodemailer");
const { JsonWebTokenError } = require("jsonwebtoken");
const Stats = require("../models/statistics");
const { response } = require("express");
dotenv.config();
const router = express.Router();

const {
  FsStatistics,
  FieldValue,
  FsDeliveryAgent,
} = require("../services/firebase_service_config");
const generateCode = require("../functions/generate_code.js");

//endpoint to signup for stage one
router.post("/signup_stage_one", async (req, res) => {
  const {
    delivery_agent_type: type,
    fullname,
    email,
    address,
    state,
    city,
    nin,
    phone_no,
    company_name,
    cac_reg_no
  } = req.body;

  //test for missing required fields
  if (
    !fullname ||
    !phone_no ||
    !nin ||
    !type ||
    !email ||
    !address ||
    !state ||
    !city
  )
    return res
      .status(400)
      .send({ status: "error", msg: "All fields must be filled" });

  //test for email type
  if (typeof email !== "string")
    return res.status(400).send({ status: "error", msg: "Invalid email" });

  //regex test for email
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // const valid = /@.com/.test(email);
  if (!regex.test(String(email).toLocaleLowerCase()))
    // add a chech for valid email later
    return res
      .status(400)
      .send({ status: "error", msg: "Please enter a valid email" });

  //Test for duplicate fileds that are supposed to be unique (email)
  const found_email = await Delivery_agent.findOne({
    email,
    is_deleted: false
  }).lean();
  if (found_email)
    return res
      .status(400)
      .send({ status: "error", msg: "This email is already in use" });

  // check in the user collection
  const found_email1 = await User.findOne({
    email,
    is_deleted: false
  }).lean();
  if (found_email1)
    return res
      .status(400)
      .send({ status: "error", msg: "This email is already in use" });

  //Test for duplicate fileds that are supposed to be unique (phone number)
  const found_phone_no = await Delivery_agent.findOne({
    phone_no,
    is_deleted: false
  }).lean();
  // console.log(found_phone_no);
  if (found_phone_no)
    return res
      .status(400)
      .send({ status: "error", msg: "This Phone Number is already in use" });

  // //Test for password length
  // if(plainTextPassword < 6)
  //   return res.status(400).send({status: 'error', msg: 'Password should be above 7 characters'});

  // //Password ecryption
  // const password = await bcrypt.hash(plainTextPassword, 10);

  //confirmCode for nodemailer generated

  try {
    // convert type to lowercase
    const delivery_agent_type = type.toLocaleLowerCase();

    // //upload profile picture
    // let img_url;
    // let img_id;
    // if(req.file) {
    //   const result = await cloudinary.uploader.upload(req.file.path, {folder: 'pick_load_project'});
    //   img_url = result.secure_url;
    //   img_id = result.public_id;
    // }

    const confirmCode = jwt.sign({ email: email }, process.env.JWT_SECRET);
    //delivery_agent created
    let delivery_agent = new Delivery_agent();

    const vehicle_details = {
      plate_no: "",
      color: "",
      type: "",
      name: "",
      driver_license_expiry_date: "",
      img_urls: [""],
      img_ids: [""],
    }; // created an empty vehicle details data to avoid undefined error from the front end

    delivery_agent.fullname = fullname;
    delivery_agent.email = email || "";
    delivery_agent.phone_no = phone_no;
    //delivery_agent.password = password; // not being used again
    delivery_agent.address = address;
    delivery_agent.state = state;
    delivery_agent.city = city;
    // delivery_agent.gender = gender;
    delivery_agent.nin = nin;
    delivery_agent.fleet_manager_id = "";
    delivery_agent.fleet_manager_code = "";
    delivery_agent.delivery_agent_code = "";
    delivery_agent.img_url = "";
    delivery_agent.img_id = "";
    delivery_agent.delivery_agent_type = delivery_agent_type;
    delivery_agent.approval_status = "pending";
    delivery_agent.registration_stage = "one";
    delivery_agent.confirmation_code = confirmCode;
    delivery_agent.registration_time = Date.now();
    delivery_agent.company_name = "";
    delivery_agent.cac_reg_no = "";
    delivery_agent.bank_details.bank_name = "";
    delivery_agent.bank_details.account_name = "";
    delivery_agent.bank_details.account_type = "";
    delivery_agent.bank_details.account_no = "";
    delivery_agent.bank_details.bvn = "";
    // delivery_agent.vehicle_details.plate_no = '';
    // delivery_agent.vehicle_details.type = '';
    // delivery_agent.vehicle_details.name = '';
    // delivery_agent.vehicle_details.driver_license_expiry_date = '';
    delivery_agent.vehicle_details.img_urls = [""];
    delivery_agent.vehicle_details.img_ids = [""];
    // delivery_agent.vehicle_details.color = '';

    // token generation
    const token = jwt.sign(
      {
        _id: delivery_agent._id,
        phone_no: delivery_agent.phone_no,
      },
      process.env.JWT_SECRET
    );

    delivery_agent = await delivery_agent.save();

    // //add token to delivery_agent object // uncomment after testing
    // delivery_agent['token'] = token;

    //create statistics document and populate accordingly
    let stats;
    if (delivery_agent_type === "delivery agent") {
      stats = await Stats.findOneAndUpdate(
        { doc_type: "admin" },
        { $inc: { total_pending_registrations: 1 } },
        { upsert: true }
      ).lean();

      // create firebase statistics
      const fsStatDoc = await FsStatistics.doc("statistics").get();
      if (fsStatDoc.exists) {
        await FsStatistics.doc("statistics").update({
          no_of_delivery_agents: FieldValue.increment(1),
          total_pending_registrations: FieldValue.increment(1),
        });
      } else {
        await FsStatistics.doc("statistics").set({
          doc_type: "admin",
          no_of_admins: 0,
          no_of_active_admins: 0,
          no_of_blocked_admins: 0,
          no_of_users: 0,
          no_of_active_users: 0,
          no_of_blocked_users: 0,
          no_of_delivery_agents: 0,
          no_of_active_delivery_agents: 0,
          no_of_blocked_delivery_agents: 0,
          no_of_fleet_managers: 0,
          no_of_active_fleet_managers: 0,
          no_of_blocked_fleet_managers: 0,
          total_pending_registrations: 0,
          total_deliveries: 0,
          total_instant_deliveries: 0,
          total_scheduled_deliveries: 0,
          total_successful_deliveries: 0,
          total_cancelled_deliveries: 0,
          total_cancelled_deliveries_by_users: 0,
          total_cancelled_deliveries_by_delivery_agents: 0,
          total_declined_deliveries_by_delivery_agents: 0,
          total_failed_deliveries: 0,
          total_user_reports: 0,
          total_delivery_agent_reports: 0,
          total_reports: 0,
          total_pending_reports: 0,
          total_resolved_reports: 0,
          total_revenue: 0,
          total_pickload_earnings: 0,
          total_delivery_agent_earnings: 0,
          total_fleet_manager_earnings: 0,
          total_individual_agent_earnings: 0,
          total_daily_transactions: 0,
          total_weeekly_transactions: 0,
          total_monthly_transactions: 0,
          total_yearly_transactions: 0,
        });
      }
    } else {
      stats = await Stats.findOneAndUpdate(
        { doc_type: "admin" },
        { $inc: { no_of_fleet_managers: 1, total_pending_registrations: 1 } },
        { upsert: true }
      ).lean();

      // create firebase statistics
      const fsStatDoc = await FsStatistics.doc("statistics").get();
      if (fsStatDoc.exists) {
        await FsStatistics.doc("statistics").update({
          no_of_fleet_managers: FieldValue.increment(1),
          total_pending_registrations: FieldValue.increment(1),
        });
      } else {
        await FsStatistics.doc("statistics").set({
          doc_type: "admin",
          no_of_admins: 0,
          no_of_active_admins: 0,
          no_of_blocked_admins: 0,
          no_of_users: 0,
          no_of_active_users: 0,
          no_of_blocked_users: 0,
          no_of_delivery_agents: 0,
          no_of_active_delivery_agents: 0,
          no_of_blocked_delivery_agents: 0,
          no_of_fleet_managers: 0,
          no_of_active_fleet_managers: 0,
          no_of_blocked_fleet_managers: 0,
          total_pending_registrations: 0,
          total_deliveries: 0,
          total_instant_deliveries: 0,
          total_scheduled_deliveries: 0,
          total_successful_deliveries: 0,
          total_cancelled_deliveries: 0,
          total_cancelled_deliveries_by_users: 0,
          total_cancelled_deliveries_by_delivery_agents: 0,
          total_declined_deliveries_by_delivery_agents: 0,
          total_failed_deliveries: 0,
          total_user_reports: 0,
          total_delivery_agent_reports: 0,
          total_reports: 0,
          total_pending_reports: 0,
          total_resolved_reports: 0,
          total_revenue: 0,
          total_pickload_earnings: 0,
          total_delivery_agent_earnings: 0,
          total_fleet_manager_earnings: 0,
          total_individual_agent_earnings: 0,
          total_daily_transactions: 0,
          total_weeekly_transactions: 0,
          total_monthly_transactions: 0,
          total_yearly_transactions: 0,
        });
      }
    }

    return res
      .status(200)
      .send({
        status: "ok",
        msg: "delivery_agent Registration stage one completed",
        delivery_agent,
        token,
      });
  } catch (e) {
    console.log(e);
    return res
      .status(403)
      .send({ status: "error", msg: "some error occured", e });
  }
});

//endpoint to signup for stage two
router.post("/signup_stage_two", async (req, res) => {
  const { phone_no, _id, token } = req.body;

  //check if id and token was sent
  if (!_id || !token)
    return res
      .status(400)
      .send({ status: "error", msg: "ID and token must be provided" });

  try {
    //verify token
    let delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

    //increment registration stage and edit phone_no
    delivery_agent = await Delivery_agent.findByIdAndUpdate(
      { _id },
      {
        registration_stage: "two",
        phone_no: phone_no || delivery_agent.phone_no,
      },
      { new: true }
    ).lean();

    //check if delivery_agent exists
    if (!delivery_agent)
      return res
        .status(404)
        .send({ status: "error", msg: "delivery_agent not found" });

    return res
      .status(200)
      .send({
        status: "ok",
        msg: "delivery_agent Registration stage two completed",
        delivery_agent,
      });
  } catch (e) {
    console.log(e);
    return res
      .status(403)
      .send({ status: "error", msg: "some error occurred", e });
  }
});

//endpoint to signup stage three
router.post(
  "/signup_stage_three",
  upload.array("vehicle_details_imgs"),
  async (req, res) => {
    const {
      _id,
      token,
      fleet_manager_code,
      vehicle_type: type,
      plate_no,
      fleet_name,
      driver_license_expiry_date,
      color,
      vehicle_name,
      company_name,
      cac_reg_no,
    } = req.body;

    // console.log(
    //   plate_no,
    //   color,
    //   type,
    //   vehicle_name,
    //   driver_license_expiry_date
    // );
    //check if id and token was sent
    if (!_id || !token)
      return res
        .status(400)
        .send({ status: "error", msg: "all fields must be filled" });
    console.log("got here");

    try {
      //verify token
      let delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

      //check if delivery_agent exists
      delivery_agent = await Delivery_agent.findById({ _id });
      if (!delivery_agent)
        return res
          .status(404)
          .send({ status: "error", msg: "delivery_agent not found" });

      //check delivery_agent type and update document conditionally firstly for fleet manager
      if (delivery_agent.delivery_agent_type === "fleet manager") {
        //check for required fields
        console.log("got here1");
        if (!fleet_name)
          return res
            .status(400)
            .send({ status: "error", msg: "All fields must be filled" });

        // check if fleet manager account with the same fleet name exists
        const found = await Delivery_agent.findOne({ fleet_name: new RegExp(fleet_name, 'i') }).lean();
        if (found)
          return res.status(400).send({ status: 'error', msg: `Fleet manager account with fleet name "${fleet_name}" already exists` });

        // reg request document created
        let delivery_agent_reg = new Request();

        // check if fleet manager put in his vehicle details
        if (req.files) {
          // change type to lowercase
          const vehicle_type = type.toLocaleLowerCase();
          console.log(vehicle_type);

          //upload vehicle details images
          let img_urls = [];
          let img_ids = [];
          for (let i = 0; i < req.files.length; i++) {
            const result = await cloudinary.uploader.upload(req.files[i].path, {
              folder: "pick_load_project",
            });
            console.log(result);
            img_urls.push(result.secure_url);
            img_ids.push(result.public_id);
          }

          // create vehicle details object and update the delivery agent document differently
          const vehicle_details = {
            plate_no: plate_no,
            type: vehicle_type,
            img_urls: img_urls,
            img_ids: img_ids,
            name: vehicle_name,
            color: color,
            driver_license_expiry_date: driver_license_expiry_date,
          };

          delivery_agent_reg.vehicle_details.plate_no = plate_no;
          delivery_agent_reg.vehicle_details.color = color;
          delivery_agent_reg.vehicle_details.type = vehicle_type;
          delivery_agent_reg.vehicle_details.name = vehicle_name;
          delivery_agent_reg.vehicle_details.img_urls = img_urls;

          delivery_agent = await Delivery_agent.findByIdAndUpdate(
            { _id: delivery_agent._id },
            { vehicle_details },
            { new: true }
          );
        }

        // check if company name was filled
        if (company_name) {
          // check for required field
          if (!cac_reg_no)
            return res
              .status(400)
              .send({ status: "error", msg: "All fields must be filled" });
        }
        //update fleet manager documet
        delivery_agent.fleet_name = fleet_name;
        delivery_agent.no_of_vehicles = 1;
        delivery_agent.company_name = company_name || "";
        delivery_agent.cac_reg_no = cac_reg_no || "";
        delivery_agent.registration_stage = "three";
        delivery_agent.status = "inactive";
        delivery_agent.fleet_manager_code = Date.now();
        // delivery_agent.vehicle_details.plate_no = plate_no;
        // delivery_agent.vehicle_details.type = vehicle_type;
        // delivery_agent.vehicle_details.name = vehicle_name;
        // delivery_agent.vehicle_details.driver_license_expiry_date = driver_license_expiry_date;
        // delivery_agent.vehicle_details.img_urls = img_urls;
        // delivery_agent.vehicle_details.img_ids = img_ids;
        // delivery_agent.vehicle_details.color = color;
        delivery_agent = await delivery_agent.save();

        //delivery_agent registration request is created and sent to the admin

        delivery_agent_reg.delivery_agent_name = delivery_agent.fullname;
        delivery_agent_reg.delivery_agent_id = delivery_agent._id;
        delivery_agent_reg.type_of_delivery_agent =
          delivery_agent.delivery_agent_type;
        delivery_agent_reg.time_of_registration =
          delivery_agent.registration_time;

        delivery_agent_reg = await delivery_agent_reg.save();

        // update statistics document accordingly
        const stats = await Stats.findOneAndUpdate(
          { doc_type: "admin" },
          { $inc: { total_pending_registrations: 1 } },
          { new: true }
        ).lean();

        return res
          .status(200)
          .send({
            status: "ok",
            msg: "Fleet manager signup registration stage three completed",
            delivery_agent,
            delivery_agent_reg,
          });
      } else {
        //check for required fields
        console.log(req.files);
        const vehicle_type = type.toLocaleLowerCase();
        console.log("got here2", vehicle_type, type);
        if (
          !vehicle_type ||
          !plate_no ||
          req.files.length === 0
          // !driver_license_expiry_date
        )
          return res
            .status(400)
            .send({ status: "error", msg: "All fields must be filled" });
        console.log("and here");
        //delivery_agent registration request is created
        let delivery_agent_reg = new Request();

        //check if delivery_agent registers under a fleet manager and update document accordingly
        let fleet_manager;
        if (fleet_manager_code) {
          //check if fleet manager code exists
          fleet_manager = await Delivery_agent.findOne({
            fleet_manager_code: fleet_manager_code,
          }).lean();
          console.log(fleet_manager);
          if (!fleet_manager)
            res
              .status(404)
              .send({
                status: "error",
                msg: `No fleet manager with code "${fleet_manager_code}" exists`,
              });

          // //update fleet manager document
          // fleet_manager.fleet_size += 1;
          // fleet_manager.fleet_manager_delivery_agents.push(
          //   {
          //     delivery_agent_id: delivery_agent._id,
          //     img_url: delivery_agent.img_url,
          //     fullname: delivery_agent.fullname,
          //   }
          // );

          // fleet_manager = await fleet_manager.save();

          //update delivery_agent document with relation to fleet manager fields
          // console.log('got here for testing', fleet_manager._id, fleet_manager_code);
          delivery_agent.fleet_manager_id = fleet_manager._id;
          delivery_agent.fleet_name = fleet_manager.fleet_name;
          delivery_agent.fleet_manager_code = fleet_manager_code;
          await delivery_agent.save();

          //update fleet_manager_code field in delivery_agent_registration request doument;
          delivery_agent_reg.fleet_manager_code = fleet_manager_code;
        }

        //upload vehicle details images
        let img_urls = [];
        let img_ids = [];
        for (let i = 0; i < req.files.length; i++) {
          const result = await cloudinary.uploader.upload(req.files[i].path, {
            folder: "pick_load_project",
          });
          console.log(result);
          img_urls.push(result.secure_url);
          img_ids.push(result.public_id);
        }

        // const urls = {
        //   passport: img_urls[0],
        //   front_drivers_license: img_urls[1],
        //   back_drivers_license: img_urls[2],

        // }

        // create vehicle details object and update the delivery agent document differently
        const vehicle_details = {
          plate_no: plate_no,
          type: vehicle_type,
          img_urls: img_urls,
          img_ids: img_ids,
          name: vehicle_name,
          color: color,
          driver_license_expiry_date: driver_license_expiry_date || "",
        };

        delivery_agent = await Delivery_agent.findByIdAndUpdate(
          { _id: delivery_agent._id },
          { vehicle_details },
          { new: true }
        );

        // check if he is under a fleet manager
        if (delivery_agent.fleet_manager_code) {
          //update delivery_agent document
          delivery_agent.registration_stage = "four";

          // update statistics document accordingly
          const stats = await Stats.findOneAndUpdate(
            { doc_type: "admin" },
            { $inc: { total_pending_registrations: -1 } },
            { new: true }
          ).lean();
          // create firebase statistics
          const fsStatDoc = await FsStatistics.doc("statistics").get();
          if (fsStatDoc.exists) {
            await FsStatistics.doc("statistics").update({
              total_pending_registrations: FieldValue.increment(-1),
            });
          } else {
            await FsStatistics.doc("statistics").set({
              doc_type: "admin",
              no_of_admins: 0,
              no_of_active_admins: 0,
              no_of_blocked_admins: 0,
              no_of_users: 0,
              no_of_active_users: 0,
              no_of_blocked_users: 0,
              no_of_delivery_agents: 0,
              no_of_active_delivery_agents: 0,
              no_of_blocked_delivery_agents: 0,
              no_of_fleet_managers: 0,
              no_of_active_fleet_managers: 0,
              no_of_blocked_fleet_managers: 0,
              total_pending_registrations: 0,
              total_deliveries: 0,
              total_instant_deliveries: 0,
              total_scheduled_deliveries: 0,
              total_successful_deliveries: 0,
              total_cancelled_deliveries: 0,
              total_cancelled_deliveries_by_users: 0,
              total_cancelled_deliveries_by_delivery_agents: 0,
              total_declined_deliveries_by_delivery_agents: 0,
              total_failed_deliveries: 0,
              total_user_reports: 0,
              total_delivery_agent_reports: 0,
              total_reports: 0,
              total_pending_reports: 0,
              total_resolved_reports: 0,
              total_revenue: 0,
              total_pickload_earnings: 0,
              total_delivery_agent_earnings: 0,
              total_fleet_manager_earnings: 0,
              total_individual_agent_earnings: 0,
              total_daily_transactions: 0,
              total_weeekly_transactions: 0,
              total_monthly_transactions: 0,
              total_yearly_transactions: 0,
            });
          }
        } else {
          delivery_agent.registration_stage = "three";
        }
        delivery_agent.status = "inactive";
        delivery_agent.delivery_agent_code = Date.now();
        delivery_agent.no_of_vehicles += 1;
        // delivery_agent.vehicle_details.plate_no = plate_no;
        // delivery_agent.vehicle_details.type = vehicle_type;
        // delivery_agent.vehicle_details.name = vehicle_name;
        // delivery_agent.vehicle_details.driver_license_expiry_date = driver_license_expiry_date;
        // delivery_agent.vehicle_details.img_urls = img_urls;
        // delivery_agent.vehicle_details.img_ids = img_ids;
        // delivery_agent.vehicle_details.color = color;

        delivery_agent = await delivery_agent.save();

        //delivery_agent registration request is updated and sent to the admin
        delivery_agent_reg.delivery_agent_name = delivery_agent.fullname;
        delivery_agent_reg.delivery_agent_id = delivery_agent._id;
        delivery_agent_reg.type_of_delivery_agent =
          delivery_agent.delivery_agent_type;
        delivery_agent_reg.time_of_registration =
          delivery_agent.registration_time;
        delivery_agent_reg.vehicle_details.plate_no = plate_no;
        delivery_agent_reg.vehicle_details.color = color;
        delivery_agent_reg.vehicle_details.type = vehicle_type;
        delivery_agent_reg.vehicle_details.name = vehicle_name;
        delivery_agent_reg.vehicle_details.img_urls = img_urls;
        delivery_agent_reg = await delivery_agent_reg.save();

        // update statistics document accordingly
        const stats = await Stats.findOneAndUpdate(
          { doc_type: "admin" },
          { $inc: { total_pending_registrations: 1 } },
          { new: true }
        ).lean();

        return res
          .status(200)
          .send({
            status: "ok",
            msg: "delivery agent signup registration stage three completed",
            delivery_agent,
            delivery_agent_reg,
          });
      }
    } catch (e) {
      console.log(e);
      return res
        .status(403)
        .send({ status: "error", msg: "some error occurred", e });
    }
  }
);

// endpoint to set bank account details
router.post("/set_bank_account_details", async (req, res) => {
  const {
    token,
    account_name,
    account_no,
    bank_name,
    account_type,
    bvn,
    confirm_account_no,
  } = req.body;
  console.log(token);

  // check for required fields
  if (
    !account_name ||
    !account_no ||
    !bank_name ||
    !account_type ||
    !confirm_account_no
  )
    return res
      .status(400)
      .send({ status: "error", msg: "all fields must be filled" });

  try {
    // verify token
    let delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

    // check if account number tallies
    if (account_no !== confirm_account_no)
      return res
        .status(400)
        .send({ status: "error", msg: "account number mismatch" });

    // create data object, fetch document and update accordingly
    const data = {
      bank_name: bank_name,
      account_no: account_no,
      account_name: account_name,
      account_type: account_type,
      bvn: bvn,
    };
    delivery_agent = await Delivery_agent.findByIdAndUpdate(
      { _id: delivery_agent._id },
      { bank_details: data, registration_stage: "four" },
      { new: true }
    ).lean();

    // update statistics document accordingly
    const stats = await Stats.findOneAndUpdate(
      { doc_type: "admin" },
      { $inc: { total_pending_registrations: -1 } },
      { new: true }
    ).lean();
    // create firebase statistics
    const fsStatDoc = await FsStatistics.doc("statistics").get();
    if (fsStatDoc.exists) {
      await FsStatistics.doc("statistics").update({
        total_pending_registrations: FieldValue.increment(-1),
      });
    } else {
      await FsStatistics.doc("statistics").set({
        doc_type: "admin",
        no_of_admins: 0,
        no_of_active_admins: 0,
        no_of_blocked_admins: 0,
        no_of_users: 0,
        no_of_active_users: 0,
        no_of_blocked_users: 0,
        no_of_delivery_agents: 0,
        no_of_active_delivery_agents: 0,
        no_of_blocked_delivery_agents: 0,
        no_of_fleet_managers: 0,
        no_of_active_fleet_managers: 0,
        no_of_blocked_fleet_managers: 0,
        total_pending_registrations: 0,
        total_deliveries: 0,
        total_instant_deliveries: 0,
        total_scheduled_deliveries: 0,
        total_successful_deliveries: 0,
        total_cancelled_deliveries: 0,
        total_cancelled_deliveries_by_users: 0,
        total_cancelled_deliveries_by_delivery_agents: 0,
        total_declined_deliveries_by_delivery_agents: 0,
        total_failed_deliveries: 0,
        total_user_reports: 0,
        total_delivery_agent_reports: 0,
        total_reports: 0,
        total_pending_reports: 0,
        total_resolved_reports: 0,
        total_revenue: 0,
        total_pickload_earnings: 0,
        total_delivery_agent_earnings: 0,
        total_fleet_manager_earnings: 0,
        total_individual_agent_earnings: 0,
        total_daily_transactions: 0,
        total_weeekly_transactions: 0,
        total_monthly_transactions: 0,
        total_yearly_transactions: 0,
      });
    }

    return res
      .status(200)
      .send({
        status: "ok",
        msg: "bank account details set successfully",
        delivery_agent,
      });
  } catch (e) {
    console.log(e);
    return res
      .status(403)
      .send({ status: "error", msg: "some error occurred", e });
  }
});

// login endpoint
router.post("/login", async (req, res) => {
  const { phone_no, device_type } = req.body;

  if (!phone_no)
    return res
      .status(400)
      .send({ status: "error", msg: "All fields must be filled" });

  // const found = await Delivery_agent.findOne({phone_no, is_deleted: false}).lean();
  const found = await Delivery_agent.findOne({
    phone_no,
    status: "active",
    is_deleted: false,
  }).lean();

  if (!found) {
    return res
      .status(400)
      .send({
        status: "error",
        msg: "Account not active or delivery agent does not exist",
      });
  }
  try {
    let os_type = "";
    if (device_type == "ios") {
      os_type = "iOS";
    }

    if (device_type == "android") {
      os_type = "android";
    }

    if (device_type == "windows") {
      os_type = "windows";
    }

    if (device_type == "linux") {
      os_type = "linux";
    }

    if (device_type == "mac") {
      os_type = "macOS";
    }

    if (device_type == undefined) {
      os_type = "";
    }

    if (device_type == null) {
      os_type = "";
    }

    const delivery_agent = await Delivery_agent.findOneAndUpdate(
      { phone_no: phone_no, is_deleted: false },
      {
        is_online: true,
        last_login: Date.now(),
        is_available_for_work: true,
        os_type,
      },
      { new: true }
    ).lean();

    await FsDeliveryAgent.doc(delivery_agent._id.toString()).update({
      os_type: os_type,
      is_online: true
    });

    //check if delivery_agent account exists
    if (!delivery_agent)
      return res
        .status(400)
        .send({ status: "error", msg: "delivery_agent not found" });

    // check if the delivery agent account has been deleted
    if (delivery_agent.is_deleted === true)
      return res
        .status(400)
        .send({
          status: "error",
          msg: "delivery agent does not exist anymore",
        });

    // generate token
    let token = jwt.sign(
      {
        phone_no: phone_no,
        _id: delivery_agent._id,
      },
      process.env.JWT_SECRET
    );

    return res
      .status(200)
      .send({
        status: "ok",
        msg: "delivery_agent gotten successfully",
        delivery_agent,
        token,
      });
  } catch (e) {
    console.log(e);
    return res
      .status(403)
      .send({ status: "error", msg: "Some error occurred", e });
  }
});


// endpoint to update_firebase_account_created field
router.post("/update_firebase_account_created", async (req, res) => {
  const { token } = req.body;

  if (!token)
    return res
      .status(400)
      .send({ status: "error", msg: "all fields must be filled" });

  try {
    // verify token
    let delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

    // set is_online to false
    delivery_agent = await Delivery_agent.findOneAndUpdate(
      { _id: delivery_agent._id },
      { is_firebase_account_created: true },
      { new: true }
    ).lean();
    return res
      .status(200)
      .send({ status: "ok", msg: "Success" });
  } catch (e) {
    console.log(e);
    return res
      .status(403)
      .send({ status: "error", msg: "Some error occurres", e });
  }
});


// logout endpoint
router.post("/logout", async (req, res) => {
  const { token } = req.body;

  if (!token)
    return res
      .status(400)
      .send({ status: "error", msg: "all fields must be filled" });

  try {
    // verify token
    let delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

    // set is_online to false
    delivery_agent = await Delivery_agent.findOneAndUpdate(
      { _id: delivery_agent._id },
      { is_online: false, is_available_for_work: false },
      { new: true }
    ).lean();
    return res
      .status(200)
      .send({ status: "ok", msg: "Logout successfull", delivery_agent });
  } catch (e) {
    console.log(e);
    return res
      .status(403)
      .send({ status: "error", msg: "Some error occurres", e });
  }
});

//change phone number
router.post("/change_phone_no", async (req, res) => {
  const { token, phone_no: new_phone_no, old_phone_no } = req.body;

  //check for required fields
  if (!token || !new_phone_no || !old_phone_no)
    return res
      .status(400)
      .send({ status: "error", msg: "all fields must be filled" });

  try {
    // verify token
    let deliveryAgent = jwt.verify(token, process.env.JWT_SECRET);

    let delivery_agent = await Delivery_agent.findOne({
      _id: deliveryAgent._id,
    })
      .select(["phone_no"])
      .lean();

    // check if phone number matches
    if (delivery_agent.phone_no !== old_phone_no) {
      return res
        .status(400)
        .send({
          status: "error",
          msg: `Old phone no: ${old_phone_no} does not match the phone no attached to this account`,
        });
    }

    // check if phone number exists in the database
    delivery_agent = await Delivery_agent.findOne({
      phone_no: new_phone_no,
      is_deleted: false,
    }).lean();
    if (delivery_agent)
      return res
        .status(400)
        .send({ status: "error", msg: "phone number already in use" });

    // update delivery agent document
    delivery_agent = await Delivery_agent.findOneAndUpdate(
      { _id: deliveryAgent._id },
      { phone_no: new_phone_no },
      { new: true }
    ).lean();
    console.log(delivery_agent);

    // check if delivery agent exists
    if (!delivery_agent)
      return res
        .status(400)
        .send({ status: "error", msg: "delivery agent does not exist" });

    // fetch the deliveries that are not history for the delivery agent
    const deliveries = await Delivery.find({
      delivery_agent_phone_no: deliveryAgent.phone_no,
      "delivery_status.is_accepted": true,
      "delivery_status.is_completed": false,
      "delivery_status.is_cancelled": false,
    }).lean();

    // change the phone number for every delivery document that is not history
    let new_deliveries = [];
    for (let i = 0; i < deliveries.length; i++) {
      const delivery = await Delivery.findOneAndUpdate(
        { _id: deliveries[i]._id },
        { delivery_agent_phone_no: new_phone_no },
        { new: true }
      ).lean();
      new_deliveries.push(delivery);
    }
    console.log(new_deliveries);

    return res
      .status(200)
      .send({
        status: "ok",
        msg: "phone number changed successfully",
        delivery_agent,
      });
  } catch (e) {
    console.log(e);
    return res
      .status(403)
      .send({ status: "error", msg: "some error occurred", e });
  }
});

// endpoint to forgot phone number
router.post("/forgot_phone_no", async (req, res) => {
  const { token, phone_no: new_phone_no } = req.body;

  // test for required fields
  if (!token || !new_phone_no)
    return res
      .status(400)
      .send({ status: "error", msg: "all fields must be filled" });

  try {
  } catch (e) {
    console.log(e);
    return res
      .status(403)
      .send({ status: "error", msg: "some error occurred", e });
  }
});

// endpoint to continue registration from where the delicvery agent stopped
router.post("/continue_registration", async (req, res) => {
  const { phone_no } = req.body;

  // test for required fields
  if (!phone_no)
    return res
      .status(400)
      .send({ status: "error", msg: "all fields must be filled" });

  try {
    // check if delivery agent exists
    const delivery_agent = await Delivery_agent.findOne({
      phone_no,
      is_deleted: false,
    }).lean();
    if (!delivery_agent)
      return res
        .status(400)
        .send({ status: "error", msg: "delivery agent not found" });

    // generate token
    const token = jwt.sign(
      {
        phone_no: phone_no,
        _id: delivery_agent._id,
      },
      process.env.JWT_SECRET
    );

    return res
      .status(200)
      .send({
        status: "ok",
        msg: "delivery agent gotted successfully",
        delivery_agent,
        token,
      });
  } catch (e) {
    console.log(e);
    return res
      .status(403)
      .send({ status: "error", msg: "some error occurred", e });
  }
});

// this endpoint to recover account
router.post("/recover_account", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res
      .status(400)
      .send({ status: "error", msg: "All fields must be entered" });
  }

  // check if the delivery agent exists
  const found = await Delivery_agent.findOne({ email }, { email: 1 }).lean();

  if (!found) {
    return res
      .status(400)
      .send({
        status: "error",
        msg: "There is no delivery agent account with this email",
      });
  }

  // create resetPasswordCode
  /**
   * Get the current timestamp and use to verify whether the
   * delivery agent can still use this link to reset their password
   */

  const timestamp = Date.now();
  const resetPhoneNoCode = jwt.sign(
    { email, timestamp },
    process.env.JWT_SECRET
  );

  //send email to Delivery_agent to reset password
  sendRecoverAccount1(email, resetPhoneNoCode);

  return res
    .status(200)
    .json({
      status: "ok",
      msg: "Password reset email sent, please check your email",
    });
});

// endpoint to recover account webpage
router.get("/recover_account_page/:resetPhoneNoCode", async (req, res) => {
  const resetPhoneNoCode = req.params.resetPhoneNoCode;
  try {
    const data = jwt.verify(resetPhoneNoCode, process.env.JWT_SECRET);

    const sendTime = data.timestamp;
    // check if more than 5 minutes has elapsed
    const timestamp = Date.now();
    if (timestamp > sendTime) {
      console.log("handle the expiration of the request code");
    }

    return res.send(`<!DOCTYPE html>
    <html>
        <head>
            <title>Recover Account</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">    
            <style>
                body {
                    font-family: Arial, Helvetica, sans-serif;
                    margin-top: 10%;
                }
                form{
            width: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: 26%;
            margin-top: 0%;
        }
            @media screen and (max-width: 900px) {
                form{
            width: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
                }
            

            }
                input[type=text]
            {
                    width: 100%;
                    padding: 12px 20px;
                    margin: 8px 0;
                    display: inline-block;
                    border: 1px solid #ccc;
                    box-sizing: border-box;
                }

                button {
                    background-color: #04AA6D;
                    color: white;
                    padding: 14px 20px;
                    margin: 8px 0;
                    border: none;
                    cursor: pointer;
                    width: 100%;
                }

                button:hover {
                    opacity: 0.8;
                }   

                .container {
                    padding: 16px;
                }

                span.psw {
                    float: right;
                    padding-top: 16px;
                }

                /* Change styles for span and cancel button on extra small screens */
                @media screen and (max-width: 300px) {
                    span.psw {
                        display: block;
                        float: none;
                    }

                    .cancelbtn {
                        width: 100%;
                    }
                }
            </style>
        </head>
        <body>    
                <h2 style="display: flex; align-items: center; justify-content: center; margin-bottom: 0;">Recover Account</h2>
                <h6 style="display: flex; align-items: center; justify-content: center; font-weight: 200;">Enter the new phone number
                    you want to use in recovering your account</h6>    
        
            <form action="https://serverpickload.wl.r.appspot.com/delivery_agent_auth/reset_phone_no" method="post">
                <div class="imgcontainer">
                </div>
                <div class="container">
                    <input type="text" placeholder="Enter phone number" name="phone" required style="border-radius: 5px;" maxlength="11">
                    <input type='text' placeholder="nil" name='resetPhoneNoCode' value=${resetPhoneNoCode} style="visibility: hidden"><br>
                    <button type="submit" style="border-radius: 5px; background-color: #1aa803;">Submit</button>            
                </div>        
            </form>
        </body>

    </html>`);
  } catch (e) {
    console.log(e);
    return res.status(200).send(`</div>
    <h1>Password Reset</h1>
    <p>An error occured!!! ${e}</p>
    </div>`);
  }
});

// endpoint to reset phone number
router.post("/reset_phone_no", async (req, res) => {
  const { phone, resetPhoneNoCode } = req.body;

  if (!phone || !resetPhoneNoCode) {
    return res
      .status(400)
      .json({ status: "error", msg: "All fields must be entered" });
  }

  try {
    const data = jwt.verify(resetPhoneNoCode, process.env.JWT_SECRET);
    const phone_no = "+234" + phone.slice(1);

    // check if phone number is already in use
    const found = await Delivery_agent.findOne(
      { phone_no, is_deleted: false },
      { phone_no: 1 }
    ).lean();
    if (found)
      return res
        .status(400)
        .send({ status: "error", msg: "phone number already in use" });

    // update the phone_no field
    await Delivery_agent.updateOne(
      { email: data.email },
      {
        $set: { phone_no },
      }
    );

    // return a response which is a web page
    return res.status(200).send(`</div>
    <h1>Recover Account</h1>
    <p>Your account has been recovered successfully!!!</p>
    <p>You can now login with your new phone number.</p>
    </div>`);
  } catch (e) {
    console.log("error", e);
    return res.status(200).send(`</div>
    <h1>Recover Account</h1>
    <p>An error occured!!! ${e}</p>
    </div>`);
  }
});

// endpoint to request delete delivery_agent account
router.post("/request_delete_account", async (req, res) => {
  const { token, email, phone } = req.body;

  if (!token || !email || !phone)
    return res
      .status(400)
      .json({ status: "error", msg: "All fields must be entered" });

  try {
    const { _id } = jwt.verify(token, process.env.JWT_SECRET);

    // generate code
    const deleteAccountCode = jwt.sign(
      {
        timestamp: Date.now(),
        email,
        phone,
        _id
      },
      process.env.JWT_SECRET
    );

    // send mail to the delivery_agent
    sendDeleteAccount1(email, deleteAccountCode);

    // return a response which is a web page
    return res.status(200).send({ status: "ok", msg: "success" });
  } catch (e) {
    console.log("error", e);
    return res
      .status(503)
      .send({ status: "error", msg: "some error occurred" });
  }
});

// endpoint to delete account page
router.get("/delete_account_page/:deleteAccountCode", async (req, res) => {
  const deleteAccountCode = req.params.deleteAccountCode;
  try {
    const data = jwt.verify(deleteAccountCode, process.env.JWT_SECRET);

    // const sendTime = data.timestamp;
    // // check if more than 5 minutes has elapsed
    // const timestamp = Date.now();
    // if(timestamp > sendTime){
    //     console.log('handle the expiration of the request code');
    // }

    return res.send(`<!DOCTYPE html>

    <html>
          <head>
            <title>Delete Account</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">    
            <style>
              body {
                font-family: Arial, Helvetica, sans-serif;
                margin-top: 10%;
              }
              form{
                width: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-left: 26%;
                margin-top: 0%;
              }
                input[type=text] {
                  width: 100%;
                  padding: 12px 20px;
                  margin: 8px 0;
                  display: inline-block;
                  border: 1px solid #ccc;
                  box-sizing: border-box;
                }
    
                button:hover {
                  opacity: 0.8;
                }   
    
                .container {
                  padding: 16px;
                }
    
                span.psw {
                  float: right;
                  padding-top: 16px;
                }
    
            </style>
          </head>
    
          <body> 
            <h3 style="display: flex; align-items: center; justify-content: center; margin-bottom: 0;">Delete Account</h2>
            <h6 style="display: flex; align-items: center; justify-content: center; font-weight: 200;">Are you sure you want to delete your pickload account?</h6>    
        
            <form action="https://serverpickload.wl.r.appspot.com/delivery_agent_auth/delete_account" method="post">
              
              <div class="container">
                <input type='text' placeholder= "nil" name='deleteAccountCode' value=${deleteAccountCode} style="visibility: hidden"><br>
                <button type="submit" style="border-radius: 5px; padding: 14px 20px; background-color: #1aa803; color: white">Yes, Delete Account</button>          
              </div>        
            </form>
          </body>
          
    </html>`);
  } catch (e) {
    console.log(e);
    return res.status(200).send(`</div>
    <h1>Password Reset</h1>
    <p>An error occured!!! ${e}</p>
    </div>`);
  }
});

// endpoint to delete account
router.post("/delete_account", async (req, res) => {
  const { deleteAccountCode } = req.body;

  if (!deleteAccountCode) {
    return res
      .status(400)
      .json({
        status: "error",
        msg: "All fields must be entered",
        // vars: req.body,
      });
  }

  try {
    const delivery_agent = jwt.verify(
      deleteAccountCode,
      process.env.JWT_SECRET
    );

    // check if phone number is already in use
    // await Delivery_agent.deleteOne({
    //   email: delivery_agent.email,
    //   is_deleted: false,
    // }).lean();
    const da = await Delivery_agent.findOneAndUpdate({
      email: delivery_agent.email,
      is_deleted: false,
    }, {
      phone_no: `${delivery_agent.phone}_deleted_${Date.now()}`, is_deleted: true
    }, { upsert: true }).lean();

    // update is_deleted on firestore for normal delivery agent
    await FsDeliveryAgent.doc(delivery_agent._id.toString()).update({ is_deleted: true });

    // Remove from list of agents under fleet_manager
    if (da.fleet_manager_id != null) {
      let fleet_manager = await Delivery_agent.findOne({ _id: da.fleet_manager_id });

      const index = fleet_manager.fleet_manager_delivery_agents.findIndex(agent => agent.delivery_agent_id == da._id);

      fleet_manager.fleet_manager_delivery_agents.splice(index, 1);

      // Decreasing fleet_size
      await Delivery_agent.updateOne(
        { _id: da.fleet_manager_id },
        { $inc: { fleet_size: -1 } }
      );
    }

    // Update statistics document
    await Statistics.updateOne(
      { doc_type: 'admin' },
      {
        $inc: { no_of_delivery_agents: -1, no_of_active_delivery_agents: -1 }
      },
      { upsert: true }
    );

    await FsStatistics.doc('statistics').update({
      no_of_delivery_agents: FieldValue.increment(-1),
      no_of_active_delivery_agents: FieldValue.increment(-1)
    });

    console.log("------------> DELETED MY GUY 2");


    // return a response which is a web page
    return res.status(200).send(`</div>
    <h1>Delete Account</h1>
    <p>Your account has been successfully deleted!!!</p>
    </div>`);
  } catch (e) {
    console.log("error", e);
    return res.status(200).send(`</div>
    <h1>Delete Account</h1>
    <p>An error occured!!! ${e}</p>
    </div>`);
  }
});

// endpont to get email using phone number
router.post("/get_email", async (req, res) => {
  const { phone_no } = req.body;

  if (!phone_no)
    return res
      .status(400)
      .send({ status: "error", msg: "All fields must be filled" });

  try {

    const delivery_agent = await Delivery_agent.findOne(
      { phone_no: phone_no, is_deleted: false }
    ).lean();

    //check if delivery_agent account exists
    if (!delivery_agent)
      return res
        .status(400)
        .send({ status: "error", msg: "delivery_agent not found" });

    return res
      .status(200)
      .send({
        status: "ok",
        msg: "delivery_agent gotten successfully",
        email: delivery_agent.email
      });
  } catch (e) {
    console.log(e);
    return res
      .status(403)
      .send({ status: "error", msg: "Some error occurred", e });
  }
});

// //endpoint to verify user
// router.get('/confirm/:confirmationCode', async (req, res) => {
//   try{
//     const delivery_agent = await Delivery_agent.findone({
//       confirmation_code: req.params.confirmationCode
//     }).lean();

//     if(!delivery_agent)
//       return res.status(404).send({status: 'error', msg: 'delivery_agent not found'});

//     delivery_agent.status = 'inactive';

//     await delivery_agent.save((err) => {
//       if(err)
//         return res.status(500).send({status: 'error', msg: err})
//     });

//     return res.status(200).send(`<h1>Account confirmed</h1>
//     <p>Please go back to the app and login</p>
//     <p>Cheers</p>
//     </div>`);

//   }catch(e){
//     console.log(e);
//     return res.status(403).send({status: 'error', msg: 'Some error occurred', e});
//   }
// });

// //change password
// router.post('/change_password', async (req, res) => {
//   const { _id, token, old_password, new_password, confirm_password } = req.body;

//   if(!_id || !token || !old_password || !new_password || !confirm_password)
//     return res.status(400).send({status: 'error', msg: 'All fields must be filed'});

//   try{
//     //verify token
//     let delivery_agent = jwt.verify(token, process.env.JWT_SECRET);

//     delivery_agent = await Delivery_agent.findById({_id});
//     console.log(delivery_agent)

//     //password check
//     const correct = await bcrypt.compare(old_password, delivery_agent.password);
//     if(!correct)
//       return res.status(400).send({status: 'error', msg: 'Incorrect password'});
//     if(new_password !== confirm_password)
//       return res.status(400).send({status: 'error', msg: 'New password and Confirm password must match'});

//     //encrypt new password
//     const password = await bcrypt.hash(confirm_password, 10);

//     //edit your delivery_agent profile
//     delivery_agent.password = password;
//     delivery_agent = await delivery_agent.save();
//     return res.status(200).send({status: 'ok', msg: 'Password updated successfully', delivery_agent});

//   }catch(e) {
//     console.log(e)
//     return res.status(403).send({status: 'error', msg: 'Some error occurres', e});
//   }
// });

module.exports = router;
