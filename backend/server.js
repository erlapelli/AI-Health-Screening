require("dotenv").config();

const http = require("http");

const app = require("./app");
const setupCallSocket = require("./websocket/callSocket");

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

setupCallSocket(server);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});