import { ElementType, Section, SectionProperty, HeaderFooterRef, DocxElement } from '../core/types';

export class SectionModel implements Section {
    type: ElementType.Section = ElementType.Section;
    props: SectionProperty = {};
    headers: HeaderFooterRef[] = [];
    footers: HeaderFooterRef[] = [];
    children: DocxElement[] = [];
    parent?: DocxElement;

    constructor() { }
}
