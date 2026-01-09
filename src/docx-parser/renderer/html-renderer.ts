import { DocxDocument, ElementType, Paragraph, Run, Table, DocxElement } from '../core/types';
import { LengthConverter } from '../styler/converter';
import { formatListNumber } from '../styler/numbering-manager';
import { getShapePath, getStrokeDashArray } from '../utils/shape-utils';

export class HtmlRenderer {
    // Numbering State: numId -> current counts per level
    private numberingState: Map<string, number[]> = new Map();
    private currentDocx?: DocxDocument;

    render(docx: DocxDocument): HTMLElement {
        this.currentDocx = docx;
        const container = document.createElement('div');
        container.className = 'docx-viewer';

        // Dynamic defaults from document
        const styleManager = (docx as any).context?.styleManager;
        const defaults = styleManager?.defaultRunProperties || {};

        container.style.fontFamily = defaults.font ? `${defaults.font}, "Microsoft YaHei", sans-serif` : '"Calibri", "Microsoft YaHei", sans-serif';
        container.style.fontSize = defaults.size ? `${defaults.size / 2}pt` : '11pt';
        container.style.lineHeight = '1.15'; // Base line height
        container.style.color = (defaults.color && defaults.color !== 'auto') ? `#${defaults.color}` : 'black';
        container.style.boxSizing = 'border-box';
        // Reset state
        this.numberingState.clear();

        // Temporary mount for layout measurement
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.top = '-10000px';
        tempContainer.style.left = '-10000px';
        tempContainer.style.width = '1000px'; // Broad enough for A4 width
        tempContainer.style.visibility = 'hidden';
        document.body.appendChild(tempContainer);
        tempContainer.appendChild(container);

        try {
            docx.sections.forEach(section => {
                const nodes = this.flattenContent(section.children);

                let pageIndex = 1;

                let currentPage = this.createPage(section);
                let contentArea = this.createContentArea(section);
                currentPage.appendChild(contentArea);
                this.renderHeaderFooter(section, currentPage, 'header', pageIndex);
                this.renderHeaderFooter(section, currentPage, 'footer', pageIndex);
                container.appendChild(currentPage);

                // Calculate page height limit
                const pageHeightPx = section.props.pageSize ? LengthConverter.dxaToPx(section.props.pageSize.height) : 1123;
                // Buffer of 20px to avoid hitting the absolute bottom
                const pageLimit = pageHeightPx - 20;

                nodes.forEach(node => {
                    if (node.type === ElementType.Break && node.style?.breakType === 'page') {
                        // Force new page
                        pageIndex++;
                        currentPage = this.createPage(section);
                        contentArea = this.createContentArea(section);
                        currentPage.appendChild(contentArea);
                        this.renderHeaderFooter(section, currentPage, 'header', pageIndex);
                        this.renderHeaderFooter(section, currentPage, 'footer', pageIndex);
                        container.appendChild(currentPage);
                        return;
                    }

                    const el = this.renderElement(node, { pageIndex });
                    if (el) {
                        const hasContent = contentArea.childNodes.length > 0;
                        contentArea.appendChild(el);

                        // Check for overflow against the physical page limit
                        if (hasContent && contentArea.scrollHeight > pageLimit) {
                            // Move to new page
                            contentArea.removeChild(el);
                            pageIndex++;

                            currentPage = this.createPage(section);
                            contentArea = this.createContentArea(section);
                            currentPage.appendChild(contentArea);
                            this.renderHeaderFooter(section, currentPage, 'header', pageIndex);
                            this.renderHeaderFooter(section, currentPage, 'footer', pageIndex);
                            container.appendChild(currentPage);

                            contentArea.appendChild(el);
                        }
                    }
                });

                // Finalize total pages (Post-process if needed)
                const totalPages = pageIndex;
                container.querySelectorAll('.docx-total-pages').forEach(el => {
                    el.textContent = String(totalPages);
                });
            });
        } finally {
            // Cleanup: remove from temp mount but keep the container elements
            document.body.removeChild(tempContainer);
        }

        return container;
    }

    private createPage(section: any): HTMLElement {
        const page = document.createElement('div');
        page.className = 'docx-page';

        // Strict Page Size
        let width = '794px'; // A4 default
        let height = '1123px';

        if (section.props.pageSize) {
            const w = LengthConverter.dxaToPx(section.props.pageSize.width);
            const h = LengthConverter.dxaToPx(section.props.pageSize.height);
            width = `${w}px`;
            height = `${h}px`;
        }

        page.style.width = width;
        page.style.height = height; // Strict height as requested
        page.style.border = '1px solid #e0e0e0';
        page.style.margin = '20px auto';
        page.style.backgroundColor = 'white';
        page.style.boxSizing = 'border-box';
        page.style.position = 'relative';
        page.style.overflow = 'hidden'; // Clip content relative to page size

        return page;
    }

    private createContentArea(section: any): HTMLElement {
        const div = document.createElement('div');
        div.className = 'docx-content';
        div.style.position = 'absolute';
        div.style.top = '0';
        div.style.left = '0';
        div.style.width = '100%';
        // Remove fixed height to allow scrollHeight to reflect content correctly
        div.style.boxSizing = 'border-box';
        // Z-Index to ensure it doesn't overlap header/footer if not desired? 
        // Docs usually have header/footer in margins.

        // Apply margins as padding to the content area container
        if (section.props.pageMargin) {
            const m = section.props.pageMargin;
            div.style.paddingTop = `${LengthConverter.dxaToPx(m.top)}px`;
            div.style.paddingRight = `${LengthConverter.dxaToPx(m.right)}px`;
            div.style.paddingBottom = `${LengthConverter.dxaToPx(m.bottom)}px`;
            div.style.paddingLeft = `${LengthConverter.dxaToPx(m.left)}px`;
        } else {
            div.style.padding = '96px';
        }

        return div;
    }

    private renderHeaderFooter(section: any, page: HTMLElement, type: 'header' | 'footer', pageIndex: number) {
        const refs = type === 'header' ? section.headers : section.footers;
        const ref = refs.find((h: any) => h.kind === 'default') || refs[0];

        if (ref && (ref as any).content) {
            const el = document.createElement('div');
            el.className = `docx-${type}`;
            el.style.position = 'absolute';
            el.style.left = section.props.pageMargin ? `${LengthConverter.dxaToPx(section.props.pageMargin.left)}px` : '96px';
            el.style.right = section.props.pageMargin ? `${LengthConverter.dxaToPx(section.props.pageMargin.right)}px` : '96px';

            // Positioning
            if (type === 'header') {
                const top = section.props.pageMargin ? `${LengthConverter.dxaToPx(section.props.pageMargin.header)}px` : '30px';
                el.style.top = top;
            } else {
                const bottom = section.props.pageMargin ? `${LengthConverter.dxaToPx(section.props.pageMargin.footer)}px` : '30px';
                el.style.bottom = bottom;
            }

            // Render content
            el.style.zIndex = '50';

            // Background to avoid see-through if desired
            el.style.backgroundColor = 'white';

            (ref as any).content.forEach((c: any) => {
                const childEl = this.renderElement(c, { pageIndex });
                if (childEl) el.appendChild(childEl);
            });
            page.appendChild(el);
        }
    }

    private flattenContent(nodes: DocxElement[]): DocxElement[] {
        const result: DocxElement[] = [];
        nodes.forEach(node => {
            // Naive pass-through. 
            // Ideally we split paragraphs that contain breaks, but simple hoisting is complex here without deep cloning.
            // We rely on the top-level Break check in render loop for now.
            result.push(node);
        });
        return result;
    }

    private renderElement(node: any, context?: any): HTMLElement | Text | null {
        switch (node.type) {
            case ElementType.Paragraph:
                return this.renderParagraph(node, context);
            case ElementType.Table:
                return this.renderTable(node, context);
            case ElementType.Run:
                return this.renderRun(node, context);
            case ElementType.Text:
                return document.createTextNode(node.text);
            case ElementType.Image:
                return this.renderImage(node, context); // Handles Images AND Shapes
            case ElementType.Tab:
                return document.createTextNode('\u00A0\u00A0\u00A0\u00A0');
            case ElementType.Break:
                return document.createElement('br');
            case ElementType.Field:
                return this.renderField(node, context);
            default:
                if (node.text) return document.createTextNode(node.text);
                return null;
        }
    }

    private renderParagraph(paragraph: Paragraph, context?: any): HTMLElement {
        const p = document.createElement('p');

        // Reset margin, keep lineHeight relative to inherit from container/DocDefaults
        p.style.margin = '0';

        if (paragraph.props.alignment) {
            const alignMap: any = { both: 'justify' };
            p.style.textAlign = alignMap[paragraph.props.alignment] || paragraph.props.alignment;
        }

        // List Handling (Hierarchy and visual)
        if (paragraph.props.numbering && paragraph.props.numbering.level) {
            const { numId, ilvl, level } = paragraph.props.numbering;
            const nm = (this.currentDocx as any)?.context?.numberingManager;

            // 1. Counter update
            if (!this.numberingState.has(numId)) this.numberingState.set(numId, []);
            const counters = this.numberingState.get(numId)!;

            // Ensure counters for all levels up to ilvl are initialized
            for (let i = 0; i <= ilvl; i++) {
                if (counters[i] === undefined) {
                    const lDef = nm?.getNumbering(numId, i);
                    counters[i] = lDef?.start || 1;
                }
            }

            const currentVal = counters[ilvl];
            counters[ilvl]++;
            // Reset lower levels
            for (let k = ilvl + 1; k < counters.length; k++) (counters as any)[k] = undefined;

            // 2. Marker construction with full hierarchy support (e.g., 1.1.1)
            const abstractNum = nm?.getNumberingDefinition(numId);
            const txt = level.text || `%${ilvl + 1}.`;

            const formattedText = txt.replace(/%(\d+)/g, (_match: string, levelIdx: string) => {
                const idx = parseInt(levelIdx, 10) - 1;
                const val = (counters[idx] !== undefined) ? (idx === ilvl ? currentVal : counters[idx]) : 1;
                const lDef = abstractNum?.levels.get(idx);
                return formatListNumber(val, lDef?.format || 'decimal');
            });

            const marker = document.createElement('span');
            marker.className = 'docx-list-marker';
            marker.textContent = formattedText;

            // Apply effective paragraph run properties (styles) to the marker
            const rPr = (paragraph.props as any).rPr;
            if (rPr) {
                if (rPr.bold) marker.style.fontWeight = 'bold';
                if (rPr.italic) marker.style.fontStyle = 'italic';
                if (rPr.color && rPr.color !== 'auto') marker.style.color = `#${rPr.color}`;
                if (rPr.size) marker.style.fontSize = `${rPr.size / 2}pt`;
                if (rPr.shading && rPr.shading !== 'auto') marker.style.backgroundColor = `#${rPr.shading}`;
                if (rPr.font) marker.style.fontFamily = rPr.font;
            }

            if (level.font) marker.style.fontFamily = level.font;
            // Force symbol font if bullet type might need it
            if (level.format === 'bullet' && !level.font) {
                marker.style.fontFamily = 'Symbol, Wingdings, "Segoe UI Symbol"';
            }

            // 3. Precise Indentation Layout
            const fallbackIndent = (ilvl === 0) ? 360 : (ilvl + 1) * 720;
            let leftIndent = LengthConverter.dxaToPx(level.indent || fallbackIndent);
            let hanging = LengthConverter.dxaToPx(level.hanging || 360);

            if (paragraph.props.indent?.left) leftIndent = LengthConverter.dxaToPx(paragraph.props.indent.left);
            if (paragraph.props.indent?.hanging) hanging = LengthConverter.dxaToPx(paragraph.props.indent.hanging);

            p.style.paddingLeft = `${leftIndent}px`;
            p.style.position = 'relative';
            p.style.textIndent = `-${hanging}px`;

            const markerSpan = document.createElement('span');
            markerSpan.style.display = 'inline-block';
            markerSpan.style.width = `${hanging}px`;
            markerSpan.style.textIndent = '0';
            markerSpan.appendChild(marker);
            p.appendChild(markerSpan);

            paragraph.children.forEach(child => {
                const el = this.renderElement(child, context);
                if (el) p.appendChild(el);
            });

            if (paragraph.props.spacing) {
                if (paragraph.props.spacing.before) p.style.marginTop = `${LengthConverter.dxaToPx(paragraph.props.spacing.before)}px`;
                if (paragraph.props.spacing.after) p.style.marginBottom = `${LengthConverter.dxaToPx(paragraph.props.spacing.after)}px`;
            }

            return p;
        }

        // Standard Paragraph properties (Non-list)
        if (paragraph.props.indent) {
            const left = paragraph.props.indent.left ? LengthConverter.dxaToPx(paragraph.props.indent.left) : 0;
            const right = paragraph.props.indent.right ? LengthConverter.dxaToPx(paragraph.props.indent.right) : 0;
            const firstLine = paragraph.props.indent.firstLine ? LengthConverter.dxaToPx(paragraph.props.indent.firstLine) : 0;
            const hanging = paragraph.props.indent.hanging ? LengthConverter.dxaToPx(paragraph.props.indent.hanging) : 0;

            p.style.marginLeft = `${left}px`;
            p.style.marginRight = `${right}px`;
            if (firstLine) p.style.textIndent = `${firstLine}px`;
            if (hanging) p.style.textIndent = `-${hanging}px`;
        }

        if (paragraph.props.spacing) {
            let marginTop = 0;
            let marginBottom = 0;
            if (paragraph.props.spacing.before) marginTop += LengthConverter.dxaToPx(paragraph.props.spacing.before);
            if (paragraph.props.spacing.after) marginBottom += LengthConverter.dxaToPx(paragraph.props.spacing.after);

            // Handle Lines units (100 lines = 1 line height)
            if (paragraph.props.spacing.beforeLines) marginTop += (paragraph.props.spacing.beforeLines / 100) * 18;
            if (paragraph.props.spacing.afterLines) marginBottom += (paragraph.props.spacing.afterLines / 100) * 18;

            if (marginTop > 0) p.style.marginTop = `${marginTop}px`;
            if (marginBottom > 0) p.style.marginBottom = `${marginBottom}px`;

            if (paragraph.props.spacing.line) {
                const rule = paragraph.props.spacing.lineRule;
                const val = paragraph.props.spacing.line;
                if (rule === 'auto') {
                    // Adjusted scale: (val/240) * 1.15 to match common browser 'normal' metrics
                    p.style.lineHeight = `${(val / 240 * 1.15).toFixed(2)}`;
                } else {
                    p.style.lineHeight = `${LengthConverter.dxaToPx(val)}px`;
                }
            }
        }

        if ((paragraph.props as any).shading) {
            p.style.backgroundColor = `#${(paragraph.props as any).shading}`;
        }

        if ((paragraph.props as any).borders) {
            const borders = (paragraph.props as any).borders;
            ['top', 'left', 'bottom', 'right'].forEach(side => {
                if (borders[side]) {
                    const b = borders[side];
                    if (b.val && b.val !== 'nil' && b.val !== 'none') {
                        const sz = Math.max(1, b.sz / 8);
                        p.style[`border${side.charAt(0).toUpperCase() + side.slice(1)}` as any] = `${sz}px solid #${b.color || '000000'}`;
                        if (b.space) p.style[`padding${side.charAt(0).toUpperCase() + side.slice(1)}` as any] = `${b.space}px`;
                    }
                }
            });
        }

        // Handle Empty Paragraph (ensure height)
        if (paragraph.children.length === 0) {
            p.appendChild(document.createTextNode('\u200B'));
        }

        paragraph.children.forEach(child => {
            const el = this.renderElement(child, context);
            if (el) p.appendChild(el);
        });
        return p;
    }

    private renderTable(table: Table, context?: any): HTMLElement {
        const tbl = document.createElement('table');
        tbl.style.borderCollapse = 'collapse';
        if (table.props?.width) {
            const w = LengthConverter.dxaToPx(table.props.width);
            tbl.style.width = `${w}px`;
        } else {
            tbl.style.width = '100%';
        }

        if (table.props?.borders) {
            const b = table.props.borders;
            ['top', 'left', 'bottom', 'right'].forEach(side => {
                const bd = b[side as keyof typeof b];
                if (bd && bd.val !== 'nil') {
                    const sz = Math.max(1, bd.sz / 8);
                    tbl.style[`border${side.charAt(0).toUpperCase() + side.slice(1)}` as any] = `${sz}px solid #${bd.color || '000000'}`;
                }
            });
        }

        table.children.forEach(row => {
            const tr = document.createElement('tr');
            row.children.forEach(cell => {
                if (cell.props?.merged) return;

                const td = document.createElement('td');
                td.style.verticalAlign = 'top';

                if (cell.props?.margins) {
                    const m = cell.props.margins;
                    if (m.top !== undefined) td.style.paddingTop = `${LengthConverter.dxaToPx(m.top)}px`;
                    if (m.right !== undefined) td.style.paddingRight = `${LengthConverter.dxaToPx(m.right)}px`;
                    if (m.bottom !== undefined) td.style.paddingBottom = `${LengthConverter.dxaToPx(m.bottom)}px`;
                    if (m.left !== undefined) td.style.paddingLeft = `${LengthConverter.dxaToPx(m.left)}px`;
                } else {
                    td.style.padding = '2px';
                }

                if (cell.props?.borders) {
                    const sides = ['top', 'left', 'bottom', 'right'];
                    sides.forEach(side => {
                        const b = cell.props!.borders[side];
                        if (b && b.val !== 'nil' && b.val !== 'none') {
                            const sz = Math.max(1, b.sz / 8);
                            td.style[`border${side.charAt(0).toUpperCase() + side.slice(1)}` as any] = `${sz}px solid #${b.color || '000000'}`;
                        }
                    });
                } else {
                    td.style.border = '1px solid black';
                }

                if (cell.props?.shading && cell.props.shading !== 'auto') {
                    td.style.backgroundColor = `#${cell.props.shading}`;
                }

                if (cell.props?.colSpan) td.colSpan = cell.props.colSpan;
                if (cell.props?.rowSpan) td.rowSpan = cell.props.rowSpan;
                if (cell.props?.width) td.style.width = `${LengthConverter.dxaToPx(cell.props.width)}px`;

                cell.children.forEach(child => {
                    const el = this.renderElement(child, context);
                    if (el) td.appendChild(el);
                });

                if (cell.props?.borders) {
                    const hasTL2BR = cell.props.borders['tl2br'];
                    const hasTR2BL = cell.props.borders['tr2bl'];

                    if (hasTL2BR || hasTR2BL) {
                        td.style.position = 'relative';
                        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                        svg.style.position = 'absolute';
                        svg.style.top = '0'; svg.style.left = '0';
                        svg.style.width = '100%'; svg.style.height = '100%';
                        svg.style.pointerEvents = 'none';

                        if (hasTL2BR && hasTL2BR.val !== 'nil' && hasTL2BR.val !== 'none') {
                            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                            line.setAttribute('x1', '0'); line.setAttribute('y1', '0'); line.setAttribute('x2', '100%'); line.setAttribute('y2', '100%');
                            line.setAttribute('stroke', `#${hasTL2BR.color || '000000'}`);
                            line.setAttribute('stroke-width', String(Math.max(1, hasTL2BR.sz / 8)));
                            svg.appendChild(line);
                        }
                        if (hasTR2BL && hasTR2BL.val !== 'nil' && hasTR2BL.val !== 'none') {
                            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                            line.setAttribute('x1', '100%'); line.setAttribute('y1', '0'); line.setAttribute('x2', '0'); line.setAttribute('y2', '100%');
                            line.setAttribute('stroke', `#${hasTR2BL.color || '000000'}`);
                            line.setAttribute('stroke-width', String(Math.max(1, hasTR2BL.sz / 8)));
                            svg.appendChild(line);
                        }
                        td.appendChild(svg);
                    }
                }

                tr.appendChild(td);
            });
            tbl.appendChild(tr);
        });
        return tbl;
    }

    private renderRun(run: Run, context?: any): HTMLElement {
        const span = document.createElement('span');
        span.style.whiteSpace = 'pre-wrap';

        const props = run.props;
        if (props.bold) span.style.fontWeight = 'bold';
        if (props.italic) span.style.fontStyle = 'italic';
        if (props.color && props.color !== 'auto') span.style.color = `#${props.color}`;
        if (props.size) span.style.fontSize = `${props.size / 2}pt`;
        if (props.font) span.style.fontFamily = props.font;

        if (props.underline && props.underline !== 'none') span.style.textDecoration = 'underline';
        if (props.strike) span.style.textDecoration = (span.style.textDecoration ? span.style.textDecoration + ' ' : '') + 'line-through';

        if (props.highlight && props.highlight !== 'none') {
            const colorMap: any = { yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', magenta: '#ff00ff', blue: '#0000ff', red: '#ff0000', darkBlue: '#00008b', darkCyan: '#008b8b', darkGreen: '#006400', darkMagenta: '#8b008b', darkRed: '#8b0000', darkYellow: '#808000', darkGray: '#a9a9a9', lightGray: '#d3d3d3', black: '#000000' };
            if (colorMap[props.highlight]) span.style.backgroundColor = colorMap[props.highlight];
        } else if (props.shading && props.shading !== 'auto') {
            span.style.backgroundColor = `#${props.shading}`;
        }

        if (props.verticalAlign) {
            if (props.verticalAlign === 'superscript') span.style.verticalAlign = 'super';
            if (props.verticalAlign === 'subscript') span.style.verticalAlign = 'sub';
        }

        run.children.forEach(child => {
            const el = this.renderElement(child, context);
            if (el) span.appendChild(el);
        });
        return span;
    }

    private renderField(field: any, context?: any): HTMLElement {
        const span = document.createElement('span');
        span.className = 'docx-field';
        const instruction = field.instruction?.trim().toUpperCase();

        if (instruction.includes('PAGE') && !instruction.includes('NUMPAGES')) {
            span.textContent = context?.pageIndex ? String(context.pageIndex) : '1';
        } else if (instruction.includes('NUMPAGES')) {
            span.className += ' docx-total-pages';
            span.textContent = '1';
        } else {
            span.textContent = field.result || '';
        }
        return span;
    }

    private renderImage(image: any, context?: any): HTMLElement {
        const isShape = !!image.style?.isShape;
        const positioning = image.style?.positioning;
        const container = document.createElement('div');

        if (positioning?.type === 'anchor') {
            container.style.position = 'absolute';
            if (positioning.h) container.style.left = `${positioning.h.offset}px`;
            if (positioning.v) container.style.top = `${positioning.v.offset}px`;
            container.style.zIndex = '100';
        } else {
            container.style.display = 'inline-block';
            container.style.position = 'relative';
            container.style.verticalAlign = 'middle';
        }

        if (isShape) {
            const w = image.style.width || 100;
            const h = image.style.height || 100;
            container.style.width = `${w}px`;
            container.style.height = `${h}px`;

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 100 100');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.setAttribute('preserveAspectRatio', 'none');
            svg.style.position = 'absolute'; svg.style.top = '0'; svg.style.left = '0';
            svg.style.overflow = 'visible';

            const shapeType = image.style.shapeType || 'rect';
            const shapeInfo = getShapePath(shapeType);
            let shapeEl: SVGElement;

            if (shapeInfo.type === 'ellipse') {
                shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                shapeEl.setAttribute('cx', '50'); shapeEl.setAttribute('cy', '50'); shapeEl.setAttribute('rx', '48'); shapeEl.setAttribute('ry', '48');
            } else if (shapeInfo.type === 'circle') {
                shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                shapeEl.setAttribute('cx', '50'); shapeEl.setAttribute('cy', '50'); shapeEl.setAttribute('r', '48');
            } else {
                shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                shapeEl.setAttribute('d', shapeInfo.data || 'M 0 0 L 100 0 L 100 100 L 0 100 Z');
            }

            shapeEl.setAttribute('fill', image.style.fillColor || '#cccccc');
            shapeEl.setAttribute('stroke', image.style.strokeColor || '#333333');
            shapeEl.setAttribute('stroke-width', String(image.style.strokeWidth || 1));

            const dashArray = getStrokeDashArray(image.style.strokeDash || 'solid');
            if (dashArray && dashArray !== 'none') shapeEl.setAttribute('stroke-dasharray', dashArray);

            const transforms: string[] = [];
            if (image.style.flipH) transforms.push('translate(100, 0) scale(-1, 1)');
            if (image.style.flipV) transforms.push('translate(0, 100) scale(1, -1)');
            if (image.style.rotation) transforms.push(`rotate(${image.style.rotation}, 50, 50)`);
            if (transforms.length > 0) shapeEl.setAttribute('transform', transforms.join(' '));

            svg.appendChild(shapeEl);
            container.appendChild(svg);

            if (image.children && image.children.length > 0) {
                const textDiv = document.createElement('div');
                textDiv.style.position = 'absolute'; textDiv.style.top = '0'; textDiv.style.left = '0';
                textDiv.style.width = '100%'; textDiv.style.height = '100%';
                textDiv.style.display = 'flex'; textDiv.style.flexDirection = 'column'; textDiv.style.justifyContent = 'center';
                textDiv.style.padding = '5px'; textDiv.style.boxSizing = 'border-box'; textDiv.style.zIndex = '1';

                image.children.forEach((c: any) => {
                    const el = this.renderElement(c, context);
                    if (el) textDiv.appendChild(el);
                });
                container.appendChild(textDiv);
            }
        } else {
            const img = document.createElement('img');
            img.alt = 'Image';
            if (image.style?.src) img.src = image.style.src;
            img.style.width = image.style?.width ? `${image.style.width}px` : 'auto';
            img.style.height = image.style?.height ? `${image.style.height}px` : 'auto';
            img.style.maxWidth = '100%';
            container.appendChild(img);
        }
        return container;
    }
}
