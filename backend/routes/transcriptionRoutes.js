const express = require("express");
const multer = require("multer");

const { transcribe } = require("../controllers/transcriptionController");

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage,
});

router.post("/", upload.single("audio"), transcribe);

module.exports = router;