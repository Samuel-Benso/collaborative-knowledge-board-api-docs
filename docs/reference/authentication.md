# Authentication

All requests to the Collaborative Knowledge Board API, except Register and Login, must prove who you are with a JSON Web Token (JWT). Authentication works the same way in v2 as in v1, so existing clients do not need to change how they log in.

**On this page**

- [How authentication works](#how-authentication-works)
- [Register](#register)
- [Login](#login)
- [Send the token with every request](#send-the-token-with-every-request)
- [Authenticate a real time connection](#authenticate-a-real-time-connection)
- [Token expiry](#token-expiry)
- [Errors](#errors)
- [Open questions](#open-questions)

**Tags used on this page**

| Tag | Meaning |
|---|---|
| **[MISSING]** | The engineering notes do not say |
| **[UNCLEAR]** | The notes can be read in more than one way |
| **[ASSUMED]** | This page states a value that has not been confirmed |

Questions are tracked by number (for example Q29) in the Open Questions log.

**Base URL:** `https://api.example.com/v2`

---

## How authentication works

1. **Register** once to create an account.
2. **Log in** with your email and password. The API returns a JWT.
3. **Send the JWT** in the `Authorization` header of every other request.

```
Authorization: Bearer <token>
```

Keep your token private. Anyone who has it can act as you until it expires.

---

## Register

`POST /auth/register`

Creates a new user account.

> **[ASSUMED]** The engineering notes say authentication is unchanged from v1, so this page uses the v1 endpoints under the v2 base URL. Confirm the paths (Q31).

**Authentication:** Not required.

### Request body

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Your display name |
| `email` | string | Yes | A valid email address. Must not already be registered |
| `password` | string | Yes | Your password. Length and complexity rules are not documented **[MISSING]** (Q28) |

### Example request

```bash
curl -X POST "https://api.example.com/v2/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Samuel",
    "email": "samuel@example.com",
    "password": "StrongPass#2026"
  }'
```

### Example response

`201 Created`

```json
{
  "id": "u_3",
  "name": "Samuel",
  "email": "samuel@example.com",
  "createdAt": "2026-10-20T09:00:00Z"
}
```

> **[UNCLEAR]** Version 2 user IDs use the prefix `u_`. Version 1 used `usr_` (Q20).

### Errors

| Status | Code | Cause | What to do |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` **[ASSUMED]** | A required field is missing, the email is invalid, or the password is too weak | Check the request body |
| 409 | `EMAIL_ALREADY_EXISTS` **[ASSUMED]** | An account with this email already exists | Log in instead, or use another email |

---

## Login

`POST /auth/login`

Checks your credentials and returns a JWT.

**Authentication:** Not required.

### Request body

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | The email you registered with |
| `password` | string | Yes | Your password |

### Example request

```bash
curl -X POST "https://api.example.com/v2/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "samuel@example.com",
    "password": "StrongPass#2026"
  }'
```

### Example response

`200 OK`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

| Field | Type | Description |
|---|---|---|
| `token` | string | The JWT. Send this value in the `Authorization` header |
| `tokenType` | string | Always `Bearer` |
| `expiresIn` | integer | How many seconds the token stays valid **[ASSUMED]** (Q29) |

Save the token in a variable so you can reuse it:

```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Errors

| Status | Code | Cause | What to do |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` **[ASSUMED]** | Email or password is missing | Check the request body |
| 401 | `INVALID_CREDENTIALS` **[ASSUMED]** | The email or password is incorrect | Check your details and try again |

---

## Send the token with every request

Add the `Authorization` header to every request except Register and Login.

```bash
curl "https://api.example.com/v2/boards" \
  -H "Authorization: Bearer $TOKEN"
```

Rules:

- Write `Bearer`, then one space, then the token.
- Send only the token value. Do not include quotation marks or the rest of the login response.
- Send the header over HTTPS only.

---

## Authenticate a real time connection

The real time connection uses the same token. Pass it in the `auth` option when you connect. You do not set an `Authorization` header for this connection.

```js
import { io } from "socket.io-client";

const socket = io("wss://api.example.com", {
  auth: { token: process.env.TOKEN },
});

socket.on("connect_error", (err) => {
  console.error("Connection failed:", err.message);
});
```

> **[MISSING]** The notes do not say how the server responds to a missing or invalid token, or what happens when the token expires while the connection is open (Q15). This page assumes an invalid token causes a `connect_error` event. See the Real Time Events guide for the full connection steps.

---

## Token expiry

A token is valid for a limited time. When it expires, requests return `401 UNAUTHORIZED`.

To continue:

1. Call `POST /auth/login` again to get a new token.
2. Replace the old token in your client.
3. Repeat the request that failed.

> **[MISSING]** The notes do not say whether the API supports refreshing a token without logging in again (Q29). This page assumes it does not.

---

## Errors

These errors can happen on any endpoint that requires authentication.

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing token"
  }
}
```

| Status | Code | Cause | What to do |
|---|---|---|---|
| 401 | `UNAUTHORIZED` **[ASSUMED]** | The token is missing, malformed, invalid or expired | Check the header format, then log in again to get a new token |
| 403 | `FORBIDDEN` **[ASSUMED]** | Your token is valid, but you do not have permission for this resource | Confirm you are using the correct account |

A `401` means the API does not know who you are. A `403` means it knows who you are, but you are not allowed to do this.

> **[MISSING]** Only `VERSION_CONFLICT` is named in the v2 engineering notes. The codes on this page follow the conventions of version 1 and need to be confirmed (Q28).

---

## Open questions

These questions affect this page. Each is tracked in the Open Questions log.

| ID | Question | Used on this page for |
|---|---|---|
| Q15 | How are missing, invalid and expired tokens handled on a real time connection? | Authenticate a real time connection |
| Q20 | Did ID prefixes change between v1 and v2? | Register response |
| Q28 | What is the full list of v2 error codes, and what are the password rules? | Errors |
| Q29 | What is the token lifetime, and can a token be refreshed? | Login, token expiry |
| Q31 | Are the register and login paths unchanged under `/v2`? | Register, Login |