const { process_params } = require("express/lib/router");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const transport = nodemailer.createTransport({
  service: "gmail",
  // host: 'smtp.gmail.com',
  // port: 587,
  // secure: false,
  // requireTLS: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// const email_sender_name = "Pickload";

const sendConfirmationEmail = (fullname, email, confirmationCode) => {
  transport
    .sendMail({
      from: `support@pickload.ng <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Please confirm your account",
      html: `<h1>Email Confirmation<h2>
        <p>Thank you ${fullname} for signing up with our App Service. Please confirm your email by clicking on the following link</p>
        <a href=https://serverpickload.wl.r.appspot.com/auth/confirm/${confirmationCode}> Click here</a>
        <p>Cheers</p>
        <p>Your App Service team</p>
        </div>`,
      // text: 'Testing email'
    })
    .catch((err) => console.log(err));
};

const sendLoginDetails = (fullname, login_details) => {
  transport
    .sendMail({
      from: `support@pickload.ng <${process.env.MAIL_USER}>`,
      to: login_details.email,
      subject: "Login Details",
      html: `<h1>Email Confirmation<h2>
        <p>Thank you ${fullname} for registering with Deebug Institute.</p>
        <p>Login Details: Email: ${login_details.email} <br /> Password: ${login_details.password} </p>
        <p>Goodluck with your learning journey</p>
        </div>`,
    })
    .catch((err) => console.log(err));
};

const sendPasswordReset = (email, resetPasswordCode) => {
  transport
    .sendMail({
      from: `support@pickload.ng <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Password Reset",
      html: `<h2>Hello!</h2>
      <p style="line-height: 1.5">We have received a request to reset your password for your account on our platform. To reset your password click the link below</p>
      <a href=https://serverpickload.wl.r.appspot.com/user_auth/reset_password_page/${resetPasswordCode}>Proceed</a> <br />
      <br /><p style="line-height: 1.5">If you did not make this request, please ignore this email. <br /><br />Best regards, <br />Team Pickload.</p>
        </div>`,
    })
    .then((res) => console.log("email sent successfully"))
    .catch((err) => console.log(err));
};

const sendRecoverAccount = (email, resetPhoneNoCode) => {
  transport
    .sendMail({
      from: `support@pickload.ng <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Recover Account",
      html: `<h2>Hi User,</h2>
      <p style="line-height: 1.5">We are sending you this email because you requested to recover your Pickload account. Click on the link below to get started</p>
      <a href=https://serverpickload.wl.r.appspot.com/user_auth/recover_account_page/${resetPhoneNoCode}>Get started</a>
      <p style="line-height: 1.5">If you did not request to recover your account, you can kindly ignore this email. Only a person with access to your email will be able to recover your account. <br /><br />Best regards, <br />Team Pickload.
        </div>`,
    })
    .then((res) => console.log("email sent successfully"))
    .catch((err) => console.log(err));
};

const sendPasswordReset1 = (email, resetPasswordCode) => {
  transport
    .sendMail({
      from: `support@pickload.ng <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Password Reset",
      html: `<h2>Hello!</h2>
      <p style="line-height: 1.5">We have received a request to reset your password for your account on our platform. To reset your password click the link below</p>
      <a href=https://serverpickload.wl.r.appspot.com/delivery_agent_auth/reset_password_page/${resetPasswordCode}>Proceed</a>
      <p style="line-height: 1.5">If you did not make this request, please ignore this email. <br /><br />Best regards, <br />Team Pickload.</p>
        </div>`,
    })
    .then((res) => console.log("email sent successfully"))
    .catch((err) => console.log(err));
};

const sendRecoverAccount1 = (email, resetPhoneNoCode) => {
  transport
    .sendMail({
      from: `support@pickload.ng <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Recover Account",
      html: `<h2>Hi Delivery Agent,</h2>
      <p style="line-height: 1.5">We are sending you this email because you requested to recover your Pickload account. Click on the link below to get started</p>
      <a href=https://serverpickload.wl.r.appspot.com/delivery_agent_auth/recover_account_page/${resetPhoneNoCode}>Get started</a>
      <p style="line-height: 1.5">If you did not request to recover your account, you can kindly ignore this email. Only a person with access to your email will be able to recover your account.
      <br /><br />
      Best regards, <br />Team Pickload.</p>
        </div>`,
    })
    .then((res) => console.log("email sent successfully"))
    .catch((err) => console.log(err));
};

const sendDeleteAccount1 = (email, deleteAccountCode) => {
  transport
    .sendMail({
      from: `support@pickload.ng <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Delete Pickload Account",
      html: `<p style="line-height: 1.5">
        Hello! <br/>
        Thank you for reaching out to us with your request to delete your account on our platform.
        We're sorry to see you go, but we understand that circumstances change. <br /> <br />
        As requested, we have initiated the process to delete your account. Please note that once your account is deleted, you will lose all your data and you will not be able to retrieve any information associated with it, including your login credentials. <br />
        If you're ready to delete your account, click the link.
        <a href=https://serverpickload.wl.r.appspot.com/delivery_agent_auth/delete_account_page/${deleteAccountCode}>Proceed to delete account</a> <br /> <br />
        Otherwise, you can ignore this mail and your account will remain active.<br />
        We hope you had a positive experience with us; if you change your mind and wish to use our app again in the future, you'll need to create a new account.<br />
        Thank you for your understanding and we hope to see you again soon! <br /> <br />
        Best regards,<br />
        Team Pickload.
    </p>
        </div>`,
    })
    .then((res) => console.log("email sent successfully"))
    .catch((err) => console.log(err));
};

const sendDeleteAccount = (email, deleteAccountCode) => {
  transport
    .sendMail({
      from: `support@pickload.ng <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Delete Pickload Account",
      html: `<p style="line-height: 1.5">
      Hello! <br/>
      Thank you for reaching out to us with your request to delete your account on our platform.
      We're sorry to see you go, but we understand that circumstances change. <br /> <br />
      As requested, we have initiated the process to delete your account. Please note that once your account is deleted, you will lose all your data and you will not be able to retrieve any information associated with it, including your login credentials. <br />
      If you're ready to delete your account, click the link.
      <a https://serverpickload.wl.r.appspot.com/user_auth/delete_account_page/${deleteAccountCode}>Proceed to delete account</a> <br /> <br />
      Otherwise, you can ignore this mail and your account will remain active.<br />
      We hope you had a positive experience with us; if you change your mind and wish to use our app again in the future, you'll need to create a new account.<br />
      Thank you for your understanding and we hope to see you again soon! <br /> <br />
      Best regards,<br />
      Team Pickload.
  </p>
        </div>`,
    })
    .then((res) => console.log("email sent successfully"))
    .catch((err) => console.log(err));
};

const sendOTP = (email, otp) => {
  transport
    .sendMail({
      from: `support@pickload.ng <${process.env.MAIL_USER}>`,
      to: email,
      subject: "One Time Password",
      html: `<p style="line-height: 1.5">
      Your OTP verification code is: <br /> <br />
      <font size="3">${otp}</font> <br />
      Best regards,<br />
      Team Pickload.
  </p>
        </div>`,
    })
    .then((res) => console.log("email sent successfully"))
    .catch((err) => console.log(err));
};

const sendEmail = (email, subject, body) => {
  transport
    .sendMail({
      from: `support@pickload.ng <${process.env.MAIL_USER}>`,
      to: email,
      subject: subject,
      html: `<p>${body}</p>`,
    })
    .then((res) => console.log("email sent successfully"))
    .catch((err) => console.log(err));
};

const sendRegRequestAcceptedToDeliveryAgent = (email) => {
  transport
    .sendMail({
      from: `support@pickload.ng <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Registration Request",
      html: `<p style="line-height: 1.5">Dear Delivery Agent, <br />
      We are pleased to inform you that your delivery agent account has been successfully approved. You can now log in to our mobile application and start using our platform to make deliveries.<br /><br />
      We would like to take this opportunity to thank you for choosing our platform to grow your business. With our platform, we aim to provide you with a seamless experience to manage your deliveries, increase your earnings and grow your customer base.<br /><br />
      We believe that our platform will help you to streamline your deliveries and improve your customer service. You will be able to receive delivery requests from customers, manage your deliveries, and track your earnings all in one place.<br /><br />
      If you have any questions or concerns, please do not hesitate to contact us. Our customer support team is always available to assist you.<br />
      We look forward to working with you and wish you the best of luck with your deliveries.<br /><br />
      Best regards,<br />
      Pickload</p>
        </div>`,
    })
    .then((res) => console.log("email sent successfully"))
    .catch((err) => console.log(err));
};

const sendRegRequestAcceptedToFleetManager = (email) => {
  transport
    .sendMail({
      from: `support@pickload.ng <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Registration Request",
      html: `<p style="line-height: 1.5">Dear Fleet Manager, <br />
      We are pleased to inform you that your fleet manager account has been successfully approved. You can now log in to our mobile application and start using our platform.<br /><br />
      We would like to take this opportunity to thank you for choosing our platform to grow your business. With our platform, we aim to provide you with a seamless experience to manage your deliveries, increase your earnings and grow your customer base.<br /><br />
      We believe that our platform will help you to streamline your deliveries and improve your customer service. You will be able to receive delivery requests from customers, manage your deliveries, and track your earnings all in one place.<br /><br />
      If you have any questions or concerns, please do not hesitate to contact us. Our customer support team is always available to assist you.<br />
      We look forward to working with you and wish you the best of luck with your deliveries.<br /><br />
      Best regards,<br />
      Pickload</p>
        </div>`,
    })
    .then((res) => console.log("email sent successfully"))
    .catch((err) => console.log(err));
};

const sendRegDeclinedMail = (email) => {
  transport
    .sendMail({
      from: `support@pickload.ng <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Account Registration Feedback",
      html: `<p style="line-height: 1.5">Hey there, <br />
      Thank you for your interest in registering as a Pickload agent. We appreciate your enthusiasm and willingness to join our team. However, after careful consideration, we regret to inform you that we are unable to proceed with your request to create an account with Pickload.<br /><br />

      Upon reviewing the provided user details, we identified some inaccuracies and inconsistencies that prevent us from validating your information. Accuracy and reliability are crucial for our delivery operations, ensuring the highest level of service to our customers.<br /><br />

      We understand that errors can occur unintentionally, and we encourage you to review and double-check the user details you provided during the registration process. Please ensure that all information, including personal information, contact details, and any supporting documents, are accurate and up to date.<br /><br />

      While we appreciate your interest in becoming a Pickload agent, we must maintain strict standards to ensure the safety and quality of our service. We genuinely appreciate your understanding in this matter. Should you have any further questions or require clarification regarding the reasons for our decision, please feel free to reach out to us. We are here to assist you and provide any additional information you may need.<br />
Thank you for considering our platform, and we wish you the best in all your future endeavors.<br /><br />

      Best regards,<br />
      Pickload</p>
        </div>`,
    })
    .then((res) => console.log("email sent successfully"))
    .catch((err) => console.log(err));
};

module.exports = {
  sendConfirmationEmail,
  sendPasswordReset,
  sendPasswordReset1,
  sendLoginDetails,
  sendRecoverAccount,
  sendRecoverAccount1,
  sendDeleteAccount,
  sendDeleteAccount1,
  sendEmail,
  sendRegRequestAcceptedToDeliveryAgent,
  sendRegRequestAcceptedToFleetManager,
  sendRegDeclinedMail,
  sendOTP
};
