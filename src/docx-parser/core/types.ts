export enum ElementType {
    Document = 'document',
    Section = 'section',
    Paragraph = 'paragraph',
    Run = 'run',
    Text = 'text',
    Table = 'table',
    TableRow = 'table-row',
    TableCell = 'table-cell',
    Image = 'image',
    Hyperlink = 'hyperlink',
    BookmarkStart = 'bookmark-start',
    BookmarkEnd = 'bookmark-end',
    Break = 'break',
    Tab = 'tab',
    Symbol = 'symbol',
    Header = 'header',
    Footer = 'footer',
    Field = 'field'
}

export interface DocxElement {
    type: ElementType;
    children?: DocxElement[];
    style?: any; // We'll refine this later
    parent?: DocxElement;
}

export interface RunProperty {
    bold?: boolean;
    italic?: boolean;
    underline?: string;
    strike?: boolean;
    color?: string;
    highlight?: string;
    shading?: string; // New: Text background/shading
    size?: number; // In half-points usually, but we might convert early

    font?: string;
    verticalAlign?: 'baseline' | 'superscript' | 'subscript';
}

export interface ParagraphProperty {
    alignment?: 'left' | 'center' | 'right' | 'justify';
    indent?: {
        left?: number;
        right?: number;
        firstLine?: number;
        hanging?: number;
    };
    spacing?: {
        before?: number;
        after?: number;
        beforeLines?: number;
        afterLines?: number;
        line?: number;
        lineRule?: 'auto' | 'exact' | 'atLeast';
    };
    styleId?: string;
    outlineLevel?: number;
    numbering?: {
        numId: string;
        ilvl: number;
        level?: any; // NumberingLevel resolved
    };
    shading?: string; // New: Paragraph shading/background
    borders?: {       // New: Paragraph borders
        top?: any;
        left?: any;
        bottom?: any;
        right?: any;
        between?: any;
    };

}

// Table Property Interface
export interface TableProperty {
    width?: number;
    borders?: {
        top?: any;
        left?: any;
        bottom?: any;
        right?: any;
        insideH?: any;
        insideV?: any;
    };
}

export interface SectionProperty {
    pageSize?: {
        width: number;
        height: number;
        orientation: 'portrait' | 'landscape';
    };
    pageMargin?: {
        top: number;
        right: number;
        bottom: number;
        left: number;
        header: number;
        footer: number;
        gutter: number;
    };
}

// Concrete Interfaces
export interface TextRun extends DocxElement {
    type: ElementType.Text;
    text: string;
}

export interface Run extends DocxElement {
    type: ElementType.Run;
    props: RunProperty;
    children: (TextRun | FieldRun | DocxElement)[];
}

export interface FieldRun extends DocxElement {
    type: ElementType.Field;
    instruction: string;
    result?: string;
}

export interface Paragraph extends DocxElement {
    type: ElementType.Paragraph;
    props: ParagraphProperty;
    children: (Run | DocxElement)[];
}

export interface Table extends DocxElement {
    type: ElementType.Table;
    props?: TableProperty;
    children: TableRow[];
}

export interface TableRow extends DocxElement {
    type: ElementType.TableRow;
    children: TableCell[];
}

export interface TableCell extends DocxElement {
    type: ElementType.TableCell;
    children: (Paragraph | Table)[];
    props?: {
        colSpan?: number;
        rowSpan?: number;
        width?: number; // dxa
        shading?: string;
        borders?: any;
        margins?: {
            top?: number;
            left?: number;
            bottom?: number;
            right?: number;
        };
        vMerge?: string; // restart | continue
        merged?: boolean; // Internal flag for renderer to skip
    };
}

export interface DocxDocument extends DocxElement {
    type: ElementType.Document;
    sections: Section[];
    children: Section[]; // Usually sections wrap content
    metadata?: any;
}

export interface Section extends DocxElement {
    type: ElementType.Section;
    props: SectionProperty;
    headers: HeaderFooterRef[];
    footers: HeaderFooterRef[];
    children: DocxElement[];
}

export interface HeaderFooterRef {
    type: 'header' | 'footer';
    id: string; // rId
    kind: 'default' | 'first' | 'even';
    content?: DocxElement[];
}
