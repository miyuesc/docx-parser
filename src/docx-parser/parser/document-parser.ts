import { DocumentModel } from '../models/document';
import { SectionModel } from '../models/section';
import { ParsingContext } from '../core/context';
import { XmlParser } from '../utils/xml';
import { ParagraphParser } from './strategies/paragraph-parser';
import { TableParser } from './strategies/table-parser';
import { HeaderFooterParser } from './strategies/header-footer-parser';


export class DocumentParser {
    constructor(private context: ParsingContext) { }

    async parse(): Promise<DocumentModel> {
        const xmlStr = await this.context.loadFile('word/document.xml');
        if (!xmlStr) throw new Error('Could not find word/document.xml');

        const xmlDoc = new XmlParser().parse(xmlStr);
        const docModel = new DocumentModel();

        const body = XmlParser.query(xmlDoc, 'body');
        if (!body) throw new Error('Invalid document.xml: No body found');

        // Initial section
        let currentSection = new SectionModel();

        let currentContent: any[] = [];
        const sections: SectionModel[] = [];

        for (let i = 0; i < body.childNodes.length; i++) {
            const child = body.childNodes[i] as Element;
            if (child.nodeType !== 1) continue;

            const tagName = child.tagName;

            if (tagName === 'w:p') {
                const paragraph = ParagraphParser.parse(child, this.context);
                currentContent.push(paragraph);

                const pPr = XmlParser.query(child, 'pPr');
                const sectPr = pPr ? XmlParser.query(pPr, 'sectPr') : null;
                if (sectPr) {
                    currentSection.children = currentContent;
                    this.parseSectionProps(sectPr, currentSection);
                    sections.push(currentSection);

                    currentSection = new SectionModel();
                    currentContent = [];
                }
            } else if (tagName === 'w:tbl') {
                const table = TableParser.parse(child, this.context);
                currentContent.push(table);
            } else if (tagName === 'w:sectPr') {
                currentSection.children = currentContent;
                this.parseSectionProps(child, currentSection);
                sections.push(currentSection);
            }
        }

        if (currentContent.length > 0 || sections.length === 0) {
            if (currentSection.children.length === 0) {
                currentSection.children = currentContent;
                sections.push(currentSection);
            }
        }

        // Post-process sections: Load headers/footers
        for (const section of sections) {
            for (const h of section.headers) {
                // We attach the loaded AST to the reference or stash it in the section
                // But types.ts Section interface defines headers: HeaderFooterRef[]
                // We might need to extend Section to hold actual content or just Ref.
                // Actually HeaderFooterRef doesn't hold content. 
                // Let's modify types.ts or just handle it in Renderer by fetching?
                // Fetching in Renderer is async, but renderer is sync.
                // So we MUST fetch now.

                // Strategy: Expand HeaderFooterRef to include content
                (h as any).content = await HeaderFooterParser.parse(h.id, this.context);
            }
            for (const f of section.footers) {
                (f as any).content = await HeaderFooterParser.parse(f.id, this.context);
            }
            docModel.addSection(section);
        }

        return docModel;
    }

    private parseSectionProps(sectPr: Element, section: SectionModel) {
        const pgSz = XmlParser.query(sectPr, 'pgSz');
        if (pgSz) {
            const w = parseInt(pgSz.getAttribute('w:w') || '0', 10);
            const h = parseInt(pgSz.getAttribute('w:h') || '0', 10);
            const orient = pgSz.getAttribute('w:orient') as 'portrait' | 'landscape' || 'portrait';

            section.props = {
                ...section.props,
                pageSize: { width: w, height: h, orientation: orient }
            };
        }

        const pgMar = XmlParser.query(sectPr, 'pgMar');
        if (pgMar) {
            section.props.pageMargin = {
                top: parseInt(pgMar.getAttribute('w:top') || '0', 10),
                right: parseInt(pgMar.getAttribute('w:right') || '0', 10),
                bottom: parseInt(pgMar.getAttribute('w:bottom') || '0', 10),
                left: parseInt(pgMar.getAttribute('w:left') || '0', 10),
                header: parseInt(pgMar.getAttribute('w:header') || '0', 10),
                footer: parseInt(pgMar.getAttribute('w:footer') || '0', 10),
                gutter: parseInt(pgMar.getAttribute('w:gutter') || '0', 10),
            }
        }

        const headers = XmlParser.queryAll(sectPr, 'headerReference');
        headers.forEach(h => {
            const id = h.getAttribute('r:id');
            const type = h.getAttribute('w:type') as 'default' | 'first' | 'even';
            if (id) {
                section.headers.push({ type: 'header', id, kind: type });
            }
        });

        const footers = XmlParser.queryAll(sectPr, 'footerReference');
        footers.forEach(f => {
            const id = f.getAttribute('r:id');
            const type = f.getAttribute('w:type') as 'default' | 'first' | 'even';
            if (id) {
                section.footers.push({ type: 'footer', id, kind: type });
            }
        });
    }
}
