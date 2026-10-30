# Real time events

Real time events let your application learn about changes as they happen, without polling. When a user creates a card, moves a card or adds a comment, every client that has joined the board receives an event.

The real time service uses [Socket.io](https://socket.io). You connect once, join one or more boards, and listen for events.

**Real time URL:** `wss://api.example.com`
**REST base URL:** `https://api.example.com/v2`

> **How to read the markers on this page**
> Statements without a marker come from the v2 engineering notes. A **[Assumed]** marker means the page relies on something the notes do not state, and it is tied to a question number in [Open questions](../meta/open-questions.md). Verify every marked item against the live service before relying on it.

---

## Summary

| Step | What you do |
|---|---|
| 1 | [Connect](#connect) to `wss://api.example.com` and send your token in the `auth` option. |
| 2 | [Join a board](#join-a-board) by emitting `board.join` with the board ID. |
| 3 | [Listen](#events) for `card.created`, `card.moved` and `comment.added`. |
| 4 | [Handle reconnection](#reconnection) by joining the board again after every connect, and reloading the board data. |

New to real time? Follow the [Quickstart](../getting-started/quickstart-move-card-realtime.md) first. For the ideas behind this page, read [Real time events overview](../concepts/realtime-events-overview.md).

---

## Before you start

You need:

- A JWT from logging in. See [Authentication](authentication.md).
- The ID of a board you can access, such as `b_9`.
- The Socket.io client library for your language. This page uses the JavaScript client.

```bash
npm install socket.io-client
```

> **[Assumed, Q56]** The notes name Socket.io but not its version, namespace or path. This page assumes Socket.io version 4, the default namespace (`/`) and the default path (`/socket.io`). Use the same major version of the client library as the server.

---

## Connect

Connect to `wss://api.example.com` and pass your token in the `auth` option. Do not put the token in the URL.

```js
import { io } from "socket.io-client";

const socket = io("wss://api.example.com", {
  auth: { token: process.env.TOKEN },
});

socket.on("connect", () => {
  console.log("Connected as", socket.id);
});
```

The token is the same JWT that you send as `Authorization: Bearer <token>` in REST requests, without the word `Bearer`. **[Assumed, Q52]**

### Connection errors

> **[Assumed, Q52]** The notes do not describe what happens when the token is missing, invalid or expired. This page assumes the server refuses the connection and the client emits a `connect_error` event with a message.

```js
socket.on("connect_error", (err) => {
  console.error("Could not connect:", err.message);
  // If the message points to the token, log in again and reconnect.
});
```

`connect_error` is a standard Socket.io event. It is not an API error, so it does not use the JSON format in [Errors](errors.md).

---

## Join a board

A connection receives no board events until it joins a board. Emit `board.join` with the board ID.

```js
socket.emit("board.join", { boardId: "b_9" });
```

| Field | Type | Required | Description |
|---|---|---|---|
| `boardId` | string | Yes | The ID of the board whose events you want to receive. |

You receive events only for boards that you have joined.

> **[Assumed, Q57]** The notes do not describe a confirmation or an error for `board.join`. This page assumes there is no acknowledgement. Because you cannot tell from the response whether a join worked, confirm it during development by making a change from a second client and checking that the event arrives.

> **[Assumed, Q57]** Joining several boards on one connection is assumed to work, by emitting `board.join` once for each board. Joining a board you are not allowed to access is assumed to fail without an event.

> **[Assumed, Q58]** The notes do not list a way to stop receiving events for a board other than disconnecting. This page does not use a `board.leave` event.

---

## Events

Three events are sent. Every event has the same envelope.

### Event envelope

```json
{
  "boardId": "b_9",
  "actorId": "u_3",
  "timestamp": "2026-10-20T09:15:00Z",
  "data": { }
}
```

| Field | Type | Description |
|---|---|---|
| `boardId` | string | The board where the change happened. |
| `actorId` | string | The ID of the user who made the change. |
| `timestamp` | string | When the change happened. |
| `data` | object | The details of the change. The contents depend on the event. |

> **[Assumed, Q59]** The timestamp is assumed to be ISO 8601 in UTC, like `updatedAt` on a card. The notes do not list the contents of `data`. The sections below state the contents that this page assumes.

Listen for each event with `socket.on`:

```js
socket.on("card.created", (event) => { /* ... */ });
socket.on("card.moved", (event) => { /* ... */ });
socket.on("comment.added", (event) => { /* ... */ });
```

### card.created

Sent when a card is created on the board.

```json
{
  "boardId": "b_9",
  "actorId": "u_3",
  "timestamp": "2026-10-20T09:10:00Z",
  "data": {
    "id": "c_101",
    "title": "Write launch plan",
    "description": "...",
    "columnId": "col_1",
    "position": 0,
    "version": 1,
    "tags": ["launch"],
    "dueDate": "2026-11-01",
    "updatedAt": "2026-10-20T09:10:00Z"
  }
}
```

**[Assumed, Q59]** `data` is the full [card object](cards.md). The values above are illustrative.

### card.moved

Sent when a card changes column, position, or both.

```json
{
  "boardId": "b_9",
  "actorId": "u_3",
  "timestamp": "2026-10-20T09:15:00Z",
  "data": {
    "id": "c_101",
    "title": "Write launch plan",
    "description": "...",
    "columnId": "col_3",
    "position": 0,
    "version": 5,
    "tags": ["launch"],
    "dueDate": "2026-11-01",
    "updatedAt": "2026-10-20T09:15:00Z"
  }
}
```

**[Assumed, Q59]** `data` is the full card object after the move, so `version` is the new version (the version from the request plus 1). The event does not say which column or position the card came from.

> **[Assumed, Q62]** The user who moves a card is assumed to receive the `card.moved` event for their own move too. Write your handler so that applying the same change twice does no harm.

### comment.added

Sent when a comment or a reply is added to a card on the board.

```json
{
  "boardId": "b_9",
  "actorId": "u_3",
  "timestamp": "2026-10-20T09:20:00Z",
  "data": {
    "id": "m_7",
    "cardId": "c_101",
    "parentId": "m_5",
    "depth": 2,
    "body": "Agreed",
    "authorId": "u_3"
  }
}
```

**[Assumed, Q59]** `data` is the full [comment object](comments.md).

### Changes that have no event

> **[Assumed, Q44, Q63]** The notes list only the three events above. Nothing announces a card update, a card deletion, a comment edit or a comment deletion. A client that shows these live will not hear about them. Reload the affected card or comments when your user could have changed them, and when you reconnect.

---

## Event order

> **[Assumed, Q60]** The notes do not say whether events arrive in the order that the changes happened, and events carry no sequence number. Treat order as not guaranteed.

Design your handlers so that a late or repeated event cannot put your data in the wrong state:

1. **Compare versions for cards.** Every card event carries the card's `version` in `data` (assumed). Apply the event only if its `version` is higher than the version you already hold for that card. Otherwise ignore it as stale.
2. **Use `timestamp` as a tie-breaker, not as the main rule.** Clocks and delivery delays make timestamps a weaker signal than `version`.
3. **Make handlers idempotent.** Applying the same event twice must give the same result.
4. **Handle a reply that arrives before its parent.** For `comment.added`, if the `parentId` is not in your data, load the comments for the card instead of dropping the event.

```js
const cards = new Map(); // cardId -> card object

function applyCardEvent(event) {
  const card = event.data;
  const current = cards.get(card.id);

  if (current && card.version <= current.version) {
    return; // stale or repeated event
  }
  cards.set(card.id, card);
}

socket.on("card.created", applyCardEvent);
socket.on("card.moved", applyCardEvent);
```

This is the same version idea that protects your REST updates. See [Conflicts and versions](../concepts/conflicts-and-versions.md).

---

## Reconnection

Connections drop. The Socket.io client reconnects on its own, but your application has two jobs to do when it does.

### 1. Join your boards again

> **[Assumed, Q61]** Board membership belongs to a connection, so a new connection starts with no boards joined. This page assumes the server does not remember your boards.

Run `board.join` inside the `connect` handler, not once after the first connection. The `connect` event fires on every successful connection, including reconnections.

### 2. Reload the board data

> **[Assumed, Q61]** The notes do not describe replay of missed events. This page assumes that events sent while you were disconnected are lost and are not sent again after you reconnect.

After every reconnection, fetch the board data again from the REST API, so that you do not show stale cards. Read every page. See [Pagination](pagination.md).

### Reconnection example

```js
import { io } from "socket.io-client";

const BOARD_IDS = ["b_9"];
let hasConnectedBefore = false;

const socket = io("wss://api.example.com", {
  // A function is called on every connection attempt, so a refreshed token is used.
  auth: (cb) => cb({ token: getCurrentToken() }),
});

socket.on("connect", async () => {
  for (const boardId of BOARD_IDS) {
    socket.emit("board.join", { boardId });
  }

  if (hasConnectedBefore) {
    await reloadBoards(BOARD_IDS); // fetch every page again over REST
  }
  hasConnectedBefore = true;
});

socket.on("disconnect", (reason) => {
  console.warn("Disconnected:", reason);
});
```

`getCurrentToken` and `reloadBoards` are functions that you write. `getCurrentToken` returns your current JWT, and `reloadBoards` loads the cards again.

Subscribe to events only once, outside the `connect` handler. If you call `socket.on` inside it, each reconnection adds another listener and every event is handled several times.

More guidance is in [Reconnect to real time](../how-to/reconnect-to-realtime.md).

---

## Complete example

This script connects, joins a board, and prints every event. Run it in one terminal, move a card from another client or with `curl`, and watch the event arrive.

```js
import { io } from "socket.io-client";

const TOKEN = process.env.TOKEN;
const BOARD_ID = process.env.BOARD_ID ?? "b_9";

const socket = io("wss://api.example.com", { auth: { token: TOKEN } });

socket.on("connect", () => {
  console.log("Connected:", socket.id);
  socket.emit("board.join", { boardId: BOARD_ID });
});

socket.on("connect_error", (err) => {
  console.error("Connection failed:", err.message);
});

socket.on("disconnect", (reason) => {
  console.warn("Disconnected:", reason);
});

for (const name of ["card.created", "card.moved", "comment.added"]) {
  socket.on(name, (event) => {
    console.log(`${name} on ${event.boardId} by ${event.actorId}`);
    console.log(JSON.stringify(event.data, null, 2));
  });
}
```

Run it:

```bash
TOKEN="<your JWT>" BOARD_ID="b_9" node realtime-client.js
```

The same script is in [`examples/realtime-client.js`](../../examples/realtime-client.js). In a second terminal, trigger an event:

```bash
curl -X PATCH https://api.example.com/v2/cards/c_101/move \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "columnId": "col_3", "position": 0, "version": 4 }'
```

The first terminal should print a `card.moved` event within a moment. If nothing arrives, check [Troubleshooting](../troubleshooting.md#no-real-time-events-arrive).

> **Not yet tested.** The code on this page was written from the engineering notes and has not been run against the live service. It is checked as described in the [Documentation quality plan](../meta/documentation-quality-plan.md).

---

## Quick reference

| Item | Value |
|---|---|
| URL | `wss://api.example.com` |
| Library | Socket.io **[Assumed, Q56: version 4]** |
| Authentication | Token in the `auth` option |
| Join a board | `socket.emit("board.join", { boardId })` |
| Events | `card.created`, `card.moved`, `comment.added` |
| Event fields | `boardId`, `actorId`, `timestamp`, `data` |
| Order guaranteed | Not documented, assume no **[Q60]** |
| Missed events replayed | Not documented, assume no **[Q61]** |

---

## Related pages

- [Quickstart: move a card and receive the event](../getting-started/quickstart-move-card-realtime.md)
- [Real time events overview](../concepts/realtime-events-overview.md)
- [Reconnect to real time](../how-to/reconnect-to-realtime.md)
- [Cards reference](cards.md)
- [Comments reference](comments.md)
- [Conflicts and versions](../concepts/conflicts-and-versions.md)
- [Errors](errors.md)