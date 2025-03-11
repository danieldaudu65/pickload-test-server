async function sendNotification(data, callback, apiKey){
    // console.log(data);
    // console.log(callback);
    // console.log(apiKey);
    let headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": "Basic " + apiKey,
    };

    let options = {
        host: "onesignal.com",
        port: 443,
        path: "/api/v1/notifications",
        method: "POST",
        headers: headers
    };

    let https = require('https');
    let req = https.request(options, res => {
        res.on('data', data => {
            console.log(JSON.parse(data));
            return callback(null, JSON.parse(data));
        });
    });

    req.on('error', e => {
        return callback({
            message: e
        });
    });

    req.write(JSON.stringify(data));
    req.end();
}

module.exports = {sendNotification}
