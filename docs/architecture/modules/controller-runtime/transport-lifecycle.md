# MCP HTTP Transport Lifecycle

> Capability: `mcp-http-transport-lifecycle`
> Runtime Authority: `docs/architecture/../../CURRENT.md` and `docs/architecture/../../CURRENT.md`

## Responsibility

`src/cli/mcp/transports/` owns HTTP authentication handoff and protocol-era serving. MCP 2026-07-28 is the canonical public boundary and is served per request without protocol-level sessions. The session registry, global admission capacity, transport leases, and DELETE cleanup exist only for the explicit 2025-era compatibility path. The transport does not own durable Work/Process/ControllerRound authority or Gateway process recovery.

## Invariants

- Modern `server/discover` and subsequent 2026-07-28 requests are handled by the SDK v2 per-request handler and do not require or emit `Mcp-Session-Id`.
- Durable Work, Process, and ControllerRound identity is independent from both modern request bindings and legacy transport sessions.
- A newly created Work is claimed with an opaque Work-bound controller capability immediately; modern sessionless follow-up requests must present that exact authority. Legacy owner records without a capability digest require an explicit `controller_claim` authority upgrade and are never accepted by principal identity alone.
- Legacy 2025-era traffic is classified mechanically by the SDK and routed to one bounded stateful compatibility registry shared by all public MCP HTTP routes.
- On the legacy path, route and authenticated principal must match the stored session on GET, POST, and DELETE; active POST work is protected from capacity eviction.
- Legacy stream-only sessions are reclaimable through client DELETE, explicit prior-session replacement, lease expiry, absolute lifetime, or oldest-safe capacity eviction.
- Legacy initialize admission is an atomic registry reservation. Shared static-bearer clients use the global pool; per-principal fairness applies only where authentication provides a meaningful distinct principal.
- Health session metrics describe only legacy compatibility state; modern request serving has no long-lived session capacity authority.
- Closing or replacing transport state never implies that a durably accepted Work or Process is cancelled.
- The Gateway-to-Canonical-Runtime client classifies structured SDK HTTP 404 as an expired inner session, reconnects once, and replays only an operation already proven replay-safe by its idempotency contract.

## Verification

```text
bun test tests/unit/fix-mcp-session-lifecycle.test.ts tests/cli/mcp-http.test.ts
```
