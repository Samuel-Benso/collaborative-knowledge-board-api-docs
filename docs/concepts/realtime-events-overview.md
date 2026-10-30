# Real time events overview

Real time events let your application learn about changes on a board as they happen, without polling the REST API. When another user creates a card, moves a card or adds a comment, the API pushes an event to every client that has joined that board.

This page explains how the real time connection works and how it fits with the REST API. For a working first example, follow the [Quickstart](../getting-started/quickstart-move-card-realtime.md). For the exact payload of each event, see the [Real time events reference](../reference/realtime-events.md). For recovery after a dropped connection, see [Reconnect to real time](../how-to/reconnect-to-realtime.md).

> **Items marked "Assumption"** are not stated in the engineering notes for v2. They are listed with questions at the end of this page. Verify them before you build logic that depends on them.

## The model in one minute

Real time in v2 uses [Socket.io](https://socket.io). You use it in three steps:

1. **Connect** to `wss://api.example.com` and send your token in the `auth` option.
2. **Join a board** by emitting `board.join` with the board's id.
3. **Listen** for the events you care about: `card.created`, `card.moved` and `comment.added`.

| Item | Value |
|---|---|
| Connection URL | `wss://api.example.com` |
| Authentication | The JWT, in the Socket.io `auth` option |
| Join message | Emit `board.join` with `{ "boardId": "b_9" }` |
| Events | `card.created`, `card.moved`, `comment.added` |
| Fields in every event | `boardId`, `actorId`, `timestamp`, `data` |

The real time URL has no `/v2` in it. The `/v2` prefix belongs to the REST base URL, `https://api.example.com/v2`, and does not apply here.

> **Assumption:** The `auth` option is `{ token: "<JWT>" }`. The notes say only that the token goes "in the auth option". The token is the same JWT you use for REST requests. See [Authentication](../getting-started/authentication.md).

## Sequence: from connection to first event

```
Your client                       API                      Another user
    |                              |                            |
    |  connect                     |                            |
    |  wss://api.example.com       |                            |
    |  auth: { token }             |                            |
    |----------------------------->|                            |
    |  connected                   |                            |
    |<-----------------------------|                            |
    |                              |                            |
    |  emit board.join             |                            |
    |  { boardId: "b_9" }          |                            |
    |----------------------------->|                            |
    |                              |  (client now receives      |
    |                              |   events for board b_9)    |
    |                              |                            |
    |                              |   PATCH /cards/c_101/move  |
    |                              |<---------------------------|
    |  event: card.moved           |                            |
    |  boardId, actorId,           |                            |
    |  timestamp, data             |                            |
    |<-----------------------------|                            |
```

Connecting alone does not deliver any events. You receive events for a board only after you emit `board.join` for it. If you work with several boards, emit `board.join` once for each.

## The events

Every event has the same outer shape:

```json
{
  "boardId": "b_9",
  "actorId": "u_3",
  "timestamp": "2026-10-30T09:15:00Z",
  "data": { }
}
```

| Field | Meaning |
|---|---|
| `boardId` | The board the event belongs to. |
| `actorId` | The id of the user who caused the event. |
| `timestamp` | When the event happened. |
| `data` | The event-specific content. |

| Event | Sent when | Related page |
|---|---|---|
| `card.created` | A user creates a card on the board. | [Cards reference](../reference/cards.md) |
| `card.moved` | A user moves a card within or across columns. | [Conflicts and versions](conflicts-and-versions.md) |
| `comment.added` | A user adds a comment or a reply. | [Comment threading](comment-threading.md) |

> **Assumption:** `timestamp` is an ISO 8601 string in UTC, in the same format as the card's `updatedAt` field. The notes do not state the format.

> **Assumption:** The `data` object holds the full card for `card.created` and `card.moved`, and the full comment for `comment.added`, in the same shape the REST API returns. The notes do not show the contents of `data`.

The notes list no events for card updates, card deletion, comment edits or comment deletion. In v2, those changes do not produce real time events. Your application will not be told when another user edits or deletes something, so refresh the data from the REST API when the user opens a card or a thread.

## Events are notifications, REST is the source of truth

Treat an event as a signal that something changed, not as a complete record of the board. The REST API holds the authoritative state.

- Use events to update the screen quickly.
- Use REST requests to load the starting state, to recover after a disconnect, and to confirm anything important.
- Keep sending `version` with every move and update, and keep handling `409 VERSION_CONFLICT`. Events reduce conflicts but cannot prevent them. See [Conflicts and versions](conflicts-and-versions.md).

A reliable client therefore follows this pattern: load the board over REST, join the board, apply events as they arrive, and reload over REST whenever it may have missed events.

## Event order

> **Assumption:** The notes do not describe ordering guarantees, and events carry no sequence number. Write your client so that it does not depend on strict ordering.

Use these rules:

- **Compare, do not trust arrival order.** For a card, keep the event whose card has the higher `version`. Ignore an event whose version is lower than the one you already hold.
- **Make updates safe to repeat.** When you receive `comment.added`, add the comment only if you do not already hold a comment with that `id`. The same event may be delivered more than once, for example after a reconnection.
- **Use `timestamp` only as a hint.** Timestamps come from the server, but two events in the same second cannot be ordered by timestamp alone.
- **Expect your own actions.** If your user moves a card, you may also receive the `card.moved` event for that move. Compare `actorId` with your own user id, or apply the event as a no-op if the card already shows the new state.

> **Assumption:** The API sends an event to the client that caused the change as well as to other clients on the board. The notes do not say.

## Connections drop

Networks fail, laptops sleep and servers restart. Plan for the connection to drop.

- The Socket.io client library reconnects automatically by default.
- A new connection starts with no board joined. After every reconnection, emit `board.join` again for each board you were following.
- Events that happened while you were disconnected are not replayed. After you rejoin, reload the board's cards over REST so that you have anything you missed.

> **Assumption:** Joined boards are not remembered across connections, and missed events are not replayed. The notes describe neither behavior.

The simplest correct approach is to put `board.join` inside the handler for the `connect` event. That handler runs on the first connection and on every reconnection.

```js
import { io } from "socket.io-client";

const socket = io("wss://api.example.com", {
  auth: { token: process.env.TOKEN },
});

const BOARD_ID = "b_9";

socket.on("connect", () => {
  socket.emit("board.join", { boardId: BOARD_ID });
  // After a reconnection, also reload the board over REST here.
});

socket.on("connect_error", (err) => {
  console.error("Could not connect:", err.message);
});

socket.on("card.moved", (event) => {
  console.log("Card moved on board", event.boardId, "by", event.actorId);
});
```

This example is for orientation. The tested, complete version is in [`examples/realtime-client.js`](../../examples/realtime-client.js).

## Authentication and access

The connection is authenticated with the same JWT as the REST API. A missing, invalid or expired token prevents the connection from opening, and the client library reports the problem through the `connect_error` event.

> **Assumption:** You can join only boards that your user can access through the REST API. The notes do not describe board permissions for real time.

> **Assumption:** Joining a board that does not exist produces no error and no events. The notes do not describe this case.

Tokens expire. A connection that was opened with a valid token is not guaranteed to stay open after the token expires, and a reconnection with an expired token fails. When `connect_error` reports an authentication problem, log in again and connect with the new token. See [Authentication](../getting-started/authentication.md).

## When to use real time and when to use REST

| Task | Use |
|---|---|
| Show another user's new card or move straight away | Real time events |
| Show a new comment straight away | Real time events |
| Load the board when the page opens | REST, with pagination |
| Recover after a disconnect | REST, then join again |
| Move a card, add a comment, edit or delete | REST requests |
| Learn about edits and deletions made by others | REST (no events exist for these) |

Real time is receive-only for the three events above. Changes are made through REST requests, and the resulting events are broadcast to the board.

> **Assumption:** The only message a client emits is `board.join`. The notes list no other client-to-server messages, and no message to leave a board.

## Troubleshooting

If no events arrive, work through the checklist in [No real-time events arrive](../troubleshooting.md#no-real-time-events-arrive). The most common causes are connecting to a URL with `/v2` in it, forgetting to emit `board.join`, and not rejoining after a reconnection.

## Related pages

- [Quickstart: move a card and receive the real time event](../getting-started/quickstart-move-card-realtime.md): a 15-minute first run.
- [Real time events reference](../reference/realtime-events.md): connection options and every event payload.
- [Reconnect to real time](../how-to/reconnect-to-realtime.md): the recovery steps.
- [Conflicts and versions](conflicts-and-versions.md): why events do not replace the version check.
- [Comment threading](comment-threading.md): placing `comment.added` events in a thread.
- [Authentication](../getting-started/authentication.md): getting and sending the token.