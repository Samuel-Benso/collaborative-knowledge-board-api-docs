# Errors

When a request fails, the API returns an HTTP error status and a JSON body that says what went wrong. This page lists the errors you can receive, what causes each one, and what your code should do about it.

> **How to read the markers on this page**
> Statements without a marker come from the v2 engineering notes. A **[Assumed]** marker means the page relies on something the notes do not state, and it is tied to a question number in [Open questions](../meta/open-questions.md). Verify every marked item against the live API before relying on it.

---

## Error format

Every error uses this shape:

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Card was updated by someone else"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `error.code` | string | A short, constant identifier for the error. Use this in your code. |
| `error.message` | string | A readable explanation. Show it in logs. Do not match on it, because the wording can change. |

Write your error handling against the HTTP status and `error.code`, never against `error.message`.

> **[Assumed, Q49]** The notes show one example error. This page assumes every error follows the same shape and that there are no extra fields such as `details`.

---

## Error codes

Only `VERSION_CONFLICT` has a code in the engineering notes. A `403` is also described for comments, without a code. The other codes below are the names this documentation uses. Confirm them before you match on them in production code.

| Status | Code | Meaning | Confirmed |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | The request body or a query parameter is missing or invalid. | No, Q40, Q51 |
| 401 | `UNAUTHORIZED` | The token is missing, invalid or expired. | No, Q47 |
| 403 | `FORBIDDEN` | You are signed in but not allowed to do this. | Status yes, code no, Q48 |
| 404 | `NOT_FOUND` | The card, comment, column or board does not exist. | No, Q47 |
| 409 | `VERSION_CONFLICT` | The `version` you sent is not the current version of the card. | **Yes** |
| 5xx | `INTERNAL_ERROR` | Something went wrong on the server. | No, Q49 |

> **[Assumed, Q49]** The notes do not provide a complete list of error codes or a mapping from codes to HTTP statuses. Rate limiting (`429`) is not mentioned at all (Q53).

---

## 409 VERSION_CONFLICT

**Cause.** You tried to update or move a card, and the `version` in your request is not the card's current version. Someone else changed the card after you last read it.

**Returned by.** `PATCH /cards/{cardId}/move`, and any other card update, because all card updates now require `version`.

**Example response**

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Card was updated by someone else"
  }
}
```

**What to do.** Do not retry the same request, because it will fail again. Follow these steps:

1. Fetch the card again to get its current `version` and fields.
2. Decide whether your change still makes sense. If the card was moved elsewhere, you may not want to move it again.
3. Send your request again with the new `version`, or discard your change and show the user the current card.

The full walkthrough is in [Handle a version conflict](../how-to/handle-a-version-conflict.md). For the reasoning behind version checks, read [Conflicts and versions](../concepts/conflicts-and-versions.md).

> **[Assumed, Q50]** The error body does not include the card's current version or the current card, so a second request is needed. If the API adds them in the future, step 1 can be skipped.

---

## 403 Forbidden

**Cause.** You are signed in, but the action is not allowed for your user.

**Documented case.** Editing or deleting a comment that you did not write. Only the author of a comment can edit or delete it.

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the author can modify this comment"
  }
}
```

The code and message above are illustrative. **[Assumed, Q48]**

**What to do.** Do not retry. Hide the edit and delete controls for comments where `authorId` does not match the signed-in user.

---

## 401 Unauthorized

**Cause.** The `Authorization` header is missing, the token is malformed, or the token has expired. **[Assumed, Q47]**

**What to do.** Log in again to get a new token, then repeat the request. See [Authentication](authentication.md).

---

## 404 Not found

**Cause.** The ID in the path does not match anything. Check for a typo, a deleted object, or an ID from a different environment. **[Assumed, Q47]**

**What to do.** Do not retry. Reload the list that contained the ID, because the object may have been deleted by someone else.

---

## 400 Validation error

**Cause.** The request is missing a required field or a value is out of range. **[Assumed, Q40, Q51]**

Known situations that should produce this error:

| Request | Problem |
|---|---|
| Create or edit a comment | `body` is missing, empty or longer than 1,000 characters. |
| Move a card | `columnId`, `position` or `version` is missing. |
| List boards or cards | `page` or `pageSize` is not a valid number, or `pageSize` is above 100. |

> **[Assumed, Q51]** The notes give a maximum `pageSize` of 100 but not what happens above it. The API might return a `400` or reduce the value to 100 without an error. Send values of 100 or less so that you do not depend on either behavior.

**What to do.** Do not retry. Fix the request before sending it again.

---

## 5xx Server errors

**Cause.** A problem on the server, not with your request. **[Assumed, Q49]**

**What to do.** Retry safe reads with a short delay that increases each time, for example 1, 2 and 4 seconds, and stop after three attempts. Do not automatically retry a create request such as adding a comment, because the first request may have succeeded and you could create a duplicate.

---

## Errors by endpoint

| Endpoint | Possible errors |
|---|---|
| `PATCH /cards/{cardId}/move` | 400, 401, 404, **409 `VERSION_CONFLICT`** |
| `POST /cards/{cardId}/comments` | 400, 401, 404 |
| `PATCH /comments/{commentId}` | 400, 401, **403**, 404 |
| `DELETE /comments/{commentId}` | 401, **403**, 404 |
| `GET /boards` and `GET /boards/{boardId}/cards` | 400, 401, 404 (cards only) |

Bold entries come from the engineering notes. The rest are assumed. **[Assumed, Q49]**

---

## Real time errors

The real time connection does not use HTTP status codes. Errors such as a missing or invalid token arrive as Socket.io events instead of the JSON body shown above. See [Real time events](realtime-events.md#connection-errors) for how to listen for them.

> **[Assumed, Q52]** The notes do not describe what happens when the token is invalid, when you join a board you cannot access, or what shape those errors take. The real time page documents the assumptions it makes.

---

## Handle errors in code

A small wrapper that reads the error shape and separates the cases your code needs to treat differently:

```js
async function api(path, options = {}) {
  const response = await fetch(`https://api.example.com/v2${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.TOKEN}`,
      ...options.headers,
    },
  });

  if (response.ok) {
    return response.status === 204 ? null : response.json();
  }

  const { error } = await response.json().catch(() => ({}));
  const err = new Error(error?.message ?? `HTTP ${response.status}`);
  err.status = response.status;
  err.code = error?.code;
  throw err;
}

try {
  await api("/cards/c_101/move", {
    method: "PATCH",
    body: JSON.stringify({ columnId: "col_3", position: 0, version: 4 }),
  });
} catch (err) {
  if (err.code === "VERSION_CONFLICT") {
    // Fetch the card again, then decide whether to send the move again.
  } else if (err.status === 401) {
    // Log in again.
  } else {
    throw err;
  }
}
```

The wrapper checks `err.code` for `VERSION_CONFLICT`, the only confirmed code, and `err.status` for everything else, because the HTTP status is more certain than the assumed codes.

---

## Related pages

- [Handle a version conflict](../how-to/handle-a-version-conflict.md)
- [Conflicts and versions](../concepts/conflicts-and-versions.md)
- [Troubleshooting](../troubleshooting.md)
- [Authentication](authentication.md)
- [Pagination](pagination.md)
- [Real time events](realtime-events.md)