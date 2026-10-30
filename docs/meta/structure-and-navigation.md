# Structure and navigation

This page describes how the v2 documentation set is organized, why it is organized that way, and how developers find what they need. It also shows where the Stage 1 pages fit.

## Summary

- The set is organized by what a developer is trying to do, not by which team built each part of the API.
- Every page is one of four types: tutorial, how-to guide, concept or reference. A page never mixes types.
- The set has 31 files: 22 developer pages, the home page, 4 internal pages, 3 example files and a README.
- The four Stage 1 pages (authentication, boards, columns, cards) stay as reference pages and are extended for v2.
- Page titles use the words developers type into a search box, including exact error codes and event names.

## Why the structure changes

The brief reports four problems. Each one is answered by a specific part of the structure.

| Reported problem | How the structure answers it |
|---|---|
| Developers cannot tell how to connect to real time events. | A tutorial that ends with a received event, a concept page, a reference page, a how-to for reconnection and a troubleshooting entry. All five link to each other. |
| Support gets repeated questions about the conflict error. | One concept page explains the rule, one how-to gives the recovery steps, and `VERSION_CONFLICT` is named in the titles and headings where developers will search for it. |
| The existing documentation is organized by team, not by task. | Pages are grouped by task type under four headings that match what a developer is doing: learning, doing, understanding and looking up. |
| Engineers say "the code is the documentation". | Reference pages state every parameter, status code and payload, so a developer does not need to read the code. Unknowns are marked on the page and logged for engineering. |

## The four content types

| Type | Reader's goal | Rules for the page | Pages |
|---|---|---|---|
| Tutorial | "I am new. Take me through it." | One path, numbered steps, a visible result at each step, no side options. | 3 |
| How-to guide | "I know the basics. Help me do this one thing." | Starts from a task, short, steps only, links out for explanation. | 5 |
| Concept | "Help me understand how this works." | Explains why and how, uses diagrams, contains no step-by-step procedure. | 3 |
| Reference | "I need the exact detail." | Complete, consistent layout, no teaching, no opinions. | 8 |

These are the four types described by the Diátaxis framework. Keeping them separate means a developer who needs an exact error code is not slowed down by a tutorial, and a new developer is not confronted by a table of every parameter.

Two further page groups sit outside the four types: **troubleshooting** (symptom, cause and fix, searched by error message) and **release notes** (what changed and what to do).

## Navigation

The left-hand navigation in the published set has six groups, in this order. The order follows a developer's journey from first contact to day-to-day use.

```
Home (index.md)
│
├── Get started                 (tutorials)
│   ├── Authenticate: get and use a token
│   ├── Create your first board, column and card
│   └── Quickstart: move a card and receive the real time event
│
├── How-to guides
│   ├── Move a card
│   ├── Handle a version conflict
│   ├── Add and reply to comments
│   ├── Paginate lists
│   └── Reconnect to real time
│
├── Concepts
│   ├── Conflicts and versions
│   ├── Real time events overview
│   └── Comment threading
│
├── Reference
│   ├── Authentication
│   ├── Boards
│   ├── Columns
│   ├── Cards
│   ├── Comments
│   ├── Real time events
│   ├── Pagination
│   └── Errors
│
├── Troubleshooting
│
└── Release notes
    ├── What is new in v2
    └── Migrate from v1 to v2
```

Four pages in the repository are internal and do not appear in the developer navigation: the structure and navigation page (this one), the documentation quality plan, the engineering note and the open questions list. They live under `docs/meta/` and are for the documentation team and engineering.

### Reading paths

Developers arrive with different goals. The home page offers three entry points, one for each path.

| Developer | Path |
|---|---|
| New to the API | Home, Authenticate, Create your first board, Quickstart, then the three concept pages |
| Upgrading from v1 | Migrate from v1 to v2, Conflicts and versions, Paginate lists, then the Cards and Boards reference |
| Debugging an error | Troubleshooting, then Errors reference, then the matching concept page |

### Linking rules

Links make the four types work together. Every page follows these rules.

1. A tutorial links to the concept and reference pages for each thing it uses, at the end, not in the middle of the steps.
2. A how-to guide links to one concept page ("why this works") and one reference page ("every parameter").
3. A concept page links to the how-to that applies it and the reference that defines it.
4. A reference page links to the how-to for the most common task on that endpoint.
5. Every page ends with a "Related pages" list.
6. Each fact lives on one reference page. Other pages link to it instead of repeating it, except where a repeated fact is unavoidable. The pages that repeat the same facts are listed in section 3.3 of the [documentation quality plan](documentation-quality-plan.md), so they can be updated together.

## Page names developers search for

Developers search with the words in their code, their error output and their question. Titles and top headings are chosen to match those words. The table lists the search terms the structure is built around and the page that should answer each one.

| Developer types | Page | Title or heading that matches |
|---|---|---|
| `VERSION_CONFLICT`, `409` | Conflicts and versions, Handle a version conflict, Errors | "Handle a version conflict", "409 VERSION_CONFLICT" |
| move card API, `PATCH /cards/{cardId}/move` | Move a card, Cards reference | "Move a card" |
| Socket.io connect, `wss://api.example.com` | Real time events overview, Real time events reference | "Real time events" |
| `board.join` | Real time events reference, Quickstart | "Join a board (`board.join`)" |
| `card.moved`, `comment.added`, `card.created` | Real time events reference | One heading per event, named exactly |
| no events, not receiving events | Troubleshooting | "No real-time events arrive" |
| reconnect, disconnect, missed events | Reconnect to real time | "Reconnect to real time" |
| reply to comment, threaded comments, comment depth | Add and reply to comments, Comment threading | "Add and reply to comments" |
| `pageSize`, `page`, `total`, pagination | Paginate lists, Pagination reference | "Paginate lists" |
| v1 to v2, breaking changes, "data" instead of array | Migrate from v1 to v2 | "Migrate from v1 to v2" |
| 401 unauthorized, JWT, `Authorization: Bearer` | Authenticate, Authentication reference | "Authenticate: get and use a token" |
| 403 comment, edit comment, delete comment | Comments reference | "Edit a comment", "Delete a comment" |

These terms come from the engineering notes and the support problems in the brief. They are proposals. The documentation quality plan describes how search logs and the "was this helpful" rating on each page will confirm which terms developers really use, and which pages need a new title or a new section.

### Naming conventions

- **File names** are lowercase with hyphens, matching the page title: `handle-a-version-conflict.md`.
- **Tutorials and how-to guides** start with a verb: "Move a card", "Reconnect to real time".
- **Concept and reference pages** use a noun: "Conflicts and versions", "Cards".
- **Exact identifiers** are written as they appear in code: `VERSION_CONFLICT`, `board.join`, `pageSize`.
- **Two pages share the word "authentication".** The tutorial is titled "Authenticate: get and use a token" and the reference is titled "Authentication", so search results show which is which.
- **Anchors stay stable.** A heading that other pages link to is not renamed without updating every link. The troubleshooting heading "No real-time events arrive" produces the anchor `#no-real-time-events-arrive`, which the home page and other pages use.

## Where the Stage 1 pages fit

Stage 1 documented version 1: authentication, boards, columns and cards. Those pages become reference pages in the new structure. Their content is kept and extended, not discarded.

| Stage 1 page | New location | What changes for v2 |
|---|---|---|
| Authentication | `reference/authentication.md` | Authentication is unchanged from v1. Adds that the same token is sent in the Socket.io `auth` option. |
| Boards | `reference/boards.md` | `GET /boards` returns a paginated object instead of an array. |
| Columns | `reference/columns.md` | The notes list no change. Adds links to the move card pages. |
| Cards | `reference/cards.md` | Adds `position` and `version` to the card object, the move endpoint, and the `version` requirement on updates. |

Two tutorial pages use the Stage 1 resources as their subject: "Authenticate: get and use a token" and "Create your first board, column and card". They teach the Stage 1 material in task order, so a new developer meets boards, columns and cards while making something, and reads the reference pages afterward for detail.

Where v2 changes how a Stage 1 feature behaves, the reference page marks it with a "Changed in v2" note and links to the [migration guide](../release-notes/migrate-v1-to-v2.md).

## Feedback and measurement

The structure includes two ways to learn whether it works. Both are described in the [documentation quality plan](documentation-quality-plan.md).

- **A "was this helpful" rating on every page.** A page with low ratings is reviewed first.
- **Search logs.** Queries that return no results, or that lead to a page followed by a rating of "no", show where the page names or the structure do not match how developers think.

Both depend on the documentation being published on a platform that supports search logs and ratings. A folder of Markdown files alone does not provide them.

## Page inventory

| Location | Files |
|---|---|
| Root | `README.md` |
| `docs/` | `index.md`, `troubleshooting.md` |
| `docs/getting-started/` | `authentication.md`, `first-board-column-card.md`, `quickstart-move-card-realtime.md` |
| `docs/how-to/` | `move-a-card.md`, `handle-a-version-conflict.md`, `add-and-reply-to-comments.md`, `paginate-lists.md`, `reconnect-to-realtime.md` |
| `docs/concepts/` | `conflicts-and-versions.md`, `realtime-events-overview.md`, `comment-threading.md` |
| `docs/reference/` | `authentication.md`, `boards.md`, `columns.md`, `cards.md`, `comments.md`, `realtime-events.md`, `pagination.md`, `errors.md` |
| `docs/release-notes/` | `v2.0.md`, `migrate-v1-to-v2.md` |
| `docs/meta/` | `structure-and-navigation.md`, `documentation-quality-plan.md`, `engineering-note.md`, `open-questions.md` |
| `examples/` | `quickstart.js`, `realtime-client.js`, `move-card.sh` |