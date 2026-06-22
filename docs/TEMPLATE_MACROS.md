# Report Template Macros — syntax & builder reference

Canonical reference for the radiology report-template macro system. Use this to
hand-build (or have Claude build) parameterized "clickable" templates that drop
into the Dictation app.

- **Parser / renderer:** `src/radiology/speaksync/utils/templateMacros.ts`
- **Fill-in UI:** `src/radiology/speaksync/components/TemplateFillModal.tsx`
- **How to load one:** in the Dictation app → templates panel → **+** (new) or clone an
  existing template → paste the content below. Double-clicking a template that
  contains tokens opens the fill-in form; templates with **no** tokens behave as
  plain text (fully backward compatible).

---

## 1. Token syntax

| Token | Renders as | Use for |
|---|---|---|
| `{{name=default}}` | text/number field, pre-filled with `default` | measurements (`{{MPV=15}} mm`) |
| `{{name}}` | empty text field | free text (`{{wskazanie}}`) |
| `{{name\|optA\|optB\|...}}` | dropdown; **first option is the default** | severity / alternative phrasings |
| `[[name: text]]` | optional block, **included by default**, untick to drop | a finding that's usually present |
| `[[name: onText \|\| offText]]` | toggle between two phrasings (note the `\|\|`) | present/absent findings |

Rules:
- `name` is the **form label** and the **dedupe key** — the same `name` used twice
  shares one value. Names may contain spaces (`{{portal vein=16}}`).
- Inner `{{...}}` fields may sit **inside** `[[...]]` blocks.
- Use `||` (double pipe) to separate the on/off halves of a toggle block, so inner
  `{{a|b}}` choices (single pipe) still parse correctly.
- The renderer tidies whitespace left by dropped blocks (trailing spaces, double
  spaces, blank-line runs, and a space before `. , ; : )`), so inline toggles inside
  a sentence render with clean punctuation.

---

## 2. What to tokenize (conversion guide)

When converting a finished report into a template:

1. **Measurements → fields.** Every number that changes per patient becomes
   `{{label=typicalDefault}}` (vessel calibres, organ dimensions, lesion size).
   Pre-fill with a sensible typical value to overtype.
2. **Present/absent findings → toggle blocks.** e.g. oesophageal varices, recanalized
   umbilical vein, splenorenal shunt, a focal lesion. Use
   `[[name: ...present... || ...absent...]]`, or `[[name: ...]]` when "absent" just
   means the line disappears.
3. **Graded descriptions → choice dropdowns.** e.g. cirrhosis severity
   `{{nasilenie|przebudowy marskiej|znacznej przebudowy marskiej}}`.
4. **The conclusion → a short choice or assembled from the toggles above.**
5. **Leave the bulk of normal-anatomy text as plain literal text** — that's the part
   that doesn't change and is the whole point of a template.

Keep it lean: a template with 30 tokens is as slow as typing. Tokenize only the
parts that genuinely vary.

---

## 3. Style rules to preserve (Nick's preferences)

Any generated template/conclusion must follow these (they mirror the AI-refinement
rules in `src/radiology/speaksync/data/promptData.ts`):

- **Keep abbreviations as written** — `TK`, `Angio-TK`, `MR`, `MPV`, `SV` — never expand.
- **No parenthetical translations** of loan terms (e.g. `shunt splenorenalny` stays).
- **Slice/image locations** stay exactly in the `(im91 se3)` format — no dots, commas,
  or internal spaces; never split `im`/`se` from the number.
- **Conclusions are telegraphic and selective** — one finding per line, no
  "Obraz badania wskazuje na…" preamble, **only the clinically important findings**
  (main pathology + what answers the clinical question), not every incidental.
- **Never invent severity** ("zaawansowane", "istotne") that isn't in the findings —
  grading is the radiologist's call. Offer it as a `{{choice}}` instead of asserting it.
- Negation style: prefer `Nie ma…` / `nie stwierdzam…` over `nie stwierdzono…`.

---

## 4. Builder prompt (paste into Claude with a raw report)

> You are converting a finished Polish radiology report into a **parameterized
> template** for a clickable fill-in form. Use this token syntax:
> `{{name=default}}` = text/number field; `{{name|optA|optB}}` = dropdown (first is
> default); `[[name: text]]` = optional block on by default; `[[name: on || off]]` =
> toggle between two phrasings (double-pipe separator).
>
> Rules:
> - Turn every per-patient **measurement** into `{{label=typicalValue}}`.
> - Turn **present/absent findings** into `[[name: ...present... || ...absent...]]`.
> - Turn **graded descriptions** (e.g. cirrhosis severity) and the **conclusion** into
>   `{{choice|...|...}}` dropdowns — never assert a severity, offer it as a choice.
> - Leave all unchanging normal-anatomy text as plain literal text.
> - Keep abbreviations as written (TK, MR, MPV, SV); no parenthetical translations;
>   keep slice locations in the exact `(im91 se3)` format.
> - Conclusion must be telegraphic, one finding per line, only the clinically
>   important findings, no preamble.
> - Output ONLY the template content (no commentary, no markdown fences).
>
> Here is the report:
> ```
> <paste the report>
> ```

---

## 5. Worked example (excerpt)

Input line:
```
Główny pień żyły wrotnej o maksymalnej średnicy 16 mm. Niewielkie żylaki przełyku.
Śledziona o maksymalnym wymiarze 146 x 85 x 141 mm.
```
Parameterized:
```
Główny pień żyły wrotnej o maksymalnej średnicy {{MPV=15}} mm. [[żylaki: Niewielkie żylaki przełyku. || Nie ma żylaków przełyku.]]
[[splenomegalia: Splenomegalia ze śledzioną o maksymalnym wymiarze {{śledziona=146 x 85 x 141}} mm. || Śledziona o maksymalnym wymiarze {{śledziona=110}} mm, bez splenomegalii.]]
```

Two full liver examples (OLTx and cirrhosis) were delivered in chat on 2026-06-22 and
can be regenerated from the built-ins `017 TK wątroby (OLTx)` and `017 TK wątroby markosc`
in `src/radiology/speaksync/data/systemTemplates.ts`.
