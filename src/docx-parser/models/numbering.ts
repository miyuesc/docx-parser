export interface NumberingDefinition {
    id: string; // numId
    abstractNumId: string; // reference to abstract
}

export interface AbstractNumberingDefinition {
    id: string; // abstractNumId
    levels: Map<number, NumberingLevel>;
}

export interface NumberingLevel {
    level: number;
    start?: number;
    format?: string; // decimal, bullet, etc.
    text?: string; // %1.
    align?: string;
    indent?: number; // left
    hanging?: number;
    font?: string; // for bullets
}

export interface NumberingInstance {
    numId: string;
    ilvl: number;
    definition: AbstractNumberingDefinition;
    level: NumberingLevel;
}
