# Collaborative Knowledge Board API documentation

Build on the Collaborative Knowledge Board API. Version 2 lets your app move cards, discuss them in threaded comments and see changes from other users as they happen.

| | |
|---|---|
| **Base URL** | `https://api.example.com/v2` |
| **Real time** | Socket.io at `wss://api.example.com` |
| **Authentication** | Log in to get a JWT and send it as `Authorization: Bearer <token>` |

## New here?

Follow the [Quickstart](getting-started/quickstart-move-card-realtime.md). In about 15 minutes you will log in, move a card and receive the real time event for the move. You do not need any earlier knowledge of the product.

## Upgrading from v1?

Version 2 has two breaking changes: card updates and moves now require `version`, and list endpoints return paginated objects. Read the [v2.0 release notes](release-notes/v2.0.md) for the ranked list of changes, then follow the [migration guide](release-notes/migrate-v1-to-v2.md).

## Find what you need by task

| I want to... | Read |
|---|---|
| Log in and send a token | [Authentication guide](getting-started/authentication.md) |
| Create my first board, column and card | [First board, column and card](getting-started/first-board-column-card.md) |
| Move a card to another column or position | [Move a card](how-to/move-a-card.md) |
| Stop getting `409 VERSION_CONFLICT` errors | [Handle a version conflict](how-to/handle-a-version-conflict.md) |
| Comment on a card and reply to a comment | [Add and reply to comments](how-to/add-and-reply-to-comments.md) |
| Load all boards or all cards in a board | [Paginate lists](how-to/paginate-lists.md) |
| Recover after the real time connection drops | [Reconnect to real time events](how-to/reconnect-to-realtime.md) |
| Find out why no events arrive | [Troubleshooting](troubleshooting.md#no-real-time-events-arrive) |

## Understand how it works

| Page | Explains |
|---|---|
| [Conflicts and versions](concepts/conflicts-and-versions.md) | Optimistic updates, the version check and the 409 response, with a sequence diagram |
| [Real time events overview](concepts/realtime-events-overview.md) | How rooms, events and REST calls fit together |
| [Comment threading](concepts/comment-threading.md) | How replies nest and what the depth means |

## Look up exact details

| Page | Contains |
|---|---|
| [Authentication](reference/authentication.md) | Login request, token and header |
| [Boards](reference/boards.md) | Board endpoints |
| [Columns](reference/columns.md) | Column endpoints and the cards in a column |
| [Cards](reference/cards.md) | Card object and the move endpoint |
| [Comments](reference/comments.md) | Create, reply, edit and delete, with permissions |
| [Real time events](reference/realtime-events.md) | Connecting, joining a board, event payloads, order and reconnection |
| [Pagination](reference/pagination.md) | `page`, `pageSize` and the response object |
| [Errors](reference/errors.md) | Error shape and every error code |

## Release notes

| Page | Contains |
|---|---|
| [v2.0 release notes](release-notes/v2.0.md) | What changed, ranked by impact |
| [Migrate from v1 to v2](release-notes/migrate-v1-to-v2.md) | Before and after code for the two breaking changes, and a test checklist |

## Code examples

Complete, runnable examples are in the [`examples`](../examples/) folder: [`quickstart.js`](../examples/quickstart.js), [`realtime-client.js`](../examples/realtime-client.js) and [`move-card.sh`](../examples/move-card.sh).

## How the pages are organised

Each page belongs to one of four types, so you can tell what you will get before you open it.

| Type | What it gives you | Where |
|---|---|---|
| Tutorial | Steps to follow from zero to a working result | `getting-started/` |
| How to | The steps for one specific task | `how-to/` |
| Concept | An explanation of why something works the way it does | `concepts/` |
| Reference | Exact parameters, responses and errors to look up | `reference/` |

## Things to know before you build

- **Unconfirmed behaviour is marked.** Some details were not confirmed by engineering when these pages were written. Each is marked as an assumption on the page where it appears. See the [open questions](meta/open-questions.md) for the full list.
- **Always send `version`.** Updating or moving a card without it is expected to fail.
- **Do not rely on the order of lists.** The sort order of boards and cards is not documented. See [Pagination](reference/pagination.md).
- **Real time events can arrive out of order, and you can receive your own events.** Write handlers that can safely run twice. See [Real time events](reference/realtime-events.md).

## About this documentation

| Page | Purpose |
|---|---|
| [Structure and navigation](meta/structure-and-navigation.md) | How the pages are organised and why |
| [Documentation quality plan](meta/documentation-quality-plan.md) | How examples are tested and how pages stay accurate |
| [Engineering note](meta/engineering-note.md) | Findings, gaps and the engineering time needed to finish |
| [Open questions](meta/open-questions.md) | Questions for engineering, with priority and the assumption used |

Return to the [README](../README.md).