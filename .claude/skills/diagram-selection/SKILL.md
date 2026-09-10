---
name: diagram-selection
description: Use whenever creating a new diagram (drawio, mermaid, or any format) in this repo. Picks the right diagram TYPE (sequence vs flowchart vs C4/architecture) BEFORE drawing, based on what the design is actually showing. Prevents overlap-mess when a flowchart is used for a round-trip flow.
---

# Diagram type selection

Before drawing ANY diagram in this repo, pick the type based on what the design is showing. The wrong type makes the picture messy no matter how good the tool is.

## The 3-type rule

| Diagram type | Use when the story is... | Do NOT use when... |
|---|---|---|
| **Sequence** | "Who talks to who, in what order over time" — request/response, round-trips, multi-step protocols | Static architecture, no time dimension |
| **Flowchart** | "If this, then that" — decisions, branches, sad-path handling | There's a round-trip (arrows will cross) |
| **C4 / Architecture** | "Which box owns what" — services, boundaries, deploy topology | Runtime behavior or timing matters |

## Quick decision tree

1. Does the flow **come back** to where it started? (client → server → client) → **Sequence diagram**
2. Are there **branches / if-then-else / retries** in the story? → **Flowchart**
3. Is it **who owns what** at deploy time? → **C4 / Architecture diagram**
4. Multiple of the above? → Draw **two diagrams**, one per angle. Do not cram everything into one.

## Red flags — pick a different type

- **Arrows crossing / overlapping** → you probably picked a flowchart for a round-trip. Switch to sequence.
- **Same two boxes with 2+ labels stacked** → same issue. Switch to sequence.
- **20+ boxes in one diagram** → too big. Split into a C4 container diagram + separate detail diagrams per component.
- **Labels do not fit** → abbreviate on the arrow, put full text in a Note or the caption below.

## How to draw each type with `drawio:drawio`

- **Sequence in Mermaid**: `sequenceDiagram` with `autonumber`, `participant`, `->>`, `-->>`, `Note over`. Best default for round-trips.
- **Flowchart in Mermaid**: `flowchart TD` (top-down) or `flowchart LR` (left-right). Use `subgraph` to group related boxes.
- **C4 / architecture in draw.io XML**: use GCP / AWS / Azure shape libraries for real service icons. Ask user for the specific cloud stack before choosing icons.

## Examples in this repo

- `docs/requirements/diagrams/04-voice-pipeline.drawio` — round-trip Browser ↔ Server ↔ Gemini → **sequence diagram** (correct choice, was rebuilt from a bad flowchart)
- If we later add "what happens when Gemini is down" → branches → **flowchart**
- If we later add "here is every service we deploy" → ownership → **C4 container diagram**

## Language for the user

Explain the CHOICE in one sentence before drawing. Example:
"Voice pipeline is a round-trip (browser → server → Gemini → server → browser), so this is a sequence diagram, not a flowchart."

If a re-draw is needed later, cite the red flag that triggered it.
