const hasOneHourElapsed = (timestamp) => {
    const currentTime = Date.now(); // Current time in milliseconds
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    return currentTime - timestamp > oneHour;
};

// // Usage example
// const timestamp = Date.now() - 3600 * 1000; // 1 hour ago
// console.log(hasOneHourElapsed(timestamp)); // Output: true or false

module.exports = {hasOneHourElapsed};