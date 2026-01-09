export class LengthConverter {
    // 1 inch = 72 points
    // 1 inch = 1440 twips (dxa)
    // 1 point = 20 twips
    // 1 inch = 914400 EMUs

    // We target 96 DPI for screen typically, but let's standardise
    // 1 inch = 96 px

    static dxaToPx(dxa: number): number {
        return (dxa / 1440) * 96;
    }

    static ptToPx(pt: number): number {
        return (pt / 72) * 96;
    }

    static emuToPx(emu: number): number {
        return (emu / 914400) * 96;
    }

    // Half-points (often used for font size in OpenXML) to px
    static halfPointToPx(hp: number): number {
        return (hp / 2 / 72) * 96;
    }
}
