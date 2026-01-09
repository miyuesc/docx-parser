import { StyleManager } from '../styler/style-manager';
import { NumberingManager } from '../styler/numbering-manager';
import { XmlParser } from '../utils/xml';

export interface Relationship {
    id: string; // rId
    type: string;
    target: string;
    targetMode?: 'External' | 'Internal';
}

export class ParsingContext {
    private relationships: Map<string, Relationship>;
    public readonly styleManager: StyleManager;
    public readonly numberingManager: NumberingManager;
    private zip: any; // JSZip instance
    private imageMap: Map<string, string> = new Map(); // rId -> ObjectURL

    constructor(zip: any, styleManager: StyleManager, numberingManager: NumberingManager) {
        this.zip = zip;
        this.styleManager = styleManager;
        this.numberingManager = numberingManager;
        this.relationships = new Map();
    }

    addRelationship(rel: Relationship) {
        this.relationships.set(rel.id, rel);
    }

    getRelationship(id: string): Relationship | undefined {
        return this.relationships.get(id);
    }

    getZip() {
        return this.zip;
    }

    async loadFile(path: string, type: 'string' | 'xml' | 'blob' = 'string'): Promise<any> {
        const file = this.zip.file(path);
        if (!file) return null;
        if (type === 'string') return await file.async('string');
        if (type === 'blob') return await file.async('blob');
        return await file.async('string');
    }

    // New: Parse relationships
    async loadRelationships() {
        const relsXml = await this.loadFile('word/_rels/document.xml.rels');
        if (!relsXml) return;

        const doc = new XmlParser().parse(relsXml);
        const rels = XmlParser.queryAll(doc, 'Relationship');

        for (const rel of rels) {
            const id = rel.getAttribute('Id');
            const type = rel.getAttribute('Type');
            const target = rel.getAttribute('Target');
            const targetMode = rel.getAttribute('TargetMode') as 'External' | 'Internal';

            if (id && type && target) {
                this.relationships.set(id, { id, type, target, targetMode });
            }
        }
    }

    // New: Pre-load image blobs
    async prepareImages() {
        for (const [rId, rel] of this.relationships) {
            if (rel.type.includes('image') && rel.targetMode !== 'External') {
                // Target is relative to word/ directory usually, e.g. "media/image1.png"
                const path = `word/${rel.target}`;
                const blob = await this.loadFile(path, 'blob');
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    this.imageMap.set(rId, url);
                }
            }
        }
    }

    getImageUrl(rId: string): string | undefined {
        return this.imageMap.get(rId);
    }
}
