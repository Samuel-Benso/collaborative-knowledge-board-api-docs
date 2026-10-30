# Reconnect to Real-time Events

The Collaborative Knowledge Board API uses Socket.IO to deliver real-time updates to connected clients.

When a client joins a board, it can receive events such as:

* `card.created`
* `card.moved`
* `comment.added`

Network interruptions, server restarts, browser sleep, and temporary connectivity problems can disconnect a client. When the connection is restored, the client must rejoin the board to continue receiving its events.

This guide explains how to detect disconnections, reconnect, rejoin a board, and keep the application's card and comment data consistent.

## Before you begin

You need:

* A valid API access token.
* The ID of the board you want to receive events from.
* A Socket.IO client library.

Install the Socket.IO client:

```bash
npm install socket.io-client
```

The real-time connection endpoint documented for API v2 is:

```text
wss://api.example.com
```

The connection uses Socket.IO authentication options to send the token.

> **Important:** Socket.IO is not the same as a plain WebSocket connection. Use a compatible Socket.IO client rather than the browser's native `WebSocket` API. The engineering notes specify a `wss://` connection address but do not clarify whether the deployed Socket.IO endpoint accepts that exact URL or requires an HTTPS origin that upgrades to WebSocket.

## Understand the connection lifecycle

A real-time client needs to complete three steps:

1. Connect to the Socket.IO server.
2. Authenticate using its access token.
3. Join the board whose events it needs to receive.

Connecting to the server alone does not subscribe the client to a board's events. The client must emit `board.join` with the relevant board ID.

```text
Application
    |
    | Connect with access token
    v
Socket.IO server
    |
    | Emit board.join
    | { boardId: "b_9" }
    v
Board event subscription
    |
    | Receive events
    v
card.created
card.moved
comment.added
```

## Connect and join a board

Use the Socket.IO client to establish the connection.

```javascript
import { io } from "socket.io-client";

const SOCKET_URL = "wss://api.example.com";
const API_TOKEN = process.env.API_TOKEN;
const BOARD_ID = "b_9";

const socket = io(SOCKET_URL, {
  auth: {
    token: API_TOKEN
  }
});

socket.on("connect", () => {
  console.log("Connected to the real-time server.");

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

The `auth` option sends the access token as part of the Socket.IO connection handshake.

The `board.join` event identifies the board whose updates the client wants to receive.

The example uses a fixed board ID for demonstration. In an application, use the board selected by the authenticated user.

## Listen for board events

After joining a board, register listeners for the events supported by API v2.

```javascript
socket.on("card.created", (event) => {
  console.log("A card was created:", event);
});

socket.on("card.moved", (event) => {
  console.log("A card was moved:", event);
});

socket.on("comment.added", (event) => {
  console.log("A comment was added:", event);
});
```

Each event has a common envelope containing:

| Field       | Description                                |
| ----------- | ------------------------------------------ |
| `boardId`   | ID of the board associated with the event. |
| `actorId`   | ID of the user who performed the action.   |
| `timestamp` | Time associated with the event.            |
| `data`      | Event-specific information.                |

The exact structure of `data` depends on the event. The engineering notes do not provide complete event-specific payload schemas.

For example, a `card.moved` event relates to a card movement, while a `comment.added` event relates to a newly created comment. Do not assume that their `data` objects have identical fields.

## Handle disconnections

Listen for the `disconnect` event to detect when the connection is lost.

```javascript
socket.on("disconnect", (reason) => {
  console.log("Real-time connection lost:", reason);
});
```

Socket.IO clients support automatic reconnection by default. When a connection is restored, the client emits the `connect` event again.

However, reconnecting to the server does not necessarily restore the previous board subscription. The application should join the board again after every successful connection.

## Rejoin the board after reconnection

Place the board subscription inside the `connect` event handler.

This ensures that the client sends `board.join` after the initial connection and after subsequent successful reconnections.

```javascript
socket.on("connect", () => {
  console.log("Connected to the real-time server.");

  socket.emit("board.join", {
    boardId: BOARD_ID
  });

  console.log(`Requested subscription to board ${BOARD_ID}`);
});
```

Avoid placing `board.join` in a separate block that runs only once when the application starts. If the connection drops and returns, that one-time subscription may not be repeated.

### Complete connection example

The following example combines connection handling, board subscription, event listeners, and disconnection logging.

```javascript
import { io } from "socket.io-client";

const SOCKET_URL = "wss://api.example.com";
const API_TOKEN = process.env.API_TOKEN;
const BOARD_ID = "b_9";

const socket = io(SOCKET_URL, {
  auth: {
    token: API_TOKEN
  }
});

socket.on("connect", () => {
  console.log("Connected:", socket.id);

  socket.emit("board.join", {
    boardId: BOARD_ID
  });

  console.log("Requested board subscription:", BOARD_ID);
});

socket.on("card.created", (event) => {
  console.log("Card created:", event);
});

socket.on("card.moved", (event) => {
  console.log("Card moved:", event);
});

socket.on("comment.added", (event) => {
  console.log("Comment added:", event);
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
});

socket.on("connect_error", (error) => {
  console.error("Connection error:", error.message);
});
```

This example demonstrates the client-side connection lifecycle. It does not establish whether the server confirms successful board subscription or provides event replay after reconnection.

## Understand what happens to events during disconnection

A client cannot assume that it receives every event that occurs while it is disconnected.

For example:

1. A client joins board `b_9`.
2. The network connection drops.
3. Another user moves a card.
4. The server emits `card.moved`.
5. The disconnected client does not receive that event.
6. The client reconnects and rejoins board `b_9`.

Rejoining restores the board subscription, but it does not establish that missed events are replayed.

The engineering notes do not specify event persistence, replay, delivery guarantees, or a mechanism for requesting missed events.

### Recommended recovery behaviour

After reconnecting:

1. Re-establish the authenticated Socket.IO connection.
2. Rejoin the board.
3. Refresh the relevant board data through the REST API.
4. Replace or reconcile the application's local state with the latest server state.
5. Continue processing incoming real-time events.

Refreshing the board data helps the client recover from changes that occurred while it was disconnected.

The documented list endpoint for retrieving cards on a board is:

```http
GET /boards/{boardId}/cards
```

It supports pagination through `page` and `pageSize`.

For example:

```http
GET https://api.example.com/v2/boards/b_9/cards?page=1&pageSize=20
Authorization: Bearer <token>
```

Because the endpoint is paginated, retrieve additional pages when the board contains more cards than the requested page size.

See [Paginate Lists](paginate-lists.md) for details.

> **Note:** The engineering notes do not specify a dedicated endpoint for retrieving every board-related resource or a mechanism for replaying missed real-time events. Refreshing the card list restores card state, but clients may also need a documented comment retrieval operation to reconcile comment threads.

## Avoid duplicate event listeners

Register event listeners once when initializing the Socket.IO client.

A common mistake is registering the same listeners inside the `connect` handler:

```javascript
// Avoid this pattern.
socket.on("connect", () => {
  socket.on("card.moved", (event) => {
    console.log(event);
  });
});
```

Every reconnection can register another listener. A single event may then trigger multiple callbacks.

Instead, register event listeners outside the connection handler:

```javascript
socket.on("connect", () => {
  socket.emit("board.join", {
    boardId: BOARD_ID
  });
});

socket.on("card.moved", (event) => {
  console.log("Card moved:", event);
});
```

This keeps event listeners separate from connection and subscription management.

## Handle connection errors

Listen for `connect_error` to identify connection or authentication problems.

```javascript
socket.on("connect_error", (error) => {
  console.error("Unable to connect:", error.message);
});
```

Possible causes include:

* An expired or invalid access token.
* Network connectivity problems.
* An unavailable real-time server.
* An incorrect connection endpoint.
* A server-side authentication or configuration issue.

The engineering notes do not define specific Socket.IO authentication error codes or handshake response formats.

If the token expires, obtain a valid token through the documented authentication flow before attempting another authenticated connection.

Do not assume that reconnecting with an expired token will restore access.

## Connection and recovery sequence

The following sequence illustrates the expected client-side recovery process.

```text
Client                         Socket.IO Server
  |                                  |
  | Connect with access token        |
  |--------------------------------->|
  |                                  |
  | Connection established           |
  |<---------------------------------|
  |                                  |
  | board.join                       |
  | { boardId: "b_9" }               |
  |--------------------------------->|
  |                                  |
  | Receive board events             |
  |<---------------------------------|
  |                                  |
  | Network interruption             |
  |                                  |
  | Connection lost                  |
  |                                  |
  | Automatic reconnection attempt   |
  |--------------------------------->|
  |                                  |
  | Connection established           |
  |<---------------------------------|
  |                                  |
  | board.join                       |
  | { boardId: "b_9" }               |
  |--------------------------------->|
  |                                  |
  | Refresh board data through REST  |
  |--------------------------------->|
  |                                  |
  | Continue receiving events        |
  |<---------------------------------|
```

The sequence represents the recommended recovery approach. The server acknowledgement for `board.join`, reconnection timing, and missed-event recovery mechanism are not defined in the available engineering notes.

## Questions for engineering

The following details require confirmation before the real-time reconnection behaviour can be treated as fully specified.

| Area                  | Question                                                                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connection URL        | Does the Socket.IO server accept `wss://api.example.com` directly, or should clients connect through `https://api.example.com` and allow Socket.IO to upgrade the transport? |
| Authentication        | What error or handshake response does the server return when a token is missing, invalid, or expired?                                                                        |
| Board subscription    | Does `board.join` return an acknowledgement confirming that the client successfully joined the board?                                                                        |
| Reconnection          | What reconnection limits, delays, or backoff settings does the server recommend?                                                                                             |
| Subscription recovery | Must clients emit `board.join` again after every reconnection?                                                                                                               |
| Event delivery        | Are events persisted or replayed when a client reconnects?                                                                                                                   |
| Event ordering        | Does the server guarantee event order for a board?                                                                                                                           |
| Duplicate delivery    | Can clients receive duplicate events, and is there a unique event ID for deduplication?                                                                                      |
| State recovery        | Is there a recommended endpoint or cursor-based mechanism for recovering events missed during disconnection?                                                                 |
| Comment recovery      | Which endpoint retrieves comments and threaded replies after a reconnection?                                                                                                 |
| Multiple boards       | Can one connection join multiple boards, and how should clients leave a board subscription?                                                                                  |

## Related documentation

* [Quickstart: Move a Card and Receive a Real-time Event](../getting-started/quickstart-move-card-realtime.md)
* [Real-time Events Overview](../concepts/realtime-events-overview.md)
* [Conflicts and Versions](../concepts/conflicts-and-versions.md)
* [Paginate Lists](paginate-lists.md)
* [Authentication](../getting-started/authentication.md)
* [Real-time Events API Reference](../reference/realtime-events.md)
