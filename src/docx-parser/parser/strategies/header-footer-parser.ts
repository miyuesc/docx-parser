import { ParsingContext } from '../../core/context';
import { XmlParser } from '../../utils/xml';
import { ParagraphParser } from './paragraph-parser';
import { TableParser } from './table-parser';
import { DocxElement } from '../../core/types';

export class HeaderFooterParser {
    static async parse(id: string, context: ParsingContext): Promise<DocxElement[]> {
        const rel = context.getRelationship(id);
        if (!rel) return [];

        const target = `word/${rel.target}`;
        const xmlStr = await context.loadFile(target);
        if (!xmlStr) return [];

        const xmlDoc = new XmlParser().parse(xmlStr);
        // Root is w:hdr or w:ftr
        const root = xmlDoc.documentElement;

        const children: DocxElement[] = [];

        for (let i = 0; i < root.childNodes.length; i++) {
            const child = root.childNodes[i] as Element;
            if (child.nodeType !== 1) continue;

            if (child.tagName === 'w:p') {
                children.push(ParagraphParser.parse(child, context));
            } else if (child.tagName === 'w:tbl') {
                children.push(TableParser.parse(child, context));
            }
        }

        return children;
    }
}
