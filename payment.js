const dotenv = require("dotenv");
const paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);

dotenv.config();

// function to create an order payment
const createPayment = async (email, amount, ref) => {
  try {
    const paymentData = {
      email,
      amount: amount * 100,
      currency: 'NGN',
      ref: ref,
      // callback: (response) => {
      //   //this happens after the payment is completed successfully
      //   console.log(response);
      //   const reference = response.reference;
      //   // console.log('Payment complete! Reference: ' + reference);
      //   // make a reques to the endpoint to update the payment document
      //   async function postJSON(data) {
      //     try {
      //       // Data to be sent
      //       const requestData = {
      //         ref, token
      //       };

      //       // Convert the data to URL parameters
      //       const queryParams = new URLSearchParams(requestData).toString();

      //       // URL with query parameters
      //       const url = `https://server-superMart.onrender.com/user_payment/confirm_payment?${queryParams}`;
      //       const response = await fetch(url);
      //       // const response = await fetch("https://server-superMart.onrender.com/user_payment/confirm_payment", {
      //       //   method: "GET",
      //       //   headers: {
      //       //     "Content-Type": "application/json",
      //       //   },
      //       //   body: JSON.stringify(data),
      //       // });

      //       const result = await response.json();
      //       // console.log("Success:", result);
      //     } catch (error) {
      //       console.error("Error:", error);
      //     }
      //   }

      //   postJSON({ ref, token });
      // },
    };

    const response = await paystack.transaction.initialize(paymentData);
    // console.log(response);
    return response
  } catch (error) {
    console.error(error);
    return { msg: "some error occurred", error }
  }
};

module.exports = { createPayment };