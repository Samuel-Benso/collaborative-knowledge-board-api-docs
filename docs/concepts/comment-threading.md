# Comment threading

Comments on a card are organized in threads. A thread has one top-level comment and any number of replies to it. Threads are limited to two levels, so a reply cannot have its own replies.

This page explains how threads are built, what the `parentId` and `depth` fields mean, and what to expect when you edit, delete or receive comments in real time. For step-by-step instructions, see [Add and reply to comments](../how-to/add-and-reply-to-comments.md). For every parameter and error code, see the [Comments reference](../reference/comments.md).

> **Items marked "Assumption"** are not stated in the engineering notes for v2. They are listed with questions at the end of this page. Verify them before you build logic that depends on them.

## The thread model

Every comment belongs to one card. A comment is either a top-level comment or a reply.

| Kind | `parentId` | `depth` | Created by |
|---|---|---|---|
| Top-level comment | Not set | 1 (Assumption) | `POST /cards/{cardId}/comments` without `parentId` |
| Reply | The `id` of a top-level comment | 2 | `POST /cards/{cardId}/comments` with `parentId` |

The maximum depth is 2. A thread therefore looks like this:

```
Card c_101
├── m_5   "Can we ship this on Friday?"        depth 1, parentId not set
│   ├── m_7   "Agreed"                         depth 2, parentId m_5
│   └── m_8   "Let's check with QA first"      depth 2, parentId m_5
└── m_9   "Updated the launch plan"            depth 1, parentId not set
    └── m_10  "Thanks, looks good"             depth 2, parentId m_9
```

Replies always point to the top-level comment, never to another reply. If you want to answer a reply, create another reply under the same top-level comment.

## How `parentId` works

`parentId` is the only field that decides where a comment sits in a thread.

- Leave `parentId` out to start a new thread.
- Set `parentId` to the `id` of a top-level comment to reply to it.

A reply returned by the API looks like this:

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

You do not set `depth` yourself. The API calculates it from `parentId`.

A top-level comment has no parent. The notes do not show a top-level response, so the shape below is an assumption.

```json
{
  "id": "m_5",
  "cardId": "c_101",
  "parentId": null,
  "depth": 1,
  "body": "Can we ship this on Friday?",
  "authorId": "u_1"
}
```

> **Assumption:** A top-level comment returns `"parentId": null` and `"depth": 1`. The notes confirm only that a reply has `depth: 2`.

## Rules that apply to every comment

| Rule | Value |
|---|---|
| `body` | Required. Maximum 1,000 characters. |
| `parentId` | Optional. Must identify a top-level comment on the same card (Assumption for the "same card" part). |
| Maximum depth | 2 levels |
| Who can edit | The comment's author only |
| Who can delete | The comment's author only |
| Response when someone else edits or deletes | `403` |

The API rejects a request when `body` is missing or longer than 1,000 characters, when `parentId` does not identify a valid parent, or when the reply would go deeper than 2 levels. The exact error codes for these cases are listed in the [Comments reference](../reference/comments.md) and the [Errors reference](../reference/errors.md).

## What happens when you try to go deeper than 2 levels

If you set `parentId` to the id of a reply, for example `m_7` in the thread above, the new comment would sit at depth 3. The API does not allow this.

> **Assumption:** The request is rejected with a `4xx` error. The notes say comments "can be 2 levels deep" but do not say what the API returns when a client exceeds that limit.

Build your client so that the Reply action on a reply uses the reply's `parentId`, not the reply's own `id`. This keeps the new comment in the same thread at depth 2 and avoids the error entirely.

```js
// Choose the parentId for a new reply.
// If the comment being answered is already a reply, use its parent instead.
function replyParentId(comment) {
  return comment.depth === 1 ? comment.id : comment.parentId;
}
```

## Editing and deleting

Edit a comment with `PATCH /comments/{commentId}` and delete it with `DELETE /comments/{commentId}`. Only the author can do either. Any other user receives `403`.

Two points matter for threads:

- **Editing does not move a comment.** The `parentId` and `depth` of a comment stay the same after an edit. (Assumption: the notes do not say whether `parentId` can be changed in an edit. Do not send it.)
- **Deleting a top-level comment may affect its replies.** The notes do not say whether replies are deleted with the parent, kept, or shown as orphans.

> **Assumption:** Replies are not removed silently. Until engineering confirms the behavior, write your client so that it handles both cases: a reply whose parent no longer exists, and a thread that disappears as a whole.

## Comments and real time events

When a comment is created, subscribers to the board receive a `comment.added` event. Like every event, it includes `boardId`, `actorId`, `timestamp` and a `data` object. See [Real time events](../reference/realtime-events.md) for the full payload and [Real time events overview](realtime-events-overview.md) for how to connect and join a board.

To place an incoming comment in the right thread, read `parentId` and `depth` from the event's `data` object:

```js
socket.on("comment.added", (event) => {
  const comment = event.data;
  if (!comment.parentId) {
    addThread(comment);                        // new top-level comment
  } else {
    addReply(comment.parentId, comment);       // reply to an existing thread
  }
});
```

> **Assumption:** `event.data` contains the same comment fields that the REST API returns (`id`, `cardId`, `parentId`, `depth`, `body`, `authorId`). The notes list `comment.added` but do not show its `data` object.

The notes list no events for editing or deleting a comment. Only `comment.added` exists in v2. This means other users' clients are not told when a comment is edited or deleted. If your interface shows live comments, reload the card's comments when the user opens the card, and do not assume that your local copy is current.

## Listing the comments on a card

The engineering notes document no endpoint for reading comments. You can create, edit and delete comments, and you can receive new ones through `comment.added`, but the notes do not say how to fetch the existing comments on a card.

> **Assumption:** Existing comments are available through a read endpoint or inside the card response, and the list is paginated like other v2 lists. This is not confirmed. Until it is, the how-to guide and the quickstart do not depend on it.

## Design guidance for your client

- Show top-level comments in order of creation, with replies grouped under their parent.
- Hide the Reply control on replies, or make it reply to the parent as shown above.
- Check the 1,000-character limit before you send the request. The API enforces it, but a client-side count gives the user a faster message.
- Show the edit and delete controls only on comments where `authorId` matches the signed-in user. The API enforces this with `403`, but hiding the controls avoids avoidable errors.

## Related pages

- [Add and reply to comments](../how-to/add-and-reply-to-comments.md): the steps to create, reply, edit and delete.
- [Comments reference](../reference/comments.md): parameters, responses and error codes.
- [Real time events](../reference/realtime-events.md): the `comment.added` payload.
- [Troubleshooting](../troubleshooting.md): fixes for common comment errors.