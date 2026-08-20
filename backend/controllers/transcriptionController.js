const { transcribeAudio } = require("../services/transcriptionService");

async function transcribe(req, res) {
  try {
    console.log("Uploaded file:", req.file);

    if (!req.file) {
      return res.status(400).json({
        error: "Audio file is required",
      });
    }

    const text = await transcribeAudio(req.file.path);

    res.json({
      text,
    });
  } catch (error) {
    console.error("Transcription error:", error);

    res.status(500).json({
      error: "Failed to transcribe audio",
    });
  }
}

module.exports = {
  transcribe,
};

