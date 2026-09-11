# Review follow-ups — driver-apply-via-map

Deferred from impl-review triage (2026-09-11):

- **F7**: Replace in-memory Nest throttler store with a shared backend (e.g. Redis) when Railway runs multiple API replicas, so apply/register 10/min limits stay global per IP.
