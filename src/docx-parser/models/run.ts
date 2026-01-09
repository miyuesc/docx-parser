import { ElementType, Run, RunProperty, TextRun, DocxElement } from '../core/types';

export class RunModel implements Run {
    type: ElementType.Run = ElementType.Run;
    props: RunProperty = {};
    children: (TextRun | DocxElement)[] = [];
    parent?: DocxElement;

    constructor(props?: RunProperty) {
        if (props) this.props = props;
    }

    addChild(child: TextRun | DocxElement) {
        this.children.push(child);
        child.parent = this;
    }

    addText(text: string) {
        this.addChild({
            type: ElementType.Text,
            text: text,
            parent: this
        });
    }
}
