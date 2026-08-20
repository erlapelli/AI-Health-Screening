const fs = require("fs");
const openai = require("../config/openai");

async function transcribeAudio(filePath) {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: "gpt-4o-mini-transcribe",
  });

  return transcription.text;
}

module.exports = {
  transcribeAudio,
};