`examples/quickstart.js`

// This example connects to the Collaborative Knowledge Board API, joins a board's real-time event stream, and moves a card using its current version.

**Dependencies**

```bash
npm install socket.io-client
```

// **Environment variables**

```bash
API_TOKEN="your_jwt_token"
BOARD_ID="b_9"
CARD_ID="c_101"
COLUMN_ID="col_3"
POSITION=0
VERSION=4
```

**Code**

```javascript
import { io } from "socket.io-client";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const API_BASE_URL = "https://api.example.com/v2";
const SOCKET_URL = "wss://api.example.com";

const {
  API_TOKEN,
  BOARD_ID,
  CARD_ID,
  COLUMN_ID,
  POSITION,
  VERSION
} = process.env;

function validateConfiguration() {
  const required = {
    API_TOKEN,
    BOARD_ID,
    CARD_ID,
    COLUMN_ID,
    POSITION,
    VERSION
  };

  for (const [key, value] of Object.entries(required)) {
    if (value === undefined || value === "") {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  if (!Number.isInteger(Number(POSITION)) || Number(POSITION) < 0) {
    throw new Error("POSITION must be a non-negative integer.");
  }

  if (!Number.isInteger(Number(VERSION)) || Number(VERSION) < 0) {
    throw new Error("VERSION must be a non-negative integer.");
  }
}

async function moveCard() {
  const response = await fetch(
    `${API_BASE_URL}/cards/${CARD_ID}/move`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        columnId: COLUMN_ID,
        position: Number(POSITION),
        version: Number(VERSION)
      })
    }
  );

  const result = await response.json();

  if (response.status === 409 &&
      result.error?.code === "VERSION_CONFLICT") {
    throw new Error(
      "Version conflict. Retrieve the latest card version before retrying."
    );
  }

  if (!response.ok) {
    throw new Error(
      `Card move failed (${response.status}): ${
        result.error?.message || JSON.stringify(result)
      }`
    );
  }

  console.log("\nCard moved successfully.");
  console.log(JSON.stringify(result, null, 2));
}

async function main() {
  validateConfiguration();

  const socket = io(SOCKET_URL, {
    auth: {
      token: API_TOKEN
    }
  });

  const rl = readline.createInterface({ input, output });

  try {
    // Register event listeners once.
    socket.on("card.created", (event) => {
      console.log("\nCard created:", event);
    });

    socket.on("card.moved", (event) => {
      console.log("\nReal-time card movement received:", event);
    });

    socket.on("comment.added", (event) => {
      console.log("\nNew comment received:", event);
    });

    socket.on("disconnect", (reason) => {
      console.log("\nReal-time connection disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("\nConnection error:", error.message);
    });

    // Wait for the initial Socket.IO connection.
    await new Promise((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("connect_error", reject);
    });

    console.log("Connected to the real-time server.");

    // Join the selected board.
    socket.emit("board.join", {
      boardId: BOARD_ID
    });

    console.log(`Requested subscription to board ${BOARD_ID}.`);

    console.log(
      "\nThe API notes do not define a board.join acknowledgement. " +
      "Confirm subscription readiness with the API team before relying " +
      "on event delivery."
    );

    // Give the user control over when the REST request is sent.
    await rl.question(
      "\nPress ENTER to move the card and listen for the real-time event..."
    );

    await moveCard();

    // Keep the connection open to receive events.
    console.log("\nListening for board events. Press Ctrl+C to exit.");

    await new Promise(() => {});
  } finally {
    rl.close();
    socket.disconnect();
  }
}

main().catch((error) => {
  console.error("\nError:", error.message);
  process.exitCode = 1;
});
```

// ### Run the example

// Save the file as `examples/quickstart.js`, configure the environment variables, and execute:

```bash
node examples/quickstart.js
```

// **Expected workflow:**

// 1. The client connects to the real-time server using the JWT.
// 2. The client emits `board.join` with the selected board ID.
// 3. You press Enter to submit the card move.
// 4. The API processes the move using the supplied card version.
// 5. If successful, the updated card is displayed.
// 6. The client listens for `card.moved` and other board events.

// **Implementation note:** The engineering notes do not define a `board.join` acknowledgement or event-delivery guarantee. The example therefore demonstrates the documented connection and subscription request, but successful subscription before the REST operation must be verified against the server implementation.
