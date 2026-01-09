import { XmlParser } from '../utils/xml';
import { NumberingDefinition, AbstractNumberingDefinition, NumberingLevel } from '../models/numbering';

export class NumberingManager {
    private abstractNums: Map<string, AbstractNumberingDefinition> = new Map();
    private nums: Map<string, NumberingDefinition> = new Map();

    constructor(private zip?: any) { }

    async loadNumbering() {
        if (!this.zip) return;
        const xmlStr = await this.zip.file('word/numbering.xml')?.async('string');
        if (!xmlStr) return;

        const doc = new XmlParser().parse(xmlStr);

        // 1. Abstract Numbering
        const abstracts = XmlParser.getElements(doc, 'w:abstractNum');
        abstracts.forEach(node => {
            const id = node.getAttribute('w:abstractNumId');
            if (!id) return;

            const abstractNum: AbstractNumberingDefinition = {
                id,
                levels: new Map()
            };

            const levels = XmlParser.getElements(node, 'w:lvl');
            levels.forEach(lvl => {
                const ilvl = parseInt(lvl.getAttribute('w:ilvl') || '0', 10);

                const startNode = XmlParser.getElement(lvl, 'w:start');
                const start = startNode ? startNode.getAttribute('w:val') : null;

                const numFmtNode = XmlParser.getElement(lvl, 'w:numFmt');
                const numFmt = numFmtNode ? numFmtNode.getAttribute('w:val') : null;

                const lvlTextNode = XmlParser.getElement(lvl, 'w:lvlText');
                const lvlText = lvlTextNode ? lvlTextNode.getAttribute('w:val') : null;

                const jcNode = XmlParser.getElement(lvl, 'w:lvlJc');
                const jc = jcNode ? jcNode.getAttribute('w:val') : null;

                const pPr = XmlParser.getElement(lvl, 'w:pPr');
                const ind = pPr ? XmlParser.getElement(pPr, 'w:ind') : null;

                const rPr = XmlParser.getElement(lvl, 'w:rPr');
                const rFonts = rPr ? XmlParser.getElement(rPr, 'w:rFonts') : null;
                const font = rFonts ? (rFonts.getAttribute('w:ascii') || rFonts.getAttribute('w:hAnsi')) : undefined;

                abstractNum.levels.set(ilvl, {
                    level: ilvl,
                    start: start ? parseInt(start, 10) : 1,
                    format: numFmt || 'decimal',
                    text: lvlText || undefined,
                    align: jc || undefined,
                    indent: ind ? parseInt(ind.getAttribute('w:left') || '0', 10) : 0,
                    hanging: ind ? parseInt(ind.getAttribute('w:hanging') || '0', 10) : 0,
                    font: font || undefined
                });
            });

            this.abstractNums.set(id, abstractNum);
        });

        // 2. Concrete Numbering
        const nums = XmlParser.getElements(doc, 'w:num');
        nums.forEach(node => {
            const id = node.getAttribute('w:numId');
            const abstractNumId = XmlParser.getElement(node, 'w:abstractNumId')?.getAttribute('w:val');
            if (id && abstractNumId) {
                this.nums.set(id, { id, abstractNumId });
            }
        });
    }

    getNumbering(numId: string, ilvl: number): NumberingLevel | null {
        const num = this.nums.get(numId);
        if (!num) return null;

        const abstractNum = this.abstractNums.get(num.abstractNumId);
        if (!abstractNum) return null;

        return abstractNum.levels.get(ilvl) || null;
    }

    getNumberingDefinition(numId: string): AbstractNumberingDefinition | null {
        const num = this.nums.get(numId);
        if (!num) return null;
        return this.abstractNums.get(num.abstractNumId) || null;
    }
}

export function formatListNumber(val: number, format: string): string {
    switch (format) {
        case 'decimal':
            return val.toString();
        case 'lowerLetter':
            return String.fromCharCode(96 + val);
        case 'upperLetter':
            return String.fromCharCode(64 + val);
        case 'lowerRoman':
            return toRoman(val).toLowerCase();
        case 'upperRoman':
            return toRoman(val);
        case 'bullet':
            return '•';
        case 'decimalEnclosedCircle': {
            // ①, ②, ... up to 20
            if (val >= 1 && val <= 20) return String.fromCharCode(0x245F + val);
            return val.toString();
        }
        case 'decimalEnclosedCircleChinese': {
            // ㈠, ㈡, ...
            const map = ['㈠', '㈡', '㈢', '㈣', '㈤', '㈥', '㈦', '㈧', '㈨', '㈩'];
            return map[val - 1] || val.toString();
        }
        case 'decimalEnclosedParen':
            return `(${val})`;
        case 'decimalFullstop':
            return `${val}.`;
        default:
            return val.toString(); // Fallback
    }
}

function toRoman(num: number): string {
    const lookup: { [key: string]: number } = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
    let roman = '';
    for (const i in lookup) {
        if (Object.prototype.hasOwnProperty.call(lookup, i)) {
            while (num >= lookup[i]) {
                roman += i;
                num -= lookup[i];
            }
        }
    }
    return roman;
}

