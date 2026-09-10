# Technical Designs

**In a hurry → [00-recap.md](00-recap.md)** — the whole system in 2 minutes, plain words.
**Start properly → [00-system-overview.md](00-system-overview.md)** — the whole system in one page, diagram by diagram (context → containers → flows → states → data), with links into every deep-dive doc.

The numbered docs (01–09) are the deep dives and the source of truth; the overview summarises but never decides. When you change a numbered doc, update the matching overview section + diagram in the same PR.

## How to add a design doc
1. Copy `_template.md` to a new file — name it `NN-short-title.md` (e.g. `01-voice-pipeline.md`).
2. Fill in every section.
3. The **Requirements this implements** section is required — trace back to PRD `R-xx-n` IDs in `/docs/requirements/03-product-requirements.md`.
4. Link any related decisions (`D-xxx`) from `/docs/requirements/05-decisions-log.md`.
