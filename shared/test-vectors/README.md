# Test Vectors

Language-neutral JSON test fixtures shared between implementations.

## Purpose

Both the TypeScript core (`packages/core`) and a future Python CLI (`apps/cli-py`)
validate against these same vectors. This is the mechanism that keeps the two
architectures (A: web SPA, B: Python CLI) in sync — any behavioral change must
pass both implementations against the same expected outputs.

## Structure

Each JSON file in this directory contains an array of test cases following a
consistent schema. See `strength.schema.json` for the canonical format.

## Adding Vectors

1. Add cases to the appropriate JSON file (or create a new one with a matching schema).
2. Run both the TS and Python test suites to confirm they agree.
3. Never include real passwords — use synthetic examples only.
