# Screenshots

To capture these screenshots locally:

```bash
pnpm build
pnpm --filter @passforge/web preview
# Open http://localhost:4173 in a browser
```

## Required screenshots

### meter-and-feedback.png

Type a weak-to-moderate password (e.g., "Tr0ub4dor&3"). Capture the full card
showing the strength meter (segments lit), crack-time estimate, and feedback
findings list with severity indicators.

### breach-states.png

Capture all three breach check states side-by-side or stacked:

1. **Breached** (red) — use "password" as input, click "Check breach exposure"
2. **Safe** (green) — use a long random string, click check
3. **Unavailable** (gray) — disconnect network or block api.pwnedpasswords.com,
   click check. Note the gray color and "does NOT mean safe" warning text,
   visually distinct from the green "safe" state.

### k-anonymity-explainer.png

With a password entered, click "How does the breach check protect my privacy?"
to expand the explainer. Capture showing the prefix/suffix visual with the
blue-highlighted prefix ("sent to api.pwnedpasswords.com") and the
crossed-out suffix ("never leaves your device").
