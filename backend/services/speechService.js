const openai = require("../config/openai");

async function generateSpeech(text) {
  const audioResponse = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text,
    response_format: "mp3",
  });

  return Buffer.from(await audioResponse.arrayBuffer());
}

module.exports = {
  generateSpeech,
};