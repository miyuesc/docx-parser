import { XmlParser } from '../utils/xml';

export interface StyleDefinition {
    id: string;
    type: 'paragraph' | 'character' | 'table' | 'numbering';
    name?: string;
    basedOn?: string;
    next?: string;
    rPr?: any;
    pPr?: any;
}

export class StyleManager {
    private styles: Map<string, StyleDefinition> = new Map();
    private defaultRunProperties: any = {};


    constructor(private zip?: any) { }

    async loadStyles() {
        if (!this.zip) return;
        const xmlStr = await this.zip.file('word/styles.xml')?.async('string');
        if (!xmlStr) return;

        const xmlDoc = new XmlParser().parse(xmlStr);
        const styleNodes = XmlParser.getElements(xmlDoc, 'w:style'); // w:style

        for (const node of styleNodes) {
            const id = node.getAttribute('w:styleId');
            const type = node.getAttribute('w:type') as any;
            if (!id) continue;

            const style: StyleDefinition = { id, type };

            const name = XmlParser.getElement(node, 'w:name');
            if (name) style.name = name.getAttribute('w:val') || undefined;

            const basedOn = XmlParser.getElement(node, 'w:basedOn');
            if (basedOn) style.basedOn = basedOn.getAttribute('w:val') || undefined;

            // Extract properties
            const rPr = XmlParser.getElement(node, 'w:rPr');
            if (rPr) style.rPr = this.parseRunProperties(rPr);

            const pPr = XmlParser.getElement(node, 'w:pPr');
            if (pPr) style.pPr = this.parseParagraphProperties(pPr);

            this.styles.set(id, style);
        }

        // Parse DocDefaults
        const docDefaults = XmlParser.getElement(xmlDoc, 'w:docDefaults');
        if (docDefaults) {
            const rPrDefault = XmlParser.getElement(docDefaults, 'w:rPrDefault');
            if (rPrDefault) {
                const rPr = XmlParser.getElement(rPrDefault, 'w:rPr');
                if (rPr) this.defaultRunProperties = this.parseRunProperties(rPr);
            }
        }
    }

    private parseRunProperties(rPr: Element): any {
        const props: any = {};
        if (XmlParser.getElement(rPr, 'w:b')) props.bold = true;
        if (XmlParser.getElement(rPr, 'w:i')) props.italic = true;
        const color = XmlParser.getElement(rPr, 'w:color');
        if (color) props.color = color.getAttribute('w:val');
        const sz = XmlParser.getElement(rPr, 'w:sz');
        if (sz) props.size = parseInt(sz.getAttribute('w:val') || '0', 10);
        const rFonts = XmlParser.getElement(rPr, 'w:rFonts');
        if (rFonts) {
            props.font = rFonts.getAttribute('w:ascii') || rFonts.getAttribute('w:hAnsi') || rFonts.getAttribute('w:eastAsia');
        }
        return props;
    }

    private parseParagraphProperties(pPr: Element): any {
        const props: any = {};
        const jc = XmlParser.getElement(pPr, 'w:jc');
        if (jc) props.alignment = jc.getAttribute('w:val');

        const ind = XmlParser.getElement(pPr, 'w:ind');
        if (ind) {
            props.indent = {
                left: parseInt(ind.getAttribute('w:left') || '0', 10),
                right: parseInt(ind.getAttribute('w:right') || '0', 10),
                firstLine: parseInt(ind.getAttribute('w:firstLine') || '0', 10),
                hanging: parseInt(ind.getAttribute('w:hanging') || '0', 10)
            };
        }

        const spacing = XmlParser.getElement(pPr, 'w:spacing');
        if (spacing) {
            props.spacing = {
                before: parseInt(spacing.getAttribute('w:before') || '0', 10),
                after: parseInt(spacing.getAttribute('w:after') || '0', 10),
                beforeLines: parseInt(spacing.getAttribute('w:beforeLines') || '0', 10),
                afterLines: parseInt(spacing.getAttribute('w:afterLines') || '0', 10),
                line: parseInt(spacing.getAttribute('w:line') || '0', 10),
                lineRule: spacing.getAttribute('w:lineRule') || 'auto'
            };
        }

        const rPr = XmlParser.getElement(pPr, 'w:rPr');
        if (rPr) {
            props.rPr = this.parseRunProperties(rPr);
        }

        const shd = XmlParser.getElement(pPr, 'w:shd');
        if (shd) {
            const fill = shd.getAttribute('w:fill');
            if (fill && fill !== 'auto') props.shading = fill;
        }

        return props;
    }

    getStyle(styleId: string): StyleDefinition | undefined {
        return this.styles.get(styleId);
    }

    // Resolve Paragraph Styles
    resolveParagraphStyle(localProps: any, styleId?: string): any {
        // Start with a shallow copy of localProps to preserve numbering, styleId, etc.
        let effective: any = { ...localProps, rPr: {} };

        // 1. Defaults (DocDefaults)
        Object.assign(effective.rPr, this.defaultRunProperties);

        // 2. Style Chain
        if (styleId) {
            const chain = this.getStyleChain(styleId);
            chain.reverse().forEach(style => {
                if (style.pPr) {
                    if (style.pPr.indent) effective.indent = { ...(effective.indent || {}), ...style.pPr.indent };
                    if (style.pPr.spacing) effective.spacing = { ...(effective.spacing || {}), ...style.pPr.spacing };
                    if (style.pPr.alignment) effective.alignment = style.pPr.alignment;
                    if (style.pPr.shading) effective.shading = style.pPr.shading;
                    // Merge rPr (text properties defined on paragraph style)
                    if (style.pPr.rPr) Object.assign(effective.rPr, style.pPr.rPr);
                }
            });
        }

        // 3. Local direct formatting
        if (localProps.indent) effective.indent = { ...(effective.indent || {}), ...localProps.indent };
        if (localProps.spacing) effective.spacing = { ...(effective.spacing || {}), ...localProps.spacing };
        // alignment/shading already in effective due to spread, but re-assign to be safe in override order
        if (localProps.alignment) effective.alignment = localProps.alignment;
        if (localProps.shading) effective.shading = localProps.shading;
        if (localProps.rPr) Object.assign(effective.rPr, localProps.rPr);

        return effective;
    }

    // Resolve effective properties for a paragraph/run
    resolveRunStyle(localProps: any, styleId?: string, paragraphStyleId?: string): any {
        let effective = { ...this.defaultRunProperties };
        if (paragraphStyleId) {
            this.getStyleChain(paragraphStyleId).reverse().forEach(s => {
                // Style definition level rPr
                if (s.rPr) Object.assign(effective, s.rPr);
                // Paragraph definition level rPr (pPr > rPr)
                if (s.pPr && s.pPr.rPr) Object.assign(effective, s.pPr.rPr);
            });
        }
        if (styleId) {
            this.getStyleChain(styleId).reverse().forEach(s => {
                if (s.rPr) Object.assign(effective, s.rPr);
            });
        }
        Object.assign(effective, localProps);
        return effective;
    }

    private getStyleChain(styleId: string): StyleDefinition[] {
        const chain: StyleDefinition[] = [];
        let currentId: string | undefined = styleId;
        const visited = new Set<string>();
        while (currentId && !visited.has(currentId)) {
            visited.add(currentId);
            const style = this.styles.get(currentId);
            if (!style) break;
            chain.push(style);
            currentId = style.basedOn;
        }
        return chain;
    }
}
