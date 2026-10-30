# Paginate Lists

The Collaborative Knowledge Board API v2 uses pagination to return large collections of boards and cards in manageable batches.

Instead of receiving an entire collection in one response, clients can request a specific page and control how many records each response contains.

Pagination is supported by these endpoints:

* `GET /boards`
* `GET /boards/{boardId}/cards`

Both endpoints accept the `page` and `pageSize` query parameters.

This guide explains how to request pages, interpret pagination metadata, and retrieve subsequent results.

## Pagination parameters

| Parameter  | Type    | Required | Default       | Description                                           |
| ---------- | ------- | -------- | ------------- | ----------------------------------------------------- |
| `page`     | integer | No       | Not specified | The page of results to retrieve.                      |
| `pageSize` | integer | No       | `20`          | Number of records to return per page. Maximum: `100`. |

The API returns 20 records per page when `pageSize` is omitted. You can request up to 100 records per page.

The engineering notes do not specify the default page number. Confirm this behaviour before relying on an omitted `page` parameter.

## List boards

Use the boards endpoint to retrieve a paginated list of boards.

```http
GET /boards
```

### Example request

Request the first page with 20 boards:

```http
GET https://api.example.com/v2/boards?page=1&pageSize=20
Authorization: Bearer <token>
```

### Example response

```json
{
  "data": [
    {
      "id": "b_9",
      "name": "Product Launch"
    },
    {
      "id": "b_10",
      "name": "Engineering Roadmap"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 134
}
```

The example shows two records for readability. The actual response can contain up to the requested page size.

## List cards on a board

Use the board cards endpoint to retrieve cards belonging to a specific board.

```http
GET /boards/{boardId}/cards
```

### Path parameters

| Parameter | Type   | Required | Description                                       |
| --------- | ------ | -------- | ------------------------------------------------- |
| `boardId` | string | Yes      | ID of the board whose cards you want to retrieve. |

### Example request

Retrieve the first 50 cards on board `b_9`:

```http
GET https://api.example.com/v2/boards/b_9/cards?page=1&pageSize=50
Authorization: Bearer <token>
```

### Example response

```json
{
  "data": [
    {
      "id": "c_101",
      "title": "Write launch plan",
      "columnId": "col_2",
      "position": 1,
      "version": 4
    },
    {
      "id": "c_102",
      "title": "Review release notes",
      "columnId": "col_3",
      "position": 0,
      "version": 2
    }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 134
}
```

The card objects illustrate relevant fields from the documented card model. The actual response may include additional card properties.

## Understand the pagination response

Both endpoints return a paginated object rather than a plain array.

The response contains three pagination fields alongside the records:

| Field      | Description                                                   |
| ---------- | ------------------------------------------------------------- |
| `data`     | Array containing the records returned for the requested page. |
| `page`     | Page number represented by the response.                      |
| `pageSize` | Number of records requested per page.                         |
| `total`    | Total number of records in the collection.                    |

For example:

```json
{
  "data": [],
  "page": 2,
  "pageSize": 20,
  "total": 134
}
```

This response indicates that:

* The client requested page 2.
* The requested page size was 20 records.
* The collection contains 134 records in total.

The `total` field represents the collection size, not the number of records in the current response.

## Retrieve subsequent pages

To retrieve more records, increase the `page` value while keeping the desired `pageSize`.

For a collection containing 134 records with a page size of 20:

| Request               | Records covered |
| --------------------- | --------------- |
| `?page=1&pageSize=20` | Records 1–20    |
| `?page=2&pageSize=20` | Records 21–40   |
| `?page=3&pageSize=20` | Records 41–60   |
| `?page=4&pageSize=20` | Records 61–80   |
| `?page=5&pageSize=20` | Records 81–100  |
| `?page=6&pageSize=20` | Records 101–120 |
| `?page=7&pageSize=20` | Records 121–134 |

The final page contains fewer records because only 14 records remain.

A client can calculate the number of pages using:

```text
totalPages = ceil(total / pageSize)
```

For the example above:

```text
totalPages = ceil(134 / 20)
           = 7
```

Use the `total` and `pageSize` values returned by the API to determine how many pages are available.

## Example: Request the next page

Suppose your application has retrieved the first page of boards:

```http
GET /boards?page=1&pageSize=20
```

The response reports:

```json
{
  "data": [],
  "page": 1,
  "pageSize": 20,
  "total": 134
}
```

To retrieve the next page, increment `page`:

```http
GET /boards?page=2&pageSize=20
```

Continue until the client has retrieved the required records or reached the final page.

## Handle pagination in your application

When implementing pagination in a client application:

1. Set the desired page size. Use the default of 20 unless the application has a reason to request a different value.
2. Send the page number and page size as query parameters.
3. Read the records from the `data` array.
4. Use `page`, `pageSize`, and `total` to determine the current position in the collection.
5. Increment the page number when the user requests more results.
6. Stop requesting subsequent pages when the final page has been reached.

For a page size of 20, a collection with 134 records has seven pages.

Do not treat the response as a plain array. In v2, the records are nested inside the `data` property.

## Pagination limits

Keep these limits in mind when constructing requests:

* The default page size is 20.
* The maximum page size is 100.
* Both boards and board-card list endpoints support pagination.
* The response includes the requested page, page size, and total record count.

Requests with a `pageSize` greater than 100 exceed the documented maximum. The exact validation response for an invalid page size is not specified.

## Migration note for v1 users

In v1, list endpoints returned plain arrays. In v2, the same endpoints return objects containing the records and pagination metadata.

**v1 response:**

```json
[
  {
    "id": "b_9",
    "name": "Product Launch"
  },
  {
    "id": "b_10",
    "name": "Engineering Roadmap"
  }
]
```

**v2 response:**

```json
{
  "data": [
    {
      "id": "b_9",
      "name": "Product Launch"
    },
    {
      "id": "b_10",
      "name": "Engineering Roadmap"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 134
}
```

Update client applications that previously expected an array.

Instead of reading records directly from the response, read them from:

```javascript
response.data
```

Also update any logic that depends on the total number of records or the current page.

See [Migrate from v1 to v2](../release-notes/migrate-v1-to-v2.md) for the full migration instructions.

## Questions for engineering

The following pagination behaviours are not defined in the available engineering notes and require confirmation.

| Area              | Question                                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| Default page      | Does `page` default to `1` when omitted?                                                                   |
| Page numbering    | Are page numbers one-based, with the first page represented by `1`?                                        |
| Invalid page      | What happens when `page` is zero, negative, or not an integer?                                             |
| Invalid page size | What status code and error response are returned when `pageSize` exceeds 100 or is invalid?                |
| Empty pages       | Does a request beyond the final page return an empty `data` array or an error?                             |
| Sorting           | What determines the order of records across pages? Can clients specify a sort order?                       |
| Data changes      | What happens to pagination when records are added, removed, or updated while a client is retrieving pages? |
| Total count       | Is `total` calculated at the time of each request or maintained as a consistent snapshot across pages?     |
| Filtering         | Do these endpoints support filters alongside `page` and `pageSize`?                                        |

## Related documentation

* [Boards API Reference](../reference/boards.md)
* [Cards API Reference](../reference/cards.md)
* [Migrate from v1 to v2](../release-notes/migrate-v1-to-v2.md)
* [Quickstart: Move a Card and Receive a Real-time Event](../getting-started/quickstart-move-card-realtime.md)
