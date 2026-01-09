/**
 * Shape Utilities for DOCX Shape Rendering
 * Maps OOXML preset geometry types to SVG paths
 */

// Preset geometry paths (viewBox 0 0 100 100)
export const PRESET_GEOMETRY_PATHS: Record<string, string | null> = {
    // Basic shapes
    'rect': 'M 2 2 L 98 2 L 98 98 L 2 98 Z',
    'roundRect': 'M 10 2 L 90 2 Q 98 2 98 10 L 98 90 Q 98 98 90 98 L 10 98 Q 2 98 2 90 L 2 10 Q 2 2 10 2 Z',
    'ellipse': null, // Use <ellipse> element instead
    'circle': null, // Use <circle> element
    'triangle': 'M 50 5 L 95 95 L 5 95 Z',
    'rtTriangle': 'M 5 5 L 95 95 L 5 95 Z',
    'diamond': 'M 50 5 L 95 50 L 50 95 L 5 50 Z',
    'parallelogram': 'M 20 5 L 95 5 L 80 95 L 5 95 Z',

    // Connectors
    'straightConnector1': 'M 0 50 L 100 50',
    'bentConnector3': 'M 0 50 L 50 50 L 50 100',
    'curvedConnector3': 'M 0 50 Q 50 25 100 50',
    'curvedConnector5': 'M 0 50 Q 25 25 50 50 T 100 50',

    // Polygons
    'pentagon': 'M 50 5 L 95 40 L 77 90 L 23 90 L 5 40 Z',
    'hexagon': 'M 25 5 L 75 5 L 95 50 L 75 95 L 25 95 L 5 50 Z',
    'heptagon': 'M 50 5 L 85 25 L 95 65 L 65 95 L 35 95 L 5 65 L 15 25 Z',
    'octagon': 'M 30 5 L 70 5 L 95 30 L 95 70 L 70 95 L 30 95 L 5 70 L 5 30 Z',
    'decagon': 'M 50 5 L 71 12 L 88 29 L 95 50 L 88 71 L 71 88 L 50 95 L 29 88 L 12 71 L 5 50 L 12 29 L 29 12 Z',

    // Stars
    'star4': 'M 50 5 L 59 41 L 95 50 L 59 59 L 50 95 L 41 59 L 5 50 L 41 41 Z',
    'star5': 'M 50 5 L 61 38 L 95 38 L 68 58 L 79 91 L 50 71 L 21 91 L 32 58 L 5 38 L 39 38 Z',
    'star6': 'M 50 5 L 58 35 L 88 20 L 68 50 L 88 80 L 58 65 L 50 95 L 42 65 L 12 80 L 32 50 L 12 20 L 42 35 Z',
    'star8': 'M 50 5 L 56 30 L 74 12 L 70 37 L 95 30 L 78 50 L 95 70 L 70 63 L 74 88 L 56 70 L 50 95 L 44 70 L 26 88 L 30 63 L 5 70 L 22 50 L 5 30 L 30 37 L 26 12 L 44 30 Z',

    // Arrows
    'rightArrow': 'M 5 30 L 60 30 L 60 10 L 95 50 L 60 90 L 60 70 L 5 70 Z',
    'leftArrow': 'M 95 30 L 40 30 L 40 10 L 5 50 L 40 90 L 40 70 L 95 70 Z',
    'upArrow': 'M 30 95 L 30 40 L 10 40 L 50 5 L 90 40 L 70 40 L 70 95 Z',
    'downArrow': 'M 30 5 L 30 60 L 10 60 L 50 95 L 90 60 L 70 60 L 70 5 Z',

    // Special shapes
    'snip2SameRect': 'M 15 2 L 98 2 L 98 85 L 83 98 L 2 98 L 2 15 Z',
    'snip1Rect': 'M 15 2 L 98 2 L 98 98 L 2 98 L 2 15 Z',
    'round2SameRect': 'M 15 2 Q 2 2 2 15 L 2 98 L 85 98 Q 98 98 98 85 L 98 2 Z',
    'round1Rect': 'M 15 2 Q 2 2 2 15 L 2 98 L 98 98 L 98 2 Z',

    // Callouts
    'wedgeRectCallout': 'M 2 2 L 98 2 L 98 98 L 50 98 L 30 120 L 40 98 L 2 98 Z',
    'wedgeEllipseCallout': null, // Complex, needs special handling

    // Blocks
    'cube': 'M 5 30 L 30 15 L 80 15 L 55 30 L 55 80 L 5 80 Z M 55 30 L 80 15 L 80 65 L 55 80 Z M 5 30 L 30 15 L 30 65 L 5 80 Z',
    'bevel': 'M 10 10 L 50 2 L 90 10 L 98 50 L 90 90 L 50 98 L 10 90 L 2 50 Z',

    // Hearts and symbols
    'heart': 'M 50 85 Q 5 50 5 30 Q 5 5 25 5 Q 50 5 50 30 Q 50 5 75 5 Q 95 5 95 30 Q 95 50 50 85 Z',
    'lightningBolt': 'M 60 5 L 45 50 L 70 50 L 40 95 L 55 60 L 30 60 Z',
    'sun': 'M 50 20 Q 35 20 35 35 Q 35 50 50 50 Q 65 50 65 35 Q 65 20 50 20 M 50 5 L 50 15 M 73 13 L 67 23 M 87 27 L 77 33 M 95 50 L 85 50 M 87 73 L 77 67 M 73 87 L 67 77 M 50 95 L 50 85 M 27 87 L 33 77 M 13 73 L 23 67 M 5 50 L 15 50 M 13 27 L 23 33 M 27 13 L 33 23',
    'moon': 'M 60 10 Q 90 20 90 50 Q 90 80 60 90 Q 75 75 75 50 Q 75 25 60 10 Z',

    // Plus and crosses
    'plus': 'M 35 5 L 65 5 L 65 35 L 95 35 L 95 65 L 65 65 L 65 95 L 35 95 L 35 65 L 5 65 L 5 35 L 35 35 Z',
    'cross': 'M 30 10 L 50 30 L 70 10 L 90 30 L 70 50 L 90 70 L 70 90 L 50 70 L 30 90 L 10 70 L 30 50 L 10 30 Z',

    // Default fallback
    'default': 'M 2 2 L 98 2 L 98 98 L 2 98 Z'
};

/**
 * Convert EMU (English Metric Units) angle to degrees
 * EMU angle: 60000 = 1 degree
 */
export function emuAngleToDegrees(emuAngle: number): number {
    return emuAngle / 60000;
}

/**
 * Convert EMU to pixels
 * 1 inch = 914400 EMU = 96 px (at 96 DPI)
 */
export function emuToPx(emu: number): number {
    return emu / 9525;
}

/**
 * Get SVG path or element type for a preset geometry
 */
export function getShapePath(prst: string): { type: 'path' | 'ellipse' | 'circle'; data: string | null } {
    if (prst === 'ellipse') {
        return { type: 'ellipse', data: null };
    }
    if (prst === 'circle') {
        return { type: 'circle', data: null };
    }

    const path = PRESET_GEOMETRY_PATHS[prst] || PRESET_GEOMETRY_PATHS['default'];
    return { type: 'path', data: path };
}

/**
 * Parse stroke dash pattern
 */
export function getStrokeDashArray(dashType?: string): string {
    const dashPatterns: Record<string, string> = {
        'solid': 'none',
        'dot': '2,2',
        'dash': '8,4',
        'lgDash': '12,4',
        'dashDot': '8,4,2,4',
        'lgDashDot': '12,4,2,4',
        'lgDashDotDot': '12,4,2,4,2,4',
        'sysDot': '3,3',
        'sysDash': '9,3',
        'sysDashDot': '9,3,3,3',
        'sysDashDotDot': '9,3,3,3,3,3'
    };

    return dashPatterns[dashType || 'solid'] || 'none';
}
