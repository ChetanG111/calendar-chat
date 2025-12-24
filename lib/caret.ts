/**
 * Calculate the coordinates of the cursor in a textarea
 */
export type CaretCoordinates = {
    top: number;
    left: number;
    height: number;
};

// We need to mirror all styles that affect text layout
const properties = [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderStyle',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
    'MozTabSize',
] as const;

let mirrorDiv: HTMLDivElement | null = null;

export function getCaretCoordinates(
    element: HTMLTextAreaElement,
    position: number
): CaretCoordinates {
    const isBrowser = typeof window !== 'undefined';
    if (!isBrowser) return { top: 0, left: 0, height: 0 };

    if (!mirrorDiv) {
        mirrorDiv = document.createElement('div');
        mirrorDiv.id = 'input-textarea-caret-position-mirror-div';
        document.body.appendChild(mirrorDiv);
    }

    const style = mirrorDiv.style;
    const computed = window.getComputedStyle(element);

    // Apply styles that affect text layout to the mirror div
    style.whiteSpace = 'pre-wrap';
    style.wordWrap = 'break-word';
    style.position = 'absolute';
    style.visibility = 'hidden'; // Keep hidden
    style.pointerEvents = 'none'; // Ensure it doesn't interfere with mouse events

    properties.forEach((prop) => {
        // @ts-ignore
        style[prop] = computed[prop];
    });

    // Handle overflow specifically for the mirror div
    // It should mimic the textarea's overflow behavior, especially for scrollbar calculation
    if (isBrowser && (window as any).mozInnerScreenX != null) { // Firefox specific logic
        if (element.scrollHeight > parseInt(computed.height)) {
            style.overflowY = 'scroll';
        } else {
            style.overflowY = 'hidden';
        }
    } else {
        style.overflow = 'hidden'; // Default for other browsers
    }

    // Set the content
    const textBeforeCaret = element.value.substring(0, position);
    const textAfterCaret = element.value.substring(position) || '.'; // Use a placeholder if no text after

    mirrorDiv.textContent = textBeforeCaret;
    const span = document.createElement('span');
    span.textContent = textAfterCaret;
    mirrorDiv.appendChild(span); // Append span to mirrorDiv, not document.body

    const computedLineHeight = computed['lineHeight'];
    let lineHeight = parseInt(computedLineHeight, 10);
    if (isNaN(lineHeight)) {
        // 'normal' is the default, which is roughly 1.2 * font-size.
        lineHeight = parseInt(computed['fontSize'], 10) * 1.2;
    }

    const coordinates = {
        top: span.offsetTop + parseInt(computed['borderTopWidth']),
        left: span.offsetLeft + parseInt(computed['borderLeftWidth']),
        height: lineHeight
    };

    // Clear the mirrorDiv content after use to prevent stale data
    mirrorDiv.innerHTML = '';

    return coordinates;
}
