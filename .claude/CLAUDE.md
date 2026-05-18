# CLAUDE.md — Cybersecurity Tools

## Response Style (Always)

- Use 3-6 word sentences.
- No filler or preamble.
- No pleasantries.
- Drop articles. ("Me fix code.")
- Run tools first. Show result. Stop.
- No narration around tools.

---

## Scope

- Defensive security only.
- Authorized testing only.
- CTF and labs welcome.
- No malware development.
- No live-target attacks.
- Document authorization upfront.

---

## Core Stack

- Python 3.12+.
- Go for fast tools.
- Rust for low-level.
- Bash for glue.
- Docker for isolation.
- Make for workflows.

---

## Project Structure

```
tool/
  src/
    core/             # Engine logic
    modules/          # Plugin checks
    parsers/          # Input parsing
    reporters/        # Output formats
    cli/              # Entry point
  configs/
    rules/
    signatures/
  tests/
    fixtures/
    unit/
    integration/
  docs/
  scripts/
  Dockerfile
  pyproject.toml
```

---

## Python Rules

- Type hints everywhere.
- `mypy --strict` clean.
- `ruff` for lint+format.
- `uv` for packages.
- `pydantic` for models.
- `typer` or `click` for CLI.
- `rich` for output.
- `httpx` over `requests`.
- `asyncio` for concurrency.
- No bare `except`.

---

## Tool Categories

### Recon

- DNS enumeration.
- Subdomain discovery.
- Port scanning wrappers.
- Banner grabbing.
- Tech fingerprinting.

### Analysis

- Static code analysis.
- Dependency scanning.
- Secret detection.
- Log parsing.
- PCAP analysis.

### Web

- Header auditing.
- TLS/SSL checks.
- CORS misconfigs.
- Cookie analysis.
- Endpoint discovery.

### Forensics

- File carving.
- Hash analysis.
- Timeline building.
- Memory parsing.
- Artifact extraction.

### Defense

- IOC matching.
- YARA wrappers.
- Sigma rules.
- Threat intel pull.
- SIEM helpers.

---

## Design Principles

- Modular plugin architecture.
- Async by default.
- Rate limit by default.
- Respect robots.txt.
- Honor scope files.
- Fail loud, log loud.
- Reproducible runs.
- Deterministic output.

---

## Input Handling

- Validate every input.
- Sanitize file paths.
- Bound recursion depth.
- Cap memory usage.
- Timeout all network calls.
- Parse before processing.
- Reject malformed silently.

---

## Output Standards

- JSON for machines.
- Markdown for humans.
- SARIF for code scans.
- STIX for threat intel.
- CSV for tables.
- Severity: info, low, med, high, crit.
- Include CVSS where applicable.
- Map to CWE/MITRE ATT&CK.

---

## Logging

- `structlog` for structured logs.
- JSON to file, pretty to stderr.
- Levels: debug, info, warn, error.
- Never log secrets.
- Redact tokens/keys.
- Correlation IDs per scan.

---

## Configuration

- YAML for human config.
- TOML for tool config.
- Env vars for secrets.
- Schema validation required.
- Sane defaults always.
- Override hierarchy: cli > env > file > default.

---

## Concurrency

- `asyncio` semaphores.
- Worker pools bounded.
- Backpressure handled.
- Cancellation supported.
- Graceful shutdown on SIGINT.

---

## Network

- Custom User-Agent string.
- Retry with backoff.
- Honor Retry-After.
- TLS verification on by default.
- Proxy support built in.
- Timeout per request.

---

## Safety Rails

- Dry-run mode default.
- Confirm destructive ops.
- Scope file required.
- Out-of-scope = hard stop.
- Authorization flag required.
- No exploit payloads shipped.

---

## Testing

- `pytest` for units.
- `pytest-asyncio` for async.
- Mock network with `respx`.
- Fixtures for sample data.
- VCR for HTTP replay.
- Coverage gate 80%.
- Fuzzing for parsers.

---

## Secrets & Crypto

- `cryptography` library only.
- Never roll own crypto.
- Secrets via env or vault.
- Zero-out memory after use.
- No hardcoded keys.
- Rotate by design.

---

## Reporting

- Executive summary first.
- Findings with severity.
- Evidence per finding.
- Remediation steps.
- References (CVE, CWE).
- Reproducibility section.

---

## Docker

- Multi-stage builds.
- Non-root user.
- Pinned base images.
- No secrets in layers.
- Healthcheck defined.
- Minimal capabilities.

---

## Forbidden

- Auto-exploit features.
- Credential stuffing tools.
- Spam or flood code.
- DDoS capabilities.
- Backdoor implants.
- Persistence mechanisms.
- Bypassing legal scope.

---

## Quick Commands

```bash
uv sync              # Install deps
uv run pytest        # Run tests
uv run mypy src      # Type check
uv run ruff check    # Lint
uv run ruff format   # Format
docker build .       # Build image
make scan            # Run scanner
make report          # Build report
```

---

## References

- OWASP ASVS.
- NIST SP 800-115.
- MITRE ATT&CK.
- CIS Benchmarks.
- CWE Top 25.
