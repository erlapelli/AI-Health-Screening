const crypto = require("crypto");

const conversations = require("../data/conversations");
const { generateScreeningReport } = require("../services/reportService");

function startCall(req, res) {
  const callId = crypto.randomUUID();

  conversations.set(callId, {
    messages: [],

    screeningData: {
      name: null,
      mainConcern: null,
      duration: null,
      severity: null,
      symptoms: [],
      followUpItems: [],
    },
  });

  console.log("New call created:", callId);

  res.json({
    callId,
  });
}

async function endCall(req, res) {
  console.log("END CALL ROUTE HIT");

  try {
    const { callId } = req.params;

    console.log("Ending callId:", callId);

    const conversation = conversations.get(callId);

    if (!conversation) {
      return res.status(404).json({
        error: "Call not found",
      });
    }

    const { screeningData } = conversation;

    if (!screeningData) {
      return res.status(400).json({
        error: "Screening data not available",
      });
    }

    console.log(
      "Screening data at end call:",
      screeningData
    );

    const report = await generateScreeningReport(
      screeningData
    );

    conversation.report = report;
    conversation.status = "completed";

    res.json({
      callId,
      report,
    });

  } catch (error) {
    console.error("End call error:", error);

    res.status(500).json({
      error: "Failed to generate screening report",
    });
  }
}

module.exports = {
  startCall,
  endCall,
};