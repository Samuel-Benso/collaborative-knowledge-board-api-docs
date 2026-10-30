# Collaborative Knowledge Board API documentation

Documentation for version 2 of the Collaborative Knowledge Board API. Version 2 adds real time events, threaded comments, card moving, version checks that return a conflict error, and paginated lists.

- **Base URL:** `https://api.example.com/v2`
- **Real time:** Socket.io at `wss://api.example.com`
- **Authentication:** Log in to get a JWT and send it as `Authorization: Bearer <token>`

## Start here

Pick the row that matches what you want to do.

| I want to... | Go to |
|---|---|
| Move a card and receive the real time event in 15 minutes | [Quickstart](docs/getting-started/quickstart-move-card-realtime.md) |
| Create my first board, column and card | [First board, column and card](docs/getting-started/first-board-column-card.md) |
| Log in and send a token | [Authentication guide](docs/getting-started/authentication.md) |
| Move a card | [How to move a card](docs/how-to/move-a-card.md) |
| Fix a `409 VERSION_CONFLICT` error | [How to handle a version conflict](docs/how-to/handle-a-version-conflict.md) |
| Add comments and replies | [How to add and reply to comments](docs/how-to/add-and-reply-to-comments.md) |
| Read long lists | [How to paginate lists](docs/how-to/paginate-lists.md) |
| Recover after a lost connection | [How to reconnect to real time events](docs/how-to/reconnect-to-realtime.md) |
| Upgrade from v1 | [Migration guide](docs/release-notes/migrate-v1-to-v2.md) |
| Fix a problem | [Troubleshooting](docs/troubleshooting.md) |

The full table of contents is in [docs/index.md](docs/index.md).

## How the documentation is organised

Pages are grouped by what you are trying to do, not by which team built the feature. There are four content types.

| Type | Folder | Use it when you want to... |
|---|---|---|
| Tutorial | `docs/getting-started/` | Learn by following steps from zero |
| How to | `docs/how-to/` | Complete one specific task |
| Concept | `docs/concepts/` | Understand why something works the way it does |
| Reference | `docs/reference/` | Look up exact parameters, responses and errors |

Release notes are in `docs/release-notes/`. Pages about the documentation itself are in `docs/meta/`.

## Reference pages

| Page | Covers |
|---|---|
| [Authentication](docs/reference/authentication.md) | Login and token use |
| [Boards](docs/reference/boards.md) | Board endpoints |
| [Columns](docs/reference/columns.md) | Column endpoints |
| [Cards](docs/reference/cards.md) | Card object and move endpoint |
| [Comments](docs/reference/comments.md) | Create, reply, edit and delete |
| [Real time events](docs/reference/realtime-events.md) | Connecting, joining a board, events and reconnection |
| [Pagination](docs/reference/pagination.md) | `page`, `pageSize` and the response object |
| [Errors](docs/reference/errors.md) | Error shape and codes |

## Concepts

- [Conflicts and versions](docs/concepts/conflicts-and-versions.md): optimistic updates, the version check and the 409 response
- [Real time events overview](docs/concepts/realtime-events-overview.md)
- [Comment threading](docs/concepts/comment-threading.md)

## Release notes

- [v2.0 release notes](docs/release-notes/v2.0.md): changes ranked by impact
- [Migrate from v1 to v2](docs/release-notes/migrate-v1-to-v2.md): what you must do for the two breaking changes

## Code examples

Runnable examples are in [`examples/`](examples/).

| File | What it does |
|---|---|
| [`quickstart.js`](examples/quickstart.js) | The quickstart steps as one script |
| [`realtime-client.js`](examples/realtime-client.js) | A complete real time client with reconnection. It matches the example in the [real time events reference](docs/reference/realtime-events.md). |
| [`move-card.sh`](examples/move-card.sh) | Moves a card with `curl` |

The examples need a valid account and token. Follow the [authentication guide](docs/getting-started/authentication.md) first.

## What is confirmed and what is assumed

Some behaviour was not confirmed by engineering when this documentation was written. These details are marked as assumptions on the pages where they appear.

- All open questions, with their priority and the assumption used, are in [docs/meta/open-questions.md](docs/meta/open-questions.md).
- The summary for the engineering lead is in [docs/meta/engineering-note.md](docs/meta/engineering-note.md).

If an example or statement here disagrees with the API, the API is correct. Please report the page so it can be fixed.

## About the documentation set

| Page | Purpose |
|---|---|
| [Structure and navigation](docs/meta/structure-and-navigation.md) | The structure, the four content types and the page names developers search for |
| [Documentation quality plan](docs/meta/documentation-quality-plan.md) | How examples are verified, how pages stay accurate and which signals show the documentation works |
| [Engineering note](docs/meta/engineering-note.md) | Findings, gaps and the engineering time needed to finish |
| [Open questions](docs/meta/open-questions.md) | Questions for engineering, with priority and assumptions |

## For reviewers

| Requirement | Where to find it |
|---|---|
| 1. API reference | [Cards](docs/reference/cards.md), [Comments](docs/reference/comments.md), [Errors](docs/reference/errors.md), [Open questions](docs/meta/open-questions.md) |
| 2. Real time events guide | [Real time events](docs/reference/realtime-events.md), [Reconnect how to](docs/how-to/reconnect-to-realtime.md), [`realtime-client.js`](examples/realtime-client.js) |
| 3. Quickstart | [Quickstart](docs/getting-started/quickstart-move-card-realtime.md) |
| 4. Conflicts and versions concept | [Conflicts and versions](docs/concepts/conflicts-and-versions.md) |
| 5. Documentation structure | [Structure and navigation](docs/meta/structure-and-navigation.md) |
| 6. Release notes and migration guide | [v2.0](docs/release-notes/v2.0.md), [Migration guide](docs/release-notes/migrate-v1-to-v2.md) |
| 7. Documentation quality plan | [Quality plan](docs/meta/documentation-quality-plan.md) |
| 8. Engineering note | [Engineering note](docs/meta/engineering-note.md) |
