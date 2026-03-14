
import { radiologyTerms } from '../data/radiologyTerms';

export const medicalPostProcess = (text: string, language: string): string => {
    let processed = text;

    // 1. Basic cleaning
    processed = processed.replace(/\s+/g, ' ').trim();

    // 2. Language specific processing
    if (language === 'pl-PL' || language === 'pl') {
        processed = processPolishRadiology(processed);
    } 
    // Add other languages here as needed

    // 3. General Medical Units (Universal)
    processed = processed.replace(/(\d+)\s*(milimetrów|milimetry|mm|milimetra)/gi, '$1 mm');
    processed = processed.replace(/(\d+)\s*(centymetrów|centymetry|cm|centymetra)/gi, '$1 cm');
    processed = processed.replace(/(\d+)\s*(j\.?h\.?|jednostek hounsfielda|jednostki hounsfielda)/gi, '$1 j.H.');

    // 4. Dimensions (e.g., "10 na 20" -> "10x20")
    // Catches "10 na 20", "10 x 20", "10x 20"
    processed = processed.replace(/(\d+)\s*(x|na)\s*(\d+)/gi, '$1x$3');
    // Catches 3D dimensions "10 na 20 na 30" -> "10x20x30"
    processed = processed.replace(/(\d+x\d+)\s*(x|na)\s*(\d+)/gi, '$1x$3');

    // 5. Ensure space after punctuation (excluding decimal points in numbers)
    processed = processed.replace(/([.,?!])([a-zA-Z])/g, '$1 $2');
    
    // 6. Fix decimal points (speech often returns "15, 5" or "15 5" instead of "15.5" or "15,5" depending on locale)
    // This looks for digit-comma-space-digit and makes it digit-comma-digit
    processed = processed.replace(/(\d+)\s*[,.]\s*(\d+)/g, '$1,$2');

    return processed;
};

const processPolishRadiology = (text: string): string => {
    let processed = text;

    // Acronyms and Casing
    const acronyms = [
        { regex: /\b(tk|taka|tomografia)\b/gi, replacement: 'TK' },
        { regex: /\b(mr|em er|rezonans)\b/gi, replacement: 'MR' },
        { regex: /\b(kt)\b/gi, replacement: 'KT' },
        { regex: /\b(usg|u es gie)\b/gi, replacement: 'USG' },
        { regex: /\b(rtg|rentgen)\b/gi, replacement: 'RTG' },
        { regex: /\b(recist)\b/gi, replacement: 'RECIST' },
        { regex: /\b(sor)\b/gi, replacement: 'SOR' },
        { regex: /\b(hds)\b/gi, replacement: 'HDS' },
    ];

    acronyms.forEach(({ regex, replacement }) => {
        processed = processed.replace(regex, replacement);
    });

    // Liver Segments (e.g., "segment siódmy" -> "seg. VII")
    const romanNumerals: Record<string, string> = {
        'pierwszy': 'I', 'drugi': 'II', 'trzeci': 'III', 'czwarty': 'IV', 'piąty': 'V',
        'szósty': 'VI', 'siódmy': 'VII', 'ósmy': 'VIII', 'dziewiąty': 'IX', 'dziesiąty': 'X',
        'jeden': 'I', 'dwa': 'II', 'trzy': 'III', 'cztery': 'IV', 'pięć': 'V',
        'sześć': 'VI', 'siedem': 'VII', 'osiem': 'VIII', 'dziewięć': 'IX', 'dziesięć': 'X',
        '4a': 'IVa', '4b': 'IVb'
    };

    processed = processed.replace(/\bsegment\s+([a-ząśżźćńół]+)(\s+[ab])?\b/gi, (match, numberWord, suffix) => {
        const roman = romanNumerals[numberWord.toLowerCase()];
        if (roman) {
            return `seg. ${roman}${suffix ? suffix.trim() : ''}`;
        }
        return match;
    });
    
    // Numeric conversions for "segment 7" -> "seg. VII"
    const digitToRoman: Record<string, string> = {
        '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', 
        '6': 'VI', '7': 'VII', '8': 'VIII', '9': 'IX', '10': 'X'
    };
    processed = processed.replace(/\bsegment\s+(\d+)([ab])?\b/gi, (match, digit, suffix) => {
        const roman = digitToRoman[digit];
        if (roman) {
            return `seg. ${roman}${suffix || ''}`;
        }
        return match;
    });

    // Common phrases cleanup
    processed = processed.replace(/\bbez cech\b/gi, 'bez cech'); // standardize casing if needed
    processed = processed.replace(/\bnie uwidoczniono\b/gi, 'nie uwidoczniono');

    return processed;
};
