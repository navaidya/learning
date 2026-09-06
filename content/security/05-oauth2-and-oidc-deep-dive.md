---
title: OAuth 2.0 / 2.1 & OIDC Deep Dive
summary: Delegated authorization done right — the roles, the grant types worth using, PKCE, refresh-token rotation, audience and scope discipline, DPoP, what OAuth 2.1 removes, and the classic OAuth attacks with their fixes.
order: 5
category: Identity & Access
difficulty: intermediate
readingMinutes: 26
threatsCovered: [authorization-code interception, token leakage, redirect hijacking, scope creep, confused deputy, CSRF on the auth flow]
practices: [PKCE, exact redirect matching, short-lived scoped tokens, refresh rotation, audience restriction, DPoP]
tags: [oauth, oidc, pkce, tokens, api-security, oauth2.1]
---

_OAuth is a **delegated authorization** framework: it lets a client get a limited, time-boxed token to act on a resource, without ever seeing the resource owner's password. It is not an authentication protocol — that is OIDC's job._

## 1. Why this matters for our system

The downstream API is an OAuth **resource server**: it must validate access tokens correctly or it is wide open. If we ever call a partner API on a user's behalf, or expose "connect your account" flows, we become an OAuth **client** and inherit the redirect/PKCE/state pitfalls. And because MCP (module 13) has adopted OAuth 2.1 for authorizing agents to tools, understanding these flows is now directly part of AI-agent security.

## 2. Core concepts

**Roles:**

| Role | In our world |
| --- | --- |
| **Resource owner** | the human (or org) who owns the data |
| **Client** | the app requesting access (our service, or an agent) |
| **Authorization server (AS)** | issues tokens after authenticating the owner and getting consent (corporate IdP) |
| **Resource server (RS)** | the API that accepts access tokens (our downstream API) |

**Tokens:**

- **Access token** — short-lived (minutes), presented to the RS. May be a JWT or opaque (validated via introspection). Carries **scopes** and an **audience**.
- **Refresh token** — longer-lived, presented only to the AS to get a new access token. Must be **rotated** on each use and bound to the client.
- **ID token** (OIDC only) — a JWT *about the user*, for the client, never sent to an RS.

**Scopes vs audience vs claims** — scope is *what* the token may do (`events:read`); audience (`aud`) is *which RS* may accept it; resource-indicator (RFC 8707) lets a client ask for a token scoped to exactly one API. A token with `aud` for API A must be rejected by API B — this stops a **confused-deputy / token-passing** attack.

**Grant types — what to use:**

| Grant | Use it? | For |
| --- | --- | --- |
| **Authorization Code + PKCE** | ✅ | any app acting for a user (web, SPA, mobile, CLI) |
| **Client Credentials** | ✅ | machine-to-machine, no user (our service → partner API) |
| **Device Authorization** | ✅ | input-constrained devices, CLIs |
| **Refresh Token** (with rotation) | ✅ | renewing access without re-prompting |
| **Implicit** | ❌ removed in 2.1 | (was for SPAs; use Code + PKCE) |
| **Resource Owner Password** | ❌ removed in 2.1 | never — the client sees the password |

**PKCE (Proof Key for Code Exchange)** — the client generates a random `code_verifier`, sends its SHA-256 hash (`code_challenge`) on the authorization request, then sends the raw `code_verifier` when exchanging the code. An attacker who intercepts the authorization code cannot use it without the verifier. **OAuth 2.1 requires PKCE for all clients**, not just public ones.

**DPoP (Demonstrating Proof of Possession)** — the client binds the token to a key it holds and signs each request; a stolen token is useless without the key. Use for high-value APIs and public clients.

**What OAuth 2.1 consolidates** (still a draft, but already adopted — e.g. by MCP): PKCE mandatory for everyone; implicit and password grants removed; **exact** redirect-URI string matching (no wildcards, no substring); refresh-token rotation or sender-constraining required; no tokens in query strings. It is essentially "OAuth 2.0 + RFC 9700 (Security BCP) made non-optional."

## 3. How it works

Authorization Code + PKCE, the one flow to know cold:

```mermaid
sequenceDiagram
  accTitle: OAuth 2.1 Authorization Code flow with PKCE
  accDescr: The client sends a hashed code challenge with the authorization request, the user authenticates and consents, the client exchanges the returned code plus the original verifier for tokens, then calls the resource server with the access token.
  participant U as User agent (browser)
  participant Cl as Client
  participant AS as Authorization server
  participant RS as Resource server
  Cl->>Cl: verifier = random(); challenge = S256(verifier); state = random()
  Cl->>U: redirect to /authorize?client_id&redirect_uri&scope&state&code_challenge
  U->>AS: authenticate + consent
  AS->>U: redirect back to redirect_uri?code=...&state=...
  U->>Cl: deliver code + state
  Cl->>Cl: verify state matches
  Cl->>AS: POST /token  (code, code_verifier, client auth)
  AS->>AS: check S256(code_verifier) == stored code_challenge
  AS-->>Cl: access_token (short, scoped, aud) + refresh_token (rotating) + id_token
  Cl->>RS: request + Authorization: Bearer <access_token>
  RS->>RS: validate signature, iss, aud, exp, scope
  RS-->>Cl: data
```

Client Credentials (our service to a partner API): just `POST /token` with `grant_type=client_credentials`, client authentication (prefer a private-key JWT or mTLS over a shared secret), and a `resource`/`scope` — you get back a scoped access token, no user involved.

## 4. How it is attacked

- **Authorization-code interception** — code leaks via referer, logs, or a malicious app on the same redirect. Fix: **PKCE** (the code alone is worthless).
- **Redirect-URI manipulation / open redirect** — attacker registers or injects `redirect_uri=https://evil.tld` and receives the code. Fix: **exact** pre-registered redirect matching; no wildcards.
- **CSRF on the callback** — attacker tricks the victim's client into consuming an attacker's code. Fix: the **`state`** parameter, bound to the user session, verified on return.
- **Mix-up attack** (multiple AS) — client confuses which AS issued a response. Fix: `iss` in the authorization response (RFC 9207); distinct redirect URIs per AS.
- **Token leakage / logging** — access tokens in URLs, browser history, proxy logs, error trackers. Fix: tokens only in headers or POST bodies; scrub logs; short `exp`.
- **Scope creep & over-broad consent** — client asks for `*` because it is easy. Fix: request the minimum; RS enforces per-endpoint scope; incremental consent.
- **Confused deputy / token replay across APIs** — a token for API A accepted by API B. Fix: strict **`aud`** checks and resource indicators.
- **Refresh-token theft** — a stolen long-lived refresh token = persistent access. Fix: **rotation with reuse detection** (using an old refresh token revokes the whole family), sender-constraining.
- **Weak client authentication** — shared `client_secret` in a mobile app or repo. Fix: public clients use PKCE + no secret; confidential clients use `private_key_jwt` or mTLS.

## 5. Defensive checklist

**As a resource server (our downstream API):**

- [ ] Validate every access token: signature (allowed alg), `iss`, `exp`/`nbf`, and **`aud` == our identifier**.
- [ ] Enforce scope per endpoint, deny by default; `events:read` cannot hit a write route.
- [ ] Reject tokens presented in query strings; accept only `Authorization: Bearer` (or DPoP).
- [ ] Rate-limit and log token validation failures as a signal.

**As a client (if/when we integrate):**

- [ ] Authorization Code + PKCE (`S256`); never implicit or password grant.
- [ ] Exact, pre-registered redirect URIs; `state` verified; `iss` checked.
- [ ] Store tokens server-side (or in memory), never in `localStorage`; refresh tokens rotated with reuse detection.
- [ ] Request minimum scopes; separate tokens per downstream API.
- [ ] Confidential client auth via `private_key_jwt` or mTLS, secret in Vault.

## 6. Simple example

Resource-server scope enforcement (Express):

```js
function requireScope(required) {
  return (req, res, next) => {
    const { scopes } = req.auth;                 // set by the JWT middleware from module 04
    if (!scopes.includes(required)) {
      return res.status(403).json({ error: 'insufficient_scope', required });
    }
    next();
  };
}

app.get('/v1/events', requireScope('events:read'), listEvents);
app.post('/v1/events/replay', requireScope('events:admin'), replayEvents);
```

PKCE parameters for a CLI client (Node):

```js
import crypto from 'node:crypto';
const b64url = (b) => b.toString('base64url');

const verifier  = b64url(crypto.randomBytes(32));
const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
const state     = b64url(crypto.randomBytes(16));
// -> /authorize?...&code_challenge=<challenge>&code_challenge_method=S256&state=<state>
// keep {verifier, state} until the redirect returns; verify state; send verifier to /token
```

## 7. Apply it to our platform

- The downstream API is a **resource server only** — it validates corporate-IdP access tokens with `aud: urn:ingestion-api` and enforces `events:read` / `events:admin`.
- Service-to-partner calls (if any) use **Client Credentials with `private_key_jwt`**, the key in OCI Vault, one token audience per partner.
- Any future MCP server we expose to agents authorizes with **OAuth 2.1 + PKCE**, per the MCP authorization spec (module 13) — agents get narrowly-scoped, short-lived tokens, and each tool maps to a scope.
- Log token-validation failures and scope denials to the same tamper-evident pipeline as everything else (module 12).

## 8. Practice

- Complete the **[PortSwigger OAuth authentication labs](https://portswigger.net/web-security/oauth)** — redirect manipulation, `state` CSRF, and stolen-code scenarios.
- Stand up Keycloak locally; run the Code+PKCE and Client Credentials flows with `curl` and read every parameter.
- Add reuse-detection to a toy refresh-token endpoint and prove that replaying an old refresh token kills the session family.

## 9. Courses and resources

- **[OAuth 2.1 overview](https://oauth.net/2.1/)** and **[RFC 9700 — OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/rfc/rfc9700)** — read both.
- **[Coursera — OAuth 2.0: Getting Started in API Security (API Academy)](https://www.coursera.org/projects/oauth-authentication-api)** / search Coursera for "OAuth 2.0".
- **[LinkedIn Learning — "OAuth 2.0" / "Web Security: OAuth and OpenID Connect"](https://www.linkedin.com/learning/topics/security-3)**.
- **[OAuth 2.0 Simplified (Aaron Parecki)](https://www.oauth.com/)** — free companion book.
- **[MCP Authorization specification](https://modelcontextprotocol.io/specification/draft/basic/authorization)** — OAuth 2.1 applied to agents.

## 10. Key takeaways

- OAuth = delegated authorization; OIDC adds authentication. Do not use a bare access token to identify a user.
- Use Authorization Code + PKCE or Client Credentials; implicit and password grants are dead.
- The RS's job is `aud` + scope + signature + expiry — every request, deny by default.
- Rotate refresh tokens with reuse detection, keep access tokens short and single-audience, and consider DPoP for high-value APIs.
