import { DocxDocument, ElementType, Section } from '../core/types';

export class DocumentModel implements DocxDocument {
    type: ElementType.Document = ElementType.Document;
    sections: Section[] = [];
    children: Section[] = []; // Alias to sections for traversal if needed
    metadata?: any;

    constructor() { }

    addSection(section: Section) {
        this.sections.push(section);
        this.children.push(section);
        section.parent = this;
    }
}
