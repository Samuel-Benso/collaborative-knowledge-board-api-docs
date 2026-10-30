# Boards

A board is the top-level container in the Collaborative Knowledge Board API. A board holds columns, and columns hold cards. Use these endpoints to create, list, update and delete boards.

**On this page**

- [The board object](#the-board-object)
- [Create a board](#create-a-board)
- [List boards](#list-boards)
- [Update a board](#update-a-board)
- [Delete a board](#delete-a-board)
- [Errors that apply to every endpoint](#errors-that-apply-to-every-endpoint)
- [Open questions](#open-questions)

**Tags used on this page**

| Tag | Meaning |
|---|---|
| **[MISSING]** | The engineering notes do not say |
| **[UNCLEAR]** | The notes can be read in more than one way |
| **[ASSUMED]** | This page states a value that has not been confirmed |

Questions are tracked by number (for example Q17) in the Open Questions log.

**Base URL:** `https://api.example.com/v2`
**Authentication:** Required on every endpoint on this page. Send `Authorization: Bearer <token>`. See Authentication.

---

## The board object

```json
{
  "id": "b_9",
  "title": "Launch Planning",
  "description": "Everything for the November launch",
  "ownerId": "u_3",
  "createdAt": "2026-10-20T09:00:00Z",
  "updatedAt": "2026-10-20T09:00:00Z"
}
```

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique board ID. Use it in column and card paths and when joining a board for real time events |
| `title` | string | Board name |
| `description` | string | Short description. Can be empty |
| `ownerId` | string | The ID of the user who created the board |
| `createdAt` | string | When the board was created, in ISO 8601 UTC |
| `updatedAt` | string | When the board last changed, in ISO 8601 UTC |

> **[MISSING]** The v2 engineering notes do not describe the board object. The fields above come from version 1, with the version 2 ID prefix `b_` (Q20, Q33).

---

## Create a board

`POST /boards`

Creates a board owned by the authenticated user.

### Request body

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | Yes | Board name. Maximum length is not documented **[MISSING]** (Q28) |
| `description` | string | No | Short description of the board |

Set `Content-Type: application/json` on the request.

### Example request

```bash
curl -X POST "https://api.example.com/v2/boards" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Launch Planning",
    "description": "Everything for the November launch"
  }'
```

### Example response

`201 Created`

```json
{
  "id": "b_9",
  "title": "Launch Planning",
  "description": "Everything for the November launch",
  "ownerId": "u_3",
  "createdAt": "2026-10-20T09:00:00Z",
  "updatedAt": "2026-10-20T09:00:00Z"
}
```

Save the board `id`. You need it to create columns and to join the board for real time events.

### Errors

| Status | Code | Cause | What to do |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` **[ASSUMED]** | `title` is missing or empty | Add a `title` to the request body |
| 401 | `UNAUTHORIZED` **[ASSUMED]** | Missing, invalid or expired token | Log in again and retry |

---

## List boards

`GET /boards`

Returns the boards the authenticated user can access, one page at a time.

> **Breaking change in v2.** This endpoint now returns an object with a `data` array and paging fields. In v1 it returned a plain array. See the Migration Guide.

### Query parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | integer | No | `1` | The page number to return |
| `pageSize` | integer | No | `20` | The number of boards per page. Maximum `100` |

> **[UNCLEAR]** Version 1 documentation used `limit` for the page size. Version 2 uses `pageSize`. It is not stated whether `limit` is still accepted (Q18).

### Example request

```bash
curl "https://api.example.com/v2/boards?page=1&pageSize=20" \
  -H "Authorization: Bearer $TOKEN"
```

### Example response

`200 OK`

```json
{
  "data": [
    {
      "id": "b_9",
      "title": "Launch Planning",
      "description": "Everything for the November launch",
      "ownerId": "u_3",
      "createdAt": "2026-10-20T09:00:00Z",
      "updatedAt": "2026-10-20T09:00:00Z"
    },
    {
      "id": "b_12",
      "title": "Content Calendar",
      "description": "",
      "ownerId": "u_3",
      "createdAt": "2026-10-21T11:30:00Z",
      "updatedAt": "2026-10-21T11:30:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 2
}
```

| Field | Type | Description |
|---|---|---|
| `data` | array | The boards on this page |
| `page` | integer | The page you requested |
| `pageSize` | integer | The page size used |
| `total` | integer | The total number of boards across all pages |

### Get every board

Request pages until you have collected `total` items. For example, if `total` is `134` and `pageSize` is `100`, you need two requests: `page=1` and `page=2`.

```js
async function getAllBoards(token) {
  const boards = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const res = await fetch(
      `https://api.example.com/v2/boards?page=${page}&pageSize=${pageSize}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const body = await res.json();
    boards.push(...body.data);

    if (boards.length >= body.total || body.data.length === 0) break;
    page += 1;
  }
  return boards;
}
```

### Edge cases

> **[MISSING]** The notes do not describe what happens when `page` is past the last page, when `pageSize` is above `100`, or what order boards are returned in (Q17). This page assumes a page past the end returns an empty `data` array, and that a `pageSize` above `100` returns `400 VALIDATION_ERROR`.

If you have no boards, `data` is an empty array and `total` is `0`. This is not an error.

### Errors

| Status | Code | Cause | What to do |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` **[ASSUMED]** | `page` or `pageSize` is not a positive integer, or `pageSize` is above `100` | Correct the query parameters |
| 401 | `UNAUTHORIZED` **[ASSUMED]** | Missing, invalid or expired token | Log in again and retry |

---

## Update a board

`PATCH /boards/{boardId}`

Changes a board's title or description. Send only the fields you want to change.

> **[UNCLEAR]** The v2 notes say that updating a card requires `version`. They do not say whether boards have a `version`. This page assumes boards do not (Q2).

### Path parameters

| Parameter | Type | Description |
|---|---|---|
| `boardId` | string | The ID of the board, for example `b_9` |

### Request body

Send at least one field.

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | No | The new board name |
| `description` | string | No | The new description |

### Example request

```bash
curl -X PATCH "https://api.example.com/v2/boards/b_9" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "title": "November Launch Planning" }'
```

### Example response

`200 OK`

```json
{
  "id": "b_9",
  "title": "November Launch Planning",
  "description": "Everything for the November launch",
  "ownerId": "u_3",
  "createdAt": "2026-10-20T09:00:00Z",
  "updatedAt": "2026-10-20T10:15:00Z"
}
```

### Permissions

> **[MISSING]** The notes do not say who may update a board. This page assumes only users with access to the board can update it (Q33).

### Errors

| Status | Code | Cause | What to do |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` **[ASSUMED]** | The body is empty, or a field has an invalid value | Send at least one valid field |
| 401 | `UNAUTHORIZED` **[ASSUMED]** | Missing, invalid or expired token | Log in again and retry |
| 403 | `FORBIDDEN` **[ASSUMED]** | You do not have permission to change this board | Confirm you are using the correct account |
| 404 | `BOARD_NOT_FOUND` **[ASSUMED]** | No board exists with this ID | Check the ID, or list your boards |

---

## Delete a board

`DELETE /boards/{boardId}`

Deletes a board.

> **[MISSING]** The notes do not say whether deleting a board also deletes its columns, cards and comments, or whether a deleted board can be restored. This page assumes the deletion is permanent and removes everything inside the board (Q32). Do not call this endpoint on data you need until this is confirmed.

### Path parameters

| Parameter | Type | Description |
|---|---|---|
| `boardId` | string | The ID of the board to delete |

### Example request

```bash
curl -X DELETE "https://api.example.com/v2/boards/b_9" \
  -H "Authorization: Bearer $TOKEN"
```

### Example response

`204 No Content`

The response has no body.

### Permissions

> **[MISSING]** The notes do not say who may delete a board. This page assumes only the board owner can (Q33).

### Errors

| Status | Code | Cause | What to do |
|---|---|---|---|
| 401 | `UNAUTHORIZED` **[ASSUMED]** | Missing, invalid or expired token | Log in again and retry |
| 403 | `FORBIDDEN` **[ASSUMED]** | You are not allowed to delete this board | Ask the board owner |
| 404 | `BOARD_NOT_FOUND` **[ASSUMED]** | No board exists with this ID. It may already be deleted | Check the ID, or list your boards |

---

## Errors that apply to every endpoint

All errors use the same shape:

```json
{
  "error": {
    "code": "BOARD_NOT_FOUND",
    "message": "Board not found"
  }
}
```

| Status | Code | Meaning |
|---|---|---|
| 401 | `UNAUTHORIZED` **[ASSUMED]** | The token is missing, invalid or expired |
| 429 | `RATE_LIMITED` **[ASSUMED]** | Too many requests. Wait before trying again (Q25) |
| 500 | `INTERNAL_ERROR` **[ASSUMED]** | Unexpected server error. Retry, then contact support |

> **[MISSING]** Only `VERSION_CONFLICT` is named in the v2 engineering notes. The other codes follow the conventions of version 1 and need to be confirmed (Q28).

---

## Open questions

These questions affect this page. Each is tracked in the Open Questions log.

| ID | Question | Used on this page for |
|---|---|---|
| Q2 | Which resources and endpoints require `version`? | Update a board |
| Q17 | How are an out of range `page`, a `pageSize` above `100` and the default sort order handled? | List boards |
| Q18 | Is `limit` still accepted alongside `pageSize`? | List boards |
| Q20 | Did ID prefixes change between v1 and v2? | The board object |
| Q25 | What are the rate limits? | Errors |
| Q28 | What is the full list of v2 error codes, and what are the field limits? | Errors, create a board |
| Q32 | Does deleting a board delete its columns, cards and comments? Can it be undone? | Delete a board |
| Q33 | What does the v2 board object contain, and who may update or delete a board? | The board object, permissions |