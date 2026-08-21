const WebSocket = require("ws");
const { URL } = require("url");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  processChatMessage,
} = require("../services/chatService");

const {
  generateSpeech,
} = require("../services/speechService");

const {
  transcribeAudio,
} = require("../services/transcriptionService");


function setupCallSocket(server) {
  const wss = new WebSocket.Server({
    server,
    path: "/ws",
  });


  wss.on("connection", (ws, request) => {

    // --------------------------------
    // GET CALL ID
    // --------------------------------

    const requestUrl = new URL(
      request.url,
      `http://${request.headers.host}`
    );

    const callId =
      requestUrl.searchParams.get("callId");


    console.log(
      "WebSocket client connected"
    );

    console.log(
      "WebSocket callId:",
      callId
    );


    // --------------------------------
    // VALIDATE CALL ID
    // --------------------------------

    if (!callId) {

      console.error(
        "No callId provided"
      );

      ws.close(
        1008,
        "Call ID is required"
      );

      return;
    }


    // --------------------------------
    // STORE CONNECTION DATA
    // --------------------------------

    ws.callId = callId;

    ws.audioChunks = [];


    // --------------------------------
    // CONFIRM CONNECTION
    // --------------------------------

    ws.send(
      JSON.stringify({
        type: "connected",
        message:
          "Realtime connection established",
        callId,
      })
    );


    // --------------------------------
    // HANDLE WEBSOCKET MESSAGES
    // --------------------------------

    ws.on(
      "message",
      async (message, isBinary) => {

        // =================================
        // AUDIO CHUNK
        // =================================

        if (isBinary) {

          ws.audioChunks.push(
            Buffer.from(message)
          );

          console.log(
            "Audio chunk received:",
            message.length,
            "bytes"
          );

          return;
        }


        // =================================
        // CONTROL MESSAGE
        // =================================

        try {

          const data = JSON.parse(
            message.toString()
          );


          console.log(
            "WebSocket event:",
            data
          );


          // =================================
          // USER FINISHED SPEAKING
          // =================================

          if (
            data.type === "audio_end"
          ) {

            console.log(
              "User finished speaking"
            );


            console.log(
              "Total audio chunks:",
              ws.audioChunks.length
            );


            const totalBytes =
              ws.audioChunks.reduce(
                (total, chunk) =>
                  total + chunk.length,
                0
              );


            console.log(
              "Total turn audio:",
              totalBytes,
              "bytes"
            );


            // --------------------------------
            // NO AUDIO CHECK
            // --------------------------------

            if (
              ws.audioChunks.length === 0
            ) {

              ws.send(
                JSON.stringify({
                  type: "error",
                  message:
                    "No audio received",
                })
              );

              return;
            }


            try {

              // =================================
              // AUDIO → TRANSCRIPTION
              // =================================

              console.log(
                "Starting transcription..."
              );


              const userAudioBuffer =
                Buffer.concat(
                  ws.audioChunks
                );


              // --------------------------------
              // TEMPORARY PROCESSING FILE
              // --------------------------------

              const tempFilePath =
                path.join(
                  os.tmpdir(),
                  `health-screening-${Date.now()}.webm`
                );


              fs.writeFileSync(
                tempFilePath,
                userAudioBuffer
              );


              console.log(
                "Temporary audio created:",
                tempFilePath
              );


              // =================================
              // SPEECH → TEXT
              // =================================

              const transcript =
                await transcribeAudio(
                  tempFilePath
                );


              console.log(
                "Transcription:",
                transcript
              );


              // --------------------------------
              // SEND TRANSCRIPT TO FRONTEND
              // --------------------------------

              ws.send(
                JSON.stringify({
                  type: "transcript",
                  text: transcript,
                })
              );


              // =================================
              // TRANSCRIPT → AI
              // =================================

              console.log(
                "Sending transcript to AI..."
              );


              const aiResponse =
                await processChatMessage(
                  ws.callId,
                  transcript
                );


              console.log(
                "AI response:",
                aiResponse
              );


              // --------------------------------
              // SEND AI TEXT TO FRONTEND
              // --------------------------------

              ws.send(
                JSON.stringify({
                  type: "assistant_text",
                  text: aiResponse,
                })
              );


              // =================================
              // AI TEXT → SPEECH
              // =================================

              console.log(
                "Generating AI speech..."
              );


              const speechAudioBuffer =
                await generateSpeech(
                  aiResponse
                );


              console.log(
                "Generated audio:",
                speechAudioBuffer.length,
                "bytes"
              );


              // --------------------------------
              // AUDIO START
              // --------------------------------

              ws.send(
                JSON.stringify({
                  type: "audio_start",
                })
              );


              // --------------------------------
              // SEND BINARY AUDIO
              // --------------------------------

              ws.send(
                speechAudioBuffer
              );


              // --------------------------------
              // AUDIO END
              // --------------------------------

              ws.send(
                JSON.stringify({
                  type: "audio_end",
                })
              );


              console.log(
                "AI audio sent through WebSocket"
              );


              // --------------------------------
              // CLEAR USER TURN
              // --------------------------------

              ws.audioChunks = [];


            } catch (error) {

              console.error(
                "WebSocket processing error:",
                error
              );


              ws.send(
                JSON.stringify({
                  type: "error",
                  message:
                    "Failed to process audio",
                })
              );


              // Make sure the next turn
              // starts with an empty buffer

              ws.audioChunks = [];
            }
          }


        } catch (error) {

          console.error(
            "WebSocket message error:",
            error
          );
        }
      }
    );


    // =================================
    // CONNECTION CLOSED
    // =================================

    ws.on("close", () => {

      console.log(
        "WebSocket client disconnected:",
        ws.callId
      );


      ws.audioChunks = [];
    });


    // =================================
    // CONNECTION ERROR
    // =================================

    ws.on("error", (error) => {

      console.error(
        "WebSocket error:",
        error
      );
    });

  });


  console.log(
    "WebSocket server initialized"
  );


  return wss;
}


module.exports = setupCallSocket;