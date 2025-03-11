const express = require("express");
const jwt = require("jsonwebtoken");

const Admin = require("../models/admin");
const Promo = require("../models/youtube_promo");
const Youtube = require("../models/youtube");

const cloudinary = require('cloudinary');
const upload = require('../utils/multer');

const router = express.Router();

//Endpoint to add youtube clip
//doc_type: user, rider, promo
router.post("/upload_clip", async (req, res) => {
  const { token, clip_url, doc_type } = req.body;
  if (!token || !clip_url || !doc_type) 
    return res
      .status(404)
      .send({ status: "error", msg: "All fields must be entered" });

  try {
    let admin = jwt.verify(token, process.env.JWT_SECRET);

    admin = await Admin.findOne({ _id: admin._id })
      .select(["-password"])
      .lean();

    if (admin.status != true) {
      return res.status(400).send({
        status: "error",
        msg: "Account has been blocked, please contact master admin",
      });
    }

    let promo = await Promo.findOne({ posted_by: "Admin", doc_type });

    // let result;

    //runs when its not the first time a clip is being uploaded
    if (promo) {
      // await cloudinary.uploader.destroy(promo.thumbnail_id);

      // result = await cloudinary.uploader.upload(req.file.path, {
      //   folder: "Youtube_Promo",
      // });
      
      // console.log(result);

      promo.clip_url = clip_url;
      promo.doc_type = doc_type;
      // promo.thumbnail_id = result.public_id;
      // promo.thumbnail_url = result.secure_url;

      await promo.save();

      return res
        .status(200)
        .send({ status: "ok", msg: "Successfully uploaded clip", promo });
    }

    // //runs when its the first time a clip is being uploaded
    // result = await cloudinary.uploader.upload(req.file.path, {
    //   folder: "Youtube_Promo",
    // });
  

    const nPromo = new Promo;

    nPromo.clip_url = clip_url;
    nPromo.doc_type = doc_type;
    // nPromo.thumbnail_id = result.public_id;
    // nPromo.thumbnail_url = result.secure_url;

    await nPromo.save();

    return res
      .status(200)
      .send({ status: "ok", msg: "Successfully uploaded clip", nPromo });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .send({ status: "error", msg: "Some error occurred", error });
  }
});

//Endpoint to view youtube promo clip
router.post("/view_clip", async (req, res) => {
  const { doc_type } = req.body;
  if (!doc_type) 
    return res
      .status(404)
      .send({ status: "error", msg: "All fields must be entered" });
  try {
    let promo = await Promo.findOne({ posted_by: "Admin", doc_type }).lean();

    if (!promo) {
      return res
        .status(404)
        .send({ status: "error", msg: "No promo clip found" });
    }

    return res.status(200).send({ status: "ok", msg: "Success", promo });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .send({ status: "error", msg: "Some error occurred", error });
  }
});

/**
 * endpoint to upload youtube video
 * @param {string} place the location of the video in the website eg: place 1, place 2, place 3, place 4 etc.
 * @param {string} doc_type either user, rider or gen
 */
router.post("/upload_youtube_video", upload.single("image"), async (req, res) => {
  const { place, video_url, doc_type } = req.body;
  if (!place || !video_url || !doc_type) 
    return res
      .status(404)
      .send({ status: "error", msg: "All fields must be entered" });
  try {
    let doc = await Youtube.findOne({ doc_type: doc_type, place: place });

    // update document conditionally
    if(!doc) {
      if(req.file === undefined)
      return res
        .status(404)
        .send({ status: "error", msg: "thumbnail required for first upload" });

      // upload image to cloudinary
      const {secure_url, public_id} = await cloudinary.uploader.upload(req.file.path, {folder: 'thumbnails'});

      // create mongodb document
      doc = new Youtube();
      doc.doc_type = doc_type;
      doc.video_url = video_url;
      doc.thumbnail_url = secure_url;
      doc.thumbnail_id = public_id;
      doc.place = place;

      await doc.save();
    } else {
      let img_url, img_id;
      if(req.file) {
        // delete old image from cloudinary
        await cloudinary.uploader.destroy(doc.thumbnail_id);
        // upload image to cloudinary
        const {secure_url, public_id} = await cloudinary.uploader.upload(req.file.path, {folder: 'thumbnails'});
        img_url = secure_url;
        img_id = public_id;
      }

      doc.video_url = video_url;
      doc.thumbnail_id = img_id || doc.thumbnail_id;
      doc.thumbnail_url = img_url || doc.thumbnail_url;

      await doc.save();
    }

    return res.status(200).send({ status: "ok", msg: "Success", doc });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .send({ status: "error", msg: "Some error occurred", error });
  }
});

// endpoint to return all uploaded videos
router.post("/view_youtube_videos", async (req, res) => {
  try {
    let doc = await Youtube.find({}).lean();

    // check if document exists
    if(!doc)
     return res.status(200).send({status: 'ok', msg: 'no video exists'})

    return res.status(200).send({ status: "ok", msg: "Success", doc });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .send({ status: "error", msg: "Some error occurred", error });
  }
});

module.exports = router;