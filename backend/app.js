const express = require("express");
const cors = require("cors");

const transcriptionRoutes = require("./routes/transcriptionRoutes");
const speechRoutes = require("./routes/speechRoutes");
const chatRoutes = require("./routes/chatRoutes");
const callRoutes = require("./routes/callRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("AI Health Screening Backend is running!");
});

app.get("/api/health", (req, res) => {
  res.json({
    message: "Backend connected successfully!",
  });
});

app.use("/api/transcribe", transcriptionRoutes);
app.use("/api/speak", speechRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/call", callRoutes);

module.exports = app;