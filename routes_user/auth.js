const express = require("express");
const User = require("../models/user");
const Delivery_agent = require("../models/delivery_agent");
const Statistics = require("../models/statistics");
const Referral = require("../models/referral");
const router = express.Router();
const jwt = require("jsonwebtoken");

const {
  sendRecoverAccount,
  sendDeleteAccount,
  sendPasswordReset,
  sendOTP
} = require("../utils/nodemailer");
const generateCode = require("../functions/generate_code")

/**
 * ---------------------------
 * FOR OTP SENDING TWILLIO
 */
// const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
// let OTP, user;

// // Login endpoint
// router.post("/send_otp", async (req, res) => {
//   const { phone_no, email } = req.body;

//   if (!phone_no || !email) {
//     return res
//       .status(400)
//       .send({ status: "error", msg: "Please enter Phone number" });
//   }

//   try {
//     OTP = '';
//     for(let i = 0; i < 6; i++){
//       OTP += process.env.TWILIO_DIGITS[Math.floor(Math.random() * 10)];
//     }

//     // get the email attached to the account

//     sendOTP(email, OTP);

//     await client.messages.create({
//       body: `Pickload: Your OTP verification code is ${OTP}`,
//       to: phone_no,
//       from: process.env.TWILIO_PHONE 
//     }).then(() => res.status(200).send({status: 'ok', msg: 'Success'}))
//     .catch((e) => res.status(403).send({ status: "error", msg: "An error occured", e }));

//   } catch (e) {
//     console.log(e);
//     return res.status(403).send({ status: "error", msg: "An error occured", e });
//   }
// });

// FOR OTP SENDING AFRICASTALKING

// const AfricasTalking = require('africastalking');
// const africastalking = AfricasTalking({
//   apiKey: `${process.env.AFRICASTALKING_APIKEY}`,
//   username: `${process.env.AFRICASTALKING_USERNAME}`
// });

let OTP, user;

// Login endpoint
router.post("/send_otp", async (req, res) => {
  const { phone_no, email } = req.body;

  if (!phone_no || !email) {
    return res
      .status(400)
      .send({ status: "error", msg: "Please enter Phone number or email" });
  }

  try {
    OTP = '';
    for (let i = 0; i < 6; i++) {
      OTP += process.env.TWILIO_DIGITS[Math.floor(Math.random() * 10)];
    }

    // get the email attached to the account
    sendOTP(email, OTP);

    // const result = await africastalking.SMS.send(process.env.AFRICASTALKING_SENDER_NAME == 'a' ? {
    //   to: phone_no,
    //   message: `Pickload: Your OTP verification code is ${OTP}`
    // } : {
    //   to: phone_no,
    //   message: `Pickload: Your OTP verification code is ${OTP}`,
    //   from: `${process.env.AFRICASTALKING_SENDER_NAME}`
    // });

    //console.log(result);
    return res.status(200).send({ status: 'ok', msg: 'Success' });

  } catch (e) {
    console.log(e);
    return res.status(403).send({ status: "error", msg: "An error occured", e });
  }
});

router.post("/verify_otp", async (req, res) => {
  const { otp } = req.body;

  if (!otp) {
    return res
      .status(400)
      .send({ status: "error", msg: "Please enter OTP" });
  }
  try {
    if (otp != OTP) {
      return res.status(400).send({ status: 'error', msg: 'Incorrect OTP' });
    }
    OTP = '';
    return res.status(200).send({ status: 'ok', msg: 'Success' });
  } catch (e) {
    console.log(e);
    return res.status(403).send({ status: "error", msg: "An error occured", e });
  }
});

/**
 * --------------------------------------------------------------------------------
 */


const {
  FsUser,
  FsStatistics,
  FieldValue,
} = require("../services/firebase_service_config");

// signup endpoint
router.post("/signup", async (req, res) => {
  const { fullname, phone_no, email, device_type, referral_code } = req.body;

  // checks
  if (!fullname || !phone_no || !email) {
    return res
      .status(400)
      .send({ status: "error", msg: "All fields should be filled" });
  }

  // if(typeof fullname !== 'string' || typeof email !== 'string'){
  //     return res.status(400).send({status: 'error', msg: 'Invalid fullname or email'});
  // }

  // const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // if(!regex.test(String(email).toLocaleLowerCase())){
  //     return res.status(400).json({status: 'error', msg: 'Please enter a valid email'});
  // }

  try {
    let found = await User.findOne({ phone_no, is_deleted: false }).lean();

    if (found) {
      return res
        .status(400)
        .send({
          status: "error",
          msg: "An account with this phone number already exists",
        });
    }

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

    const timestamp = Date.now();

    const mUser = new User();
    mUser.fullname = fullname;
    mUser.phone_no = phone_no;
    mUser.email = email || "";
    mUser.img = "";
    mUser.img_id = "";
    mUser.referral_code = generateCode(fullname);
    mUser.referee_code = referral_code || "";
    mUser.account_status = "active";
    mUser.created_at = timestamp;
    mUser.last_login = timestamp;

    let os_type = "";
    if (device_type == "ios") {
      mUser.os_type = "iOS";
    }

    if (device_type == "android") {
      mUser.os_type = "android";
    }

    if (device_type == "windows") {
      mUser.os_type = "windows";
    }

    if (device_type == "linux") {
      mUser.os_type = "linux";
    }

    if (device_type == "mac") {
      mUser.os_type = "macOS";
    }

    if (device_type == undefined) {
      mUser.os_type = "";
    }

    if (device_type == null) {
      mUser.os_type = "";
    }

    const user = await mUser.save();
    const token = jwt.sign(
      {
        _id: mUser._id,
        phone_no: mUser.phone_no,
        email: email
      },
      process.env.JWT_SECRET
    );

    await FsUser.doc(user._id.toString()).set({
      _id: user._id.toString(),
      is_calling: false,
      is_online: false,
      call_in_progress: false,
      token: "",
      channel_name: "",
      fullname: fullname,
      img_url: "",
      designation: "user",
      os_type,
      is_deleted: false,
      is_blocked: false,
    });

    await Statistics.updateOne(
      { doc_type: "admin" },
      {
        $inc: {
          no_of_users: 1,
          no_of_active_users: 1,
        },
      },
      { upsert: true }
    );

    const fsStatDoc = await FsStatistics.doc("statistics").get();
    if (fsStatDoc.exists) {
      await FsStatistics.doc("statistics").update({
        no_of_users: FieldValue.increment(1),
        no_of_active_users: FieldValue.increment(1),
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

    // check if there is referral code and update doc accordingly

    // fetch reward notifier from the statistics document
    const { reward_notifier } = await Statistics.findOne({}, { reward_notifier: 1, _id: 0 }).lean();

    // create referral document
    const referral = new Referral();
    referral.user_id = user._id;
    referral.fullname = fullname;
    referral.timestamp = timestamp;
    referral.reward_notifier = reward_notifier;
    referral.referral_code = mUser.referral_code;


    if (referral_code) {
      await User.updateOne({ referral_code }, { $inc: { no_of_referrals: 1 } });

      referral.referee_code = referral_code;

      // update referre referral document
      await Referral.updateOne({ referral_code }, { $inc: { no_of_referrals: 1 } });
    }

    await referral.save();

    return res
      .status(200)
      .send({ status: "ok", msg: "User created", user, token });
  } catch (e) {
    console.log(e);
    if (e.code === 11000) {
      // duplicate key error: meaning an email already exists
      return res
        .status(400)
        .send({ status: "error", msg: "Phone Number already in use" });
    }
    // something went wrong, let the program crash and restart on the server
    return res
      .status(403)
      .send({ status: "error", msg: "some error occurred", e });
  }
});

// Login endpoint
router.post("/login", async (req, res) => {
  const { phone_no, device_type } = req.body;

  if (!phone_no) {
    return res
      .status(400)
      .send({ status: "error", msg: "Please enter Phone number" });
  }

  try {
    //find a user that matches the phone number
    let user = await User.findOne({ phone_no }).lean();

    if (!user) {
      return res
        .status(404)
        .send({
          status: "error",
          msg: `No user with phone no: ${phone_no} found`,
        });
    }

    const token = jwt.sign(
      {
        _id: user._id,
        phone_no: user.phone_no,
        email: user.email
      },
      process.env.JWT_SECRET
    );

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

    // check if user has a referral code and update accordingly
    if (!user.referral_code) {
      user = await User.findOneAndUpdate({ _id: user._id }, { os_type, referral_code: generateCode(user.fullname) }, { new: true });
    } else {
      user = await User.findOneAndUpdate({ _id: user._id }, { os_type }, { new: true });
    }

    if (user.account_status != "active") {
      return res.status(400).send({ status: "error", msg: "User not active" });
    }

    return res.status(200).send({ status: "ok", token, user });
  } catch (e) {
    console.log(e);
    return res.status(403).send({ status: "error", msg: "An error occured" });
  }
});

//change phone number endpoint
router.post("/change_phone_no", async (req, res) => {
  const { token, old_phone_no, new_phone_no } = req.body;

  if (!token || !old_phone_no || !new_phone_no) {
    return res
      .status(400)
      .send({ status: "error", msg: "All fields must be filled" });
  }

  try {
    let user = jwt.verify(token, process.env.JWT_SECRET);
    const _id = user._id;

    let aUser = await User.findOne({ _id }).lean();

    if (aUser.phone_no != old_phone_no) {
      return res
        .status(400)
        .send({
          status: "error",
          msg: `Old phone no: ${old_phone_no} does not match the phone no attached to this account`,
        });
    }

    // check if new phone number exists in the database
    aUser = await User.findOne({
      phone_no: new_phone_no,
      is_deleted: false,
    }).lean();
    if (aUser)
      return res
        .status(400)
        .send({ status: "error", msg: "phone number already in use" });

    const timestamp = Date.now();
    user = await User.findOneAndUpdate(
      { _id },
      {
        $set: {
          phone_no: new_phone_no,
          phone_no_change_date: timestamp,
        },
      },
      { new: true }
    ).lean();

    return res
      .status(200)
      .send({ status: "ok", msg: "Phone number update successful", user });
  } catch (e) {
    console.log(e);
    return res.status(403).json({ status: "error", msg: ";-)" });
  }
});

// endpoint to check if a user account has been blocked
router.post("/check_account_status", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res
      .status(400)
      .send({ status: "error", msg: "Please enter Phone number" });
  }

  try {
    // verify token
    let user = jwt.verify(token, process.env.JWT_SECRET);

    //fetch the user document
    user = await User.findOne({ _id: user._id }).lean();

    if (user.account_status === "blocked") {
      return res
        .status(200)
        .send({ status: "ok", msg: "user account has been blocked" });
    }

    return res
      .status(200)
      .send({ status: "ok", msg: "user account not blocked", user });
  } catch (e) {
    console.log(e);
    return res.status(403).send({ status: "error", msg: "An error occured" });
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

  // check if the user exists
  const found = await User.findOne({ email }, { email: 1 }).lean();

  if (!found) {
    return res
      .status(400)
      .send({
        status: "error",
        msg: "There is no user account with this email",
      });
  }

  // create resetPasswordCode
  /**
   * Get the current timestamp and use to verify whether the
   * user can still use this link to reset their password
   */

  const timestamp = Date.now();
  const resetPhoneNoCode = jwt.sign(
    { email, timestamp },
    process.env.JWT_SECRET
  );

  //send email to user to reset password
  sendRecoverAccount(email, resetPhoneNoCode);

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
            
                <form action="https://serverpickload.wl.r.appspot.com/user_auth/reset_phone_no" method="post">
                    <div class="imgcontainer">
                    </div>
                    <div class="container">
                        <input type="text" placeholder="Enter phone number" name="phone" required style="border-radius: 5px;" maxlength="11">
                        <input type='text' placeholder= "nil" name='resetPhoneNoCode' value=${resetPhoneNoCode} style="visibility: hidden"><br>
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
  console.log(req.body);

  if (!phone || !resetPhoneNoCode) {
    return res
      .status(400)
      .json({
        status: "error",
        msg: "All fields must be entered",
        vars: req.body,
      });
  }

  try {
    const data = jwt.verify(resetPhoneNoCode, process.env.JWT_SECRET);
    const phone_no = phone.slice(1);

    // check if phone number is already in use
    const found = await User.findOne(
      { phone_no, is_deleted: false },
      { phone_no: 1 }
    ).lean();
    if (found)
      return res
        .status(400)
        .send({ status: "error", msg: "phone number already in use" });

    // update the phone_no field
    await User.updateOne(
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

// this endpoint to all a user reset their password
router.post("/forgot_password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res
      .status(400)
      .send({ status: "error", msg: "All fields must be entered" });
  }

  // check if the user exists
  const found = await User.findOne({ email }, { email: 1 }).lean();

  if (!found) {
    return res
      .status(400)
      .send({
        status: "error",
        msg: "There is no user account with this email",
      });
  }

  // create resetPasswordCode
  /**
   * Get the current timestamp and use to verify whether the
   * user can still use this link to reset their password
   */

  const timestamp = Date.now();
  const resetPasswordCode = jwt.sign(
    { email, timestamp },
    process.env.JWT_SECRET
  );

  //send email to user to reset password
  sendPasswordReset(email, resetPasswordCode);

  return res
    .status(200)
    .json({
      status: "ok",
      msg: "Password reset email sent, please check your email",
    });
});

router.get("/reset_password_page/:resetPasswordCode", async (req, res) => {
  const resetPasswordCode = req.params.resetPasswordCode;
  try {
    const data = jwt.verify(resetPasswordCode, process.env.JWT_SECRET);

    const sendTime = data.timestamp;
    // check if more than 5 minutes has elapsed
    const timestamp = Date.now();
    if (timestamp > sendTime) {
      console.log("handle the expiration of the request code");
    }

    return res.send(`<!DOCTYPE html>
        <html>
            <head>
                <title>Reset Password</title>
            </head>
            <body>
                <h1>Reset Password</h1>
                <p>Enter your new password to reset your password</p>
                <form action='/auth/reset_password' method='POST'>
                    <input type='text' id='pass' name='password' placeholder='Enter password' required minlength="5"><br><br>
                    <input type='text' id='confirm_pass' name='confirm_password' placeholder='Confirm password' required minlength="5"><br><br>
                    <input type='text' name='reset_code' value=${resetPasswordCode} hidden><br>
                    <input type='submit' value='Submit'>
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

router.post("/reset_password", async (req, res) => {
  const {
    password: plainTextPassword,
    confirm_password,
    reset_code,
  } = req.body;

  if (!plainTextPassword || !confirm_password || !reset_code) {
    return res
      .status(400)
      .json({ status: "error", msg: "All fields must be entered" });
  }

  if (plainTextPassword !== confirm_password) {
    return res
      .status(400)
      .json({ status: "error", msg: "Passwords do not match" });
  }

  if (plainTextPassword.length < 5) {
    return res
      .status(400)
      .json({
        status: "error",
        msg: "Password too small, should be at least 5 characters long",
      });
  }

  try {
    const data = jwt.verify(reset_code, process.env.JWT_SECRET);

    // hash the new password
    const password = await bcrypt.hash(plainTextPassword, 10);
    // update the password field
    await User.updateOne(
      { email: data.email },
      {
        $set: { password },
      }
    );

    // return a response which is a web page
    return res.status(200).send(`</div>
        <h1>Password Reset</h1>
        <p>Your password was reset successfully!!!</p>
        <p>You can now login with your new password.</p>
        </div>`);
  } catch (e) {
    console.log("error", e);
    return res.status(200).send(`</div>
        <h1>Password Reset</h1>
        <p>An error occured!!! ${e}</p>
        </div>`);
  }
});

// endpoint to request delete user account
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

    // send mail to the user
    sendDeleteAccount(email, deleteAccountCode);

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
            <h6 style="display: flex; text-align: center; align-items: center; justify-content: center; font-weight: 200;">Are you sure you want to delete your Pickload account?</h6>
            <form action="https://serverpickload.wl.r.appspot.com/user_auth/delete_account" method="post">
              
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
      .json({ status: "error", msg: "All fields must be entered" });
  }

  try {
    const user = jwt.verify(deleteAccountCode, process.env.JWT_SECRET);

    // check if phone number is already in use
    // await User.deleteOne({email: user.email, is_deleted: false}).lean();
    await User.updateOne(
      { email: user.email, is_deleted: false },
      { phone_no: `${user.phone}_deleted_${Date.now()}`, is_deleted: true },
      { upsert: true }
    ).lean();

    console.log("------------> DELETED MY GUY");

    // update statistics document
    await Statistics.updateOne(
      { doc_type: "admin" },
      {
        $inc: {
          no_of_users: -1,
          no_of_active_users: -1,
        },
      },
      { upsert: true }
    ).lean();

    await FsStatistics.doc('statistics').update({
      no_of_users: FieldValue.increment(-1),
      no_of_active_users: FieldValue.increment(-1)
    });

    await FsUser.doc(user._id.toString()).update({
      is_deleted: true
    });

    // return a response which is a web page
    return res.status(200).send(`</div>
        <p>Your account has been deleted successfully!!!</p>
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

    const user = await User.findOne(
      { phone_no: phone_no, is_deleted: false }
    ).lean();

    //check if user account exists
    if (!user)
      return res
        .status(400)
        .send({ status: "error", msg: "user not found" });

    return res
      .status(200)
      .send({
        status: "ok",
        msg: "user gotten successfully",
        email: user.email
      });
  } catch (e) {
    console.log(e);
    return res
      .status(403)
      .send({ status: "error", msg: "Some error occurred", e });
  }
});

module.exports = router;