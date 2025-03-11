const multer = require('multer');
const path = require('path');

module.exports = multer({
    storage: multer.diskStorage({}),
    fileFilter: (req, file, cb) => {
        let ext = path.extname(file.originalname).toLocaleLowerCase();
        if(ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png" && ext !== ".gif"){
            cb(new Error(`File type (${ext}) is not supported`), false);
            return;
        }
        cb(null, true);
    }
});