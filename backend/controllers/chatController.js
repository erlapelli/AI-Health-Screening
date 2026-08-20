const conversations = require("../data/conversations");
const { extractScreeningData } = require("../services/screeningService");
const openai = require("../config/openai");

async function chat(req, res) {
  try {
    const { callId, message } = req.body;

    if (!callId) {
      return res.status(400).json({
        error: "Call ID is required",
      });
    }

    if (!message) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    const conversation = conversations.get(callId);

    if (!conversation) {
      return res.status(404).json({
        error: "Call not found",
      });
    }

    const history = conversation.messages;

    history.push({
      role: "user",
      content: message,
    });

    const updatedScreeningData = await extractScreeningData(
      message,
      conversation.screeningData
    );

    conversation.screeningData = updatedScreeningData;

    const response = await openai.responses.create({
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
      `,

      input: history,
    });

    const reply = response.output_text;

    history.push({
      role: "assistant",
      content: reply,
    });

    res.json({
      reply,
      screeningData: conversation.screeningData,
    });

  } catch (error) {
    console.error("LLM error:", error);

    res.status(500).json({
      error: "Failed to generate AI response",
    });
  }
}

module.exports = {
  chat,
};