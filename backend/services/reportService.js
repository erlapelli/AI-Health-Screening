const openai = require("../config/openai");

async function generateScreeningReport(screeningData) {
  const reportInput = `
Generate a health screening report from the following screening data.

Screening data:
${JSON.stringify(screeningData, null, 2)}
`;

  const response = await openai.responses.create({
    model: "gpt-5.6-luna",

    instructions: `
      You are generating a concise health screening report.

      Use ONLY the information provided in the screening data.

      Do not diagnose the user.
      Do not invent missing information.

      Return ONLY valid JSON with exactly these fields:

      {
        "summary": "",
        "mainConcern": "",
        "keySymptoms": [],
        "duration": "",
        "severity": "",
        "followUpItems": []
      }

      If information is missing, use "Not provided".
      keySymptoms and followUpItems must always be arrays.
    `,

    input: reportInput,
  });

  return JSON.parse(response.output_text);
}

module.exports = {
  generateScreeningReport,
};