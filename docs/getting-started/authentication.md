# Authenticate: get a token and use it

Every request to the API, and every real time connection, needs a token. In this tutorial you log in, get a token, check that it works and learn where to send it. It takes about 5 minutes.

Authentication in v2 is unchanged from v1. If your v1 code already logs in and sends a token, it keeps working. You only need to change the base URL to `https://api.example.com/v2`.

**You need:**

- An account on the Collaborative Knowledge Board, with its email address and password.
- `curl` and a terminal. Any other HTTP client works too.

**Quick summary:** log in to get a JWT, then send it as `Authorization: Bearer <token>` on every REST request and in the `auth` option when you connect to real time events.

> **Assumption:** The engineering notes say that you log in to get a JWT, but they do not give the login path, the request body or the name of the field that holds the token. This page assumes `POST /auth/login` with `email` and `password`, and a response with a `token` field. See [Q73](../meta/open-questions.md). The full details of the login request are in the [authentication reference](../reference/authentication.md). If the two pages differ, the reference page is correct.

## Step 1: Log in

Send your email and password to the login endpoint.

```bash
curl -s -X POST https://api.example.com/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "you@example.com", "password": "your-password" }'
```

You get a response that contains a JWT:

```json
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

The real token is much longer than this example. It has three parts separated by dots.

## Step 2: Save the token in a variable

Copy the value of `token` and store it in an environment variable. The rest of the documentation uses `$TOKEN`.

```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Check that it is set:

```bash
echo "${#TOKEN}"
```

The number printed is the length of the token. It should be well above 100. If it prints `0`, the variable is empty.

## Step 3: Check that the token works

Call an endpoint that needs authentication. Listing boards is a good test, because every account can use it.

```bash
curl -s https://api.example.com/v2/boards \
  -H "Authorization: Bearer $TOKEN"
```

A working token returns a paginated object. Your values differ:

```json
{
  "data": [ { "id": "b_9", "name": "Launch plan" } ],
  "page": 1,
  "pageSize": 20,
  "total": 1
}
```

The exact fields inside each board are in the [boards reference](../reference/boards.md). What matters here is the shape: the boards are in `data`, next to `page`, `pageSize` and `total`. See [Pagination](../reference/pagination.md).

**Checkpoint.** You are done with REST authentication when this call returns an object with a `data` array. If it returns an error, go to [If something goes wrong](#if-something-goes-wrong).

## Step 4: Know where to send the token

| Where | How to send it |
|---|---|
| REST requests | The header `Authorization: Bearer <token>`. There is one space after `Bearer`. |
| Real time connection | The `auth` option of the Socket.io client, as shown below. |

For real time events, connect to `wss://api.example.com` and pass the token in `auth`:

```js
import { io } from "socket.io-client";

const socket = io("wss://api.example.com", {
  auth: { token: process.env.TOKEN },
});

socket.on("connect", () => console.log("connected", socket.id));
socket.on("connect_error", (err) => console.error("connect_error", err.message));
```

The name `token` inside `auth` is an assumption, because the notes say only that the token goes in the `auth` option ([Q73](../meta/open-questions.md)). The [quickstart](quickstart-move-card-realtime.md) and the [real time events reference](../reference/realtime-events.md) use the same form.

## Keep your token safe

A token gives full access to your account.

- Do not commit it to source control. Keep it in an environment variable or a secrets manager.
- Do not put it in a URL or query string. URLs are stored in logs and browser history.
- Do not write it to logs. Print only its length or the first few characters when you debug.
- Do not put it in code that runs in a public web page.
- If you think a token has leaked, log in again and stop using the old one. How to cancel a token before it expires is not documented ([Q74](../meta/open-questions.md)).

## When a token stops working

A token can expire. The lifetime of a token, and whether it can be refreshed, are not stated in the engineering notes ([Q74](../meta/open-questions.md)). Until they are confirmed:

- Treat any authentication error as a sign that the token may have expired.
- Log in again to get a new token, and retry the request once.
- Do not retry in a loop. If the second attempt fails, show an error to the user.
- For a real time connection, update the `auth` option with the new token before you reconnect.

## If something goes wrong

| Problem | Likely cause | Fix |
|---|---|---|
| The login request returns an error | Wrong email or password, or a misspelled field name | Check the credentials and the request body against the [authentication reference](../reference/authentication.md) |
| `curl` prints nothing for the boards call | The base URL is wrong, or the request did not reach the server | Run it again without `-s` to see the error. The base URL is `https://api.example.com/v2` |
| An error response with a message about authentication | The token is missing, expired or malformed | Check that `echo "${#TOKEN}"` shows a long number, that the header starts with `Authorization: Bearer ` and that you did not add quotation marks inside the token. Then log in again |
| The login worked in v1 but fails now | The base URL still points to v1 | Use `https://api.example.com/v2`. See the [migration guide](../release-notes/migrate-v1-to-v2.md) |
| `connect_error` in real time | The token is missing, expired or sent in the wrong place | Pass it as `auth: { token }`, not in a header or the URL |

All errors use the same shape. See [Errors](../reference/errors.md).

```json
{ "error": { "code": "VERSION_CONFLICT", "message": "Card was updated by someone else" } }
```

The error codes that authentication failures return are not confirmed ([Q74](../meta/open-questions.md)). For more help, see [Troubleshooting](../troubleshooting.md).

## Next steps

- [Create your first board, column and card](first-board-column-card.md)
- [Quickstart: move a card and receive the real time event](quickstart-move-card-realtime.md)
- [Authentication reference](../reference/authentication.md)