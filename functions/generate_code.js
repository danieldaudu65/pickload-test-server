function generateCode(fullName) {
    // Split the full name into an array of words
    const words = fullName.split(" ");

    // Initialize an empty string to store the initials
    let initials = "";
    const randomNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    if (words.length === 1) {
        initials += words[0].charAt(0).toUpperCase();
        for (let i = 0; i < 7; i++) {
            initials += randomNumbers[Math.floor(Math.random() * 10)];
        }
        return initials
    } else {

        // Iterate over the first two words in the array
        for (let i = 0; i < Math.min(words.length, 2); i++) {
            const word = words[i];
            // Extract the first character of each word and append it to the initials string
            initials += word.charAt(0).toUpperCase();
        }

        for (let i = 0; i < 6; i++) {
            initials += randomNumbers[Math.floor(Math.random() * 10)];
        }
        // Return the initials
        return initials;
    }
}

module.exports = generateCode;