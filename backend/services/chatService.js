const openai = require("../config/openai");
const conversations = require("../data/conversations");

const {
  extractScreeningData,
} = require("./screeningService");

async function processChatMessage(callId, message) {
  const conversation = conversations.get(callId);

  if (!conversation) {
    throw new Error("Call not found");
  }

  // --------------------------------
  // 1. UPDATE SCREENING DATA
  // --------------------------------

  const updatedScreeningData =
    await extractScreeningData(
      message,
      conversation.screeningData
    );

  conversation.screeningData =
    updatedScreeningData;

  console.log(
    "Updated screening data:",
    conversation.screeningData
  );

  // --------------------------------
  // 2. UPDATE CONVERSATION HISTORY
  // --------------------------------

  const history = conversation.messages;

  history.push({
    role: "user",
    content: message,
  });

  // --------------------------------
  // 3. GENERATE AI RESPONSE
  // --------------------------------

  const response =
    await openai.responses.create({
      model: "gpt-5.6-luna",

      instructions: `
        You are a friendly health screening assistant.

        Your job is to conduct a basic health screening conversation.

        Rules:
        - Ask one question at a time.
        - Keep responses short and conversational.
        - Remember information the user has already provided.
        - Do not repeat questions that have already been answered.
        - Ask relevant follow-up questions.
        - Do not provide a medical diagnosis.
        - If the user describes an emergency or severe symptoms,
          recommend seeking appropriate medical care.

        Current screening data:
        ${JSON.stringify(
          conversation.screeningData,
          null,
          2
        )}

        Use the current screening data to understand
        what information has already been collected.
      `,

      input: history,
    });

  const reply =
    response.output_text;

  // --------------------------------
  // 4. SAVE AI RESPONSE
  // --------------------------------

  history.push({
    role: "assistant",
    content: reply,
  });

  return reply;
}

module.exports = {
  processChatMessage,
};