import JSZip from 'jszip';

export class ZipLoader {
    static async load(data: ArrayBuffer | Blob | File): Promise<JSZip> {
        return await JSZip.loadAsync(data);
    }
}
