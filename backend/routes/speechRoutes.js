const express = require("express");

const { speak } = require("../controllers/speechController");

const router = express.Router();

router.post("/", speak);

module.exports = router;