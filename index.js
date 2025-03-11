const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

// set strictquery parameter to true
mongoose.set({"strictQuery": true});

// init mongoose
mongoose.connect(process.env.MONGO_URI);

const con = mongoose.connection;
con.on('open', error => {
    if(!error){
        console.log('DB connection successful');
    }else{
        console.log(`DB connection failed with error: ${error}`);
    }
});

const domainsFromEnv = process.env.CORS_DOMAINS || "";
const whitelist = domainsFromEnv.split(",").map(item => item.trim());
const corsOptions = {
    origin: (origin, callback) => {
        if(!origin || whitelist.indexOf(origin) !== -1){
            callback(null, true);
        }else{
            callback(new Error("Not Allowed by CORS"));
        }
    },
    credentials: true
}

app.use(cors(corsOptions));

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(cookieParser());


app.use('/user_auth', require('./routes_user/auth'));
app.use('/user_delivery', require('./routes_user/deliveries'));
app.use('/user_profile', require('./routes_user/profile'));
app.use('/user_transaction', require('./routes_user/transactions'));
app.use('/user_report', require('./routes_user/reports'));
app.use('/user_review', require('./routes_user/reviews'));
app.use('/user_search', require('./routes_user/search'));
app.use('/user_chat', require('./routes_user/chat'));
app.use('/user_homepage_stats', require('./routes_user/homepage_stats'));
app.use('/user_referral', require('./routes_user/referral'));

app.use('/view_ops', require('./routes_admin/view_ops'));
app.use('/admin_reports', require('./routes_admin/reports'));
app.use('/admin_expenditure', require('./routes_admin/expenditure'));
app.use('/transaction', require('./routes_admin/transaction'));
app.use('/master_admin', require('./routes_admin/master_admin '));
app.use('/admin_stats', require('./routes_admin/statistics'));
app.use('/admin_reg_request', require('./routes_admin/reg_request'));
app.use('/admin_profile', require('./routes_admin/profile'));
app.use('/admin_delivery', require('./routes_admin/delivery'));
app.use('/admin_delete', require('./routes_admin/delete'));
app.use('/admin_block', require('./routes_admin/block'));
app.use('/admin_percentages', require('./routes_admin/percentages'));
app.use('/admin_revenue', require('./routes_admin/revenue'));
app.use('/admin_review', require('./routes_admin/reviews'));
app.use('/admin_search', require('./routes_admin/search'));
app.use('/admin_auth', require('./routes_admin/auth'));
app.use('/help_feedback_admin', require('./routes_admin/help_feedback'));
app.use('/admin_bank_account_change_request', require('./routes_admin/bank_account_change'));
app.use('/admin_payment_record', require('./routes_admin/payment_records'));
app.use('/admin_settings', require('./routes_admin/settings'));
app.use('/admin_system_message', require('./routes_admin/system_message'));
app.use('/admin_delivery_agent', require('./routes_admin/delivery_agent'));
app.use('/admin_referral', require('./routes_admin/reward'));

app.use('/delivery_agent_notification', require('./routes_delivery_agent/notification'));
app.use('/delivery_agent_earnings', require('./routes_delivery_agent/earnings'));
app.use('/delivery_agent_bank_account_change_request', require('./routes_delivery_agent/bank_account_change_request'));
app.use('/delivery_agent_review', require('./routes_delivery_agent/review'));
app.use('/user_notification', require('./routes_user/notifications'));
app.use('/delivery_agent_stats', require('./routes_delivery_agent/statistics'));
app.use('/delivery_agent_search', require('./routes_delivery_agent/search'));
app.use('/delivery_agent_delivery', require('./routes_delivery_agent/deliveries'));
app.use('/delivery_agent_profile', require('./routes_delivery_agent/profile'));
app.use('/delivery_agent_report', require('./routes_delivery_agent/reports'));
app.use('/delivery_agent_auth', require('./routes_delivery_agent/auth'));
app.use('/delivery_agent_chat', require('./routes_delivery_agent/chat'));
app.use('/delivery_agent_delete', require('./routes_delivery_agent/delete'));
app.use('/delivery_agent_referral', require('./routes_delivery_agent/referral'));

app.use('/generate_token', require('./agora/generate_token'));
app.use('/call_notif', require('./agora/notification'));
app.use('/help_feedback', require('./route_help_feedback/help_feedback'));
app.use('/stats', require('./routes_gen/stats'));
app.use('/admin_upload_promo', require('./routes_admin/youtube_promo'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on PORT ${PORT}`));