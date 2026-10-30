# Engineering note: v2 documentation

**To:** Engineering Lead, Collaborative Knowledge Board API
**From:** Samuel, Documentation Engineer
**Date:** 30 October 2026
**Subject:** What the v2 docs need from engineering, and the smallest way to get it

## Summary

The v2 documentation set is written from the engineering notes. It covers all four v2 endpoints in the brief (move card, create and reply, edit, delete), both paginated lists, the three real time events and the two breaking changes. No example has been run against a live API yet, because the notes are the only source I have.

Every fact the notes do not state is marked "Assumption" on its page and logged in `open-questions.md` with a priority. Nothing unconfirmed is presented as fact.

I need about 90 minutes of engineering time, once, plus 10 minutes per API-changing pull request after that. The details are below.

## What I found

The notes are enough to explain the version check, the 409 response, the move request and the comment rules. They are not enough to publish a reference that developers can use without asking someone. Four gaps stop a developer today:

1. **No login details** (Q73). The notes say "log in to get a JWT" but give no path, body or response field. Every code example depends on it.
2. **No endpoint to read comments** (Q78). Comments can be created, edited and deleted, but a developer cannot load the existing comments on a card.
3. **No endpoint to read one card** (Q84). The conflict recovery steps need to fetch a card to get its current version.
4. **Reconnection behavior is unknown** (Q90). I do not know whether a joined board survives a reconnection or whether missed events are replayed. The real time guide and the client example depend on the answer.

## Contradictions and unclear points

| # | Point | Why it matters |
|---|---|---|
| 1 | The notes say updates and moves require `version`, but only the move endpoint is described (Q85). | Developers need the update path and method. |
| 2 | Comments are "2 levels deep" and a reply shows `depth: 2`, but a top-level comment's depth is not shown (Q75). | Position starts at 0 elsewhere, so depth 0 or 1 for a top-level comment is a real question. |
| 3 | The REST base URL has `/v2`. The real time URL does not (Q97). | I documented it as intended. A wrong guess breaks every connection. |
| 4 | `403` is given for comment edit and delete by a non-author, but no error code is given (Q76). | `errors.md` needs a code for each status. |
| 5 | Events are listed with `boardId`, `actorId`, `timestamp` and `data`, but `data` is never shown (Q94). | Developers cannot write handlers without it. |

Other open items, such as page size limits (Q69) and joining a missing board (Q70), are minor and have safe default wording on their pages.

## What I need, in order

| Step | Request | Time (estimate) | Resolves |
|---|---|---|---|
| 1 | Answer the four Critical questions: Q73, Q78, Q84, Q90. A written reply is fine. | 30 min | The gaps above |
| 2 | Paste six real payloads: the login response, `GET` of one card, the comment list, a `409` response, a `card.moved` event and a `comment.added` event. | 30 min | Q75, Q79, Q82, Q87, Q94 and most Important questions |
| 3 | Give me a test or staging account with seed data (Q71), and send the OpenAPI file or event payload list if one exists (Q72). | 30 min | Verification of every example |
| 4 | After that, review each pull request that changes the API for 10 minutes and tell me what it affects. I also need read access to API error logs. | 10 min per pull request | Keeping the docs accurate (see the quality plan) |

Steps 1 to 3 total about 90 minutes. You do not need to write any documentation. Pasting real responses is enough, and I will do the rest.

## What happens without it

The pages stay published with the assumptions marked. Developers who build on an assumption that proves wrong will hit errors that the docs predicted but could not confirm. The most likely support tickets would come from the four Critical items.

## Status

| Item | State |
|---|---|
| Pages written from the notes | Complete |
| Assumptions marked on the page and logged | Complete |
| Examples run against a live API | Not done. Needs step 3. |
| Critical questions answered | 0 of 4 |

The full question list is in [open-questions.md](open-questions.md). The verification and maintenance approach is in the [documentation quality plan](documentation-quality-plan.md).