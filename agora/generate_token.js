const express = require('express');
const dotenv = require('dotenv');
const {RtcTokenBuilder, RtcRole} = require('agora-access-token');

dotenv.config();
const router = express.Router();

router.post('/generate_access_token', (req, res) => {
    const {channel, role} = req.body;
    if(!channel)
        return res.status(400).send({status: 'error', msg: 'all fields must be filled'});

    let callRole = RtcRole.SUBSCRIBER;
    if(role === 'publisher')
        callRole = RtcRole.PUBLISHER;

    let expireTime = 3600;
    let uid = 0;

    // calculate priviledge expire time
    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTime + expireTime;

    const token = RtcTokenBuilder.buildTokenWithUid(
        process.env.AGORA_APP_ID,
        process.env.AGORA_APP_CERTIFICATE,
        channel,
        uid,
        callRole,
        privilegeExpireTime
    );

    return res.status(400).send({status: 'ok', msg: 'Success', token});
});

module.exports = router;