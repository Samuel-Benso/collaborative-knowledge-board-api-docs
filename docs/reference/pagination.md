# Pagination

List endpoints in v2 return results one page at a time. Each response contains a page of items and the numbers you need to request the rest.

> **Breaking change from v1.** In v1, list endpoints returned a plain array. In v2 they return an object, and the array is inside its `data` field. Code written for v1 will fail until you update it. See the [v1 to v2 migration guide](../release-notes/migrate-v1-to-v2.md#2-list-endpoints-return-paginated-objects).

**Base URL:** `https://api.example.com/v2`
**Authentication:** send `Authorization: Bearer <token>` on every request. See [Authentication](authentication.md).

> **How to read the markers on this page**
> Statements without a marker come from the v2 engineering notes. A **[Assumed]** marker means the page relies on something the notes do not state, and it is tied to a question number in [Open questions](../meta/open-questions.md). Verify every marked item against the live API before relying on it.

---

## Paginated endpoints

| Endpoint | Returns |
|---|---|
| `GET /boards` | A page of boards. |
| `GET /boards/{boardId}/cards` | A page of the cards on a board. |

These are the only two endpoints that the v2 notes describe as paginated. Other list endpoints, such as the columns of a board, are assumed to still return plain arrays. **[Assumed, Q33]**

---

## Request parameters

| Parameter | Type | Default | Maximum | Description |
|---|---|---|---|---|
| `page` | integer | 1 | None documented | The page to return. The first page is 1. |
| `pageSize` | integer | 20 | 100 | The number of items on each page. |

Both are query parameters and both are optional. If you send neither, you get the first 20 items.

> **[Assumed, Q51]** The notes give the default and the maximum for `pageSize`, but not what happens above 100 or when `page` is beyond the last page. This page assumes that a `page` beyond the last page returns an empty `data` array, and it tells you to stay within the limits so that you do not depend on either behavior. Page numbering starting at 1 is shown in the notes' example response.

### Example request

```bash
curl "https://api.example.com/v2/boards/b_9/cards?page=1&pageSize=20" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Response

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
  "pageSize": 20,
  "total": 134
}
```

| Field | Type | Description |
|---|---|---|
| `data` | array | The items on this page. The items are the same objects that v1 returned in the array. |
| `page` | integer | The page number that this response contains. |
| `pageSize` | integer | The page size that was used. |
| `total` | integer | The total number of items across all pages. |

The response has no `next` link, no `hasMore` flag and no page count. Work these out from `total` and `pageSize`.

---

## Work out the number of pages

```
pageCount = ceil(total / pageSize)
```

For the example above, `ceil(134 / 20)` is 7. Pages 1 to 6 have 20 items each, and page 7 has 14.

You have reached the last page when `page * pageSize >= total`.

---

## Read every page

Request pages until you have collected `total` items.

```js
async function* fetchAll(path, token, pageSize = 100) {
  let page = 1;
  let received = 0;

  while (true) {
    const url = `https://api.example.com/v2${path}?page=${page}&pageSize=${pageSize}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const body = await response.json();
    yield* body.data;

    received += body.data.length;
    if (body.data.length === 0 || received >= body.total) return;
    page += 1;
  }
}

for await (const card of fetchAll("/boards/b_9/cards", process.env.TOKEN)) {
  console.log(card.id, card.title);
}
```

The loop stops when `received` reaches `total`, and also when a page comes back empty, so a change in the data cannot make it run forever.

Using `pageSize=100`, which is the maximum, gives the fewest requests. For the 134 cards in the example this takes 2 requests instead of 7.

---

## Order of results

> **[Assumed, Q35, Q54]** The notes do not say how items are sorted. Do not rely on the order of items inside `data`, and do not assume it is the same from one request to the next. For cards, sort by `position` on the client after you have received all the pages.

Cards from one column can be spread across pages, so you must read all pages before you show a column. See [Columns](columns.md#get-the-cards-in-a-column).

---

## Data that changes while you read

> **[Assumed, Q55]** The notes do not say what happens when items are added or removed between your page requests. With page-number pagination, adding an item can push one item onto the next page so that you see it twice, and removing an item can pull one back so that you miss it.

To protect your application:

- Remove duplicates by `id` when you combine pages.
- If your application receives [real time events](realtime-events.md), apply `card.created` and `card.moved` events to your list as they arrive, and do not treat the page data as a final answer.
- After loading all pages, compare the number of items that you hold to `total` and reload if they differ.

---

## Errors

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` **[Assumed, Q51]** | `page` or `pageSize` is not a whole number, or is below 1. |
| 401 | `UNAUTHORIZED` **[Assumed, Q47]** | The token is missing, invalid or expired. |
| 404 | `NOT_FOUND` **[Assumed, Q47]** | The board in the path does not exist. |

See [Errors](errors.md) for the error format.

---

## Update code from v1

| In v1 | In v2 |
|---|---|
| `const boards = await response.json();` | `const { data: boards, total } = await response.json();` |
| One request returned every item. | One request returns at most 100 items. Loop over pages to get all of them. |
| `boards.length` was the number of boards. | `total` is the number of boards. `data.length` is the number on this page. |

There are two ways to get this wrong. If you keep treating the response as an array, your code fails with errors such as "response.map is not a function". If you read `data` but do not loop over pages, your code runs without errors but silently loads only the first 20 items of any list that is longer than 20.

---

## Related pages

- [Paginate lists](../how-to/paginate-lists.md)
- [Boards reference](boards.md)
- [Cards reference](cards.md)
- [Columns reference](columns.md)
- [v1 to v2 migration guide](../release-notes/migrate-v1-to-v2.md)
- [Errors reference](errors.md)