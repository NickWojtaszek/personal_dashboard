
import type { RadiologyCode } from '../types';

export const initialRadiologyCodes: RadiologyCode[] = [
    { code: '025', fullCode: '5.03.00.0000025', points: 60.7, desc: 'TK: badanie głowy bez wzmocnienia kontrastowego', category: 'TK Głowa' },
    { code: '027', fullCode: '5.03.00.0000027', points: 124.6, desc: 'TK: badanie głowy bez i ze wzmocnieniem kontrastowym', category: 'TK Głowa' },
    { code: '070', fullCode: '5.03.00.0000070', points: 68.2, desc: 'TK: badanie innej okolicy anatomicznej bez wzmocnienia kontrastowego', category: 'TK Inne' },
    { code: '071', fullCode: '5.03.00.0000071', points: 147.3, desc: 'TK: badanie innej okolicy anatomicznej bez i ze wzmocnieniem kontrastowym', category: 'TK Inne' },
    { code: '073', fullCode: '5.03.00.0000073', points: 174.3, desc: 'TK: badanie dwóch okolic anatomicznych bez i ze wzmocnieniem kontrastowym', category: 'TK Wielonarządowe' },
    { code: '085', fullCode: '5.03.00.0000085', points: 196.3, desc: 'TK: angiografia tt. wieńcowych u pacjentów po zabiegach koronaroplastyki lub wszczepieniu by-passów', category: 'TK Angiografia' },
    { code: '086', fullCode: '5.03.00.0000086', points: 146.6, desc: 'TK: wirtualna kolonoskopia u pacjentów, u których warunki anatomiczne uniemożliwiają wykonanie kolonoskopii tradycyjnej', category: 'TK Specjalistyczne' },
    { code: '087', fullCode: '5.03.00.0000087', points: 213.7, desc: 'TK: badanie kardiologiczne TK (obejmuje badanie morfologii i czynności mięśnia sercowego)', category: 'TK Kardiologia' },
    { code: '088', fullCode: '5.03.00.0000088', points: 167.6, desc: 'TK: angiografia (z wyłączeniem angiografii tt. wieńcowych)', category: 'TK Angiografia' },
    { code: '094', fullCode: '5.03.00.0000094', points: 98.3, desc: 'TK: badanie głowy ze wzmocnieniem kontrastowym', category: 'TK Głowa' },
    { code: '095', fullCode: '5.03.00.0000095', points: 113.6, desc: 'TK: innej okolicy anatomicznej ze wzmocnieniem kontrastowym', category: 'TK Inne' },
    { code: '096', fullCode: '5.03.00.0000096', points: 82.7, desc: 'TK: badanie dwóch okolic anatomicznych bez wzmocnienia kontrastowego', category: 'TK Wielonarządowe' },
    { code: '097', fullCode: '5.03.00.0000097', points: 154.8, desc: 'TK: badanie dwóch okolic anatomicznych ze wzmocnieniem kontrastowym', category: 'TK Wielonarządowe' },
    { code: '098', fullCode: '5.03.00.0000098', points: 129.6, desc: 'TK: głowy bez wzmocnienia kontrastowego i co najmniej dwie fazy ze wzmocnieniem kontrastowym', category: 'TK Głowa' },
    { code: '099', fullCode: '5.03.00.0000099', points: 150.5, desc: 'TK: innej okolicy anatomicznej bez wzmocnienia kontrastowego i co najmniej dwie fazy ze wzmocnieniem kontrastowym', category: 'TK Inne' },
    { code: '115', fullCode: '5.03.00.0000115', points: 97.3, desc: 'TK: badanie trzech lub więcej okolic anatomicznych bez wzmocnienia kontrastowego', category: 'TK Wielonarządowe' },
    { code: '116', fullCode: '5.03.00.0000116', points: 170.8, desc: 'TK: badanie trzech lub więcej okolic anatomicznych ze wzmocnieniem kontrastowym', category: 'TK Wielonarządowe' },
    { code: '117', fullCode: '5.03.00.0000117', points: 200.2, desc: 'TK: badanie trzech lub więcej okolic anatomicznych bez i ze wzmocnieniem kontrastowym', category: 'TK Wielonarządowe' },
];
