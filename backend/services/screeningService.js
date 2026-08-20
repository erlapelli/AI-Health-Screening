const openai = require("../config/openai");

async function extractScreeningData(message, currentData) {
  const response = await openai.responses.create({
    model: "gpt-5.6-luna",

    instructions: `
      You extract structured health-screening information from a user's message.

      Return ONLY valid JSON.

      Use exactly these fields:
      {
        "name": null,
        "mainConcern": null,
        "duration": null,
        "severity": null,
        "symptoms": [],
        "followUpItems": []
      }

      Rules:
      - Extract only information explicitly provided by the user.
      - Never guess or invent information.
      - If the current data already contains a value, preserve it unless
        the user clearly provides a newer/corrected value.
      - "symptoms" must be an array.
      - "followUpItems" must be an array.
      - Keep unknown values as null.
    `,

    input: `
Current screening data:
${JSON.stringify(currentData)}

New user message:
${message}
    `,
  });

  return JSON.parse(response.output_text);
}

module.exports = {
  extractScreeningData,
};