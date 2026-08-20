const express = require("express");

const {
  startCall,
  endCall,
} = require("../controllers/callController");

const router = express.Router();

router.post("/start", startCall);

router.post("/:callId/end", endCall);

module.exports = router;