# Troubleshooting

Find your symptom, check the likely cause and apply the fix. Details that engineering has not confirmed are marked as assumptions and link to the [open questions](meta/open-questions.md).

**Jump to:**

- [Real time events](#real-time-events): [no events arrive](#no-real-time-events-arrive), [duplicates](#events-arrive-twice), [wrong order](#events-arrive-in-the-wrong-order), [stop after reconnect](#events-stop-after-a-reconnect), [missing event types](#there-is-no-event-for-a-card-update-or-delete)
- [Cards](#cards): [409 conflict](#409-version_conflict-when-moving-or-updating-a-card), [400 on move](#400-error-when-moving-a-card), [unexpected position](#the-card-ends-up-in-the-wrong-position)
- [Lists](#lists): [not an array](#datamap-is-not-a-function-or-the-list-looks-wrong), [missing items](#only-20-items-appear), [duplicates or gaps](#duplicates-or-gaps-while-paging)
- [Comments](#comments): [403](#403-when-editing-or-deleting-a-comment), [rejected comment](#a-comment-or-reply-is-rejected)
- [Authentication](#authentication)
- [Upgrading from v1](#a-v1-client-stopped-working)

## Real time events

### No real-time events arrive

You connect without errors, but your handlers never run.

Work through this checklist in order.

1. **Log what the connection is doing.** Add these listeners before anything else. They show whether you connect, whether the server rejects you and which events arrive.

   ```js
   socket.on("connect", () => console.log("connected", socket.id));
   socket.on("connect_error", (err) => console.error("connect_error", err.message));
   socket.on("disconnect", (reason) => console.log("disconnected", reason));
   socket.onAny((event, payload) => console.log("event", event, payload));
   ```

   `onAny` is available in Socket.io version 4, which these docs assume ([Q56](meta/open-questions.md)).

2. **Check the URL.** Connect to `wss://api.example.com`. Do not add `/v2` to the real time URL.
3. **Check the token.** Pass the JWT in the `auth` option, not in an HTTP header or a query string:

   ```js
   const socket = io("https://api.example.com", { auth: { token: jwt } });
   ```

   If `connect_error` fires, the token is usually missing, expired or malformed. Log in again to get a new one. See [Authentication](getting-started/authentication.md).
4. **Join the board.** Connecting alone sends you nothing. Emit `board.join` with the board id after every connection:

   ```js
   socket.emit("board.join", { boardId: "b_9" });
   ```

5. **Check the board id.** It must be the id of an existing board, in the form `b_9`. A typo does not produce an error.
6. **Check your access.** If you cannot access the board, the join is assumed to fail silently, with no error and no events ([Q57](meta/open-questions.md)). Confirm that the same token can read the board over REST with `GET /boards`.
7. **Check the event name.** Only three events exist: `card.created`, `card.moved` and `comment.added`. Names are case sensitive.
8. **Trigger a matching action.** Move a card or add a comment on the board you joined. Updating a card's title does not send an event.
9. **Listen for your own actions too.** The actor is assumed to receive their own events ([Q62](meta/open-questions.md)). If you perform the action yourself and still see nothing, the join has not worked.

If every step passes and no events arrive, run the [quickstart](getting-started/quickstart-move-card-realtime.md) unchanged. If it also fails, report the output of the listeners from step 1 to support.

### Events arrive twice

The server is assumed to send an event to the person who caused it as well as to everyone else ([Q62](meta/open-questions.md)). You can also receive duplicates if you register the same handler on every reconnect.

**Fix:**

- Register handlers once, outside the `connect` handler. Only emit `board.join` inside `connect`.
- Make handlers idempotent. Applying the same event twice must give the same result. For cards, compare `version` and ignore an event that is not newer than the card you already hold.

### Events arrive in the wrong order

Event order is not guaranteed, and events carry no sequence number ([Q60](meta/open-questions.md)).

**Fix:** Do not apply events in the order they arrive. Compare the `version` of the card in the event with the version you already have, and ignore older ones. If you cannot tell whether you missed something, reload the card over REST. See [Real time events](reference/realtime-events.md).

### Events stop after a reconnect

Socket.io reconnects automatically, but the server is assumed not to remember which boards you joined, and does not replay missed events ([Q61](meta/open-questions.md)).

**Fix:** On every `connect` event, including reconnects:

1. Emit `board.join` again for each board you follow.
2. Reload the board's cards over REST to recover anything you missed.

See [Reconnect to real time events](how-to/reconnect-to-realtime.md) and the complete client in [`realtime-client.js`](../examples/realtime-client.js).

### There is no event for a card update or delete

Only `card.created`, `card.moved` and `comment.added` exist ([Q63](meta/open-questions.md)). Card updates, card deletions, comment edits and comment deletions send no event.

**Fix:** After you make one of these changes yourself, update your local state from the REST response. To see changes made by other users, reload the data over REST when the user opens or refreshes the view.

## Cards

### 409 VERSION_CONFLICT when moving or updating a card

```json
{ "error": { "code": "VERSION_CONFLICT", "message": "Card was updated by someone else" } }
```

**Cause:** The `version` you sent is not the card's current version. Someone else changed the card after you read it.

**Fix:**

1. Reload the card with its current `version`.
2. Decide whether your change still makes sense. For a move, it usually does.
3. Send the request again with the new `version`.

If you see this error on every request from a single user, you are probably reusing an old version. After a successful move, store the `version` from the response. See [Handle a version conflict](how-to/handle-a-version-conflict.md) and [Conflicts and versions](concepts/conflicts-and-versions.md).

### 400 error when moving a card

**Cause:** A required field is missing or invalid. The move body needs `columnId`, `position` and `version`. A request without `version` is assumed to return `400` ([Q65](meta/open-questions.md)). An invalid value is assumed to return `400 VALIDATION_ERROR` ([Q51](meta/open-questions.md)).

**Fix:** Send all three fields. `position` is a number that starts at `0`. `columnId` must be the id of an existing column, such as `col_2`.

### The card ends up in the wrong position

**Cause:** `position` starts at `0`, not `1`. The first slot in a column is `0`.

**Fix:** Use `0` for the top of a column. After the move, read `position` from the response rather than assuming it.

## Lists

### `data.map is not a function`, or the list looks wrong

**Cause:** In v2, `GET /boards` and `GET /boards/{boardId}/cards` return an object, not an array. This code worked in v1:

```js
const boards = await response.json();
boards.map(renderBoard); // fails in v2
```

**Fix:** Read the items from `data`:

```js
const { data: boards } = await response.json();
boards.map(renderBoard);
```

See the [migration guide](release-notes/migrate-v1-to-v2.md#2-list-endpoints-return-paginated-objects).

### Only 20 items appear

**Cause:** The default `pageSize` is 20. The response `total` tells you how many items exist. For example, `"total": 134` means 7 pages of 20.

**Fix:** Request further pages, or ask for a larger `pageSize` up to the maximum of 100. See [Paginate lists](how-to/paginate-lists.md).

### An empty page, or a 400 error, when paging

**Cause:** An out-of-range `page` is assumed to return an empty `data` array. An invalid `page` or `pageSize` is assumed to return `400 VALIDATION_ERROR` ([Q51](meta/open-questions.md)). Values above 100 for `pageSize` are not allowed.

**Fix:** Stop when you have loaded `total` items or when `data` is empty. Keep `page` at 1 or higher and `pageSize` between 1 and 100.

### Duplicates or gaps while paging

**Cause:** The sort order is not documented ([Q54](meta/open-questions.md)). If items are added or removed while you page, you can see an item twice or miss one ([Q55](meta/open-questions.md)).

**Fix:** Remove duplicates by `id`. After the last page, compare the number of unique items with `total` and reload if they differ.

## Comments

### 403 when editing or deleting a comment

**Cause:** Only the author of a comment can edit or delete it. Your token belongs to a different user.

**Fix:** Show edit and delete controls only when the comment's `authorId` matches the current user's id. See the [comments reference](reference/comments.md).

### A comment or reply is rejected

Check these requirements:

- `body` is required and has a maximum of 1,000 characters.
- `parentId` must be the id of an existing comment on the same card.
- Comments can be nested 2 levels deep. A reply to a reply that is already at the deepest level is not allowed. See [Comment threading](concepts/comment-threading.md).
- The `cardId` in the path must exist.

The exact error codes for these cases are listed in the [comments reference](reference/comments.md) and [Errors](reference/errors.md).

## Authentication

### 401 or an authentication error on any request

**Cause:** The token is missing, expired or sent in the wrong format.

**Fix:** Send it as `Authorization: Bearer <token>`, with a single space after `Bearer` and no quotation marks. If the token has expired, log in again. Authentication is unchanged from v1. See [Authentication](reference/authentication.md).

## A v1 client stopped working

**Cause:** Version 2 has two breaking changes. Card updates and moves require `version`, and list endpoints return paginated objects.

**Fix:** Follow the [migration guide](release-notes/migrate-v1-to-v2.md). Check the base URL too. Version 2 is at `https://api.example.com/v2`.

## Still stuck?

When you contact support, include:

- The request method, URL and body, with the token removed.
- The full error response.
- For real time problems, the output of the listeners from [the checklist](#no-real-time-events-arrive).
- The time the problem occurred, with the time zone.