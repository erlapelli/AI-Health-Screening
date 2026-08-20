const { generateSpeech } = require("../services/speechService");

async function speak(req, res) {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        error: "Text is required",
      });
    }

    const audioBuffer = await generateSpeech(text);

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length,
    });

    res.send(audioBuffer);
  } catch (error) {
    console.error("TTS error:", error);

    res.status(500).json({
      error: "Failed to generate speech",
    });
  }
}

module.exports = {
  speak,
};