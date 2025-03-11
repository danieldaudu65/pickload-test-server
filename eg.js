const {createPayment} = require("./payment");

async function generateURL () {
    console.log(await createPayment("osagiepromise79@gmail.com", 100, Date.now().toString(), "token"));
}
generateURL();