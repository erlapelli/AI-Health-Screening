import { useRef, useState } from "react";
import "./App.css";
const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = API_URL.replace(/^http/, "ws");

function App() {
  const [screen, setScreen] = useState("welcome");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [socket, setSocket] = useState(null);

  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [callId, setCallId] = useState(null);
  const [report, setReport] = useState(null);

  const [error, setError] = useState("");

  const mediaRecorderRef = useRef(null);

  // Audio chunks sent from browser to backend
  const audioChunksRef = useRef([]);

  // Audio chunks received from AI through WebSocket
  const incomingAudioChunksRef = useRef([]);

  // ==========================================
  // START RECORDING
  // ==========================================

  const startRecording = async () => {
    try {
      setError("");
      setTranscript("");
      setAiResponse("");

      if (
        !socket ||
        socket.readyState !== WebSocket.OPEN
      ) {
        setError(
          "Realtime connection is not ready."
        );
        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      const mediaRecorder =
        new MediaRecorder(stream);

      mediaRecorderRef.current =
        mediaRecorder;

      audioChunksRef.current = [];

      // --------------------------------
      // SEND AUDIO CHUNKS THROUGH WEBSOCKET
      // --------------------------------

      mediaRecorder.ondataavailable = (
        event
      ) => {
        if (
          event.data.size > 0 &&
          socket.readyState === WebSocket.OPEN
        ) {
          socket.send(event.data);
        }
      };

      // --------------------------------
      // RECORDING STOPPED
      // --------------------------------

      mediaRecorder.onstop = () => {
        stream
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        if (
          socket.readyState === WebSocket.OPEN
        ) {
          socket.send(
            JSON.stringify({
              type: "audio_end",
            })
          );
        }

        console.log(
          "Audio turn sent to backend"
        );

        setIsRecording(false);
        setIsProcessing(true);
      };

      // Send audio chunks every 250ms
      mediaRecorder.start(250);

      setIsRecording(true);

      console.log(
        "Recording started"
      );

    } catch (error) {
      console.error(
        "Microphone error:",
        error
      );

      setError(
        "Could not access microphone."
      );
    }
  };


  // ==========================================
  // DONE SPEAKING
  // ==========================================

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !==
        "inactive"
    ) {
      mediaRecorderRef.current.stop();

      mediaRecorderRef.current = null;

      console.log(
        "User finished speaking"
      );
    }
  };


  // ==========================================
  // CONNECT WEBSOCKET
  // ==========================================

  const connectWebSocket = (callId) => {
    const ws = new WebSocket(
      `${WS_URL}/ws?callId=${callId}`
    );

    // --------------------------------
    // CONNECTION OPEN
    // --------------------------------

    ws.onopen = () => {
      console.log(
        "WebSocket connected"
      );

      setSocket(ws);
    };


    // --------------------------------
    // RECEIVE MESSAGE
    // --------------------------------

    ws.onmessage = async (event) => {

      // ==================================
      // BINARY AUDIO FROM AI
      // ==================================

      if (
        event.data instanceof Blob
      ) {
        console.log(
          "AI audio chunk received:",
          event.data.size,
          "bytes"
        );

        incomingAudioChunksRef.current.push(
          event.data
        );

        return;
      }


      // ==================================
      // JSON MESSAGE
      // ==================================

      try {
        const data = JSON.parse(
          event.data
        );

        console.log(
          "WebSocket message:",
          data
        );


        // --------------------------------
        // CONNECTION CONFIRMED
        // --------------------------------

        if (
          data.type === "connected"
        ) {
          console.log(
            "Realtime connection established"
          );
        }


        // --------------------------------
        // USER TRANSCRIPT
        // --------------------------------

        if (
          data.type === "transcript"
        ) {
          setTranscript(
            data.text
          );
        }


        // --------------------------------
        // AI TEXT RESPONSE
        // --------------------------------

        if (
          data.type === "assistant_text"
        ) {
          setAiResponse(
            data.text
          );

          setIsProcessing(true);
        }


        // --------------------------------
        // AI AUDIO START
        // --------------------------------

        if (
          data.type === "audio_start"
        ) {
          console.log(
            "AI audio started"
          );

          incomingAudioChunksRef.current =
            [];
        }


        // --------------------------------
        // AI AUDIO END
        // --------------------------------

        if (
          data.type === "audio_end"
        ) {
          console.log(
            "AI audio finished"
          );

          const audioBlob =
            new Blob(
              incomingAudioChunksRef.current,
              {
                type: "audio/mpeg",
              }
            );

          console.log(
            "Final AI audio:",
            audioBlob.size,
            "bytes"
          );

          incomingAudioChunksRef.current =
            [];

          const audioUrl =
            URL.createObjectURL(
              audioBlob
            );

          const audio =
            new Audio(audioUrl);

          audio.onended = () => {
            URL.revokeObjectURL(
              audioUrl
            );

            setIsProcessing(false);

            console.log(
              "AI finished speaking"
            );
          };

          try {
            await audio.play();

            console.log(
              "AI audio playback started"
            );

          } catch (error) {
            console.error(
              "Audio playback error:",
              error
            );

            setIsProcessing(false);

            setError(
              "Could not play AI audio."
            );
          }
        }


        // --------------------------------
        // WEBSOCKET ERROR MESSAGE
        // --------------------------------

        if (
          data.type === "error"
        ) {
          setIsProcessing(false);

          setError(
            data.message
          );
        }

      } catch (error) {
        console.error(
          "WebSocket message error:",
          error
        );
      }
    };


    // --------------------------------
    // WEBSOCKET ERROR
    // --------------------------------

    ws.onerror = (error) => {
      console.error(
        "WebSocket error:",
        error
      );

      setError(
        "Realtime connection failed."
      );

      setIsProcessing(false);
    };


    // --------------------------------
    // WEBSOCKET CLOSED
    // --------------------------------

    ws.onclose = () => {
      console.log(
        "WebSocket disconnected"
      );

      setSocket(null);
    };

    return ws;
  };


  // ==========================================
  // START CALL
  // ==========================================

  const startCall = async () => {
    try {
      setError("");
      setTranscript("");
      setAiResponse("");
      setReport(null);

      const response =
        await fetch(
          `${API_URL}/api/call/start`,
          {
            method: "POST",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to start call"
        );
      }

      setCallId(
        data.callId
      );

      connectWebSocket(
        data.callId
      );

      setScreen("active");

      console.log(
        "Call started:",
        data.callId
      );

    } catch (error) {
      console.error(
        "Start call error:",
        error
      );

      setError(
        error.message
      );
    }
  };


  // ==========================================
  // END CALL
  // ==========================================

  const endCall = async () => {
    try {

      if (!callId) {
        setError(
          "No active call."
        );
        return;
      }

      if (isRecording) {
        setError(
          "Please finish speaking before ending the call."
        );
        return;
      }

      if (isProcessing) {
        setError(
          "Please wait for the AI to finish speaking."
        );
        return;
      }

      setError("");

      // Close WebSocket
      if (
        socket &&
        socket.readyState ===
          WebSocket.OPEN
      ) {
        socket.close();
      }

      const response =
        await fetch(
          `${API_URL}/api/call/${callId}/end`,
          {
            method: "POST",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to end call"
        );
      }

      setReport(
        data.report
      );

      setScreen("report");

      setSocket(null);

      console.log(
        "Final report:",
        data.report
      );

    } catch (error) {
      console.error(
        "End call error:",
        error
      );

      setError(
        error.message
      );
    }
  };


  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="app">

      <div className="container">

        {/* =========================
            WELCOME SCREEN
        ========================== */}

        {screen === "welcome" && (
          <div className="welcome-card">

            <div className="medical-icon">
              🩺
            </div>

            <h1>
              AI Health Screening
            </h1>

            <p className="welcome-description">
              Your voice-based health
              screening assistant
            </p>

            <button
              className="primary-button"
              onClick={startCall}
            >
              Start Call
            </button>

          </div>
        )}


        {/* =========================
            ACTIVE CALL SCREEN
        ========================== */}

        {screen === "active" && (
          <div className="active-card">

            <div className="header">

              <div className="small-icon">
                🩺
              </div>

              <h1>
                AI Health Screening
              </h1>

            </div>


            {/* STATUS */}

            <div className="status-section">

              <div className="status-icon">

                {isRecording
                  ? "🎤"
                  : isProcessing
                  ? "🔊"
                  : "💬"}

              </div>

              <h2>

                {isRecording
                  ? "Listening..."
                  : isProcessing
                  ? "AI is speaking..."
                  : "Ready"}

              </h2>

            </div>


            {/* USER TRANSCRIPT */}

            {transcript && (
              <div className="conversation-card user-card">

                <span className="conversation-label">
                  You said
                </span>

                <p>
                  {transcript}
                </p>

              </div>
            )}


            {/* AI RESPONSE */}

            {aiResponse && (
              <div className="conversation-card ai-card">

                <span className="conversation-label">
                  AI Assistant
                </span>

                <p>
                  {aiResponse}
                </p>

              </div>
            )}


            {/* CONTROLS */}

            <div className="controls">

              {/* SPEAK / DONE SPEAKING */}

              <button
                className={
                  isRecording
                    ? "speaking-button"
                    : "primary-button"
                }
                onClick={
                  isRecording
                    ? stopRecording
                    : startRecording
                }
                disabled={
                  isProcessing
                }
              >
                {isRecording
                  ? "✓ Done Speaking"
                  : "🎤 Speak"}
              </button>


              {/* END CALL */}

              <button
                className="end-call-button"
                onClick={
                  endCall
                }
                disabled={
                  isRecording ||
                  isProcessing
                }
              >
                🔴 End Call
              </button>

            </div>

          </div>
        )}


        {/* =========================
            REPORT SCREEN
        ========================== */}

        {screen === "report" &&
          report && (

            <div className="report-card">

              <div className="report-header">

                <div className="report-icon">
                  📋
                </div>

                <h1>
                  Health Screening Report
                </h1>

                <p>
                  Summary of your
                  screening conversation
                </p>

              </div>


              {/* SUMMARY */}

              <div className="report-section">

                <h3>
                  Summary
                </h3>

                <p>
                  {report.summary}
                </p>

              </div>


              {/* MAIN CONCERN */}

              <div className="report-section">

                <h3>
                  Main Concern
                </h3>

                <p>
                  {report.mainConcern}
                </p>

              </div>


              {/* KEY SYMPTOMS */}

              <div className="report-section">

                <h3>
                  Key Symptoms
                </h3>

                {report.keySymptoms.length >
                0 ? (
                  <ul>

                    {report.keySymptoms.map(
                      (
                        symptom,
                        index
                      ) => (
                        <li
                          key={index}
                        >
                          {symptom}
                        </li>
                      )
                    )}

                  </ul>
                ) : (
                  <p>
                    Not provided
                  </p>
                )}

              </div>


              {/* DURATION */}

              <div className="report-section">

                <h3>
                  Duration
                </h3>

                <p>
                  {report.duration}
                </p>

              </div>


              {/* SEVERITY */}

              <div className="report-section">

                <h3>
                  Severity
                </h3>

                <p>
                  {report.severity}
                </p>

              </div>


              {/* FOLLOW-UP */}

              <div className="report-section">

                <h3>
                  Follow-up Items
                </h3>

                {report.followUpItems.length >
                0 ? (
                  <ul>

                    {report.followUpItems.map(
                      (
                        item,
                        index
                      ) => (
                        <li
                          key={index}
                        >
                          {item}
                        </li>
                      )
                    )}

                  </ul>
                ) : (
                  <p>
                    Not provided
                  </p>
                )}

              </div>


              {/* NEW SCREENING */}

              <button
                className="primary-button new-screening-button"
                onClick={() => {

                  setCallId(null);
                  setReport(null);
                  setTranscript("");
                  setAiResponse("");
                  setSocket(null);
                  setError("");
                  setIsRecording(false);
                  setIsProcessing(false);

                  incomingAudioChunksRef.current =
                    [];

                  setScreen(
                    "welcome"
                  );

                }}
              >
                Start New Screening
              </button>

            </div>
          )}


        {/* =========================
            ERROR
        ========================== */}

        {error && (
          <div className="error-message">
            Error: {error}
          </div>
        )}

      </div>

    </div>
  );
}

export default App;