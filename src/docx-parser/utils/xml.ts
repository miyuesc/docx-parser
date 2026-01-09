export class XmlParser {
    private parser: DOMParser;

    constructor() {
        if (typeof DOMParser !== 'undefined') {
            this.parser = new DOMParser();
        } else {
            throw new Error('DOMParser is not available. This library must run in a browser environment or use a polyfill.');
        }
    }

    parse(xmlString: string): Document {
        return this.parser.parseFromString(xmlString, 'application/xml');
    }

    static query(node: Element | Document, selector: string): Element | null {
        // querySelector doesn't like colons in selectors unless escaped
        const escapedSelector = selector.replace(/:/g, '\\\\:');
        return node.querySelector(escapedSelector);
    }

    static queryAll(node: Element | Document, selector: string): Element[] {
        const escapedSelector = selector.replace(/:/g, '\\\\:');
        return Array.from(node.querySelectorAll(escapedSelector));
    }

    static getElement(node: Element | Document, tagName: string): Element | null {
        const els = node.getElementsByTagName(tagName);
        return els.length > 0 ? els[0] : null;
    }

    static getElements(node: Element | Document, tagName: string): Element[] {
        return Array.from(node.getElementsByTagName(tagName));
    }

    static getElementNS(node: Element | Document, namespace: string, localName: string): Element | null {
        const els = node.getElementsByTagNameNS(namespace, localName);
        return els.length > 0 ? (els[0] as Element) : null;
    }

    static getElementsNS(node: Element | Document, namespace: string, localName: string): Element[] {
        return Array.from(node.getElementsByTagNameNS(namespace, localName));
    }
}

export const xmlUtil = new XmlParser();
