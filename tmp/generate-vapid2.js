const webpush = require('web-push');
const fs = require('fs');

const vapidKeys = webpush.generateVAPIDKeys();
fs.writeFileSync('tmp/vapid.json', JSON.stringify(vapidKeys));
