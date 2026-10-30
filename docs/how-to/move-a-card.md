# Move a Card

A card can be moved to a different position within its current column or transferred to another column on the same board.

The Collaborative Knowledge Board API v2 uses a dedicated move endpoint and version checking to ensure that a card is not moved using outdated information.

This guide explains how to move a card, understand its position, and handle a version conflict.

## Before you begin

You need:

* An API v2 access token.
* The ID of the card you want to move.
* The ID of the destination column.
* The current version of the card.

Include your access token in the request header:

```http
Authorization: Bearer <token>
```

The API base URL is:

```text
https://api.example.com/v2
```

For authentication instructions, see [Authentication](../getting-started/authentication.md).

## Move a card

Use the following endpoint:

```http
PATCH /cards/{cardId}/move
```

### Path parameters

| Parameter | Type   | Required | Description             |
| --------- | ------ | -------- | ----------------------- |
| `cardId`  | string | Yes      | ID of the card to move. |

### Request body

| Field      | Type    | Required | Description                                                                              |
| ---------- | ------- | -------- | ---------------------------------------------------------------------------------------- |
| `columnId` | string  | Yes      | ID of the destination column.                                                            |
| `position` | integer | Yes      | Target position of the card in the destination column. Position numbering starts at `0`. |
| `version`  | integer | Yes      | Current version of the card. Used to detect concurrent changes.                          |

### Example request

The following request moves card `c_101` to the first position in column `col_3`.

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

The `position` value is zero-based:

| Position | Meaning         |
| -------- | --------------- |
| `0`      | First position  |
| `1`      | Second position |
| `2`      | Third position  |
| `3`      | Fourth position |

To move a card within its current column, provide that column's ID as `columnId` and specify the new position.

## Understand the response

A successful move returns the updated card. Its version increases by one.

For example, if the card was at version `4` before the move, the returned card has version `5`.

```json
{
  "id": "c_101",
  "title": "Write launch plan",
  "description": "Prepare the launch documentation.",
  "columnId": "col_3",
  "position": 0,
  "version": 5,
  "tags": ["launch"],
  "dueDate": "2026-11-01",
  "updatedAt": "2026-10-20T09:20:00Z"
}
```

The important fields to check are:

* `columnId`: confirms the card's destination column.
* `position`: confirms its new position.
* `version`: identifies the updated card revision.

Update your local card state using the returned object. Use its new version for the next card update or move request.

The exact successful HTTP status code and whether the response is wrapped in a `data` object are not specified in the available engineering notes.

## Handle a version conflict

The API requires the current card version when moving a card.

If another user updates or moves the card before your request is processed, the version you submit may no longer be current. The API rejects the request with:

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

### What to do

1. Stop the current move attempt.
2. Retrieve the latest card state.
3. Review the changes made by the other user.
4. Confirm whether the intended move is still appropriate.
5. If it is, submit a new move request using the latest card version.

Do not repeat the same request with the stale version. Do not automatically retry with a newer version without reviewing the updated card.

For a detailed walkthrough, see [Handle a Version Conflict](handle-a-version-conflict.md).

## Example: Moving a card after refreshing its version

Assume you initially read a card at version `4`.

You submit a move request:

```json
{
  "columnId": "col_3",
  "position": 0,
  "version": 4
}
```

Another user has already updated the card, so the API returns `409 VERSION_CONFLICT`.

After retrieving the latest card, you find that its version is now `5`.

If the intended move is still valid, submit the request again:

```json
{
  "columnId": "col_3",
  "position": 0,
  "version": 5
}
```

If successful, the API returns the updated card with version `6`.

Always use the version returned by the latest successful operation or card retrieval.

## Common mistakes

| Mistake                                       | Why it causes problems                            | What to do instead                                    |
| --------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| Omitting `version`                            | The move request requires a version value.        | Include the card's current version.                   |
| Reusing an old version                        | Another user may have changed the card.           | Retrieve the latest card and use its current version. |
| Starting positions at `1`                     | Card positions are zero-based.                    | Use `0` for the first position.                       |
| Ignoring the response                         | The card may have a new position and version.     | Update local state using the returned card.           |
| Retrying a conflict without reviewing changes | The original action may no longer be appropriate. | Refresh, review, and then decide whether to retry.    |

## Questions for engineering

The following behaviours are not defined in the available engineering notes and require confirmation.

| Area                   | Question                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Position validation    | What happens when the requested position is greater than the number of cards in the destination column?                 |
| Position adjustment    | When a card moves, does the API automatically shift the positions of other cards in the source and destination columns? |
| Same-column moves      | Does the endpoint use the same behaviour for reordering a card within its current column?                               |
| Destination validation | What response is returned when `columnId` does not identify a valid column or belongs to another board?                 |
| Permissions            | What permissions are required to move a card?                                                                           |
| Successful response    | What HTTP status code and response envelope does a successful move return?                                              |
| Atomicity              | Are the card move and position adjustments applied atomically?                                                          |
| Concurrent changes     | Does the version check cover both card updates and moves?                                                               |

## Related documentation

* [Handle a Version Conflict](handle-a-version-conflict.md)
* [Conflicts and Versions](../concepts/conflicts-and-versions.md)
* [Cards API Reference](../reference/cards.md)
* [Columns API Reference](../reference/columns.md)
* [Real-time Events Overview](../concepts/realtime-events-overview.md)
