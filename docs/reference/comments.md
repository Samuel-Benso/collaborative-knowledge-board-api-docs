# Comments

Comments let users discuss a card. A comment can be a top-level comment on the card or a reply to another comment. Comments can be two levels deep: a comment and a reply to it. You can create, reply to, edit and delete comments, and every client on the board receives a real time event when a comment is added.

Comments are new in v2. They are not available in v1.

**Base URL:** `https://api.example.com/v2`
**Authentication:** send `Authorization: Bearer <token>` on every request. See [Authentication](authentication.md).

> **How to read the markers on this page**
> Statements without a marker come from the v2 engineering notes. A **[Assumed]** marker means the page relies on something the notes do not state, and it is tied to a question number in [Open questions](../meta/open-questions.md). Verify every marked item against the live API before relying on it.

---

## Endpoints at a glance

| Action | Method and path | Who may do it |
|---|---|---|
| [Create a comment](#create-a-comment) | `POST /cards/{cardId}/comments` | Any user with access to the board **[Assumed, Q47]** |
| [Reply to a comment](#reply-to-a-comment) | `POST /cards/{cardId}/comments` with `parentId` | Any user with access to the board **[Assumed, Q47]** |
| [Edit a comment](#edit-a-comment) | `PATCH /comments/{commentId}` | The comment's author only |
| [Delete a comment](#delete-a-comment) | `DELETE /comments/{commentId}` | The comment's author only |

> **[Assumed, Q46]** The notes do not document an endpoint to read the comments of a card, and the card object does not include them. Where this page says "reload the comments", it assumes a read endpoint exists. Its path, response shape and pagination are not documented, so this page does not describe them.

---

## The comment object

```json
{
  "id": "m_7",
  "cardId": "c_101",
  "parentId": "m_5",
  "depth": 2,
  "body": "Agreed",
  "authorId": "u_3"
}
```

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique comment ID. Prefixed `m_`. |
| `cardId` | string | The card the comment belongs to. |
| `parentId` | string or null | The ID of the comment being replied to. `null` for a top-level comment. **[Assumed, Q39]** |
| `depth` | integer | Nesting level. A reply to a top-level comment has `depth` 2. A top-level comment is assumed to have `depth` 1. **[Assumed, Q39]** |
| `body` | string | The comment text. Maximum 1,000 characters. |
| `authorId` | string | The ID of the user who wrote the comment. Prefixed `u_`. |

> **[Assumed, Q39]** The notes show only an example reply. Timestamps such as `createdAt` and `updatedAt` are not documented, so this page does not list them. If the API returns them, add them here.

---

## Create a comment

Adds a top-level comment to a card.

```
POST /cards/{cardId}/comments
```

### Path parameters

| Parameter | Type | Description |
|---|---|---|
| `cardId` | string | The ID of the card to comment on, for example `c_101`. |

### Body parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `body` | string | Yes | The comment text. Maximum 1,000 characters. |
| `parentId` | string | No | Leave out for a top-level comment. See [Reply to a comment](#reply-to-a-comment). |

### Example request

```bash
curl -X POST https://api.example.com/v2/cards/c_101/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "body": "Can we move the launch to Friday?" }'
```

### Example response

**[Assumed, Q39]** The status code is assumed to be `201 Created`. The `id` and `depth` values are illustrative.

```json
{
  "id": "m_5",
  "cardId": "c_101",
  "parentId": null,
  "depth": 1,
  "body": "Can we move the launch to Friday?",
  "authorId": "u_3"
}
```

### Errors

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` **[Assumed, Q40]** | `body` is missing, empty or longer than 1,000 characters. |
| 401 | `UNAUTHORIZED` **[Assumed, Q47]** | The token is missing, invalid or expired. |
| 404 | `NOT_FOUND` **[Assumed, Q47]** | The card does not exist. |

---

## Reply to a comment

A reply is created with the same endpoint. Add `parentId` with the ID of the comment you are replying to.

```bash
curl -X POST https://api.example.com/v2/cards/c_101/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "body": "Agreed", "parentId": "m_5" }'
```

### Example response

```json
{
  "id": "m_7",
  "cardId": "c_101",
  "parentId": "m_5",
  "depth": 2,
  "body": "Agreed",
  "authorId": "u_3"
}
```

### Rules for replies

- Comments can be **two levels deep**. You can reply to a top-level comment. The reply has `depth` 2.
- The parent comment must belong to the same card as the new reply. **[Assumed, Q42]**

> **[Assumed, Q41]** The notes do not say what happens when you reply to a comment that already has `depth` 2. The API may return an error or attach the reply to the parent. Until this is confirmed, build your interface so that a `depth` 2 comment has no reply button, and do not send a `parentId` that points to a `depth` 2 comment.

> **[Assumed, Q42]** The notes do not say what is returned when `parentId` does not exist, belongs to a different card, or points to a deleted comment. This page assumes `404 NOT_FOUND` for a missing parent and `400 VALIDATION_ERROR` for a parent on a different card.

See [Comment threading](../concepts/comment-threading.md) for how to display threads.

---

## Edit a comment

Changes the text of a comment. Only the author can edit it.

```
PATCH /comments/{commentId}
```

### Path parameters

| Parameter | Type | Description |
|---|---|---|
| `commentId` | string | The ID of the comment to edit, for example `m_7`. |

### Body parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `body` | string | Yes | The new comment text. Maximum 1,000 characters. **[Assumed, Q43]** |

### Example request

```bash
curl -X PATCH https://api.example.com/v2/comments/m_7 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "body": "Agreed, Friday works." }'
```

### Example response

**[Assumed, Q43]** The response is assumed to be `200 OK` with the updated comment.

```json
{
  "id": "m_7",
  "cardId": "c_101",
  "parentId": "m_5",
  "depth": 2,
  "body": "Agreed, Friday works.",
  "authorId": "u_3"
}
```

### Permissions

Only the author of a comment can edit it. Any other user receives `403`.

### Errors

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` **[Assumed, Q40]** | `body` is missing, empty or longer than 1,000 characters. |
| 401 | `UNAUTHORIZED` **[Assumed, Q47]** | The token is missing, invalid or expired. |
| 403 | `FORBIDDEN` **[Assumed, Q48]** | The signed-in user is not the author of the comment. |
| 404 | `NOT_FOUND` **[Assumed, Q47]** | The comment does not exist. |

> **[Assumed, Q43]** Editing a card requires `version`, but the notes do not say whether editing a comment does. This page assumes comments have no version check and that `PATCH /comments/{commentId}` never returns `409`.

> **[Assumed, Q44]** The notes do not say whether the real time channel sends an event when a comment is edited. This page assumes it does not. See [Real time events](#real-time-events-for-comments).

---

## Delete a comment

Deletes a comment. Only the author can delete it.

```
DELETE /comments/{commentId}
```

### Path parameters

| Parameter | Type | Description |
|---|---|---|
| `commentId` | string | The ID of the comment to delete, for example `m_7`. |

### Example request

```bash
curl -X DELETE https://api.example.com/v2/comments/m_7 \
  -H "Authorization: Bearer $TOKEN"
```

### Example response

**[Assumed, Q45]** The response is assumed to be `204 No Content` with no body.

### Permissions

Only the author of a comment can delete it. Any other user receives `403`.

### Errors

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` **[Assumed, Q47]** | The token is missing, invalid or expired. |
| 403 | `FORBIDDEN` **[Assumed, Q48]** | The signed-in user is not the author of the comment. |
| 404 | `NOT_FOUND` **[Assumed, Q47]** | The comment does not exist or was already deleted. |

> **[Assumed, Q45]** The notes do not say what happens to the replies when you delete a top-level comment. They may be deleted with it, or they may remain without a parent. Do not assume either behavior. After a delete, reload the card's comments.

---

## Real time events for comments

When a comment is added, every client that has joined the board receives a `comment.added` event.

```json
{
  "boardId": "b_9",
  "actorId": "u_3",
  "timestamp": "2026-10-20T09:15:00Z",
  "data": { }
}
```

| Field | Description |
|---|---|
| `boardId` | The board the card belongs to. |
| `actorId` | The ID of the user who added the comment. |
| `timestamp` | When the event happened. |
| `data` | An object with the event details. |

> **[Assumed, Q44]** The notes say each event has a `data` object but do not list its fields. This page assumes `data` contains the full comment object shown above. The timestamp format is assumed to be ISO 8601 in UTC, matching `updatedAt` on the card.

Editing and deleting a comment are **not** announced by any event in the notes. The only real time events are `card.created`, `card.moved` and `comment.added`. A client that shows comments live will not see edits or deletes made by other users until it reloads the comments.

Full details, including how to connect and join a board, are in [Real time events](realtime-events.md).

---

## Common mistakes

| Mistake | What to do instead |
|---|---|
| Sending a `body` longer than 1,000 characters | Check the length on the client before sending. |
| Replying to a reply | Show the reply button only on comments with `depth` 1. |
| Showing edit and delete to every user | Show them only when `authorId` matches the signed-in user's ID. |
| Expecting live updates for edits and deletes | Reload the comments after you edit or delete, and on a timer if you need other users' changes. |

---

## Related pages

- [Add and reply to comments](../how-to/add-and-reply-to-comments.md)
- [Comment threading](../concepts/comment-threading.md)
- [Real time events reference](realtime-events.md)
- [Errors reference](errors.md)
- [Authentication](authentication.md)