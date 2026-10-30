# Conflicts and versions

When two people change the same card at the same time, one change must not silently overwrite the other. The v2 API prevents this with a version number on every card. If your request carries an out-of-date version, the API rejects it with `409 VERSION_CONFLICT` and leaves the card unchanged.

This page explains how the version check works, what the 409 response means, and what your application should do when it receives one. For the step-by-step recovery procedure, see [Handle a version conflict](../how-to/handle-a-version-conflict.md). For the exact request and response formats, see the [Cards reference](../reference/cards.md) and the [Errors reference](../reference/errors.md).

> **Items marked "Assumption"** are not stated in the engineering notes for v2. They are listed with questions at the end of this page. Verify them before you build logic that depends on them.

## The problem: two users, one card

Two users open the same card at the same moment. Both see the card at version 4. User A moves it to another column. User B then moves it somewhere else, still believing the card is at version 4.

Without a check, User B's request would be applied on top of User A's change, and User A's move would be lost without anyone being told. With the version check, the API accepts the first request and rejects the second.

## How optimistic updates work

v2 uses optimistic concurrency. The API does not lock a card while someone is looking at it. Instead:

1. Your client reads the card and remembers its `version`.
2. Your client sends a change and includes that `version`.
3. The API compares the version in your request with the card's current version.
4. If they match, the API applies the change and increases the version by 1.
5. If they do not match, the API rejects the change with `409 VERSION_CONFLICT`.

The word "optimistic" refers to the assumption that conflicts are rare. Most requests succeed on the first attempt, and no one waits for a lock. You only handle extra work in the uncommon case where two people collide.

## The version field

Every card returned by v2 includes a `version` field:

```json
{
  "id": "c_101",
  "title": "Write launch plan",
  "description": "...",
  "columnId": "col_2",
  "position": 1,
  "version": 4,
  "tags": ["launch"],
  "dueDate": "2026-11-01",
  "updatedAt": "2026-10-20T09:15:00Z"
}
```

| Property | Behavior |
|---|---|
| Type | Integer |
| Changes | Increases by 1 each time the card is moved. The move response returns the card with the new version. |
| Required on | Every request that updates or moves a card. This is a breaking change from v1. See [Migrate from v1 to v2](../release-notes/migrate-v1-to-v2.md). |
| Meaning | A counter for that one card. Do not compare versions across different cards. |

Treat the version as an opaque token. Send back exactly the value you received. Do not calculate the next version yourself, because another user's change may have already used it.

> **Assumption:** The version also increases when a card is changed by an update other than a move, such as editing the title. The notes say updates require `version` but state the increase only for moves.

## Sequence: a conflict

The diagram shows two clients, A and B, moving the same card. The card starts at version 4.

```
Client A                    API                       Client B
   |                         |                           |
   |  GET card c_101         |                           |
   |------------------------>|                           |
   |  version 4              |                           |
   |<------------------------|                           |
   |                         |         GET card c_101    |
   |                         |<--------------------------|
   |                         |         version 4         |
   |                         |-------------------------->|
   |                         |                           |
   |  PATCH /cards/c_101/move|                           |
   |  version: 4             |                           |
   |------------------------>|                           |
   |                         | current version is 4: OK  |
   |                         | apply move, version -> 5  |
   |  200 OK, version 5      |                           |
   |<------------------------|                           |
   |                         |   PATCH /cards/c_101/move |
   |                         |   version: 4              |
   |                         |<--------------------------|
   |                         | current version is 5      |
   |                         | 4 does not match: reject  |
   |                         |   409 VERSION_CONFLICT    |
   |                         |-------------------------->|
   |                         |                           |
   |                         |   GET card c_101          |
   |                         |<--------------------------|
   |                         |   version 5, new position |
   |                         |-------------------------->|
   |                         |                           |
   |                         |   User B decides, then    |
   |                         |   PATCH move, version: 5  |
   |                         |<--------------------------|
   |                         |   200 OK, version 6       |
   |                         |-------------------------->|
```

The same sequence in words:

1. Both clients read card `c_101` at version 4.
2. Client A sends its move with version 4. The versions match, so the API applies the move and returns version 5.
3. Client B sends its move with version 4. The card is now at version 5, so the API rejects the request with `409 VERSION_CONFLICT`. Nothing changes.
4. Client B reads the card again, sees version 5 and the new position, decides whether its move still makes sense, and sends it again with version 5.

## The 409 response

When the version in your request is not the card's current version, the API returns HTTP status `409` with the standard v2 error body:

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Card was updated by someone else"
  }
}
```

| Part | Value |
|---|---|
| HTTP status | `409` |
| `error.code` | `VERSION_CONFLICT`. Use this value in your code, not the message text. |
| `error.message` | `Card was updated by someone else`. A human-readable explanation. Do not parse it. |

The card is not changed by a rejected request. It is safe to retry after you have refreshed your copy.

> **Assumption:** The 409 response contains only the error object. It does not include the card's current version or current state. After a 409, your client must fetch the card again to learn the current version.

## What to do when you receive a 409

A 409 does not mean your request was invalid. It means your copy of the card is out of date. Do the following:

1. **Stop.** Do not resend the same request. It will fail again, because it still carries the old version.
2. **Fetch the current card.** Read the card again to get its current `version`, `columnId` and `position`.
3. **Decide whether your change still applies.** Compare the fresh card with what you intended. The other user may have already moved the card to the place you wanted, or somewhere that makes your move wrong.
4. **Resend with the new version,** or let the user choose, or abandon the change.
5. **Limit retries.** Retry a small number of times, for example 3, then show the user a message instead of looping.

Choose a strategy that fits your application:

| Strategy | When to use it | What it does |
|---|---|---|
| Refresh and ask | Changes the user typed or dragged by hand | Reload the card, show the user what changed, and let them confirm or redo their change. This is the safest choice. |
| Refresh and retry | Moves that do not depend on other state, such as a drag to a specific column | Reload the card, then send the same move with the new version. |
| Refresh and discard | Background or automated updates | Reload the card and drop your change. Another user's change wins. |

Do not copy the new version into your old request without reading the card. A blind retry makes the version check pointless, because it overwrites the other user's change in exactly the way the check exists to prevent.

## Example: move a card and recover from a conflict

The example uses Node.js 18 or later, which includes `fetch`. Set `TOKEN` to a valid JWT. See [Authentication](../getting-started/authentication.md).

```js
const BASE = "https://api.example.com/v2";
const TOKEN = process.env.TOKEN;

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

async function getCard(cardId) {
  const res = await fetch(`${BASE}/cards/${cardId}`, { headers });
  if (!res.ok) throw new Error(`GET card failed: ${res.status}`);
  return res.json();
}

async function moveCard(cardId, columnId, position, version) {
  return fetch(`${BASE}/cards/${cardId}/move`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ columnId, position, version }),
  });
}

async function moveCardSafely(cardId, columnId, position, maxAttempts = 3) {
  let card = await getCard(cardId);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await moveCard(cardId, columnId, position, card.version);

    if (res.ok) {
      return res.json(); // The updated card, with the new version.
    }

    const body = await res.json();

    if (res.status === 409 && body.error.code === "VERSION_CONFLICT") {
      // Our copy is out of date. Read the card again.
      card = await getCard(cardId);

      // Decide whether the move still makes sense.
      if (card.columnId === columnId && card.position === position) {
        return card; // Someone already made this exact move.
      }
      continue; // Try again with the fresh version.
    }

    throw new Error(`Move failed: ${body.error.code}`); // Any other error.
  }

  throw new Error("Card keeps changing. Ask the user to try again.");
}
```

> **Assumption:** `GET /cards/{cardId}` returns a single card object that includes `version`. The engineering notes describe the card object but do not list this endpoint. Adjust the `getCard` function if your reference page shows a different path.

## Seeing other people's changes before you conflict

You can reduce the number of conflicts by keeping your copy of each card current. When you join a board, you receive real time events, including `card.moved` when someone moves a card. Use these events to update the local card and its version as soon as someone else changes it. See [Real time events overview](realtime-events-overview.md) and [Real time events](../reference/realtime-events.md).

Events do not remove the need for the version check. An event can arrive after your user has already started a change, and two requests can reach the API at nearly the same time. Always send `version`, and always handle `409`.

> **Assumption:** The `card.moved` event's `data` object includes the card's new `version`. The notes list the event and its common fields (`boardId`, `actorId`, `timestamp`, `data`) but do not show what `data` contains.

## Common mistakes

| Mistake | Result | Fix |
|---|---|---|
| Omitting `version` from a move or update | The request is rejected. | Always send the version you last received. |
| Sending a version you calculated (for example, the old version plus 1) | A conflict, or worse, a change applied to a card you have not seen. | Send the exact version returned by the API. |
| Retrying the same request after a 409 | The same 409 again. | Fetch the card first, then send the new version. |
| Looping forever on 409 | Wasted requests and a stuck interface. | Limit attempts, then tell the user. |
| Matching on the message text | Breaks if the wording changes. | Check `error.code` equals `VERSION_CONFLICT`. |
| Using one card's version for another card | A conflict. | Track the version for each card separately. |

> **Assumption:** A request with a missing `version` is rejected with `400` and the code `VALIDATION_ERROR`. The notes say `version` is required but do not state the response.

## Summary

- Every card has a `version`. Send it with every move or update.
- If the version is current, the change is applied and the version increases by 1.
- If the version is out of date, the API returns `409 VERSION_CONFLICT` and changes nothing.
- On a 409, fetch the card again, decide whether your change still applies, then resend with the new version. Limit retries.
- Real time events help you stay current but do not replace the version check.

## Related pages

- [Handle a version conflict](../how-to/handle-a-version-conflict.md): the recovery steps as a short procedure.
- [Move a card](../how-to/move-a-card.md): the move request in detail.
- [Cards reference](../reference/cards.md): parameters, responses and error codes.
- [Errors reference](../reference/errors.md): every error code in v2.
- [Migrate from v1 to v2](../release-notes/migrate-v1-to-v2.md): adding `version` to existing requests.
- [Troubleshooting](../troubleshooting.md): fixes for common version errors.