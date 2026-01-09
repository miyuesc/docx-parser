import { ElementType, Table, TableRow, TableCell, Paragraph, DocxElement } from '../core/types';

export class TableModel implements Table {
    type: ElementType.Table = ElementType.Table;
    children: TableRow[] = [];
    parent?: DocxElement;
    style?: any;
    props?: any = {}; // TableProperty

    addRow(row: TableRow) {
        this.children.push(row);
        row.parent = this;
    }
}

export class TableRowModel implements TableRow {
    type: ElementType.TableRow = ElementType.TableRow;
    children: TableCell[] = [];
    parent?: DocxElement;

    addCell(cell: TableCell) {
        this.children.push(cell);
        cell.parent = this;
    }
}

export class TableCellModel implements TableCell {
    type: ElementType.TableCell = ElementType.TableCell;
    children: (Paragraph | Table)[] = [];
    props: any = {};
    parent?: DocxElement;

    addChild(child: Paragraph | Table) {
        this.children.push(child);
        child.parent = this;
    }
}
