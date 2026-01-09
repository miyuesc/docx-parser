import { DocxParser } from './src';
import { readFileSync } from 'fs';

async function main() {
  try {
    const parser = new DocxParser();

    const buffer = readFileSync('./test.docx');
    const result = await parser.parse(buffer);

    console.log('Document Metadata:');
    console.log(JSON.stringify(result.metadata, null, 2));

    console.log('\nDocument Settings:');
    console.log(JSON.stringify(result.settings, null, 2));

    console.log('\nDocument AST:');
    console.log(JSON.stringify(result.document, null, 2));

    const html = result.toHTML();
    console.log('\nHTML Output:');
    console.log(html);

  } catch (error) {
    console.error('Error parsing document:', error);
  }
}

main();
