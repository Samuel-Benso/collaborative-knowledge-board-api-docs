// `examples/realtime-client.js`

// This example creates an authenticated Socket.IO client, joins a board, listens for supported real-time events, and rejoins the board after reconnection.

// ### Dependencies

// ```bash
// npm install socket.io-client dotenv
// ```

// ### Environment configuration

// Create a `.env` file in the project root:

// ```env
// API_TOKEN=your_jwt_token
// BOARD_ID=b_9
// SOCKET_URL=wss://api.example.com
// ```

// ### Code

import "dotenv/config";
import { io } from "socket.io-client";

const {
  API_TOKEN,
  BOARD_ID,
  SOCKET_URL = "wss://api.example.com"
} = process.env;

if (!API_TOKEN) {
  throw new Error("Missing API_TOKEN environment variable.");
}

if (!BOARD_ID) {
  throw new Error("Missing BOARD_ID environment variable.");
}

// Create an authenticated Socket.IO connection.
const socket = io(SOCKET_URL, {
  auth: {
    token: API_TOKEN
  }
});

/**
 * Join the selected board.
 *
 * This function runs after the initial connection
 * and every successful reconnection.
 */
function joinBoard() {
  console.log(`Requesting subscription to board ${BOARD_ID}`);

  socket.emit("board.join", {
    boardId: BOARD_ID
  });
}

// Connection established.
socket.on("connect", () => {
  console.log("Connected to the real-time server.");
  console.log("Socket ID:", socket.id);

  joinBoard();
});

// Card created event.
socket.on("card.created", (event) => {
  console.log("\nNew card created:");
  console.log(JSON.stringify(event, null, 2));
});

// Card moved event.
socket.on("card.moved", (event) => {
  console.log("\nCard moved:");
  console.log(JSON.stringify(event, null, 2));
});

// Comment added event.
socket.on("comment.added", (event) => {
  console.log("\nNew comment added:");
  console.log(JSON.stringify(event, null, 2));
});

// Connection lost.
socket.on("disconnect", (reason) => {
  console.log("\nDisconnected from server.");
  console.log("Reason:", reason);
});

// Connection or authentication error.
socket.on("connect_error", (error) => {
  console.error("\nConnection error:");
  console.error(error.message);
});

// Application shutdown.
function shutdown() {
  console.log("\nClosing real-time connection...");
  socket.disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ### Run the client

// From the project root:

// ```bash
// node examples/realtime-client.js
// ```

// ### Expected behaviour

// When the connection succeeds, the client:

// 1. Authenticates using the supplied JWT.
// 2. Emits `board.join` with the configured board ID.
// 3. Listens for `card.created`, `card.moved`, and `comment.added`.
// 4. Displays received event payloads.
// 5. Detects connection loss.
// 6. Requests board subscription again after reconnection.

// ### Understanding the event payload

// Every documented event contains a common envelope:

// | Field       | Description                      |
// | ----------- | -------------------------------- |
// | `boardId`   | Board associated with the event. |
// | `actorId`   | User who performed the action.   |
// | `timestamp` | Time associated with the event.  |
// | `data`      | Event-specific information.      |

// The exact structure of `data` depends on the event type.

// ### Important implementation notes

// * Socket.IO automatically attempts reconnection by default.
// * The `connect` handler runs again after a successful reconnection, allowing the client to rejoin the board.
// * Event listeners are registered outside the `connect` handler to prevent duplicate listeners after reconnection.
// * Rejoining a board does not guarantee that events missed during disconnection will be replayed.
// * Refresh board data through the REST API after reconnecting to reconcile local state.
// * The engineering notes do not define a `board.join` acknowledgement, event replay mechanism, or event ordering guarantee.
// * The documented connection address is `wss://api.example.com`. Confirm the exact Socket.IO transport configuration with engineering before deploying this example.

// **Related documentation**

// * [Real-time Events Overview](../docs/concepts/realtime-events-overview.md)
// * [Reconnect to Real-time Events](../docs/how-to/reconnect-to-realtime.md)
// * [Quickstart](quickstart.js)
// * [Authentication](../docs/getting-started/authentication.md)
