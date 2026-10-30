# Open Questions: Collaborative Knowledge Board API v2

This log records every gap, contradiction and ambiguity found in the v2 engineering notes. Each row has the assumption the documentation currently uses, so nothing is left to guesswork. Rows are ranked by how badly a wrong answer would mislead a developer.

**How tags appear in the docs**

| Tag | Meaning |
|---|---|
| **[MISSING]** | The notes do not say |
| **[UNCLEAR]** | The notes say something that can be read in more than one way |
| **[CONTRADICTION]** | The notes disagree with themselves or with the Stage 1 documentation |
| **[ASSUMED]** | The docs state a value that was not confirmed |

**Priority:** Blocking means the page would be wrong or unusable without the answer. Important means developers will hit it soon. Minor means it improves completeness.

---

## Blocking (answers needed before publishing)

| ID | Area | Problem | Type | Working assumption in the docs | Question for engineering |
|---|---|---|---|---|---|
| Q1 | Update card | The notes say updating a card now requires `version`, but only `PATCH /cards/{cardId}/move` is described. The update endpoint, its body and where `version` goes are not given. | Missing | Update is `PATCH /cards/{cardId}` with `version` in the request body | What is the card update endpoint, and is `version` sent in the body or a header? |
| Q2 | Version scope | "Updating or moving a card" requires `version`. It is not stated whether Add Tags, Set Due Date and Delete Card also require it, or whether they increase it. | Ambiguous | Only update and move require `version`; tags and due date are treated as updates that increase it | Which endpoints require `version`, and which actions increase it? |
| Q3 | 409 response | The error example shows only `code` and `message`. It does not say whether the response includes the current version or the current card. | Missing | The 409 body has no extra fields, so the client must refetch the card | Does the 409 include the current `version` or card state? |
| Q4 | Real time | Reconnection behaviour is not described: are rooms kept, are missed events replayed, is there a way to catch up? | Missing | After reconnecting, the client must emit `board.join` again and refetch the board's cards | What happens to a client's board membership and missed events after a disconnect? |
| Q5 | Real time | Event order is not described, and events have no sequence number. | Missing | Order is not guaranteed; clients compare `timestamp` and card `version` to ignore stale events | Are events delivered in order per board? Is there a sequence number or event ID? |
| Q6 | Real time | The `data` object of each event (`card.created`, `card.moved`, `comment.added`) is not defined. | Missing | `card.moved` data includes the full updated card; `card.created` the new card; `comment.added` the new comment | What exactly does `data` contain for each event? |
| Q7 | Comments | There is no endpoint to list or read comments. Only create, edit and delete are described. | Missing | Not documented; flagged as a gap | How does a client load existing comments for a card? Is there a `GET /cards/{cardId}/comments`? |
| Q8 | Card list | v2 notes list `GET /boards/{boardId}/cards`. The Stage 1 docs used `GET /columns/{columnId}/cards`. | Contradiction | The v2 path is used; the Stage 1 path is treated as replaced | Is the old column path removed, kept, or both? Does the board path return cards from all columns? |
| Q9 | Move card | The notes do not say what happens to the positions of other cards, what happens with an out of range `position`, or how a move within the same column works. | Missing | Other cards shift to keep positions continuous; invalid values return `400 VALIDATION_ERROR` | How are other cards' positions and versions affected? What errors are returned for an invalid `position` or a `columnId` that does not exist? |
| Q10 | v1 list format | The brief says v1 lists returned plain arrays. The Stage 1 documentation showed objects with `data`, `page`, `limit` and `total`. | Contradiction | v1 returned plain arrays (as the brief says); Stage 1 pages are corrected | Please confirm exactly what v1 list endpoints returned. |
| Q11 | Comment depth | A reply example shows `depth: 2`, and comments "can be 2 levels deep". It is not clear whether top-level comments have depth `1` or `0`, or what happens when someone replies to a reply. | Ambiguous | Top-level comment is depth 1; a reply is depth 2; replying to a reply returns `400 VALIDATION_ERROR` | What is the depth of a top-level comment, and what error is returned beyond 2 levels? |
| Q12 | Permissions | Editing or deleting another user's comment returns "403", but no error code is named. It is not stated whether a board owner or admin can moderate. | Missing | Code is `FORBIDDEN`; only the author can edit or delete, with no exceptions | What is the exact 403 error code? Can board owners or admins edit or delete others' comments? |

---

## Important (developers will hit these soon)

| ID | Area | Problem | Type | Working assumption | Question for engineering |
|---|---|---|---|---|---|
| Q13 | Real time | It is not stated whether the user who made a change also receives the event. | Missing | Yes, the actor receives their own event; clients identify it with `actorId` | Does the actor receive their own events? |
| Q14 | Real time | `board.join` has no documented acknowledgement, error response or permission rule. There is no `board.leave` event. | Missing | No acknowledgement; joining a board the user cannot access fails (behaviour unknown) | Does `board.join` respond or fail? Who may join? Is there a leave event? |
| Q15 | Real time | The notes do not say what happens when the token is missing, invalid or expires while connected. | Missing | An invalid token causes a `connect_error`; behaviour on expiry unknown | How are authentication failures and mid-connection token expiry handled? |
| Q16 | Real time | Only three events are listed. There is nothing for card updates, deletions, tag or due date changes, or comment edits and deletes. | Missing | Only the three documented events exist | Are there other events? If not, how should clients learn about those changes? |
| Q17 | Pagination | The notes do not describe a page past the last page, a `pageSize` above 100 (rejected or limited), or the default sort order. | Missing | Out of range page returns an empty `data` array; `pageSize` above 100 returns `400 VALIDATION_ERROR` | How does the API handle those cases, and what is the default order? |
| Q18 | Pagination | v1 documentation used `limit`; v2 uses `pageSize`. | Inconsistent with v1 | `pageSize` only | Is `limit` still accepted? |
| Q19 | Date formats | The card example shows `dueDate` as a date only (`2026-11-01`), while `updatedAt` is a full timestamp. The format of the event `timestamp` is not given. | Ambiguous | `dueDate` is `YYYY-MM-DD`; `timestamp` is ISO 8601 UTC | Confirm the format of `dueDate` and of the event `timestamp`. |
| Q20 | IDs | v2 notes use `b_`, `c_`, `col_`, `m_`, `u_`. Stage 1 used `brd_`, `crd_`, `col_`, `usr_`. | Inconsistent with v1 | v2 prefixes are used everywhere; Stage 1 pages updated | Confirm the prefixes and whether they changed between versions. |
| Q21 | Delete comment | It is not stated what happens to replies when a parent comment is deleted. | Missing | Replies are deleted with the parent | Are replies deleted, kept, or shown as "deleted comment"? |
| Q22 | Comment validation | The notes give a 1,000 character limit but not whether it counts characters or bytes, whether empty or whitespace-only bodies are rejected, or what happens if `parentId` belongs to a different card or does not exist. | Missing | Empty body returns `400 VALIDATION_ERROR`; bad `parentId` returns `404` | Please confirm validation rules and error codes for comment requests. |
| Q23 | Versioning | The notes do not say whether `/v1` stays available or when it will be retired. | Missing | v1 remains available for now; no retirement date | Will v1 continue to work? Is there a deprecation date? |

---

## Minor (improve completeness)

| ID | Area | Problem | Type | Working assumption | Question for engineering |
|---|---|---|---|---|---|
| Q24 | Socket.IO | The Socket.IO major version, path, namespace and allowed transports are not given. The notes also use a `wss://` URL. | Missing | Socket.IO v4, default path and namespace | Which Socket.IO version and path are used? Does the client need a specific URL scheme? |
| Q25 | Limits | Rate limits and connection limits are not given for HTTP or real time. | Missing | No limits documented | What are the HTTP rate limits, and how many sockets or boards may a user join? |
| Q26 | Comment object | The reply example has `id`, `cardId`, `parentId`, `depth`, `body` and `authorId`. There is no `createdAt`, `updatedAt` or edited flag. | Missing | Fields beyond the example are not documented | What is the full comment object? |
| Q27 | `version` | The starting value and the rule for increasing it are not stated. The example card has `version: 4`. | Missing | Starts at 1; increases by 1 on every change to the card | What is the initial version, and does every change increase it by exactly 1? |
| Q28 | Errors | Only `VERSION_CONFLICT` and one 403 are named. Other error codes (validation, not found, unauthorized) are not listed for v2. | Missing | Stage 1 codes are reused (`VALIDATION_ERROR`, `UNAUTHORIZED`, `*_NOT_FOUND`) | Is there a full list of v2 error codes? |
| Q29 | Auth | "Authentication is unchanged" but the token lifetime and refresh behaviour were never confirmed in Stage 1. | Missing | 3600 seconds; no refresh token | Confirm token lifetime and refresh behaviour. |

---

## Stage 1 corrections required

These are mistakes or assumptions in the Stage 1 pages that Stage 2 information changes.

| ID | Stage 1 page | What to correct | Why |
|---|---|---|---|
| S1 | Get Boards, Get Cards | Responses showed `data`, `page`, `limit`, `total` for v1 | The brief says v1 returned plain arrays (see Q10) |
| S2 | All pages | `brd_`, `crd_`, `usr_` prefixes | v2 notes use `b_`, `c_`, `u_` (see Q20) |
| S3 | Get Boards | `limit` parameter | v2 uses `pageSize` (see Q18) |
| S4 | Get Cards | `/columns/{columnId}/cards` path | v2 notes use `/boards/{boardId}/cards` (see Q8) |
| S5 | Cards | Full ISO date-time for `dueDate` | Notes show date only (see Q19) |
| S6 | All pages | Base URL `/v1` | v2 base is `/v2` (see Q23) |
| S7 | Update Card | Moving a card with `columnId` in the update body | v2 has a dedicated move endpoint (see Q1, Q9) |
| S8 | Update Card, Tags, Due date | No `version` field | Updates now require `version` (see Q1, Q2) |
| S9 | Card object | No `position` or `version` | Both are new fields in v2 |

---

## The eight questions to send first

These are the Blocking items that cannot be solved by assumption. They form the core of the Engineering Note.

1. **Q1:** What is the card update endpoint, and where does `version` go?
2. **Q3:** Does the 409 response include the current version or card?
3. **Q4 and Q5:** What are the reconnection and event order guarantees?
4. **Q6:** What is in each event's `data` object?
5. **Q7:** How does a client list a card's comments?
6. **Q8:** Which card list path is correct?
7. **Q9:** How does a move affect other cards, and what are its error cases?
8. **Q12:** What is the 403 error code, and can admins moderate comments?

## Status tracking

I will update this column as answers arrive. 

| ID | Status | Answer | Date |
|---|---|---|---|
| Q1 to Q29 | Open | | |