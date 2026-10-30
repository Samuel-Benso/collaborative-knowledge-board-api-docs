# Migrate from v1 to v2

This guide shows what you must change in an application that uses v1 of the Collaborative Knowledge Board API so that it works with v2. Two changes are breaking, and your application will fail or lose data unless you make them. The rest of v2 is additive.

For the full list of what is new, see the [v2.0 release notes](v2.0.md).

> **How to read the markers on this page**
> Statements without a marker come from the v2 engineering notes. A **[Assumed]** marker means the page relies on something the notes do not state, and it is tied to a question number in [Open questions](../meta/open-questions.md). Verify every marked item against the live API before relying on it.

---

## Changes ranked by impact

| Rank | Change | Type | Who is affected | What breaks if you do nothing |
|---|---|---|---|---|
| 1 | [Updating or moving a card now requires `version`](#1-updating-or-moving-a-card-now-requires-version) | **Breaking** | Every application that updates or moves cards | Card updates and moves are rejected. **[Assumed, Q65]** |
| 2 | [List endpoints return paginated objects](#2-list-endpoints-return-paginated-objects) | **Breaking** | Every application that lists boards or the cards of a board | Your code fails to read the response, or silently loads only the first 20 items. |
| 3 | [Cards include `position` and `version`](#3-cards-include-position-and-version) | Non-breaking | Applications with strict card models | Nothing, unless your code rejects unknown fields. |
| 4 | [New: comments and real time events](#4-new-comments-and-real-time-events) | Non-breaking | No one, unless you want the features | Nothing. |

Do changes 1 and 2 before you switch production traffic to v2. They are the only changes that can break an existing application.

---

## Before you start

1. Change the base URL from the v1 URL to `https://api.example.com/v2`. **[Assumed, Q64]** The v1 base URL and the date that v1 stops working are not stated in the notes.
2. Keep your existing authentication. It is unchanged: log in to get a JWT and send it as `Authorization: Bearer <token>`. See [Authentication](../reference/authentication.md).
3. Work through the two breaking changes below, in order, and run the [test checklist](#test-your-migration).

---

## 1. Updating or moving a card now requires `version`

### What changed

Every card now has a `version` number. When you update or move a card, you must send the version you last read. If it is not the card's current version, the API rejects the request with `409 VERSION_CONFLICT`, because someone else changed the card after you read it. This protects users from overwriting each other's work.

### Who is affected

Any code that updates a card or moves it between columns or positions.

### What you must do

**Step 1. Keep the `version` of every card you load.** It is a field on the card object.

```json
{ "id": "c_101", "columnId": "col_2", "position": 1, "version": 4 }
```

**Step 2. Send `version` in the request body when you update or move a card.**

Before (v1), changing the column of a card:

```bash
curl -X PATCH https://api.example.com/v1/cards/c_101 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "columnId": "col_3" }'
```

After (v2), using the move endpoint:

```bash
curl -X PATCH https://api.example.com/v2/cards/c_101/move \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "columnId": "col_3", "position": 0, "version": 4 }'
```

The move endpoint takes `columnId`, `position` and `version`. `position` starts at 0.

> **[Assumed, Q38, Q65]** The notes say that updating a card requires `version`, but they document only the move endpoint. The path and body of the general card update are not documented, so this guide cannot show them. Add `version` to the body of that request in the same way, and use the move endpoint to change a card's column. The notes also do not state what is returned when `version` is missing. This guide assumes a `400` error.

**Step 3. Replace your stored version with the one in the response.** A successful request returns the updated card, and its `version` is the old version plus 1. Use it for the next change.

```js
async function moveCard(card, columnId, position) {
  const response = await fetch(
    `https://api.example.com/v2/cards/${card.id}/move`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${process.env.TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ columnId, position, version: card.version }),
    }
  );

  if (response.status === 409) {
    throw new Error("VERSION_CONFLICT");
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json(); // the updated card, with the new version
}
```

**Step 4. Handle `409 VERSION_CONFLICT`.** Do not retry the same request, because it will fail again. Instead:

1. Fetch the card again to get its current version and fields.
2. Decide whether your change still makes sense.
3. Send the request again with the new version, or drop your change and show the user the current card.

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Card was updated by someone else"
  }
}
```

The response does not contain the current version, so a second request is needed. **[Assumed, Q50]** Step-by-step instructions are in [Handle a version conflict](../how-to/handle-a-version-conflict.md), and the reasoning is in [Conflicts and versions](../concepts/conflicts-and-versions.md).

### How to check that it works

Move the same card twice using the same `version`. The first request must return `200` with `version` increased by 1. The second must return `409 VERSION_CONFLICT`.

---

## 2. List endpoints return paginated objects

### What changed

Two list endpoints used to return a plain array. They now return an object with the items in `data`, and they return only one page at a time.

| Endpoint | v1 response | v2 response |
|---|---|---|
| `GET /boards` | `[ {...}, {...} ]` | `{ "data": [...], "page": 1, "pageSize": 20, "total": 134 }` |
| `GET /boards/{boardId}/cards` | `[ {...}, {...} ]` | `{ "data": [...], "page": 1, "pageSize": 20, "total": 134 }` |

`pageSize` defaults to 20 and has a maximum of 100. Other list endpoints are assumed to be unchanged. **[Assumed, Q33]**

### Who is affected

Any code that lists boards or the cards of a board.

### What you must do

**Step 1. Read the items from `data`.**

Before (v1):

```js
const boards = await response.json();
boards.forEach(showBoard);
```

After (v2):

```js
const { data: boards } = await response.json();
boards.forEach(showBoard);
```

This alone is not enough. A board with more than 20 cards now returns only the first 20, and your code will not show the others, with no error.

**Step 2. Request every page.** Keep requesting pages until you have received `total` items. Use `pageSize=100` to make the fewest requests.

```js
async function fetchAll(path, token) {
  const items = [];
  let page = 1;

  while (true) {
    const url = `https://api.example.com/v2${path}?page=${page}&pageSize=100`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const body = await response.json();
    items.push(...body.data);

    if (body.data.length === 0 || items.length >= body.total) return items;
    page += 1;
  }
}

const cards = await fetchAll("/boards/b_9/cards", process.env.TOKEN);
```

**Step 3. Use `total` for counts.** `data.length` is the number of items on the current page, not the number of items in total.

**Step 4. Sort cards by `position` yourself.** The order of items inside `data` is not documented. **[Assumed, Q35]** See [Columns](../reference/columns.md#get-the-cards-in-a-column).

Full details are in [Pagination](../reference/pagination.md) and [Paginate lists](../how-to/paginate-lists.md).

### How to check that it works

Load a board with more than 20 cards, and check that the number of cards you show equals `total`.

---

## 3. Cards include `position` and `version`

**Type:** non-breaking.

Two new fields appear on every card: `position` (where the card sits in its column, starting at 0) and `version` (used by [change 1](#1-updating-or-moving-a-card-now-requires-version)).

**What you must do:** nothing, unless your code rejects fields it does not know. A strict model or a schema validator that fails on unknown fields will fail on these two. Add both fields to your card model.

---

## 4. New: comments and real time events

**Type:** non-breaking.

v2 adds threaded comments, with edit and delete, and real time events for new cards, moved cards and new comments.

**What you must do:** nothing, if you do not need them. To use them, see the [Comments reference](../reference/comments.md) and the [Real time events reference](../reference/realtime-events.md), or start with the [Quickstart](../getting-started/quickstart-move-card-realtime.md).

---

## Test your migration

Work through this list against v2 before you release.

| # | Check | Expected result |
|---|---|---|
| 1 | Your base URL is `https://api.example.com/v2`. | Requests reach v2. |
| 2 | Log in and call `GET /boards`. | Your code reads `data` and shows the boards. |
| 3 | Load a board with more than 20 cards. | The number of cards shown equals `total`. |
| 4 | Move a card with its current `version`. | The response is `200` and `version` is 1 higher. |
| 5 | Move the same card again with the old `version`. | The response is `409 VERSION_CONFLICT`, and your application fetches the card again instead of failing. |
| 6 | Load a card with `position` and `version` in a strict model. | No parsing error. |

---

## If you cannot migrate yet

> **[Assumed, Q64]** The notes do not say whether v1 remains available after v2 launches, or when it will stop working. Do not assume that v1 continues to work. Plan to complete the two breaking changes, and ask the API team for the v1 end date.

---

## Related pages

- [v2.0 release notes](v2.0.md)
- [Handle a version conflict](../how-to/handle-a-version-conflict.md)
- [Conflicts and versions](../concepts/conflicts-and-versions.md)
- [Pagination](../reference/pagination.md)
- [Cards reference](../reference/cards.md)
- [Errors](../reference/errors.md)