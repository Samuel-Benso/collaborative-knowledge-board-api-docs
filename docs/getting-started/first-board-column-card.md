# Create Your First Board, Column, and Card

In this guide, you'll learn how to create a board, add a column to it, and create your first card using the Collaborative Knowledge Board API.

A board organizes work. Columns represent stages of that work, and cards represent individual tasks.

By the end of this guide, you'll understand how these resources relate to one another and how to work with them through the API.

## What you'll need

Before you begin, make sure you have:

* An account with access to the Collaborative Knowledge Board API.
* Your API credentials.
* [Postman](https://www.postman.com/) or another HTTP client.
* Basic familiarity with HTTP requests and JSON.

You'll also need to authenticate before making requests.

## 1. Understand the resource structure

The Collaborative Knowledge Board uses three main resources to organize work:

```text
Board
  |
  ├── Column
  |     |
  |     ├── Card
  |     ├── Card
  |     └── Card
  |
  ├── Column
  |     |
  |     ├── Card
  |     └── Card
  |
  └── Column
        |
        └── Card
```

For example, imagine you're managing a product launch.

Your board might look like this:

**Board:** Product Launch

| Column      | Cards                                   |
| ----------- | --------------------------------------- |
| To Do       | Write launch plan, Prepare announcement |
| In Progress | Design landing page                     |
| Done        | Approve product logo                    |

Each card belongs to a column, and each column belongs to a board.

This relationship is important because you'll need the relevant resource IDs when creating and managing these resources.

## 2. Authenticate

All API requests require authentication.

The authentication process remains unchanged from v1.

First, log in using your account credentials to obtain a JSON Web Token (JWT).

Once you have your token, include it in the Authorization header of subsequent requests.

```http
Authorization: Bearer YOUR_TOKEN
```

For more information, see the [Authentication Guide](authentication.md).

**Important:** Keep your token private. Do not include real credentials or tokens in publicly shared code examples.

## 3. Create a board

A board is the top-level resource that holds your columns and cards.

To get started, create a board for your project.

**Example board name:**

```json
{
  "name": "Product Launch"
}
```

**API request**

The exact v1 board-creation endpoint and required request fields must be confirmed against the Stage 1 API contract before this example can be published as executable.

Expected workflow:

1. Send a request to the board-creation endpoint.
2. Include the required board information.
3. Check the response for the newly created board.
4. Save the returned board ID.

Example of the resource information you'll need:

```json
{
  "id": "b_9",
  "name": "Product Launch"
}
```

The ID in this example is illustrative.

You'll use your actual board ID when creating columns and retrieving board information.

## 4. Create a column

A column represents a stage of work within a board.

For the Product Launch board, you might create three columns:

* To Do
* In Progress
* Done

Create a column using the board it belongs to.

**Example column information:**

```json
{
  "name": "To Do"
}
```

After creating the column, save its returned ID.

For example:

```json
{
  "id": "col_2",
  "name": "To Do",
  "boardId": "b_9"
}
```

The IDs and response fields above are illustrative. Confirm the actual creation endpoint, required fields and response schema against the Stage 1 API contract.

See the [Columns API Reference](../reference/columns.md) for column operations.

## 5. Create a card

A card represents an individual task.

Now that you have a board and a column, you can create a card inside that column.

For example, let's create a card for writing the product launch plan.

**Example card information:**

```json
{
  "title": "Write launch plan",
  "description": "Prepare the product launch plan and coordinate the required activities."
}
```

The card must be associated with the appropriate column.

Use the column ID returned in the previous step when creating the card, according to the confirmed Stage 1 request schema.

A card response in v2 includes the following fields:

```json
{
  "id": "c_101",
  "title": "Write launch plan",
  "description": "Prepare the product launch plan and coordinate the required activities.",
  "columnId": "col_2",
  "position": 1,
  "version": 4,
  "tags": ["launch"],
  "dueDate": "2026-11-01",
  "updatedAt": "2026-10-20T09:15:00Z"
}
```

**Understanding the card fields**

| Field         | Description                                           |
| ------------- | ----------------------------------------------------- |
| `id`          | Unique identifier for the card.                       |
| `title`       | Name of the task.                                     |
| `description` | Additional information about the task.                |
| `columnId`    | ID of the column containing the card.                 |
| `position`    | Card's position within its column.                    |
| `version`     | Current version of the card, used for version checks. |
| `tags`        | Labels associated with the card.                      |
| `dueDate`     | Date the task is due.                                 |
| `updatedAt`   | Timestamp of the last update.                         |

**Note:** The `position` and `version` fields are new in v2. The API uses the version field to detect conflicting updates when multiple users modify the same card.

See the [Cards API Reference](../reference/cards.md) for card operations.

## 6. Verify your resources

After creating your board, column and card, retrieve the relevant resources and confirm that they are associated correctly.

Your expected resource relationship should look like this:

```text
Product Launch (Board)
        |
        └── To Do (Column)
                |
                └── Write launch plan (Card)
```

Check that:

* Your board was created successfully.
* Your column belongs to the correct board.
* Your card belongs to the correct column.
* The returned resource IDs are available for subsequent requests.

## 7. What's next?

You've now learned the basic relationship between boards, columns and cards.

Continue exploring the API with these guides:

* [Authentication](authentication.md) — Learn how to obtain and use your JWT.
* [Boards API Reference](../reference/boards.md) — Explore board operations.
* [Columns API Reference](../reference/columns.md) — Explore column operations.
* [Cards API Reference](../reference/cards.md) — Explore card operations.
* [Move a Card](../how-to/move-a-card.md) — Learn how to move cards within and across columns in v2.
* [Quickstart: Move a Card and Receive Real-Time Events](quickstart-move-card-realtime.md) — Build a complete real-time workflow.

## Troubleshooting

| Problem                                    | What to check                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| Authentication fails                       | Confirm that your JWT is valid and included in the Authorization header. |
| A resource cannot be found                 | Check that you're using the correct resource ID.                         |
| A card is associated with the wrong column | Verify the column ID supplied when creating the card.                    |
| A request fails                            | Check the HTTP status code and response body.                            |

For additional help, see the [Troubleshooting Guide](../troubleshooting.md).
