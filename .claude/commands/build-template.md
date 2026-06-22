---
description: Convert a finished radiology report into a parameterized macro template
argument-hint: paste the report (or leave blank to be prompted)
---

You are converting a finished radiology report into a **parameterized macro template**
for the Dictation app's clickable fill-in form. The authoritative syntax and style
reference is @docs/TEMPLATE_MACROS.md — follow it.

Token syntax:
- `{{name=default}}` — text/number field pre-filled with `default` (use for measurements)
- `{{name}}` — empty text field
- `{{name|optA|optB|...}}` — dropdown; first option is the default (severity / alternative phrasings)
- `[[name: text]]` — optional block, included by default, untick to drop
- `[[name: onText || offText]]` — toggle between two phrasings (double-pipe separator)

Conversion rules:
- Turn every per-patient **measurement** into `{{label=typicalValue}}`.
- Turn **present/absent findings** into `[[name: ...present... || ...absent...]]`.
- Turn **graded descriptions** (e.g. cirrhosis severity) and the **conclusion** into
  `{{choice|...|...}}` — never assert a severity, offer it as a choice.
- Leave all unchanging normal-anatomy text as plain literal text. Tokenize only what
  genuinely varies (a template with 30 tokens is as slow as typing).
- Keep abbreviations as written (TK, MR, MPV, SV); no parenthetical translations;
  keep slice locations in the exact `(im91 se3)` format.
- Conclusion must be telegraphic, one finding per line, only the clinically important
  findings, no "Obraz badania wskazuje na…" preamble.
- Preserve the report's original language.

Output ONLY the final template content — no commentary, no markdown code fences — so it
can be pasted straight into a new template. After the content, on a separate line,
suggest a short template title in the form `Title: <suggestion>`.

Report to convert:
$ARGUMENTS

If the report above is empty, ask me to paste the report and stop.
