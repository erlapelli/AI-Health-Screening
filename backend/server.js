require("dotenv").config();

const http = require("http");

const app = require("./app");
const setupCallSocket = require("./websocket/callSocket");

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

setupCallSocket(server);

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});