# Move a Card and Receive Real-Time Events

Build your first real-time workflow with the Collaborative Knowledge Board API in approximately 15 minutes.

In this tutorial, you'll authenticate, connect to the real-time event server, join a board, move a card to another column, and receive the corresponding event.

By the end, you'll have a working Node.js client that listens for card movement events.

## What you'll build

You'll create a client that performs the following workflow:

```text
Authenticate
    |
    v
Connect to Socket.io
    |
    v
Join a board
    |
    v
Listen for card.moved
    |
    v
Move a card using the REST API
    |
    v
Receive the card.moved event
```

The REST API handles the card update. Socket.io delivers real-time notifications about changes to the board.

## Prerequisites

Before starting, make sure you have:

* An account with access to the Collaborative Knowledge Board API.
* A valid JWT access token.
* An existing board containing at least two columns.
* An existing card that you can move.
* The board ID, card ID, and destination column ID.
* Node.js 18 or later.
* npm installed.
* Basic familiarity with JavaScript and HTTP requests.

You'll also need the card's current `version` value.

For this tutorial, we'll use the following example IDs:

| Resource           | Example ID |
| ------------------ | ---------- |
| Board              | `b_9`      |
| Card               | `c_101`    |
| Destination column | `col_2`    |

Replace these values with IDs from your own account.

## 1. Understand the API endpoints

The tutorial uses two interfaces.

**REST API**

Used to move the card:

```http
PATCH https://api.example.com/v2/cards/{cardId}/move
```

**Real-time connection**

Used to receive board events:

```text
wss://api.example.com
```

The REST API changes the card's position. The real-time connection notifies connected clients about the change.

Both use the same JWT authentication token.

## 2. Get your current card version

Before moving a card, retrieve its current representation using the card retrieval endpoint.

The card object contains a `version` field.

Example:

```json
{
  "id": "c_101",
  "title": "Write launch plan",
  "description": "Prepare the product launch plan.",
  "columnId": "col_1",
  "position": 0,
  "version": 4,
  "tags": ["launch"],
  "dueDate": "2026-11-01",
  "updatedAt": "2026-10-20T09:15:00Z"
}
```

In this example:

* The card currently belongs to `col_1`.
* Its current position is `0`.
* Its current version is `4`.

Save the version value. You'll need it when moving the card.

**Why does the version matter?**

Version checks prevent one user from accidentally overwriting another user's changes.

If another user updates the card before your request reaches the server, the version will have changed. The API will reject your outdated request with a `409 VERSION_CONFLICT` response.

Read [Conflicts and Versions](../concepts/conflicts-and-versions.md) for details.

## 3. Create your project

Create a directory for the real-time client:

```bash
mkdir kb-realtime-quickstart
cd kb-realtime-quickstart
```

Initialize a Node.js project:

```bash
npm init -y
```

Install the required dependencies:

```bash
npm install socket.io-client dotenv
```

The packages serve different purposes:

| Package            | Purpose                                                      |
| ------------------ | ------------------------------------------------------------ |
| `socket.io-client` | Establishes the real-time connection and listens for events. |
| `dotenv`           | Loads configuration values from an environment file.         |

Create the following files:

```text
kb-realtime-quickstart/
├── .env
├── .gitignore
└── index.js
```

Add the following to `.gitignore`:

```gitignore
node_modules/
.env
```

This prevents your local environment variables and installed dependencies from being committed to Git.

## 4. Configure your environment

Create a `.env` file:

```env
API_TOKEN=your_jwt_token
API_BASE_URL=https://api.example.com/v2
SOCKET_URL=https://api.example.com

BOARD_ID=b_9
CARD_ID=c_101
DESTINATION_COLUMN_ID=col_2

CARD_VERSION=4
CARD_POSITION=0
```

Replace the example values with your actual credentials and resource IDs.

`CARD_VERSION` must match the current version returned by the API.

`CARD_POSITION` represents the requested position in the destination column. Positions start at `0`.

For example:

| Position | Meaning     |
| -------- | ----------- |
| `0`      | First card  |
| `1`      | Second card |
| `2`      | Third card  |

The example uses HTTPS for the Socket.io client URL because Socket.io negotiates its transport and establishes the connection through its own protocol. The API's WebSocket endpoint is described as `wss://api.example.com`.

## 5. Connect to the real-time server

Create `index.js`:

```javascript
require("dotenv").config();

const { io } = require("socket.io-client");

const {
  API_TOKEN,
  SOCKET_URL,
  BOARD_ID
} = process.env;

const socket = io(SOCKET_URL, {
  auth: {
    token: API_TOKEN
  }
});

socket.on("connect", () => {
  console.log("Connected to real-time server.");
  console.log("Socket ID:", socket.id);

  socket.emit("board.join", {
    boardId: BOARD_ID
  });
});

socket.on("connect_error", (error) => {
  console.error("Connection failed:", error.message);
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
});
```

### Understanding the connection

The `io()` function creates a Socket.io client.

It receives two arguments:

1. The server URL.
2. A configuration object.

The `auth` option carries the JWT token:

```javascript
auth: {
  token: API_TOKEN
}
```

The token is sent during the Socket.io connection handshake.

Once the connection succeeds, the `connect` event fires.

The client then emits:

```javascript
socket.emit("board.join", {
  boardId: BOARD_ID
});
```

This requests access to events associated with the specified board.

**Important:** The engineering notes specify the `auth` option and `board.join` event but do not provide the server-side authentication acknowledgement or board-join acknowledgement schema. This example assumes that a successful connection and join request are sufficient to begin receiving authorized board events. Confirm the actual authorization and acknowledgement behaviour with the API team.

## 6. Listen for card movement events

Add the following listener to `index.js`, inside the existing connection setup:

```javascript
socket.on("card.moved", (event) => {
  console.log("Card movement received.");

  console.log("Board:", event.boardId);
  console.log("Actor:", event.actorId);
  console.log("Timestamp:", event.timestamp);

  console.log("Card data:", event.data);
});
```

The API sends three event types:

| Event           | Description                         |
| --------------- | ----------------------------------- |
| `card.created`  | A new card has been created.        |
| `card.moved`    | A card has been moved.              |
| `comment.added` | A comment has been added to a card. |

Each event contains:

* `boardId`: The board associated with the event.
* `actorId`: The user who performed the action.
* `timestamp`: When the event occurred.
* `data`: An object containing event-specific information.

The complete event-specific payload schemas have not been provided in the engineering notes. Therefore, the example logs `event.data` without assuming additional fields.

## 7. Move the card

Now that your client is connected and listening for events, send a request to move the card.

Add this function to `index.js`:

```javascript
async function moveCard() {
  const {
    API_TOKEN,
    API_BASE_URL,
    CARD_ID,
    DESTINATION_COLUMN_ID,
    CARD_VERSION,
    CARD_POSITION
  } = process.env;

  const response = await fetch(
    `${API_BASE_URL}/cards/${CARD_ID}/move`,
    {
      method: "PATCH",

      headers: {
        "Authorization": `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        columnId: DESTINATION_COLUMN_ID,
        position: Number(CARD_POSITION),
        version: Number(CARD_VERSION)
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("Card movement failed.");
    console.error("Status:", response.status);
    console.error("Response:", result);
    return;
  }

  console.log("Card moved successfully.");
  console.log("Updated card:", result);
}
```

The request body contains three fields:

```json
{
  "columnId": "col_2",
  "position": 0,
  "version": 4
}
```

| Field      | Description                                 |
| ---------- | ------------------------------------------- |
| `columnId` | ID of the destination column.               |
| `position` | Desired position in the destination column. |
| `version`  | Current version of the card.                |

A successful request returns the updated card with its version increased by one.

For example, if the card's version was `4`, the updated card will have version `5`.

The exact HTTP success status and whether the response wraps the card in a `data` property are not specified in the engineering notes. The example assumes the updated card is returned directly.

## 8. Run the complete workflow

The client must establish its real-time connection and join the board before moving the card.

Add the following to the bottom of `index.js`:

```javascript
socket.on("connect", async () => {
  console.log("Connected to real-time server.");

  socket.emit("board.join", {
    boardId: BOARD_ID
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await moveCard();
});
```

To avoid registering two `connect` listeners, use this complete connection handler in place of the earlier `socket.on("connect", ...)` handler.

The one-second delay is a practical demonstration measure. It gives the server time to process the join request, but it is not a guaranteed synchronization mechanism.

A production implementation should wait for a confirmed board-join acknowledgement before moving the card. That acknowledgement contract must be confirmed with engineering.

Run the application:

```bash
node index.js
```

If authentication and the requests succeed, you should see output similar to:

```text
Connected to real-time server.
Socket ID: example-socket-id

Card moved successfully.

Updated card:
{
  id: 'c_101',
  title: 'Write launch plan',
  columnId: 'col_2',
  position: 0,
  version: 5
}

Card movement received.

Board: b_9
Actor: u_3
Timestamp: 2026-10-30T10:15:00Z
Card data: { ... }
```

The output is illustrative. Actual event data depends on the server's event schema.

## 9. Handle disconnections

Real-time connections can be interrupted by network failures, server restarts or temporary connectivity problems.

Socket.io provides connection lifecycle events that allow clients to respond to interruptions.

Add the following listeners:

```javascript
socket.on("disconnect", (reason) => {
  console.log("Connection interrupted:", reason);
});

socket.on("connect", () => {
  console.log("Connection restored.");

  socket.emit("board.join", {
    boardId: BOARD_ID
  });
});
```

Socket.io clients attempt automatic reconnection by default.

However, reconnecting does not necessarily mean that events missed during the interruption will be delivered.

For reliable applications:

1. Detect when the connection is interrupted.
2. Allow the client to reconnect.
3. Join the required board again.
4. Reconcile local card data with the REST API.
5. Update the local state using the latest server response.

The engineering notes do not specify event replay, recovery offsets, or guaranteed delivery. Do not assume missed events will be replayed automatically.

See [Reconnect to Real-Time Events](../how-to/reconnect-to-realtime.md).

## 10. Troubleshooting

| Problem                          | Possible cause                            | What to check                                                |
| -------------------------------- | ----------------------------------------- | ------------------------------------------------------------ |
| Connection fails                 | Invalid token or incorrect server URL     | Verify the JWT and Socket.io server address.                 |
| No board events received         | Board join was unsuccessful               | Confirm the board ID and board access permissions.           |
| Card movement returns 409        | The card version is outdated              | Retrieve the latest card and retry with its current version. |
| Card movement returns 401        | Authentication failed                     | Check the Authorization header and token validity.           |
| Card movement returns 404        | Card or destination column does not exist | Verify the resource IDs.                                     |
| Card movement returns 403        | Insufficient permissions                  | Confirm the authenticated user can move the card.            |
| No event received after movement | Event subscription or delivery issue      | Confirm board membership and inspect the connection state.   |

## What you've learned

You've completed the core real-time card movement workflow.

You now know how to:

* Authenticate using a JWT.
* Establish a Socket.io connection.
* Join a board.
* Listen for `card.moved` events.
* Move a card using the REST API.
* Understand version checks.
* Handle connection interruptions and reconcile application state.

## Next steps

Continue with these guides:

* [Move a Card](../how-to/move-a-card.md) — Explore card movement in more detail.
* [Conflicts and Versions](../concepts/conflicts-and-versions.md) — Understand optimistic concurrency control.
* [Real-Time Events Overview](../concepts/realtime-events-overview.md) — Understand how real-time collaboration works.
* [Real-Time Events Reference](../reference/realtime-events.md) — Explore event names and payloads.
* [Troubleshooting](../troubleshooting.md) — Resolve common API and connection problems.
