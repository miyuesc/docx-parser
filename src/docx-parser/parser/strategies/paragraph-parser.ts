import { ParagraphModel } from '../../models/paragraph';
import { RunModel } from '../../models/run';
import { XmlParser } from '../../utils/xml';
import { ParsingContext } from '../../core/context';
import { ElementType } from '../../core/types';

export class ParagraphParser {
    static parse(node: Element, context: ParsingContext): ParagraphModel {
        const paragraph = new ParagraphModel();

        const pPr = XmlParser.getElement(node, 'w:pPr');
        if (pPr) {
            // New: parse local rPr for paragraph (applied to markers/bullets)
            const pRPr = XmlParser.getElement(pPr, 'w:rPr');
            if (pRPr) {
                (paragraph.props as any).rPr = (context.styleManager as any).parseRunProperties(pRPr);
            }

            const jc = XmlParser.getElement(pPr, 'w:jc');
            if (jc) {
                const val = jc.getAttribute('w:val');
                if (val) paragraph.props.alignment = val as any;
            }
            const pStyle = XmlParser.getElement(pPr, 'w:pStyle');
            if (pStyle) {
                paragraph.props.styleId = pStyle.getAttribute('w:val') || undefined;
            }

            const numPr = XmlParser.getElement(pPr, 'w:numPr');
            if (numPr) {
                const numId = XmlParser.getElement(numPr, 'w:numId')?.getAttribute('w:val');
                const ilvl = parseInt(XmlParser.getElement(numPr, 'w:ilvl')?.getAttribute('w:val') || '0', 10);
                if (numId) {
                    const level = context.numberingManager.getNumbering(numId, ilvl);
                    if (level) {
                        paragraph.props.numbering = { numId, ilvl, level };
                    }
                }
            }

            // Indentation
            const ind = XmlParser.getElement(pPr, 'w:ind');
            if (ind) {
                paragraph.props.indent = {
                    left: parseInt(ind.getAttribute('w:left') || '0', 10),
                    right: parseInt(ind.getAttribute('w:right') || '0', 10),
                    firstLine: parseInt(ind.getAttribute('w:firstLine') || '0', 10),
                    hanging: parseInt(ind.getAttribute('w:hanging') || '0', 10)
                };
            }

            // Spacing
            const spacing = XmlParser.getElement(pPr, 'w:spacing');
            if (spacing) {
                // Determine line rule
                const line = parseInt(spacing.getAttribute('w:line') || '0', 10);
                const lineRule = spacing.getAttribute('w:lineRule') as any || 'auto';
                paragraph.props.spacing = {
                    before: parseInt(spacing.getAttribute('w:before') || '0', 10),
                    after: parseInt(spacing.getAttribute('w:after') || '0', 10),
                    beforeLines: parseInt(spacing.getAttribute('w:beforeLines') || '0', 10),
                    afterLines: parseInt(spacing.getAttribute('w:afterLines') || '0', 10),
                    line,
                    lineRule
                };
            }

            // Shading / Background
            const shd = XmlParser.getElement(pPr, 'w:shd');
            if (shd) {
                const fill = shd.getAttribute('w:fill');
                if (fill && fill !== 'auto') {
                    paragraph.props.shading = fill;
                }
            }

            // Borders
            const pBdr = XmlParser.getElement(pPr, 'w:pBdr');
            if (pBdr) {
                paragraph.props.borders = {};
                ['top', 'left', 'bottom', 'right', 'between'].forEach(side => {
                    const b = XmlParser.getElement(pBdr, `w:${side}`);
                    if (b) {
                        const s = side as keyof NonNullable<typeof paragraph.props.borders>;
                        paragraph.props.borders![s] = {
                            val: b.getAttribute('w:val'),
                            sz: parseInt(b.getAttribute('w:sz') || '0', 10),
                            color: b.getAttribute('w:color'),
                            space: parseInt(b.getAttribute('w:space') || '0', 10)
                        };
                    }
                });
            }

            // Resolve effective properties from style chain
            paragraph.props = context.styleManager.resolveParagraphStyle(paragraph.props, paragraph.props.styleId);
        }

        for (let i = 0; i < node.childNodes.length; i++) {
            const child = node.childNodes[i] as Element;
            if (child.nodeType !== 1) continue;

            if (child.tagName === 'w:r') {
                const run = RunParser.parse(child, context, paragraph.props.styleId);
                paragraph.addChild(run);
            }
        }

        return paragraph;
    }
}

class RunParser {
    static parse(node: Element, context: ParsingContext, paragraphStyleId?: string): RunModel {
        const run = new RunModel();

        // Parse direct properties first
        const directProps: any = {};
        const rPr = XmlParser.getElement(node, 'w:rPr');

        if (rPr) {
            if (XmlParser.getElement(rPr, 'w:b')) directProps.bold = true;
            if (XmlParser.getElement(rPr, 'w:i')) directProps.italic = true;
            // Underline
            const u = XmlParser.getElement(rPr, 'w:u');
            if (u) {
                directProps.underline = u.getAttribute('w:val') || 'single';
            }
            // Strike
            if (XmlParser.getElement(rPr, 'w:strike') || XmlParser.getElement(rPr, 'w:dstrike')) directProps.strike = true;

            const color = XmlParser.getElement(rPr, 'w:color');
            if (color) directProps.color = color.getAttribute('w:val');

            const highlight = XmlParser.getElement(rPr, 'w:highlight');
            if (highlight) directProps.highlight = highlight.getAttribute('w:val');

            const shd = XmlParser.getElement(rPr, 'w:shd');
            if (shd) {
                const fill = shd.getAttribute('w:fill');
                if (fill && fill !== 'auto') directProps.shading = fill;
            }

            const sz = XmlParser.getElement(rPr, 'w:sz');
            if (sz) directProps.size = parseInt(sz.getAttribute('w:val') || '0', 10);

            const rFonts = XmlParser.getElement(rPr, 'w:rFonts');
            if (rFonts) {
                directProps.font = rFonts.getAttribute('w:ascii') || rFonts.getAttribute('w:hAnsi') || rFonts.getAttribute('w:eastAsia');
            }

            const rStyle = XmlParser.getElement(rPr, 'w:rStyle');
            if (rStyle) {
                const styleId = rStyle.getAttribute('w:val');
                // Resolve effective style
                const resolved = context.styleManager.resolveRunStyle(directProps, styleId || undefined, paragraphStyleId);
                run.props = resolved;
            } else {
                // No specific style, but maybe default styles exist?
                // For now, let's just resolve with direct (+ implicit defaults)
                const resolved = context.styleManager.resolveRunStyle(directProps, undefined, paragraphStyleId);
                run.props = resolved;
            }
        } else {
            // No direct props, resolve just defaults
            const resolved = context.styleManager.resolveRunStyle({}, undefined, paragraphStyleId);
            run.props = resolved;
        }

        // Iterate over children to handle mixed content (Text, Breaks, Tabs, Images)
        for (let i = 0; i < node.childNodes.length; i++) {
            const child = node.childNodes[i] as Element;
            if (child.nodeType !== 1) continue;

            const tagName = child.tagName;

            if (tagName === 'w:t') {
                run.addText(child.textContent || '');
            } else if (tagName === 'w:instrText') {
                run.addChild({
                    type: ElementType.Field,
                    parent: run,
                    instruction: child.textContent || ''
                } as any);
            } else if (tagName === 'w:br') {
                const type = child.getAttribute('w:type');
                run.addChild({
                    type: ElementType.Break,
                    parent: run,
                    style: type ? { breakType: type } : undefined
                });
            } else if (tagName === 'w:tab') {
                run.addChild({
                    type: ElementType.Tab,
                    parent: run
                });
            } else if (tagName === 'w:drawing' || tagName === 'mc:AlternateContent') {
                let drawingNodes: Element[] = [];

                if (tagName === 'mc:AlternateContent') {
                    const choice = XmlParser.getElementNS(child, 'http://schemas.openxmlformats.org/markup-compatibility/2006', 'Choice');
                    if (choice) {
                        drawingNodes = XmlParser.getElementsNS(choice, 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'drawing');
                    }
                    if (drawingNodes.length === 0) {
                        const fallback = XmlParser.getElementNS(child, 'http://schemas.openxmlformats.org/markup-compatibility/2006', 'Fallback');
                        if (fallback) {
                            // Support legacy w:pict in Fallback
                            const picts = XmlParser.getElements(fallback, 'w:pict');
                            picts.forEach(pict => {
                                // Basic VML to Shape conversion
                                const rect = XmlParser.getElement(pict, 'v:rect') || XmlParser.getElement(pict, 'v:shape');
                                if (rect) {
                                    const styleStr = rect.getAttribute('style') || '';
                                    const widthMatch = styleStr.match(/width:([\d.]+)(pt|px|in)/);
                                    const heightMatch = styleStr.match(/height:([\d.]+)(pt|px|in)/);
                                    let width = 100, height = 100;
                                    if (widthMatch) width = parseFloat(widthMatch[1]) * (widthMatch[2] === 'pt' ? 1.33 : 1);
                                    if (heightMatch) height = parseFloat(heightMatch[1]) * (heightMatch[2] === 'pt' ? 1.33 : 1);

                                    run.addChild({
                                        type: ElementType.Image,
                                        parent: run,
                                        children: [],
                                        style: {
                                            isShape: true,
                                            width, height,
                                            shapeType: rect.tagName === 'v:rect' ? 'rect' : 'rect',
                                            fillColor: rect.getAttribute('fillcolor') || '#4F81BD',
                                            strokeColor: rect.getAttribute('strokecolor') || '#333333',
                                            positioning: { type: 'inline' }
                                        }
                                    });
                                }
                            });
                        }
                    }
                } else {
                    drawingNodes = [child];
                }

                drawingNodes.forEach(drawingEl => {
                    // Positioning Info (wp:anchor or wp:inline)
                    const anchor = XmlParser.getElementNS(drawingEl, 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing', 'anchor');
                    const inline = XmlParser.getElementNS(drawingEl, 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing', 'inline');

                    let positioning: any = { type: 'inline' };
                    let extentEl: Element | null = null;

                    if (anchor) {
                        positioning.type = 'anchor';
                        extentEl = XmlParser.getElementNS(anchor, 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing', 'extent');

                        const posH = XmlParser.getElementNS(anchor, 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing', 'positionH');
                        if (posH) {
                            positioning.h = {
                                relativeFrom: posH.getAttribute('relativeFrom'),
                                offset: parseInt(XmlParser.getElementNS(posH, 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing', 'posOffset')?.textContent || '0', 10) / 9525
                            };
                        }

                        const posV = XmlParser.getElementNS(anchor, 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing', 'positionV');
                        if (posV) {
                            positioning.v = {
                                relativeFrom: posV.getAttribute('relativeFrom'),
                                offset: parseInt(XmlParser.getElementNS(posV, 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing', 'posOffset')?.textContent || '0', 10) / 9525
                            };
                        }
                        const distT = anchor.getAttribute('distT');
                        if (distT) positioning.marginTop = parseInt(distT, 10) / 9525;
                    } else if (inline) {
                        extentEl = XmlParser.getElementNS(inline, 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing', 'extent');
                    }

                    const targetBlip = XmlParser.getElementNS(drawingEl, 'http://schemas.openxmlformats.org/drawingml/2006/main', 'blip');

                    if (targetBlip) {
                        const embedId = targetBlip.getAttribute('r:embed');
                        if (embedId) {
                            const imageUrl = context.getImageUrl(embedId);
                            let width = 0, height = 0;
                            if (extentEl) {
                                width = parseInt(extentEl.getAttribute('cx') || '0', 10) / 9525;
                                height = parseInt(extentEl.getAttribute('cy') || '0', 10) / 9525;
                            }

                            run.addChild({
                                type: ElementType.Image,
                                parent: run,
                                children: [],
                                style: { src: imageUrl, width, height, positioning }
                            });
                        }
                    } else {
                        // Shape Detection (wps:wsp)
                        const wspList = XmlParser.getElementsNS(drawingEl, 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape', 'wsp');
                        wspList.forEach(wsp => {
                            // Dimensions & Transform
                            const xfrm = XmlParser.getElementNS(wsp, 'http://schemas.openxmlformats.org/drawingml/2006/main', 'xfrm');
                            let width = 100, height = 100, rotation = 0, flipH = false, flipV = false;

                            if (xfrm) {
                                const ext = XmlParser.getElementNS(xfrm, 'http://schemas.openxmlformats.org/drawingml/2006/main', 'ext');
                                if (ext) {
                                    width = parseInt(ext.getAttribute('cx') || '0', 10) / 9525;
                                    height = parseInt(ext.getAttribute('cy') || '0', 10) / 9525;
                                }
                                const rot = xfrm.getAttribute('rot');
                                if (rot) rotation = parseInt(rot, 10) / 60000;
                                flipH = xfrm.getAttribute('flipH') === '1';
                                flipV = xfrm.getAttribute('flipV') === '1';
                            }

                            // Geometry
                            const prstGeom = XmlParser.getElementNS(wsp, 'http://schemas.openxmlformats.org/drawingml/2006/main', 'prstGeom');
                            const prst = prstGeom ? prstGeom.getAttribute('prst') : 'rect';

                            // Fill & Stroke
                            const spPr = XmlParser.getElementNS(wsp, 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape', 'spPr');
                            const spStyle = XmlParser.getElementNS(wsp, 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape', 'style');

                            let fillColor = '#4F81BD'; // Default Word blue
                            let strokeColor = '#333333';
                            let strokeWidth = 1;
                            let strokeDash = 'solid';

                            // Resolve Fill from spPr or Style
                            if (spPr) {
                                const solidFill = XmlParser.getElementNS(spPr, 'http://schemas.openxmlformats.org/drawingml/2006/main', 'solidFill');
                                if (solidFill) {
                                    const srgb = XmlParser.getElementNS(solidFill, 'http://schemas.openxmlformats.org/drawingml/2006/main', 'srgbClr');
                                    if (srgb) fillColor = `#${srgb.getAttribute('val')}`;
                                } else if (XmlParser.getElementNS(spPr, 'http://schemas.openxmlformats.org/drawingml/2006/main', 'noFill')) {
                                    fillColor = 'transparent';
                                }
                            }

                            // If still default and style exists, check fillRef
                            if (fillColor === '#4F81BD' && spStyle) {
                                const fillRef = XmlParser.getElementNS(spStyle, 'http://schemas.openxmlformats.org/drawingml/2006/main', 'fillRef');
                                if (fillRef) {
                                    const srgb = XmlParser.getElementNS(fillRef, 'http://schemas.openxmlformats.org/drawingml/2006/main', 'srgbClr');
                                    const scheme = XmlParser.getElementNS(fillRef, 'http://schemas.openxmlformats.org/drawingml/2006/main', 'schemeClr');
                                    if (srgb) fillColor = `#${srgb.getAttribute('val')}`;
                                    else if (scheme) {
                                        const val = scheme.getAttribute('val');
                                        const themeColors: Record<string, string> = {
                                            'accent1': '#4F81BD', 'accent2': '#C0504D', 'accent3': '#9BBB59',
                                            'accent4': '#8064A2', 'accent5': '#4BACC6', 'accent6': '#F79646',
                                            'tx1': '#000000', 'tx2': '#1F497D', 'bg1': '#FFFFFF', 'bg2': '#EEECE1'
                                        };
                                        if (val && themeColors[val]) fillColor = themeColors[val];
                                    }
                                }
                            }

                            // Resolve Stroke
                            if (spPr) {
                                const ln = XmlParser.getElementNS(spPr, 'http://schemas.openxmlformats.org/drawingml/2006/main', 'ln');
                                if (ln) {
                                    const w = ln.getAttribute('w');
                                    if (w) strokeWidth = parseInt(w, 10) / 12700; // EMUs to pt approx

                                    const lnSolidFill = XmlParser.getElementNS(ln, 'http://schemas.openxmlformats.org/drawingml/2006/main', 'solidFill');
                                    const lnScheme = XmlParser.getElementNS(ln, 'http://schemas.openxmlformats.org/drawingml/2006/main', 'schemeClr');

                                    if (lnSolidFill) {
                                        const lnSrgb = XmlParser.getElementNS(lnSolidFill, 'http://schemas.openxmlformats.org/drawingml/2006/main', 'srgbClr');
                                        if (lnSrgb) strokeColor = `#${lnSrgb.getAttribute('val')}`;
                                    } else if (lnScheme) {
                                        const val = lnScheme.getAttribute('val');
                                        if (val === 'accent1') strokeColor = '#4F81BD';
                                    }
                                    strokeDash = XmlParser.getElementNS(ln, 'http://schemas.openxmlformats.org/drawingml/2006/main', 'prstDash')?.getAttribute('val') || 'solid';
                                    if (XmlParser.getElementNS(ln, 'http://schemas.openxmlformats.org/drawingml/2006/main', 'noFill')) strokeColor = 'transparent';
                                }
                            }

                            // Text Content
                            const txbx = XmlParser.getElementNS(wsp, 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape', 'txbx');
                            const children: any[] = [];
                            if (txbx) {
                                const txbxContent = XmlParser.getElement(txbx, 'w:txbxContent');
                                if (txbxContent) {
                                    for (let k = 0; k < txbxContent.childNodes.length; k++) {
                                        const cn = txbxContent.childNodes[k] as Element;
                                        if (cn.nodeType === 1 && cn.tagName === 'w:p') {
                                            children.push(ParagraphParser.parse(cn, context));
                                        }
                                    }
                                }
                            }

                            run.addChild({
                                type: ElementType.Image,
                                parent: run,
                                children: children,
                                style: {
                                    isShape: true,
                                    width, height, shapeType: prst, fillColor, strokeColor, strokeWidth, strokeDash, rotation, flipH, flipV,
                                    positioning
                                }
                            });
                        });
                    }
                });
            } else if (tagName === 'w:space') {
                // Explicit space
                run.addText(' ');
            }
        }

        return run;
    }
}
