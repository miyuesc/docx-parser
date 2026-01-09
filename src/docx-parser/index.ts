import { ZipLoader } from './loader/zip-loader';
import { ParsingContext } from './core/context';
import { StyleManager } from './styler/style-manager';
import { DocumentParser } from './parser/document-parser';
import { HtmlRenderer } from './renderer/html-renderer';
import { MetadataParser } from './parser/metadata-parser';
import { NumberingManager } from './styler/numbering-manager';

export class DocxParser {
    async parse(data: ArrayBuffer | Blob | File) {
        // 1. Load Zip
        const zip = await ZipLoader.load(data);

        // 2. Initialize Context
        const styleManager = new StyleManager(zip);
        const numberingManager = new NumberingManager(zip);

        // Load styles.xml and numbering.xml
        await styleManager.loadStyles();
        await numberingManager.loadNumbering();

        const context = new ParsingContext(zip, styleManager, numberingManager);

        // Load Relationships and Images FIRST
        await context.loadRelationships();
        await context.prepareImages();

        // 3. Parse Document
        const parser = new DocumentParser(context);
        const docModel = await parser.parse();

        // 4. Parse Metadata
        docModel.metadata = await MetadataParser.parse(context);

        return docModel;
    }

    render(docModel: any, target: HTMLElement) {
        const renderer = new HtmlRenderer();
        const el = renderer.render(docModel);
        target.innerHTML = '';
        target.appendChild(el);
    }
}

export * from './core/types';
