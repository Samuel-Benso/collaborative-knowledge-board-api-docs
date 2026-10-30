# Cards: Move a Card

Use this endpoint to move a card to a different position in its column, or to a different column. Every move must include the card's current `version`, which protects against two people changing the same card at the same time.

**On this page**

- [The card object](#the-card-object)
- [Move a card](#move-a-card)
- [Handling a version conflict](#handling-a-version-conflict)
- [Open questions](#open-questions)

**Tags used on this page**

| Tag | Meaning |
|---|---|
| **[MISSING]** | The engineering notes do not say |
| **[UNCLEAR]** | The notes can be read in more than one way |
| **[ASSUMED]** | This page states a value that has not been confirmed |

All questions are tracked by number (for example Q9) in the Open Questions log.

**Base URL:** `https://api.example.com/v2`

---

## The card object

Every endpoint that returns a card uses this shape. Version 2 adds `position` and `version`.

```json
{
  "id": "c_101",
  "title": "Write launch plan",
  "description": "Draft the plan for the November launch",
  "columnId": "col_2",
  "position": 1,
  "version": 4,
  "tags": ["launch"],
  "dueDate": "2026-11-01",
  "updatedAt": "2026-10-20T09:15:00Z"
}
```

| Field | Type | New in v2 | Description |
|---|---|---|---|
| `id` | string | No | Unique card ID |
| `title` | string | No | Card title |
| `description` | string | No | Longer details about the task |
| `columnId` | string | No | The column that holds the card |
| `position` | integer | **Yes** | The card's order within its column. Starts at `0` |
| `version` | integer | **Yes** | A counter that identifies the card's current state. Send it when you move or update the card |
| `tags` | array of strings | No | Labels on the card |
| `dueDate` | string or null | No | Due date, shown as `YYYY-MM-DD` **[UNCLEAR]** (Q19) |
| `updatedAt` | string | No | When the card last changed, in ISO 8601 UTC |

> **[MISSING]** The first value of `version` and the rule for how it increases are not stated. This page assumes it starts at `1` and increases by `1` each time the card changes (Q27).

---

## Move a card

`PATCH /cards/{cardId}/move`

Moves a card to a position in a column. The column can be the card's current column (to reorder it) or a different column (to move it across).

### Authentication

Required. Send your JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

### Permissions

> **[MISSING]** The notes do not say who may move a card. This page assumes any user with access to the board can move its cards (Q30).

### Path parameters

| Parameter | Type | Description |
|---|---|---|
| `cardId` | string | The ID of the card to move, for example `c_101` |

### Request body

| Field | Type | Required | Description |
|---|---|---|---|
| `columnId` | string | Yes | The ID of the column the card should end up in |
| `position` | integer | Yes | The card's new position in that column. Positions start at `0` |
| `version` | integer | Yes | The card's current `version`, as you last received it |

Set `Content-Type: application/json` on the request.

> **[MISSING]** The notes do not say what happens to the other cards in the column, what the valid range of `position` is, or how a move within the same column works. This page assumes the other cards shift so positions stay continuous, and that a `position` outside the valid range, or a `columnId` that does not exist, is rejected (Q9).

### Example request

Move card `c_101` to the first position in column `col_3`. The card's current version is `4`.

```bash
curl -X PATCH "https://api.example.com/v2/cards/c_101/move" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "columnId": "col_3",
    "position": 0,
    "version": 4
  }'
```

### Example response

`200 OK`

The response is the updated card. Its `version` is one higher than the version you sent.

```json
{
  "id": "c_101",
  "title": "Write launch plan",
  "description": "Draft the plan for the November launch",
  "columnId": "col_3",
  "position": 0,
  "version": 5,
  "tags": ["launch"],
  "dueDate": "2026-11-01",
  "updatedAt": "2026-10-20T09:30:00Z"
}
```

Store the new `version` (`5`). You must send it with your next move or update of this card.

### Errors

Errors use this shape:

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Card was updated by someone else"
  }
}
```

| Status | Code | Cause | What to do |
|---|---|---|---|
| 409 | `VERSION_CONFLICT` | The `version` you sent is not the card's current version, because someone else changed the card first | Fetch the card again, check whether your move still makes sense, then retry with the new `version`. See [Handling a version conflict](#handling-a-version-conflict) |
| 400 | `VALIDATION_ERROR` **[ASSUMED]** | `columnId`, `position` or `version` is missing or invalid, or `position` is out of range | Check the request body against the table above |
| 401 | `UNAUTHORIZED` **[ASSUMED]** | Missing, invalid or expired token | Log in again and retry |
| 403 | `FORBIDDEN` **[ASSUMED]** | You do not have access to this board | Confirm you are using the correct account |
| 404 | `CARD_NOT_FOUND` / `COLUMN_NOT_FOUND` **[ASSUMED]** | The card or the target column does not exist | Check the IDs |

> **[MISSING]** Only `VERSION_CONFLICT` is named in the engineering notes. The other codes above follow the conventions of version 1 and need to be confirmed (Q28).

### Real time

> **[ASSUMED]** A successful move sends a `card.moved` event to every client that has joined the board. See the Real Time Events guide for the payload (Q6).

---

## Handling a version conflict

A `409 VERSION_CONFLICT` means your change was rejected, and nothing was moved. The card was changed by someone else after you last read it.

Follow these steps:

1. Fetch the card again to get its current `version` and `columnId`.
2. Decide whether your move still makes sense. For example, the card may already have been moved to the column you wanted.
3. If it does, send the move again with the new `version`.
4. If it does not, show the user the current state instead.

Do not retry with the same `version`. It will fail every time.

> **[MISSING]** The 409 response does not state whether it includes the card's current `version` (Q3). Until this is confirmed, always fetch the card again.

For the full explanation and a diagram, see the Conflicts and Versions guide.

---

## Open questions

These questions affect the content of this page. Each is tracked in the Open Questions log.

| ID | Question | Used on this page for |
|---|---|---|
| Q3 | Does the 409 response include the current `version` or card? | Handling a version conflict |
| Q6 | What does the `data` object of `card.moved` contain? | Real time |
| Q9 | How does a move affect other cards? What is the valid range of `position`, and what errors does an invalid value return? | Request body, errors |
| Q19 | What is the format of `dueDate`? | The card object |
| Q27 | What is the first `version`, and does every change increase it by 1? | The card object |
| Q28 | What are the full v2 error codes? | Errors |
| Q30 | Who may move a card? | Permissions |