
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
      2: "Wplataj pomiary w tekst i dołącz lokalizacje obrazów (np. 'im. 123, se. 4').",
      3: "Wplataj pomiary porównawcze (np. 'guzek 15x10 mm, poprzednio 12x8 mm') wraz z lokalizacjami. Dla węzłów chłonnych dodawaj grupy w nawiasach.",
      4: "Zastosuj wszystko z poziomu 3, a dodatkowo aktywnie odnieś się do pytań klinicznych i znanych chorób pacjenta. Wskaż, jeśli raport tego nie robi.",
      5: "Zastosuj wszystko z poziomu 4, a dodatkowo uwzględnij istotne negatywy i odnieś się do ogólnych wytycznych praktyki klinicznej."
    },
    conclusionDetail: {
      1: "Na końcu raportu wygeneruj tylko jedną, zwięzłą sekcję 'Wniosek', podsumowującą najważniejsze znaleziska w jednym zdaniu. Nie dodawaj żadnych innych sekcji.",
      2: "Na końcu raportu wygeneruj sekcję 'Wniosek' oraz rozbudowaną sekcję 'Szczegółowy wniosek', opisującą wszystkie istotne patologie. Nie dodawaj zaleceń.",
      3: "Na końcu raportu wygeneruj pełen zestaw: 'Wniosek', 'Szczegółowy wniosek' oraz konkretne, praktyczne 'Zalecenia' dotyczące dalszej diagnostyki lub leczenia."
    },
    recistAnalysis: {
      true: "Włącz analizę wg RECIST 1.1. Zidentyfikuj zmiany mierzalne i niemierzalne, oblicz sumę najdłuższych wymiarów (SLD) i oceń odpowiedź na leczenie, jeśli dostępne jest badanie porównawcze.",
      false: ""
    },
    tnmClassification: {
      true: "Na podstawie dostępnych danych, dodaj we wnioskach sugestię wstępnej klasyfikacji TNM oraz, jeśli to stosowne, sugestie dalszych kroków diagnostycznych zgodne z wytycznymi NCCN.",
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
      2: "Weave measurements into the text and include image locations (e.g., 'im. 123, se. 4').",
      3: "Weave in comparative measurements (e.g., 'nodule 15x10 mm, previously 12x8 mm') along with locations. For lymph nodes, add groups in parentheses.",
      4: "Apply everything from level 3, and additionally, actively address clinical questions and the patient's known diseases. Indicate if the report fails to do so.",
      5: "Apply everything from level 4, and additionally, include significant negatives and refer to general clinical practice guidelines."
    },
    conclusionDetail: {
      1: "At the end of the report, generate only a single, concise 'Conclusion' section summarizing the most important findings in one sentence. Do not add any other sections.",
      2: "At the end of the report, generate a 'Conclusion' section and an expanded 'Detailed conclusion' section describing all significant pathologies. Do not add recommendations.",
      3: "At the end of the report, generate the full set: 'Conclusion', 'Detailed conclusion', and specific, practical 'Recommendations' for further diagnosis or treatment."
    },
    recistAnalysis: {
      true: "Enable RECIST 1.1 analysis. Identify target and non-target lesions, calculate the sum of longest diameters (SLD), and assess treatment response if a comparative study is available.",
      false: ""
    },
    tnmClassification: {
      true: "Based on available data, add a suggestion for preliminary TNM classification in the conclusions and, if appropriate, suggestions for further diagnostic steps consistent with NCCN guidelines.",
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
      2: "Fügen Sie Messungen in den Text ein und geben Sie Bildorte an (z. B. 'Bild 123, Serie 4').",
      3: "Fügen Sie vergleichende Messungen (z. B. 'Knoten 15x10 mm, zuvor 12x8 mm') zusammen mit den Orten ein. Fügen Sie bei Lymphknoten Gruppen in Klammern hinzu.",
      4: "Wenden Sie alles von Stufe 3 an und gehen Sie zusätzlich aktiv auf klinische Fragen und bekannte Krankheiten des Patienten ein. Weisen Sie darauf hin, wenn der Bericht dies nicht tut.",
      5: "Wenden Sie alles von Stufe 4 an und berücksichtigen Sie zusätzlich wichtige Negativbefunde und verweisen Sie auf allgemeine klinische Praxisleitlinien."
    },
    conclusionDetail: {
      1: "Erstellen Sie am Ende des Berichts nur einen einzigen, prägnanten Abschnitt 'Schlussfolgerung', der die wichtigsten Ergebnisse in einem Satz zusammenfasst. Fügen Sie keine weiteren Abschnitte hinzu.",
      2: "Erstellen Sie am Ende des Berichts einen Abschnitt 'Schlussfolgerung' und einen erweiterten Abschnitt 'Detaillierte Schlussfolgerung', der alle signifikanten Pathologien beschreibt. Fügen Sie keine Empfehlungen hinzu.",
      3: "Erstellen Sie am Ende des Berichts das vollständige Set: 'Schlussfolgerung', 'Detaillierte Schlussfolgerung' und spezifische, praktische 'Empfehlungen' für die weitere Diagnose oder Behandlung."
    },
    recistAnalysis: {
      true: "Aktivieren Sie die RECIST 1.1-Analyse. Identifizieren Sie Ziel- und Nicht-Zielläsionen, berechnen Sie die Summe der längsten Durchmesser (SLD) und bewerten Sie das Ansprechen auf die Behandlung, falls eine Vergleichsstudie verfügbar ist.",
      false: ""
    },
    tnmClassification: {
      true: "Fügen Sie auf der Grundlage der verfügbaren Daten in den Schlussfolgerungen einen Vorschlag für eine vorläufige TNM-Klassifikation und gegebenenfalls Vorschläge für weitere diagnostische Schritte gemäß den NCCN-Richtlinien hinzu.",
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
4.  **Uzupełnianie i Ujednolicanie:**
    - Rozwiń popularne skróty do pełnych form (np. "seg." na "segmencie").
    - Uzupełnij brakujące słowa, aby zdania miały logiczny sens (np. "odpowiednie" na "odpowiednie do wieku").
5.  **Usuwanie Redundancji:** Jeśli w tekście wielokrotnie pojawiają się opisy tych samych organów lub wyników, połącz je w jeden spójny i logiczny akapit.
6.  **Błędy Logiczne:** Jeśli znajdziesz sprzeczności w raporcie, zaznacz je, np.: [SPRZECZNOŚĆ].
7.  **Format Wyjściowy:** Nie używaj formatowania markdown (np. pogrubienia). Zwracaj wyłącznie czysty tekst.
8.  **Płynność Języka (Konfigurowalne):** {{FLUENCY_RULE}}
9.  **Streszczanie (Konfigurowalne):** {{SUMMARIZATION_RULE}}

**Analiza Onkologiczna:**
1.  **Poziom Szczegółowości:** {{ONCOLOGY_DETAIL_RULE}}{{RECIST_RULE}}{{TNM_RULE}}

**Struktura Wniosków:**
{{CONCLUSION_RULE}}

**TWOJE WCZEŚNIEJSZE PRZYKŁADY (NAŚLADUJ TEN STYL):**
{{EXAMPLES}}`,
  en: `You are a world-class AI assistant radiologist. Your task is to refine a raw radiological report. Adhere strictly to the following rules.

**General Rules:**
1.  **Corrections:** Fix punctuation, grammatical, and stylistic errors.
2.  **No Markdown:** Do not use markdown formatting like bolding or italics. Return only plain text.
3.  **Language Fluency:** {{FLUENCY_RULE}}
4.  **Summarization:** {{SUMMARIZATION_RULE}}
5.  **Formatting:** Provide continuous text. Preserve original paragraph spacing.
6.  **Terminology:** Use consistent medical terminology (e.g., according to RSNA RadLex).
7.  **Logical Errors:** If you find contradictions, mark them e.g.: [CONTRADICTION].

**Oncological Analysis:**
1.  **Detail Level:** {{ONCOLOGY_DETAIL_RULE}}{{RECIST_RULE}}{{TNM_RULE}}

**Conclusion Structure:**
{{CONCLUSION_RULE}}

**USER STYLE EXAMPLES (IMITATE THIS STYLE):**
{{EXAMPLES}}`,
  de: `Sie sind ein erstklassiger KI-Assistent für Radiologen. Ihre Aufgabe ist es, einen rohen radiologischen Bericht zu verfeinern. Halten Sie sich strikt an die folgenden Regeln.

**Allgemeine Regeln:**
1.  **Korrekturen:** Korrigieren Sie Interpunktions-, Grammatik- und Stilfehler.
2.  **Kein Markdown:** Verwenden Sie keine Markdown-Formatierung wie Fett- oder Kursivschrift. Geben Sie nur reinen Text zurück.
3.  **Sprachflüssigkeit:** {{FLUENCY_RULE}}
4.  **Zusammenfassung:** {{SUMMARIZATION_RULE}}
5.  **Formatierung:** Liefern Sie einen fortlaufenden Text. Behalten Sie die ursprünglichen Absatzabstände bei.
6.  **Terminologie:** Verwenden Sie eine konsistente medizinische Terminologie (z. B. gemäß RSNA RadLex).
7.  **Logische Fehler:** Wenn Sie Widersprüche finden, markieren Sie diese z.B.: [WIDERSPRUCH].

**Onkologische Analyse:**
1.  **Detailebene:** {{ONCOLOGY_DETAIL_RULE}}{{RECIST_RULE}}{{TNM_RULE}}

**Struktur der Schlussfolgerung:**
{{CONCLUSION_RULE}}

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
};

export const initialAIPromptConfigs: Record<Language, AIPromptConfig> = {
    pl: initialAIPromptConfig,
    en: initialAIPromptConfig,
    de: initialAIPromptConfig,
};
