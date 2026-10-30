# Documentation quality plan

This plan describes how the Collaborative Knowledge Board API documentation is verified, how it stays accurate as the API changes, and which signals show whether it is working.

It answers the four problems reported for the v1 documentation:

| Reported problem | What this plan does about it |
|---|---|
| Developers cannot tell how to connect to real time events | The quickstart and the real time client are tested end to end, and a new reader tries the quickstart before each release. |
| Support gets repeated questions about the conflict error | Support questions about `409 VERSION_CONFLICT` are tracked as the main success signal. |
| Documentation is organised by team, not by task | Search terms and page feedback show whether developers find the right page. |
| Engineers say "the code is the documentation" | Engineering review is limited to short, specific checks, and the questions that need them are tracked in [open questions](open-questions.md). |

## 1. Current verification status

Be clear about what has and has not been checked.

| Area | Status |
|---|---|
| Endpoint paths, parameters and error codes | Written from the engineering notes. **Not yet tested against a running API.** |
| Code examples in `examples/` and in the pages | Written from the engineering notes. **Not yet run.** |
| Behaviour the notes do not state | Marked as an assumption on the page, and listed in [open questions](open-questions.md). |
| Links and anchors between pages | Checked by hand against the folder structure. Automated checking is in section 2. |

Every claim in the documentation has one of three states:

| State | Meaning | How it appears |
|---|---|---|
| Confirmed | Engineering confirmed it, or a test against the API proved it | Stated plainly |
| Assumed | Not in the notes, and a sensible default was used | Marked as an assumption and linked to a question |
| Unknown | Cannot be documented safely | Marked as unknown and linked to a question |

The goal of the checks below is to move every Assumed and Unknown claim to Confirmed, and to keep Confirmed claims true.

## 2. How examples are verified

### 2.1 What needs a test

| Example | File or page | What the test proves |
|---|---|---|
| Quickstart script | [`quickstart.js`](../../examples/quickstart.js) | A new account can log in, move a card and receive `card.moved` |
| Move a card with `curl` | [`move-card.sh`](../../examples/move-card.sh) | The request body and headers work, and `version` increases by 1 |
| Real time client | [`realtime-client.js`](../../examples/realtime-client.js) | Connect, join, receive events, reconnect and rejoin |
| Version conflict handling | [Handle a version conflict](../how-to/handle-a-version-conflict.md) | A stale `version` returns `409 VERSION_CONFLICT`, and the retry logic recovers |
| Pagination loop | [Pagination](../reference/pagination.md) | The loop reads every item once. With `total` of 134 and `pageSize` of 20, it reads 7 pages |
| Comments | [Comments](../reference/comments.md) | Create, reply, edit and delete work. A non-author gets `403`. A reply is at depth 2 |
| Every JSON response in the pages | All reference pages | The documented fields exist and have the documented types |

### 2.2 The test environment

Examples are tested against a non-production environment with:

- A test account, and a second test account for permission checks such as the `403` on comments.
- A seeded board with at least two columns and three cards, and enough extra cards to need several pages. For example, 45 cards gives 3 pages at the default `pageSize`.
- Environment variables for the base URL and credentials, so the same scripts run anywhere. No token is ever written into a page or a script.

Whether such an environment exists is not known ([Q71](open-questions.md)). Until it does, examples are checked by hand against a development environment, and the page marks anything it could not check.

### 2.3 Automated checks

Run these in CI on every change to a page or an example, and on a schedule (section 3.5).

| Check | How it works | Fails when |
|---|---|---|
| Example scripts run | Run `quickstart.js` and `move-card.sh` against the test environment | A script exits with an error or an assertion fails |
| Real time round trip | The test joins a board, moves a card over REST, then waits for `card.moved` | No event arrives within 5 seconds, or `boardId`, `actorId`, `timestamp` or `data` is missing |
| Conflict test | Send a move with an old `version` | The response is not `409` with code `VERSION_CONFLICT` |
| Version increase | Move a card and compare versions | `version` does not increase by 1 on a move |
| Response shape | Compare each documented JSON response with a live response, field by field | A field is missing, renamed or has a different type |
| Single source for code | The runnable block in [Real time events](../reference/realtime-events.md) is compared with `realtime-client.js` | The two differ |
| Links and anchors | A link checker reads every Markdown page | A link points to a missing file or heading. Required anchors include `#move-a-card`, `#no-real-time-events-arrive`, `#get-the-cards-in-a-column` and `#2-list-endpoints-return-paginated-objects` |
| Repeated facts agree | A script searches for facts that appear on several pages (section 3.3) | A repeated fact has two different wordings |

### 2.4 Manual checks

Automation cannot judge whether a page is understandable. These are done by a person.

| Check | When | Pass condition |
|---|---|---|
| Cold start test | Before every release, and every quarter | Someone who has never seen the product follows the [quickstart](../getting-started/quickstart-move-card-realtime.md), using only the page, and moves a card and receives the event in 15 minutes. The tester is timed. Every point where they stop or ask a question is logged as a defect |
| Troubleshooting test | Every quarter | For each entry in [Troubleshooting](../troubleshooting.md), cause the problem on purpose and confirm the fix works |
| Engineering review of reference pages | When a reference page changes | An engineer answers yes or no to a short checklist: paths, parameters, status codes, permissions |
| Read aloud review | Before a release | A second writer reads each page and marks anything unclear |

### 2.5 Closing assumptions

When engineering answers a question or a test proves a behaviour:

1. Remove the assumption marker from the page and state the behaviour plainly.
2. Mark the question as answered in [open questions](open-questions.md), with the date and who answered.
3. Add a test for the behaviour, so that it stays true.
4. Search other pages for the same fact and update them.

## 3. How the documentation stays accurate

### 3.1 Ownership

| Content | Writer owns | Engineering confirms |
|---|---|---|
| Tutorials and how to guides | Wording, steps, structure | That the steps still work |
| Concepts | Explanations and diagrams | That the explanation is correct |
| Reference | Format and examples | Paths, parameters, status codes, permissions |
| Release notes and migration guide | Ranking, wording, the "what you must do" lines | Which changes are breaking |

### 3.2 Making documentation part of changing the API

- **Pull request rule.** Every pull request that changes an endpoint, an event, an error or a default must either include the matching documentation change or tick "no documentation impact" with a reason. A reviewer checks the box.
- **Release notes as input.** A change is not released until it has a release note entry ranked by impact. Breaking changes need a migration step with before and after code.
- **A machine readable source.** The best protection is a specification that engineering already maintains. An OpenAPI file for the REST endpoints and a list of real time events with their payload fields would let the reference pages and the response shape checks be compared with the source automatically. Whether these exist is not known ([Q72](open-questions.md)). Without them, the response shape check in section 2.3 uses live responses instead.

### 3.3 Facts that appear on more than one page

These facts are repeated, so they can drift apart. They are changed together, and the repeated facts check looks for them.

| Fact | Pages |
|---|---|
| The ranked list of changes and the "what you must do" lines | [v2.0 release notes](../release-notes/v2.0.md), [Migrate from v1 to v2](../release-notes/migrate-v1-to-v2.md) |
| Rules for `version` and the `409` response | [Cards](../reference/cards.md), [Errors](../reference/errors.md), [Conflicts and versions](../concepts/conflicts-and-versions.md), [Handle a version conflict](../how-to/handle-a-version-conflict.md) |
| `page` and `pageSize` defaults and limits | [Pagination](../reference/pagination.md), [Paginate lists](../how-to/paginate-lists.md) |
| Real time URL, token option, events and reconnection steps | [Real time events](../reference/realtime-events.md), [Real time events overview](../concepts/realtime-events-overview.md), [Reconnect to real time events](../how-to/reconnect-to-realtime.md), [Troubleshooting](../troubleshooting.md), `realtime-client.js` |
| Comment depth, length limit and permissions | [Comments](../reference/comments.md), [Comment threading](../concepts/comment-threading.md), [Add and reply to comments](../how-to/add-and-reply-to-comments.md) |
| Error shape | [Errors](../reference/errors.md) and every page that shows an error |

Reference pages state each fact in full. Other pages link to the reference instead of rewording it wherever possible.

### 3.4 Versioning the documentation

- Documentation is tagged with the API version it describes. Today that is v2.
- A new API version gets its own release notes and migration guide, and the previous version's pages are kept until its end date. The end date for v1 is not known ([Q64](open-questions.md)).
- Deprecations are announced in release notes before removal, with the date and the replacement.

### 3.5 Review schedule

| Frequency | What happens |
|---|---|
| Every change | Automated checks (section 2.3) |
| Every release | Cold start test, release notes check, engineering sign off on changed reference pages |
| Weekly, until none are left | Review open questions marked Critical |
| Monthly | Re-run all example tests on a schedule, even if nothing changed. This catches API changes that nobody documented |
| Quarterly | Troubleshooting test, review of search terms and feedback (section 4), and removal of pages that nobody reaches |

### 3.6 Definition of done for a documentation change

A change is finished when:

1. Every example in it has been run, or is marked as not run.
2. Every claim not confirmed by engineering is marked as an assumption and linked to a question.
3. Links and anchors pass the link check.
4. Repeated facts agree on all pages.
5. The release notes and migration guide are updated if the change affects developers.
6. A reviewer has read it as someone who has never seen the product.

## 4. Signals that the documentation is working

Signals are grouped by what they tell you. Targets below are proposals. Baselines must be taken from support data before the release, and the targets adjusted.

### 4.1 Outcome signals

| Signal | Why it matters | How it is measured | Proposed target |
|---|---|---|---|
| Support questions about `409 VERSION_CONFLICT` | This was the most repeated question | Count of tickets with this topic per month, compared with the month before release | At least 50% fewer within 2 months |
| Support questions about connecting to real time events | A reported problem | Count of tickets with this topic per month | At least 50% fewer within 2 months |
| Questions developers ask engineers about the API | Shows whether the docs replace "the code is the documentation" | Count of API questions in engineering channels and tickets | Falling every month |
| Time to first success | Measures the quickstart | Cold start test time. If request logs are available, time from a new token to the first successful move | 15 minutes or less |
| Quickstart completion | Shows whether developers get through it | Share of new tokens that make a successful move and join a board within 24 hours | Rising, and set once the baseline is known |

### 4.2 Behaviour signals from the API

These need access to request logs.

| Signal | What it shows | Healthy sign |
|---|---|---|
| Move or update requests with no `version` | Developers who did not read the migration guide | Falling after release, and close to zero after 2 months |
| `409` errors followed by a successful request with the new `version` within a minute | Developers handle the conflict correctly | Most `409`s are followed by a successful retry |
| `409` errors with no follow up request | Developers who give up | Low and falling |
| Requests that stop at page 1 on lists with a `total` above `pageSize` | Developers who did not read about pagination | Falling |
| `board.join` followed by at least one event received | Developers who connect successfully | Rising |

### 4.3 Documentation signals

| Signal | How it is measured | What to do when it is bad |
|---|---|---|
| Searches with no result, or a result that is not clicked | Search logs | Add the term to the page title or headings, or add a redirect page |
| Pages with a low "was this helpful" score | A rating on each page, with an optional comment | Rewrite the page, starting with the comments |
| Troubleshooting entry views followed by a support ticket on the same topic | Page views joined with tickets | The fix in that entry does not work. Retest it |
| Exits from the quickstart, step by step | Page analytics, or the cold start log | Rewrite the step where most readers leave |
| Page names developers search for, such as "move a card", "version conflict", "realtime events", "pagination" | Compared with the page titles in the [structure and navigation](structure-and-navigation.md) | Rename the page or add the term |

### 4.4 Health signals about the documentation itself

| Signal | Healthy sign |
|---|---|
| Failing example tests | Zero, and any failure fixed within one working day |
| Broken links and anchors | Zero |
| Open Critical questions | Falling every week until none are left |
| Claims in Assumed or Unknown state | Falling every release |
| Days since each reference page was verified | Under 90 |

### 4.5 Signals not to rely on

- **Page views on their own.** A high count can mean the page is popular or that readers cannot find the answer.
- **Number of pages.** More pages do not mean better documentation.
- **No tickets.** If developers cannot find the support route, silence does not mean success. Compare against the behaviour signals.

## 5. What this plan needs from engineering

The smallest set of things that lets the checks above run is listed in the [engineering note](engineering-note.md). In summary:

- A test environment, a second test account and seed data ([Q71](open-questions.md)).
- An API specification, or a list of event payloads, if one exists ([Q72](open-questions.md)).
- Answers to the Critical [open questions](open-questions.md).
- Read access to request logs and support ticket topics, so that section 4 can be measured.
- A review step in pull requests for any change that affects the API.