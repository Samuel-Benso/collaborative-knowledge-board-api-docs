# Columns

A column is a vertical list of cards on a board, such as "To do", "In progress" or "Done". Every card belongs to exactly one column, and a card's `columnId` field says which one.

In v2, columns themselves are largely unchanged. What changed is how cards move between them and how card lists are returned. This page covers both.

**Base URL:** `https://api.example.com/v2`
**Authentication:** send `Authorization: Bearer <token>` on every request. See [Authentication](authentication.md).

> **How to read the markers on this page**
> Statements without a marker come from the v2 engineering notes. A **[Assumed]** marker means the page relies on something the notes do not state, and it is tied to a question number in [Open questions](../meta/open-questions.md). Verify every marked item against the live API before relying on it.

---

## What changed in v2

| Change | Type | Effect on columns |
|---|---|---|
| Cards now include `position` and `version` | Non-breaking | Cards in a column can be ordered by `position`. |
| New `PATCH /cards/{cardId}/move` endpoint | Non-breaking | The way to move a card within a column or into another one. |
| Card lists return a paginated object | **Breaking** | Reading the cards of a board no longer returns a plain array. See [Pagination](pagination.md). |
| New `card.moved` real time event | Non-breaking | Clients receive an event when a card changes column or position. |

Column endpoints themselves are not listed as changed in the v2 notes.

---

## The column object

```json
{
  "id": "col_2",
  "boardId": "b_9",
  "name": "In progress",
  "position": 1
}
```

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique column ID. Prefixed `col_`. This is the value a card carries in `columnId`. |
| `boardId` | string | The board the column belongs to. **[Assumed, Q32]** |
| `name` | string | Display name of the column. **[Assumed, Q32]** |
| `position` | integer | Order of the column on the board, starting at 0. **[Assumed, Q32]** |

> **[Assumed, Q32]** Only the `col_` ID format is confirmed by the engineering notes (`"columnId": "col_2"` on the card object). The other fields are carried over from the v1 column object and have not been re-verified for v2.

---

## Endpoints

> **[Assumed, Q32]** The v2 notes do not list column endpoints, so the paths below are the v1 paths re-based on `/v2`. Confirm them before publishing.

| Action | Method and path |
|---|---|
| List columns of a board | `GET /boards/{boardId}/columns` |
| Create a column | `POST /boards/{boardId}/columns` |
| Update a column | `PATCH /columns/{columnId}` |
| Delete a column | `DELETE /columns/{columnId}` |

### List columns of a board

```bash
curl https://api.example.com/v2/boards/b_9/columns \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200 OK`** **[Assumed, Q33]**

```json
[
  { "id": "col_1", "boardId": "b_9", "name": "To do", "position": 0 },
  { "id": "col_2", "boardId": "b_9", "name": "In progress", "position": 1 },
  { "id": "col_3", "boardId": "b_9", "name": "Done", "position": 2 }
]
```

> **[Assumed, Q33]** The v2 notes say only `GET /boards` and `GET /boards/{boardId}/cards` are paginated. This page therefore assumes the column list is still a plain array. If it is paginated, the response becomes `{ "data": [...], "page": 1, "pageSize": 20, "total": 3 }` and this page must change.

### Create, update and delete a column

These actions are unchanged from v1 and are not re-documented in v2. Use the v1 request and response bodies with the v2 base URL. **[Assumed, Q32]**

> **[Assumed, Q34]** The notes do not say what happens to the cards when a column is deleted (deleted with it, blocked with an error, or moved elsewhere). Do not delete a column that contains cards until this is confirmed.

---

## Get the cards in a column

There is no dedicated "cards in a column" endpoint in the v2 notes. Read the cards of the board and group them by `columnId`:

```bash
curl "https://api.example.com/v2/boards/b_9/cards?page=1&pageSize=100" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200 OK`**

```json
{
  "data": [
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
  ],
  "page": 1,
  "pageSize": 100,
  "total": 134
}
```

Group and sort on the client:

```js
const byColumn = {};
for (const card of response.data) {
  (byColumn[card.columnId] ??= []).push(card);
}
for (const cards of Object.values(byColumn)) {
  cards.sort((a, b) => a.position - b.position);
}
```

Two points to be aware of:

- **The cards of a board can span several pages.** `pageSize` defaults to 20 and has a maximum of 100. A column may therefore be split across pages, so keep requesting pages until you have received `total` cards. See [Paginate lists](../how-to/paginate-lists.md).
- **Sort order is not documented.** Always sort by `position` on the client. **[Assumed, Q35]**

---

## Move a card to another column

Use the move endpoint. Send the destination `columnId`, the new `position` inside that column, and the card's current `version`.

```bash
curl -X PATCH https://api.example.com/v2/cards/c_101/move \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "columnId": "col_3", "position": 0, "version": 4 }'
```

- `position` starts at 0. Position 0 is the top of the destination column.
- The response is the updated card, with `version` increased by 1.
- If `version` is not the card's current version, the API returns `409 VERSION_CONFLICT`. See [Handle a version conflict](../how-to/handle-a-version-conflict.md).

Full parameter, response and error details are in the [Move card reference](cards.md#move-a-card).

> **[Assumed, Q36]** The notes do not say what happens to the other cards when a card is inserted at a position. This page assumes the API shifts the cards at and below that position down by one in the destination column, and closes the gap in the source column. Do not rely on this until it is confirmed, and re-read the cards after a move.

> **[Assumed, Q37]** The notes do not say whether a card can be moved to a column on a different board, or what error is returned for a `columnId` that does not exist or a `position` that is out of range. Moving to a column of the same board is the only documented use.

### Receive the move in real time

When a card changes column or position, every client that has joined the board receives a `card.moved` event. See [Real time events](realtime-events.md#cardmoved) for the payload.

---

## Errors

Errors use this shape:

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Card was updated by someone else"
  }
}
```

| Status | Code | When it happens on a column-related request |
|---|---|---|
| 409 | `VERSION_CONFLICT` | The `version` sent with a card move is not the card's current version. |
| 401 | **[Assumed, Q31]** | The token is missing, invalid or expired. See [Authentication](authentication.md). |
| 404 | **[Assumed, Q37]** | The column or card does not exist. |

Only `VERSION_CONFLICT` is named in the engineering notes. The other codes are listed in [Errors](errors.md) once confirmed.

---

## Migrating from v1

| If your v1 code... | Then in v2 you must... |
|---|---|
| Reads the cards of a board as an array | Read `response.data`, and loop over pages using `page`, `pageSize` and `total`. |
| Changes a card's column by updating the card | Call `PATCH /cards/{cardId}/move` with `columnId`, `position` and `version`. **[Assumed, Q38]** |
| Ignores card order | Sort by the new `position` field. |

> **[Assumed, Q38]** The notes say "updating or moving a card now requires `version`" but document only the move endpoint. It is not stated whether the general card update still accepts a `columnId`. This page assumes column changes should go through the move endpoint.

Step-by-step instructions are in the [v1 to v2 migration guide](../release-notes/migrate-v1-to-v2.md).

---

## Related pages

- [Move a card](../how-to/move-a-card.md)
- [Cards reference](cards.md)
- [Boards reference](boards.md)
- [Pagination reference](pagination.md)
- [Real time events reference](realtime-events.md)
- [Conflicts and versions](../concepts/conflicts-and-versions.md)