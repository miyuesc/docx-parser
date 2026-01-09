import { TableModel, TableRowModel, TableCellModel } from '../../models/table';
import { XmlParser } from '../../utils/xml';
import { ParsingContext } from '../../core/context';
import { ParagraphParser } from './paragraph-parser'; // Handle content in cell

export class TableParser {
    static parse(node: Element, context: ParsingContext): TableModel {
        const table = new TableModel();

        // tblPr
        const tblPr = XmlParser.getElement(node, 'w:tblPr');
        if (tblPr) {
            // Borders
            const tblBorders = XmlParser.getElement(tblPr, 'w:tblBorders');
            if (tblBorders) {
                if (!table.props) table.props = {};
                table.props.borders = {};
                ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].forEach(side => {
                    const b = XmlParser.getElement(tblBorders, `w:${side}`);
                    if (b) {
                        table.props!.borders![side as any] = {
                            val: b.getAttribute('w:val'),
                            sz: parseInt(b.getAttribute('w:sz') || '0', 10),
                            color: b.getAttribute('w:color'),
                            space: parseInt(b.getAttribute('w:space') || '0', 10)
                        };
                    }
                });
            }

            // Table Width
            const tblW = XmlParser.getElement(tblPr, 'w:tblW');
            if (tblW) {
                if (!table.props) table.props = {};
                table.props.width = parseInt(tblW.getAttribute('w:w') || '0', 10);
            }
        }

        // Rows
        const rows = XmlParser.getElements(node, 'w:tr'); // w:tr
        for (const rowNode of rows) {
            const row = new TableRowModel();

            // Cells
            const cells = XmlParser.getElements(rowNode, 'w:tc'); // w:tc
            for (const cellNode of cells) {
                const cell = new TableCellModel();

                // Cell Props
                const tcPr = XmlParser.getElement(cellNode, 'w:tcPr');
                if (tcPr) {
                    const gridSpan = XmlParser.getElement(tcPr, 'w:gridSpan');
                    if (gridSpan) {
                        cell.props.colSpan = parseInt(gridSpan.getAttribute('w:val') || '1', 10);
                    }
                    const tcW = XmlParser.getElement(tcPr, 'w:tcW');
                    if (tcW) {
                        cell.props.width = parseInt(tcW.getAttribute('w:w') || '0', 10);
                    }

                    const vMerge = XmlParser.getElement(tcPr, 'w:vMerge');
                    if (vMerge) {
                        const val = vMerge.getAttribute('w:val');
                        cell.props.vMerge = val || 'continue'; // <w:vMerge/> implies continue
                    }

                    const tcBorders = XmlParser.getElement(tcPr, 'w:tcBorders');
                    if (tcBorders) {
                        cell.props.borders = {};
                        ['top', 'left', 'bottom', 'right', 'tl2br', 'tr2bl'].forEach(side => {
                            const b = XmlParser.getElement(tcBorders, 'w:' + side);
                            if (b) {
                                (cell.props.borders as any)[side] = {
                                    val: b.getAttribute('w:val'),
                                    sz: parseInt(b.getAttribute('w:sz') || '0', 10),
                                    color: b.getAttribute('w:color')
                                };
                            }
                        });
                    }

                    const tcMar = XmlParser.getElement(tcPr, 'w:tcMar');
                    if (tcMar) {
                        cell.props.margins = {};
                        ['top', 'left', 'bottom', 'right'].forEach(side => {
                            const m = XmlParser.getElement(tcMar, 'w:' + side);
                            if (m) {
                                cell.props.margins[side] = parseInt(m.getAttribute('w:w') || '0', 10);
                            }
                        });
                    }
                }

                // Cell Content (Paragraphs, nested tables)
                // Iterate children
                for (let i = 0; i < cellNode.childNodes.length; i++) {
                    const child = cellNode.childNodes[i] as Element;
                    if (child.nodeType !== 1) continue;

                    if (child.tagName === 'w:p') {
                        const p = ParagraphParser.parse(child, context);
                        cell.addChild(p);
                    } else if (child.tagName === 'w:tbl') {
                        const nestedTable = TableParser.parse(child, context);
                        cell.addChild(nestedTable);
                    }
                }

                row.addCell(cell);
            }
            table.addRow(row);
        }

        // Post-process vMerge
        this.processRowSpans(table);

        return table;
    }

    private static processRowSpans(table: TableModel) {
        // Simple vertical merge handling (assumes aligned columns)
        const rows = table.children;
        if (rows.length === 0) return;

        const colCount = rows[0].children.length; // Approximate

        // Track open merges per column: { startCell: TableCellModel, count: number }
        const activeMerges: any[] = new Array(colCount).fill(null);

        for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            const cells = row.children;

            for (let c = 0; c < cells.length; c++) {
                const cell = cells[c] as TableCellModel;
                const vMerge = cell.props.vMerge;

                if (vMerge === 'restart') {
                    // unexpected validation: close previous if any
                    // But usually restart closes correctly.
                    // Start new merge
                    activeMerges[c] = { cell: cell, count: 1 };
                    cell.props.rowSpan = 1;
                } else if (vMerge === 'continue') {
                    if (activeMerges[c]) {
                        activeMerges[c].count++;
                        activeMerges[c].cell.props.rowSpan = activeMerges[c].count;
                        // Mark this cell as hidden/merged
                        cell.props.merged = true; // Signals renderer to skip
                    } else {
                        // Continue without start? Treat as unmerged or restart?
                        // Treat as restart effectively or ignore
                    }
                } else {
                    // No merge, reset
                    activeMerges[c] = null;
                }
            }
        }
    }
}
