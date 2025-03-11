const pushNotificationService = require("../services/push_notification_service");
//function to send notification to all users
exports.sendNotification = (toUser) => {
    let message = {
        app_id: toUser ? process.env.ONE_SIGNAL_APP_ID_USER : process.env.ONE_SIGNAL_APP_ID_DELIVERY_AGENT,
        //message/notification to be sent
        contents: { "en": "Test Push Notification" },
        included_segments: ["All"],
        content_available: true,
        small_icon: "ic_notification_icon",
        data: {
            PushTitle: "CUSTOM NOTIFICATION"
        },
    };
    pushNotificationService.sendNotification(message, (error, results) => {
        if(error) {
            return console.log('Error sending message', error);
        }
        return console.log('Success', results);
    }, toUser ? process.env.ONE_SIGNAL_API_KEY_USER : process.env.ONE_SIGNAL_API_KEY_DELIVERY_AGENT);
};

//function to send notification to particular device(s)
exports.sendNotificationToDevice = (toUser, devices, img, notiTitle, notiSubtitle, data, os_type, notiType) => {
    console.log(`notiType: ${notiType}`)
    let channel_id = "";
    let sound = "";
    if(notiType === 'order') {
        channel_id = "f1588672-5624-488a-a357-b41c408224be";
        sound = "new_order";
    } else if(notiType === 'message') {
        channel_id = "1d9384a0-84ba-4c06-955a-cb156e428aeb";
        sound = "new_message";
    } else if(notiType === 'user') {
        channel_id = "733ff63d-5130-477a-a944-51b926030c30"
        sound = "pick_sound_user";
    } else if(notiType === 'payment') {
        channel_id = "31e7421e-b50b-4f8b-9713-d0ed7ab07580";
        sound = "new_payment";
    } else if (notiType === "agent_call") {
        channel_id = "b31320a7-c95d-4d1d-b3c2-634ad6214ed8";
        sound = "pick_sound";
    } else if (notiType === "system_message") {
        channel_id = "c91d051a-a55d-46a2-904c-774b63a2248a";
        sound = "system_message";
    } else {
        channel_id = "733ff63d-5130-477a-a944-51b926030c30";
        sound = "pick_sound_user";
    } 
    let message = {
        app_id: toUser == true ? os_type == 'iOS' ? process.env.IOS_ONESIGNAL_APP_ID_USER : process.env.ONE_SIGNAL_APP_ID_USER : os_type == 'iOS' ? process.env.IOS_ONESIGNAL_APP_ID_DELIVERY_AGENT : process.env.ONE_SIGNAL_APP_ID_DELIVERY_AGENT,
        //message/notification to be sent
        headings: {'en': notiTitle},
        contents: { "en": notiSubtitle},
        large_icon: process.env.APP_ICON_URL,
        // big_picture: img,
        // huawei_big_picture: img,
        included_segments: ["include_player_ids"],
        // data,
        /**
         * the body will be the id of the target device(s)
         * and it is gotten from the flutter app of the target device
        
         * eg:
         * {
         *  "devices": ["f8f11390-7748-11ec-be86-36f1e07b2d74"]
         * }
         */
        include_player_ids: devices,
        content_available: true,
        android_sound: sound, 
        android_channel_id: channel_id, 
        small_icon: "ic_notification_icon",
        data: {
            PushTitle: "CUSTOM NOTIFICATION",
            ...data
        },
    };
    pushNotificationService.sendNotification(message, (error, results) => {
        if(error) {
            // return console.log('Error sending message', error);
        }
        // return console.log('Success', results);
    }, toUser ? process.env.ONE_SIGNAL_API_KEY_USER : process.env.ONE_SIGNAL_API_KEY_DELIVERY_AGENT);
};