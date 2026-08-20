import { useRef, useState } from "react";
import "./App.css";

function App() {
  const [screen, setScreen] = useState("welcome");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [callId, setCallId] = useState(null);
  const [report, setReport] = useState(null);

  const [error, setError] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      setError("");
      setTranscript("");
      setAiResponse("");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        stream.getTracks().forEach((track) => track.stop());

        await processAudio(audioBlob);
      };

      mediaRecorder.start();

      setIsRecording(true);
    } catch (error) {
      console.error("Microphone error:", error);
      setError("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob) => {
    try {
      setIsProcessing(true);
      setError("");

      // --------------------------------
      // STEP 1: Speech → Text
      // --------------------------------

      const formData = new FormData();

      formData.append("audio", audioBlob, "recording.webm");

      const transcriptionResponse = await fetch(
        "http://localhost:5000/api/transcribe",
        {
          method: "POST",
          body: formData,
        }
      );

      const transcriptionData = await transcriptionResponse.json();

      if (!transcriptionResponse.ok) {
        throw new Error(
          transcriptionData.error || "Transcription failed"
        );
      }

      const userText = transcriptionData.text;

      setTranscript(userText);

      // --------------------------------
      // STEP 2: Text → LLM
      // --------------------------------

      const chatResponse = await fetch(
        "http://localhost:5000/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            callId: callId,
            message: userText,
          }),
        }
      );

      const chatData = await chatResponse.json();

      if (!chatResponse.ok) {
        throw new Error(chatData.error || "AI response failed");
      }

      const aiText = chatData.reply;

      setAiResponse(aiText);

      // --------------------------------
      // STEP 3: Text → Speech
      // --------------------------------

      const speechResponse = await fetch(
        "http://localhost:5000/api/speak",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: aiText,
          }),
        }
      );

      if (!speechResponse.ok) {
        const speechData = await speechResponse.json();

        throw new Error(
          speechData.error || "Speech generation failed"
        );
      }

      const audioData = await speechResponse.blob();

      const audioUrl = URL.createObjectURL(audioData);

      const audio = new Audio(audioUrl);

      await audio.play();

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error) {
      console.error("Processing error:", error);
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };






  const startCall = async () => {
  try {
    setError("");
    setTranscript("");
    setAiResponse("");
    setReport(null);

    const response = await fetch(
      "http://localhost:5000/api/call/start",
      {
        method: "POST",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to start call");
    }

    setCallId(data.callId);
    setScreen("active");

    console.log("Call started:", data.callId);
  } catch (error) {
    console.error("Start call error:", error);
    setError(error.message);
  }
};


const endCall = async () => {
  try {
    if (!callId) {
      setError("No active call.");
      return;
    }

    setError("");

    const response = await fetch(
      `http://localhost:5000/api/call/${callId}/end`,
      {
        method: "POST",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to end call");
    }

    setReport(data.report);
    setScreen("report");

    console.log("Final report:", data.report);

  } catch (error) {
    console.error("End call error:", error);
    setError(error.message);
  }
};

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

          <h1>AI Health Screening</h1>

          <p className="welcome-description">
            Your voice-based health screening assistant
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

            <h1>AI Health Screening</h1>
          </div>

          {/* Status */}
          <div className="status-section">

            <div className="status-icon">
              {isRecording
                ? "🎤"
                : isProcessing
                ? "🧠"
                : "🔊"}
            </div>

            <h2>
              {isRecording
                ? "Listening..."
                : isProcessing
                ? "AI is thinking..."
                : "Ready"}
            </h2>

          </div>

          {/* User transcript */}
          {transcript && (
            <div className="conversation-card user-card">
              <span className="conversation-label">
                You said
              </span>

              <p>{transcript}</p>
            </div>
          )}

          {/* AI response */}
          {aiResponse && (
            <div className="conversation-card ai-card">
              <span className="conversation-label">
                AI Assistant
              </span>

              <p>{aiResponse}</p>
            </div>
          )}

          {/* Controls */}
          <div className="controls">

            <button
              className="primary-button"
              onClick={startRecording}
              disabled={isRecording || isProcessing}
            >
              🎤 Start Recording
            </button>

            <button
              className="secondary-button"
              onClick={stopRecording}
              disabled={!isRecording}
            >
              Stop Recording
            </button>

            <button
              className="end-call-button"
              onClick={endCall}
              disabled={isRecording || isProcessing}
            >
              🔴 End Call
            </button>

          </div>

        </div>
      )}

      {/* =========================
          REPORT SCREEN
      ========================== */}
      {screen === "report" && report && (
        <div className="report-card">

          <div className="report-header">

            <div className="report-icon">
              📋
            </div>

            <h1>Health Screening Report</h1>

            <p>
              Summary of your screening conversation
            </p>

          </div>

          {/* Summary */}
          <div className="report-section">
            <h3>Summary</h3>
            <p>{report.summary}</p>
          </div>

          {/* Main Concern */}
          <div className="report-section">
            <h3>Main Concern</h3>
            <p>{report.mainConcern}</p>
          </div>

          {/* Key Symptoms */}
          <div className="report-section">
            <h3>Key Symptoms</h3>

            {report.keySymptoms.length > 0 ? (
              <ul>
                {report.keySymptoms.map((symptom, index) => (
                  <li key={index}>
                    {symptom}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Not provided</p>
            )}
          </div>

          {/* Duration */}
          <div className="report-section">
            <h3>Duration</h3>
            <p>{report.duration}</p>
          </div>

          {/* Severity */}
          <div className="report-section">
            <h3>Severity</h3>
            <p>{report.severity}</p>
          </div>

          {/* Follow-up */}
          <div className="report-section">
            <h3>Follow-up Items</h3>

            {report.followUpItems.length > 0 ? (
              <ul>
                {report.followUpItems.map((item, index) => (
                  <li key={index}>
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Not provided</p>
            )}
          </div>

          {/* New Screening */}
          <button
            className="primary-button new-screening-button"
            onClick={() => {
              setCallId(null);
              setReport(null);
              setTranscript("");
              setAiResponse("");
              setScreen("welcome");
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