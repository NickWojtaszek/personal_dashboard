
import type { AIPromptConfig, StyleExample } from '../types';
import type { Language } from '../context/LanguageContext';

const promptSnippets = {
  pl: {
    fluency: {
      1: "Dokonuj wyłącznie niezbędnych korekt gramatycznych i interpunkcyjnych. Całkowicie zachowaj oryginalną strukturę zdań.",
      2: "Delikatnie przeformułuj zdania, aby brzmiały bardziej naturalnie, unikaj skomplikowanych zmian.",
      3: "Aktywnie przeformułowuj zdania, aby poprawić płynność do profesjonalnego poziomu, nie zmieniając przy tym oryginalnego znaczenia.",
      4: "Swobodnie łącz lub dziel zdania, aby uzyskać jak najlepszy przepływ informacji i czytelność.",
      5: "Przekształć tekst w formalny, akademicki styl. Używaj złożonych struktur zdaniowych, jeśli to poprawia precyzję opisu."
    },
    summarization: {
      1: "Nigdy nie skracaj opisu, nawet jeśli opisuje tylko prawidłowe znaleziska. Zawsze przedstawiaj pełny tekst.",
      2: "Skróć opis do zwięzłego podsumowania tylko wtedy, gdy CAŁY raport opisuje wyłącznie prawidłowe struktury.",
      3: "Jeśli kilka kolejnych zdań opisuje prawidłowe narządy (np. wątroba, śledziona, nerki), połącz je w jedno zbiorcze zdanie podsumowujące.",
      4: "Aktywnie wyszukuj i grupuj wszystkie prawidłowe znaleziska w jak najmniejszą liczbę zwięzłych zdań podsumowujących.",
      5: "Zredukuj wszystkie opisy prawidłowych narządów do absolutnego minimum, np. 'Struktury jamy brzusznej bez istotnych odchyleń od normy'."
    },
    oncologyDetail: {
      1: "Wplataj w tekst tylko aktualne pomiary zmian. Nie dodawaj porównań ani lokalizacji obrazów.",
      2: "Wplataj pomiary w tekst i dołącz lokalizacje obrazów w formacie '(im91 se3)'.",
      3: "Wplataj pomiary porównawcze (np. 'guzek 15x10 mm, poprzednio 12x8 mm') wraz z lokalizacjami. Dla węzłów chłonnych dodawaj grupy w nawiasach.",
      4: "Zastosuj wszystko z poziomu 3, a dodatkowo aktywnie odnieś się do pytań klinicznych i znanych chorób pacjenta. Wskaż, jeśli raport tego nie robi.",
      5: "Zastosuj wszystko z poziomu 4, a dodatkowo uwzględnij istotne negatywy i odnieś się do ogólnych wytycznych praktyki klinicznej."
    },
    conclusionDetail: {
      1: "Na końcu wygeneruj zwięzłą sekcję 'Wnioski' zawierającą TYLKO najważniejsze klinicznie rozpoznania — główną patologię oraz to, co odpowiada na pytanie kliniczne lub wpływa na postępowanie. Każde rozpoznanie w osobnej linii, telegraficznie, bez wstępu typu 'Obraz badania wskazuje na...' i bez znaczników listy (myślników/gwiazdek). NIE przepisuj wszystkich znalezisk z opisu — drobne, przygodne i prawidłowe zmiany pomiń lub ujmij zbiorczo. Wnioski mają być wyraźnie krótsze niż opis (zwykle kilka punktów). Nie dodawaj innych sekcji.",
      2: "Na końcu wygeneruj sekcję 'Wnioski' (tylko najważniejsze rozpoznania, każde w osobnej linii, telegraficznie, bez wstępów i bez znaczników listy), a po niej sekcję 'Szczegółowy wniosek' opisującą istotne patologie. Pomiń lub ujmij zbiorczo drobne i prawidłowe znaleziska. Nie dodawaj zaleceń.",
      3: "Na końcu wygeneruj, telegraficznie i bez znaczników listy: 'Wnioski' (tylko najważniejsze rozpoznania, każde w osobnej linii), 'Szczegółowy wniosek' opisujący istotne patologie oraz konkretne, praktyczne 'Zalecenia'. Pomiń lub ujmij zbiorczo drobne i prawidłowe znaleziska."
    },
    recistAnalysis: {
      true: "Włącz analizę wg RECIST 1.1. Zidentyfikuj zmiany mierzalne i niemierzalne, oblicz sumę najdłuższych wymiarów (SLD) i oceń odpowiedź na leczenie, jeśli dostępne jest badanie porównawcze.",
      false: ""
    },
    tnmClassification: {
      true: "Na podstawie dostępnych danych, dodaj we wnioskach sugestię wstępnej klasyfikacji TNM oraz, jeśli to stosowne, sugestie dalszych kroków diagnostycznych zgodne z wytycznymi NCCN.",
      false: ""
    },
    qaCheck: {
      true: `**Kontrola Jakości (QA):**
Na samym końcu, PO sekcji Wniosków, dodaj osobny blok zaczynający się od linii "QA CHECK: PASS" albo "QA CHECK: FAIL". To kontrola jakości, NIE część opisu — na jej podstawie nie wprowadzaj żadnych zmian w opisie ani nowych rozpoznań; wyłącznie OZNACZ wykryte rozbieżności. Przy "FAIL" wypunktuj krótko tylko realne problemy. Sprawdź, nie zmieniając treści opisu:
- Stronność (lewo/prawo): spójność w całym tekście i zgodność z techniką badania.
- Obecność/brak narządów oraz położenie urządzeń (stenty, cystostomia, dreny, ORIF, gastric pull-up): czy anatomicznie wiarygodne.
- Plausybilność przestrzenna/anatomiczna: miednica, przestrzeń zaotrzewnowa, podział płatowo-segmentalny płuc, komory/cysterny/linia pośrodkowa, ustawienie kostne vs złamania/sprzęt.
- Logika pomiarów i progresji względem badań porównawczych.
- Zgodność wniosków z podaną modalnością i fazą badania: nie formułuj wniosków wykraczających poza możliwości diagnostyczne modalności.
- Brak zmieszania z opisami innych badań lub innych pacjentów.
Zgłaszaj wyłącznie realne rozbieżności. Przy braku zastrzeżeń: "QA CHECK: PASS".`,
      false: ""
    }
  },
  en: {
    fluency: {
      1: "Make only necessary grammatical and punctuation corrections. Completely preserve the original sentence structure.",
      2: "Gently rephrase sentences to sound more natural; avoid complex changes.",
      3: "Actively rephrase sentences to improve fluency to a professional level without changing the original meaning.",
      4: "Freely combine or split sentences to achieve the best flow of information and readability.",
      5: "Transform the text into a formal, academic style. Use complex sentence structures if it improves the precision of the description."
    },
    summarization: {
      1: "Never shorten the description, even if it only describes normal findings. Always present the full text.",
      2: "Shorten the description to a concise summary only if the ENTIRE report describes exclusively normal structures.",
      3: "If several consecutive sentences describe normal organs (e.g., liver, spleen, kidneys), combine them into one collective summary sentence.",
      4: "Actively search for and group all normal findings into the fewest possible concise summary sentences.",
      5: "Reduce all descriptions of normal organs to the absolute minimum, e.g., 'Abdominal structures without significant abnormalities.'"
    },
    oncologyDetail: {
      1: "Weave only current measurements of lesions into the text. Do not add comparisons or image locations.",
      2: "Weave measurements into the text and include image locations in the format '(im91 se3)'.",
      3: "Weave in comparative measurements (e.g., 'nodule 15x10 mm, previously 12x8 mm') along with locations. For lymph nodes, add groups in parentheses.",
      4: "Apply everything from level 3, and additionally, actively address clinical questions and the patient's known diseases. Indicate if the report fails to do so.",
      5: "Apply everything from level 4, and additionally, include significant negatives and refer to general clinical practice guidelines."
    },
    conclusionDetail: {
      1: "At the end, generate a concise 'Conclusion' section with ONLY the most clinically important diagnoses — the main pathology and whatever answers the clinical question or changes management. Each on its own line, telegraphically, with no preamble such as 'The study shows...' and no list markers (dashes/bullets). Do NOT restate every finding from the body — omit or briefly group minor, incidental, and normal findings. The conclusion must be clearly shorter than the findings (usually a few points). Do not add any other sections.",
      2: "At the end, generate a 'Conclusion' section (only the most important diagnoses, each on its own line, telegraphic, no preamble, no list markers), followed by a 'Detailed conclusion' section describing the significant pathologies. Omit or briefly group minor and normal findings. Do not add recommendations.",
      3: "At the end, generate, telegraphically and without list markers: 'Conclusion' (only the most important diagnoses, each on its own line), 'Detailed conclusion' describing the significant pathologies, and specific, practical 'Recommendations'. Omit or briefly group minor and normal findings."
    },
    recistAnalysis: {
      true: "Enable RECIST 1.1 analysis. Identify target and non-target lesions, calculate the sum of longest diameters (SLD), and assess treatment response if a comparative study is available.",
      false: ""
    },
    tnmClassification: {
      true: "Based on available data, add a suggestion for preliminary TNM classification in the conclusions and, if appropriate, suggestions for further diagnostic steps consistent with NCCN guidelines.",
      false: ""
    },
    qaCheck: {
      true: `**Quality Control (QA):**
At the very end, AFTER the Conclusion section, add a separate block beginning with a line "QA CHECK: PASS" or "QA CHECK: FAIL". This is a quality control, NOT part of the report — do not make any changes to the findings or add new diagnoses based on it; only FLAG detected inconsistencies. On "FAIL", briefly list only genuine problems. Check, without altering the report text:
- Laterality (left/right): consistency throughout and agreement with the study technique.
- Organ presence/absence and device positioning (stents, cystostomy, drains, ORIF, gastric pull-up): whether anatomically plausible.
- Spatial/anatomical plausibility: pelvis, retroperitoneum, lobar/segmental lung division, ventricles/cisterns/midline, bony alignment vs fractures/hardware.
- Logic of measurements and progression against comparison studies.
- Concordance of conclusions with the stated modality and study phase: do not draw conclusions beyond the diagnostic capability of the modality.
- No mixing with descriptions from other studies or other patients.
Report only genuine inconsistencies. If none: "QA CHECK: PASS".`,
      false: ""
    }
  },
  de: {
    fluency: {
      1: "Nehmen Sie ausschließlich notwendige Korrekturen an Grammatik und Zeichensetzung vor. Behalten Sie die ursprüngliche Satzstruktur vollständig bei.",
      2: "Formulieren Sie Sätze behutsam um, damit sie natürlicher klingen; vermeiden Sie komplexe Änderungen.",
      3: "Formulieren Sie Sätze aktiv um, um die Sprachflüssigkeit auf ein professionelles Niveau zu verbessern, ohne die ursprüngliche Bedeutung zu ändern.",
      4: "Kombinieren oder teilen Sie Sätze frei, um den bestmöglichen Informationsfluss und die beste Lesbarkeit zu erzielen.",
      5: "Wandeln Sie den Text in einen formellen, akademischen Stil um. Verwenden Sie komplexe Satzstrukturen, wenn dies die Präzision der Beschreibung verbessert."
    },
    summarization: {
      1: "Kürzen Sie die Beschreibung niemals, auch wenn sie nur normale Befunde beschreibt. Geben Sie immer den vollständigen Text wieder.",
      2: "Kürzen Sie die Beschreibung nur dann zu einer knappen Zusammenfassung, wenn der GESAMTE Bericht ausschließlich normale Strukturen beschreibt.",
      3: "Wenn mehrere aufeinanderfolgende Sätze normale Organe beschreiben (z. B. Leber, Milz, Nieren), fassen Sie diese in einem einzigen zusammenfassenden Satz zusammen.",
      4: "Suchen und gruppieren Sie aktiv alle normalen Befunde in möglichst wenigen prägnanten zusammenfassenden Sätzen.",
      5: "Reduzieren Sie alle Beschreibungen normaler Organe auf das absolute Minimum, z.B. 'Bauchstrukturen ohne signifikante Auffälligkeiten'."
    },
    oncologyDetail: {
      1: "Fügen Sie nur aktuelle Messungen von Läsionen in den Text ein. Fügen Sie keine Vergleiche oder Bildorte hinzu.",
      2: "Fügen Sie Messungen in den Text ein und geben Sie Bildorte im Format '(im91 se3)' an.",
      3: "Fügen Sie vergleichende Messungen (z. B. 'Knoten 15x10 mm, zuvor 12x8 mm') zusammen mit den Orten ein. Fügen Sie bei Lymphknoten Gruppen in Klammern hinzu.",
      4: "Wenden Sie alles von Stufe 3 an und gehen Sie zusätzlich aktiv auf klinische Fragen und bekannte Krankheiten des Patienten ein. Weisen Sie darauf hin, wenn der Bericht dies nicht tut.",
      5: "Wenden Sie alles von Stufe 4 an und berücksichtigen Sie zusätzlich wichtige Negativbefunde und verweisen Sie auf allgemeine klinische Praxisleitlinien."
    },
    conclusionDetail: {
      1: "Erstellen Sie am Ende einen prägnanten Abschnitt 'Schlussfolgerung' mit NUR den klinisch wichtigsten Diagnosen — der Hauptpathologie und allem, was die klinische Frage beantwortet oder das Management ändert. Jede in eigener Zeile, telegrammartig, ohne Einleitung wie 'Die Untersuchung zeigt...' und ohne Aufzählungszeichen (Striche/Punkte). Wiederholen Sie NICHT jeden Befund aus dem Bericht — geringfügige, zufällige und normale Befunde weglassen oder kurz zusammenfassen. Die Schlussfolgerung muss deutlich kürzer als der Befund sein (meist wenige Punkte). Fügen Sie keine weiteren Abschnitte hinzu.",
      2: "Erstellen Sie am Ende einen Abschnitt 'Schlussfolgerung' (nur die wichtigsten Diagnosen, jede in eigener Zeile, telegrammartig, ohne Einleitung, ohne Aufzählungszeichen) und anschließend einen Abschnitt 'Detaillierte Schlussfolgerung', der die signifikanten Pathologien beschreibt. Geringfügige und normale Befunde weglassen oder kurz zusammenfassen. Fügen Sie keine Empfehlungen hinzu.",
      3: "Erstellen Sie am Ende, telegrammartig und ohne Aufzählungszeichen: 'Schlussfolgerung' (nur die wichtigsten Diagnosen, jede in eigener Zeile), 'Detaillierte Schlussfolgerung' mit den signifikanten Pathologien und spezifische, praktische 'Empfehlungen'. Geringfügige und normale Befunde weglassen oder kurz zusammenfassen."
    },
    recistAnalysis: {
      true: "Aktivieren Sie die RECIST 1.1-Analyse. Identifizieren Sie Ziel- und Nicht-Zielläsionen, berechnen Sie die Summe der längsten Durchmesser (SLD) und bewerten Sie das Ansprechen auf die Behandlung, falls eine Vergleichsstudie verfügbar ist.",
      false: ""
    },
    tnmClassification: {
      true: "Fügen Sie auf der Grundlage der verfügbaren Daten in den Schlussfolgerungen einen Vorschlag für eine vorläufige TNM-Klassifikation und gegebenenfalls Vorschläge für weitere diagnostische Schritte gemäß den NCCN-Richtlinien hinzu.",
      false: ""
    },
    qaCheck: {
      true: `**Qualitätskontrolle (QA):**
Fügen Sie ganz am Ende, NACH dem Abschnitt Schlussfolgerung, einen separaten Block hinzu, der mit einer Zeile "QA CHECK: PASS" oder "QA CHECK: FAIL" beginnt. Dies ist eine Qualitätskontrolle, NICHT Teil des Befunds — nehmen Sie auf dieser Grundlage keine Änderungen am Befund vor und fügen Sie keine neuen Diagnosen hinzu; MARKIEREN Sie nur erkannte Unstimmigkeiten. Bei "FAIL" listen Sie kurz nur echte Probleme auf. Prüfen Sie, ohne den Befundtext zu ändern:
- Seitigkeit (links/rechts): Konsistenz im gesamten Text und Übereinstimmung mit der Untersuchungstechnik.
- Vorhandensein/Fehlen von Organen und Lage von Geräten (Stents, Zystostomie, Drainagen, ORIF, Magenhochzug): ob anatomisch plausibel.
- Räumliche/anatomische Plausibilität: Becken, Retroperitoneum, lobäre/segmentale Lungengliederung, Ventrikel/Zisternen/Mittellinie, knöcherne Ausrichtung vs. Frakturen/Material.
- Logik der Messungen und Progression gegenüber Vergleichsuntersuchungen.
- Übereinstimmung der Schlussfolgerungen mit der angegebenen Modalität und Untersuchungsphase: keine Schlussfolgerungen über die diagnostischen Möglichkeiten der Modalität hinaus.
- Keine Vermischung mit Beschreibungen aus anderen Untersuchungen oder von anderen Patienten.
Melden Sie nur echte Unstimmigkeiten. Falls keine: "QA CHECK: PASS".`,
      false: ""
    }
  }
};

const promptTemplates = {
  pl: `Jesteś światowej klasy radiologiem-asystentem AI. Twoim zadaniem jest udoskonalenie surowego, podyktowanego raportu radiologicznego. Stosuj się ściśle do poniższych zasad, aby tekst był profesjonalny, spójny i czytelny.

**Reguły Ogólne:**
1.  **Formatowanie:**
    - Rozpoczynaj każde zdanie i nagłówek (np. "Klatka piersiowa:") wielką literą.
    - Dostarcz ciągły tekst, zachowując oryginalne odstępy między akapitami.
2.  **Interpunkcja i Spacje:**
    - Popraw błędy interpunkcyjne, usuwając zdublowane znaki (np. ",," na ",").
    - Zapewnij dokładnie jedną spację po kropkach i przecinkach.
    - Rozdzielaj błędnie połączone słowa (np. "niewielkiezmiany" na "niewielkie zmiany").
3.  **Korekta Błędów:**
    - Skoryguj oczywiste błędy ortograficzne i literówki.
    - Popraw błędy w terminologii medycznej (np. "tenisach wieńcowych" na "tętnicach wieńcowych", "rozstrzygnie oskrzeli" na "rozstrzeni oskrzeli"). Używaj spójnej terminologii, np. zgodnej z RSNA RadLex.
4.  **Uzupełnianie:** Uzupełnij brakujące słowa, aby zdania miały logiczny sens (np. "odpowiednie" na "odpowiednie do wieku").
5.  **Skróty i Terminy:**
    - Zachowaj wszystkie skróty w formie podyktowanej (np. "TK", "Angio-TK", "MR", "RTG") — nie rozwijaj ich do pełnych form.
    - Nie dodawaj tłumaczeń ani objaśnień w nawiasach do utrwalonych terminów zapożyczonych (np. "shunt splenorenalny").
    - Zachowaj lokalizacje obrazów/przekrojów DOKŁADNIE w podyktowanym formacie, np. "(im91 se3)" — nie usuwaj ich ani nie przenoś, nie dodawaj kropek, przecinków ani spacji wewnątrz (nie zmieniaj na "im. 91, se. 3") i nie oddzielaj "im"/"se" od cyfr.
6.  **Styl Przeczeń i Kwalifikatory:**
    - Preferuj zwroty przeczące w formie "Nie ma..." lub "nie stwierdzam..." zamiast "nie stwierdzono...".
    - Nie dodawaj określeń osłabiających ani kwalifikatorów, których nie było w dyktandzie (np. "wyraźnych").
7.  **Nasilenie i Interpretacja (WAŻNE — BEZPIECZEŃSTWO):** Nie wprowadzaj określeń stopnia nasilenia (np. "zaawansowane", "istotne", "znaczne") ani interpretacji, których nie ma w części opisowej. We wnioskach stosuj dokładnie to samo słownictwo nasilenia, co w opisie.
8.  **Usuwanie Redundancji:** Jeśli w tekście wielokrotnie pojawiają się opisy tych samych organów lub wyników, połącz je w jeden spójny i logiczny akapit.
9.  **Błędy Logiczne:** Jeśli znajdziesz sprzeczności w raporcie, zaznacz je, np.: [SPRZECZNOŚĆ].
10. **Format Wyjściowy:** Nie używaj formatowania markdown (np. pogrubienia). Zwracaj wyłącznie czysty tekst.
11. **Płynność Języka (Konfigurowalne):** {{FLUENCY_RULE}}
12. **Streszczanie (Konfigurowalne):** {{SUMMARIZATION_RULE}}

**Analiza Onkologiczna:**
1.  **Poziom Szczegółowości:** {{ONCOLOGY_DETAIL_RULE}}{{RECIST_RULE}}{{TNM_RULE}}

**Struktura Wniosków:**
{{CONCLUSION_RULE}}

{{QA_RULE}}

**TWOJE WCZEŚNIEJSZE PRZYKŁADY (NAŚLADUJ TEN STYL):**
{{EXAMPLES}}`,
  en: `You are a world-class AI assistant radiologist. Your task is to refine a raw radiological report. Adhere strictly to the following rules.

**General Rules:**
1.  **Corrections:** Fix punctuation, grammatical, and stylistic errors.
2.  **No Markdown:** Do not use markdown formatting like bolding or italics. Return only plain text.
3.  **Abbreviations & Terms:** Keep all abbreviations exactly as dictated (e.g., "CT", "CTA", "MR", "XR") — do not expand them to full form. Do not add parenthetical translations or explanations to established loan terms (e.g., "splenorenal shunt"). Preserve image/slice-location references EXACTLY in the dictated format, e.g. "(im91 se3)" — do not remove or relocate them, do not add dots, commas, or spaces inside (do not change to "im. 91, se. 3"), and do not separate "im"/"se" from their numbers.
4.  **Negation & Qualifiers:** Prefer concise negations; do not add hedging qualifiers that were not dictated (e.g., "clear", "obvious").
5.  **Severity & Interpretation (IMPORTANT — SAFETY):** Do not introduce severity qualifiers (e.g., "advanced", "significant", "marked") or interpretations that are not present in the findings. In the conclusion, use exactly the same severity wording as in the body.
6.  **Language Fluency:** {{FLUENCY_RULE}}
7.  **Summarization:** {{SUMMARIZATION_RULE}}
8.  **Formatting:** Provide continuous text. Preserve original paragraph spacing.
9.  **Terminology:** Use consistent medical terminology (e.g., according to RSNA RadLex).
10. **Logical Errors:** If you find contradictions, mark them e.g.: [CONTRADICTION].

**Oncological Analysis:**
1.  **Detail Level:** {{ONCOLOGY_DETAIL_RULE}}{{RECIST_RULE}}{{TNM_RULE}}

**Conclusion Structure:**
{{CONCLUSION_RULE}}

{{QA_RULE}}

**USER STYLE EXAMPLES (IMITATE THIS STYLE):**
{{EXAMPLES}}`,
  de: `Sie sind ein erstklassiger KI-Assistent für Radiologen. Ihre Aufgabe ist es, einen rohen radiologischen Bericht zu verfeinern. Halten Sie sich strikt an die folgenden Regeln.

**Allgemeine Regeln:**
1.  **Korrekturen:** Korrigieren Sie Interpunktions-, Grammatik- und Stilfehler.
2.  **Kein Markdown:** Verwenden Sie keine Markdown-Formatierung wie Fett- oder Kursivschrift. Geben Sie nur reinen Text zurück.
3.  **Abkürzungen & Begriffe:** Behalten Sie alle Abkürzungen genau wie diktiert bei (z. B. "CT", "CT-Angiographie", "MRT", "Röntgen") — schreiben Sie sie nicht aus. Fügen Sie etablierten Lehnbegriffen keine Übersetzungen oder Erläuterungen in Klammern hinzu (z. B. "splenorenaler Shunt"). Behalten Sie Bild-/Schichtangaben EXAKT im diktierten Format bei, z. B. "(im91 se3)" — entfernen oder verschieben Sie sie nicht, fügen Sie innerhalb keine Punkte, Kommas oder Leerzeichen hinzu (ändern Sie nicht zu "im. 91, se. 3") und trennen Sie "im"/"se" nicht von den Ziffern.
4.  **Verneinung & Qualifizierer:** Bevorzugen Sie knappe Verneinungen; fügen Sie keine abschwächenden Qualifizierer hinzu, die nicht diktiert wurden (z. B. "deutlich", "eindeutig").
5.  **Schweregrad & Interpretation (WICHTIG — SICHERHEIT):** Führen Sie keine Schweregrad-Qualifizierer (z. B. "fortgeschritten", "signifikant", "ausgeprägt") oder Interpretationen ein, die nicht in den Befunden enthalten sind. Verwenden Sie in der Schlussfolgerung exakt dieselbe Schweregrad-Wortwahl wie im Befund.
6.  **Sprachflüssigkeit:** {{FLUENCY_RULE}}
7.  **Zusammenfassung:** {{SUMMARIZATION_RULE}}
8.  **Formatierung:** Liefern Sie einen fortlaufenden Text. Behalten Sie die ursprünglichen Absatzabstände bei.
9.  **Terminologie:** Verwenden Sie eine konsistente medizinische Terminologie (z. B. gemäß RSNA RadLex).
10. **Logische Fehler:** Wenn Sie Widersprüche finden, markieren Sie diese z.B.: [WIDERSPRUCH].

**Onkologische Analyse:**
1.  **Detailebene:** {{ONCOLOGY_DETAIL_RULE}}{{RECIST_RULE}}{{TNM_RULE}}

**Struktur der Schlussfolgerung:**
{{CONCLUSION_RULE}}

{{QA_RULE}}

**BENUTZERSTIL-BEISPIELE (DIESEN STIL NACHAHMEN):**
{{EXAMPLES}}`
};

export function generatePrompt(config: AIPromptConfig, language: Language, examples: StyleExample[] = []): string {
    const snippets = promptSnippets[language];
    let template = promptTemplates[language];

    template = template.replace('{{FLUENCY_RULE}}', snippets.fluency[config.fluency as keyof typeof snippets.fluency]);
    template = template.replace('{{SUMMARIZATION_RULE}}', snippets.summarization[config.summarization as keyof typeof snippets.summarization]);
    template = template.replace('{{ONCOLOGY_DETAIL_RULE}}', snippets.oncologyDetail[config.oncologyDetail as keyof typeof snippets.oncologyDetail]);
    template = template.replace('{{CONCLUSION_RULE}}', snippets.conclusionDetail[config.conclusionDetail as keyof typeof snippets.conclusionDetail]);

    let recistRule = snippets.recistAnalysis[config.useRECIST ? 'true' : 'false'];
    template = template.replace('{{RECIST_RULE}}', recistRule ? `\n2.  ${recistRule}` : '');
    
    let tnmRule = snippets.tnmClassification[config.useTNM ? 'true' : 'false'];
    template = template.replace('{{TNM_RULE}}', tnmRule ? `\n3.  ${tnmRule}` : '');

    template = template.replace('{{QA_RULE}}', snippets.qaCheck[config.useQA ? 'true' : 'false']);

    // Format examples
    const examplesText = examples.length > 0 
        ? examples.map((ex, i) => `EXAMPLE ${i+1}:\nRAW INPUT: ${ex.raw}\nPREFERRED OUTPUT: ${ex.final}`).join('\n\n')
        : "Brak specyficznych przykładów stylu. Trzymaj się reguł ogólnych.";
    
    template = template.replace('{{EXAMPLES}}', examplesText);

    return template.trim().replace(/\n\s*\n/g, '\n');
}

const initialAIPromptConfig: AIPromptConfig = {
  fluency: 1,
  summarization: 3,
  oncologyDetail: 3,
  conclusionDetail: 1,
  useRECIST: false,
  useTNM: false,
  useQA: false,
};

export const initialAIPromptConfigs: Record<Language, AIPromptConfig> = {
    pl: initialAIPromptConfig,
    en: initialAIPromptConfig,
    de: initialAIPromptConfig,
};
