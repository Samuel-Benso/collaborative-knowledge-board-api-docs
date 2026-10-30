# Handle a Version Conflict

The Collaborative Knowledge Board API uses version numbers to prevent one user from accidentally overwriting another user's changes.

A version conflict occurs when a client submits an update using a card version that is no longer current. This can happen when another board member edits or moves the same card before the first user's changes are saved.

The API identifies this situation with the HTTP status `409 Conflict` and the error code `VERSION_CONFLICT`.

This guide explains how to detect a conflict, retrieve the latest card state, and help the user decide what to do next.

## Understand card versions

Every card has a `version` field.

For example:

```json
{
  "id": "c_101",
  "title": "Write launch plan",
  "description": "Prepare the launch documentation.",
  "columnId": "col_2",
  "position": 1,
  "version": 4,
  "tags": ["launch"],
  "dueDate": "2026-11-01",
  "updatedAt": "2026-10-20T09:15:00Z"
}
```

The `version` field identifies the current revision of the card.

When a client updates or moves a card, it must include the version it last received. The API checks that value against the current version.

* If the submitted version is current, the operation can proceed.
* If another user has changed the card and the submitted version is stale, the API rejects the operation with `409 Conflict`.
* When a card move succeeds, the returned card has a version incremented by one.

This check prevents an older client state from silently overwriting a newer one.

## When a conflict occurs

Consider this sequence:

1. Samuel opens a card. Its version is `4`.
2. Another board member updates the card. Its version becomes `5`.
3. Samuel attempts to move the card using version `4`.
4. The API compares the submitted version with the current version.
5. Because version `4` is stale, the API rejects the move.

The client receives:

```http
HTTP/1.1 409 Conflict
Content-Type: application/json
```

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Card was updated by someone else"
  }
}
```

A `409 Conflict` response means the operation was not accepted because the card has changed since the client last read it.

Do not automatically repeat the same request with the same version. It will continue to use stale data.

## Handle the conflict

When the API returns `409 VERSION_CONFLICT`, the client should:

1. **Keep the user's pending changes.** Do not discard the intended action.
2. **Retrieve the latest card state.** Use the card retrieval operation provided by the API.
3. **Compare the latest state with the user's intended changes.** Identify whether the other user's update affects the same fields or operation.
4. **Present the difference to the user when necessary.** Explain that another user changed the card.
5. **Let the user decide how to proceed.** The user can accept the latest state, revise the intended change, or retry if the change is still appropriate.
6. **Submit a new request with the latest version.** Use the version from the refreshed card.

The refreshed version must be included in the next update or move request.

> **Important:** Refreshing the card does not mean the user's original action should be repeated automatically. The client should first account for the changes made by the other user.

## Example: Moving a card with version checking

The move endpoint is:

```http
PATCH /cards/{cardId}/move
```

It accepts the destination column, target position, and current card version.

### Step 1: Submit the move

Assume the client has a card at version `4` and wants to move it to position `0` in column `col_3`.

```http
PATCH https://api.example.com/v2/cards/c_101/move
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "columnId": "col_3",
  "position": 0,
  "version": 4
}
```

### Step 2: Handle a stale version

If another user has already changed the card, the API returns:

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Card was updated by someone else"
  }
}
```

The client should stop the current move attempt and retrieve the latest card state.

### Step 3: Refresh the card

Retrieve the latest card using the card retrieval operation supported by the API.

The exact retrieval endpoint and response contract are not specified in the available engineering notes. The following object illustrates the updated card state, not a confirmed response from a particular retrieval endpoint:

```json
{
  "id": "c_101",
  "title": "Write launch plan",
  "description": "Prepare the launch documentation.",
  "columnId": "col_2",
  "position": 2,
  "version": 5,
  "tags": ["launch"],
  "dueDate": "2026-11-01",
  "updatedAt": "2026-10-20T09:20:00Z"
}
```

The card is now at version `5`.

### Step 4: Review and retry

After reviewing the refreshed card, the user can decide whether the move should still happen.

If the intended move is still valid, submit a new request using version `5`:

```http
PATCH https://api.example.com/v2/cards/c_101/move
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "columnId": "col_3",
  "position": 0,
  "version": 5
}
```

If the move succeeds, the API returns the updated card with its version incremented to `6`.

The next update or move must use the newly returned version.

## Conflict-handling sequence

The following sequence shows how the client and API interact when a version conflict occurs.

```text
Client                         API
  |                             |
  | Read card (version 4)       |
  |---------------------------->|
  |                             |
  | Card returned (version 4)   |
  |<----------------------------|
  |                             |
  | Another user changes card   |
  |                             |
  | Move card (version 4)       |
  |---------------------------->|
  |                             |
  | 409 VERSION_CONFLICT        |
  |<----------------------------|
  |                             |
  | Retrieve latest card        |
  |---------------------------->|
  |                             |
  | Latest card (version 5)     |
  |<----------------------------|
  |                             |
  | User reviews changes        |
  |                             |
  | Retry move (version 5)      |
  |---------------------------->|
  |                             |
  | Updated card (version 6)    |
  |<----------------------------|
```

## Recommended client behaviour

A well-designed client should make version conflicts understandable and recoverable.

| Situation                                         | Recommended behaviour                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| A move succeeds                                   | Replace the local card state with the returned card, including its new version. |
| The API returns `409 VERSION_CONFLICT`            | Stop the current attempt and refresh the card.                                  |
| The latest card differs from the local copy       | Show the updated information and preserve the user's pending action for review. |
| The user confirms the action is still appropriate | Submit a new request using the latest version.                                  |
| The user no longer wants the action               | Discard the pending action and retain the refreshed card state.                 |

Avoid silently retrying a failed request with a newer version. Doing so could overwrite another user's work without giving the original user an opportunity to review the changes.

## Important implementation considerations

* **Always use the latest version.** Do not reuse a version from an old local copy after a conflict.
* **Update local state after success.** The successful move response contains the incremented version.
* **Preserve pending user intent.** A rejected request should not cause the client to lose the action the user attempted.
* **Do not treat every error as a version conflict.** Handle `409 VERSION_CONFLICT` separately from other API errors.
* **Avoid blind retries.** A refreshed version alone does not establish that the original action is still appropriate.

## Questions for engineering

The following details are not defined in the available engineering notes and require confirmation.

| Area                   | Question                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Card retrieval         | What endpoint should clients call to retrieve the latest state of an individual card?                                       |
| Conflict response      | Does the `409 VERSION_CONFLICT` response include the latest card object, or must clients make a separate retrieval request? |
| General updates        | Which card update endpoint requires the version field, and does it follow the same conflict behaviour as the move endpoint? |
| Concurrent changes     | Are card updates and moves checked atomically against the submitted version?                                                |
| Retry behaviour        | Are there any recommended retry limits or backoff rules?                                                                    |
| Field-level comparison | Does the API expose enough information for clients to identify which fields changed?                                        |
| Real-time updates      | Can clients use `card.moved` or another real-time event to refresh stale card state before submitting an operation?         |

## Related documentation

* [Move a Card](move-a-card.md)
* [Conflicts and Versions](../concepts/conflicts-and-versions.md)
* [Cards API Reference](../reference/cards.md)
* [Error Reference](../reference/errors.md)
* [Real-time Events Overview](../concepts/realtime-events-overview.md)
