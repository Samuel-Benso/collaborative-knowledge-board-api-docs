# Add and Reply to Comments

Comments let board members discuss a card without moving the conversation into a separate tool. You can add a comment to a card, reply to an existing comment, edit your own comments, and delete your own comments.

This guide covers the comment endpoints available in API v2.

## Before you begin

You need:

* An API v2 access token.
* The ID of an existing card.
* The ID of a parent comment if you are replying to an existing comment.

Include your access token in every request:

```http
Authorization: Bearer <token>
```

The API base URL is:

```text
https://api.example.com/v2
```

For more information about obtaining and using an access token, see [Authentication](../getting-started/authentication.md).

## Add a comment to a card

Use this endpoint to create a comment directly on a card.

```http
POST /cards/{cardId}/comments
```

### Path parameters

| Parameter | Type   | Required | Description                           |
| --------- | ------ | -------- | ------------------------------------- |
| `cardId`  | string | Yes      | ID of the card receiving the comment. |

### Request body

| Field      | Type   | Required | Description                                                                                                 |
| ---------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------- |
| `body`     | string | Yes      | Comment text. Maximum length is 1,000 characters.                                                           |
| `parentId` | string | No       | ID of an existing comment to which this comment replies. Omit this field when creating a top-level comment. |

### Example request

```http
POST https://api.example.com/v2/cards/c_101/comments
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "body": "The launch plan is ready for review."
}
```

A comment created without `parentId` is a top-level comment.

### Example response

The engineering notes provide an example of the comment object returned for a reply. The following illustrates the documented fields for a comment response; the exact response envelope and top-level comment values require confirmation.

```json
{
  "id": "m_5",
  "cardId": "c_101",
  "parentId": null,
  "depth": 1,
  "body": "The launch plan is ready for review.",
  "authorId": "u_3"
}
```

## Reply to a comment

Use the same endpoint to reply to an existing comment. Include the parent comment's ID in the `parentId` field.

```http
POST /cards/{cardId}/comments
```

### Example request

```http
POST https://api.example.com/v2/cards/c_101/comments
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "body": "Agreed. I will review the final version today.",
  "parentId": "m_5"
}
```

### Example response

```json
{
  "id": "m_7",
  "cardId": "c_101",
  "parentId": "m_5",
  "depth": 2,
  "body": "Agreed. I will review the final version today.",
  "authorId": "u_3"
}
```

The response identifies the parent comment through `parentId` and indicates the reply's depth through `depth`.

### Comment threading rules

Comments support a maximum depth of two levels:

* **Depth 1:** A top-level comment attached directly to a card.
* **Depth 2:** A reply to a top-level comment.

A third level is not supported. The engineering notes do not specify the exact error returned when a request attempts to create a comment beyond the permitted depth.

## Edit a comment

Use this endpoint to edit an existing comment.

```http
PATCH /comments/{commentId}
```

Only the comment's author can edit it. A user who did not create the comment receives a `403 Forbidden` response.

### Path parameters

| Parameter   | Type   | Required | Description                |
| ----------- | ------ | -------- | -------------------------- |
| `commentId` | string | Yes      | ID of the comment to edit. |

### Request body

The comment text is supplied through the `body` field. The maximum comment length is 1,000 characters.

### Example request

```http
PATCH https://api.example.com/v2/comments/m_5
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "body": "The revised launch plan is ready for review."
}
```

### Response

The engineering notes do not define the successful response status or response body for this operation. Confirm the response contract with the API team before relying on a particular response shape.

### Permission error

If the authenticated user is not the comment's author, the API returns `403 Forbidden`.

The documented error format is:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action"
  }
}
```

The error envelope is consistent with the API's documented general error structure. The specific `FORBIDDEN` code and message above are illustrative; the exact code and message for comment permission failures require confirmation.

## Delete a comment

Use this endpoint to delete an existing comment.

```http
DELETE /comments/{commentId}
```

Only the comment's author can delete it. A user who did not create the comment receives a `403 Forbidden` response.

### Path parameters

| Parameter   | Type   | Required | Description                  |
| ----------- | ------ | -------- | ---------------------------- |
| `commentId` | string | Yes      | ID of the comment to delete. |

### Example request

```http
DELETE https://api.example.com
```
