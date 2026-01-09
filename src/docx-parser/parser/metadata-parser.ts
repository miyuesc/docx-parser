import { XmlParser } from '../utils/xml';
import { ParsingContext } from '../core/context';

export interface DocxMetadata {
    title?: string;
    description?: string;
    creator?: string;
    created?: Date;
    modified?: Date;
    lastModifiedBy?: string;
    revision?: number;
    keywords?: string[];
    category?: string;
    pageCount?: number;
    wordCount?: number;
    characterCount?: number;
}

export class MetadataParser {
    static async parse(context: ParsingContext): Promise<DocxMetadata> {
        const metadata: DocxMetadata = {};

        // 1. Core Properties (docProps/core.xml)
        try {
            const coreXml = await context.loadFile('docProps/core.xml');
            if (coreXml) {
                const doc = new XmlParser().parse(coreXml);
                const props = [
                    { tag: 'dc:title', key: 'title' },
                    { tag: 'dc:description', key: 'description' },
                    { tag: 'dc:creator', key: 'creator' },
                    { tag: 'cp:lastModifiedBy', key: 'lastModifiedBy' },
                    { tag: 'cp:keywords', key: 'keywords', transform: (v: string) => v.split(',').map(s => s.trim()) },
                    { tag: 'cp:category', key: 'category' },
                    { tag: 'cp:revision', key: 'revision', transform: (v: string) => parseInt(v, 10) },
                    { tag: 'dcterms:created', key: 'created', transform: (v: string) => new Date(v) },
                    { tag: 'dcterms:modified', key: 'modified', transform: (v: string) => new Date(v) }
                ];

                props.forEach(p => {
                    // Try namespace aware and non-namespace
                    const val = this.getTextContent(doc, p.tag);
                    if (val) {
                        (metadata as any)[p.key] = p.transform ? p.transform(val) : val;
                    }
                });
            }
        } catch (e) {
            console.warn('Failed to parse core properties', e);
        }

        // 2. App Properties (docProps/app.xml)
        try {
            const appXml = await context.loadFile('docProps/app.xml');
            if (appXml) {
                const doc = new XmlParser().parse(appXml);
                const props = [
                    { tag: 'Pages', key: 'pageCount', type: 'int' },
                    { tag: 'Words', key: 'wordCount', type: 'int' },
                    { tag: 'Characters', key: 'characterCount', type: 'int' }
                ];

                props.forEach(p => {
                    const val = this.getTextContent(doc, p.tag);
                    if (val) {
                        (metadata as any)[p.key] = parseInt(val, 10);
                    }
                });
            }
        } catch (e) {
            console.warn('Failed to parse app properties', e);
        }

        return metadata;
    }

    private static getTextContent(doc: Document, tag: string): string | null {
        // Simple tag name search (ignoring namespace prefix if needed or trying exact)
        // XmlParser.query uses querySelector which requires escaping colons
        // Or getElementsByTagName
        const parts = tag.split(':');
        const localName = parts.length > 1 ? parts[1] : parts[0];

        let el = doc.getElementsByTagName(tag)[0];
        if (!el) {
            el = doc.getElementsByTagName(localName)[0];
        }
        return el ? el.textContent : null;
    }
}
