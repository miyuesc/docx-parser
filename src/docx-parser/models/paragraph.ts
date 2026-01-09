import { ElementType, Paragraph, ParagraphProperty, Run, DocxElement } from '../core/types';

export class ParagraphModel implements Paragraph {
    type: ElementType.Paragraph = ElementType.Paragraph;
    props: ParagraphProperty = {};
    children: (Run | DocxElement)[] = [];
    parent?: DocxElement;

    constructor(props?: ParagraphProperty) {
        if (props) this.props = props;
    }

    addChild(child: Run | DocxElement) {
        this.children.push(child);
        child.parent = this;
    }
}
