import Phaser from 'phaser';

export const GAME_FONT =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

function toKebabProp(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

export function css(styles: Record<string, string | number>): string {
  return Object.entries(styles)
    .map(([key, value]) => `${toKebabProp(key)}:${value}`)
    .join(';');
}

export interface DomTextLayout {
  x?: number;
  y?: number;
  /** Default 0. Pass 0.5 to center on x/y. */
  originX?: number;
  originY?: number;
  scrollFactor?: number;
  depth?: number;
}

export interface DomTextHandle {
  element: HTMLSpanElement;
  dom: Phaser.GameObjects.DOMElement;
  setText: (text: string) => void;
  setVisible: (visible: boolean) => void;
  setAlpha: (alpha: number) => void;
}

function normalizeTextStyle(
  style: Record<string, string | number>
): Record<string, string | number> {
  const normalized = { ...style };

  if (normalized.textAlign === 'center') {
    if (!normalized.width && normalized.maxWidth) {
      normalized.width = normalized.maxWidth;
    }
  }

  if (normalized.width && !normalized.boxSizing) {
    normalized.boxSizing = 'border-box';
  }

  return normalized;
}

export function applyDomTextLayout(
  handle: DomTextHandle,
  layout: DomTextLayout
): void {
  if (layout.x !== undefined || layout.y !== undefined) {
    handle.dom.setPosition(
      layout.x ?? handle.dom.x,
      layout.y ?? handle.dom.y
    );
  }

  if (layout.originX !== undefined) {
    handle.dom.setOrigin(layout.originX, layout.originY ?? layout.originX);
  }

  if (layout.scrollFactor !== undefined) {
    handle.dom.setScrollFactor(layout.scrollFactor);
  }

  if (layout.depth !== undefined) {
    handle.dom.setDepth(layout.depth);
  }
}

/** DOM text aligned like Phaser.Text with setOrigin — pass explicit width when centering. */
export function domText(
  scene: Phaser.Scene,
  text: string,
  style: Record<string, string | number> = {},
  layout?: DomTextLayout
): DomTextHandle {
  const element = document.createElement('span');
  element.textContent = text;
  element.style.cssText = css({
    fontFamily: GAME_FONT,
    display: 'block',
    margin: 0,
    padding: 0,
    lineHeight: 1.25,
    ...normalizeTextStyle(style),
  });

  const dom = scene.add.dom(layout?.x ?? 0, layout?.y ?? 0, element);

  const handle: DomTextHandle = {
    element,
    dom,
    setText: (value: string) => {
      element.textContent = value;
    },
    setVisible: (visible: boolean) => {
      dom.setVisible(visible);
    },
    setAlpha: (alpha: number) => {
      dom.setAlpha(alpha);
    },
  };

  if (layout) {
    applyDomTextLayout(handle, layout);
  }

  return handle;
}

/** Single-line label centered inside a fixed w×h box (buttons, icons). */
export function domBoxLabel(
  scene: Phaser.Scene,
  text: string,
  boxWidth: number,
  boxHeight: number,
  style: Record<string, string | number> = {},
  layout?: DomTextLayout
): DomTextHandle {
  return domText(
    scene,
    text,
    {
      width: `${boxWidth}px`,
      height: `${boxHeight}px`,
      lineHeight: `${boxHeight}px`,
      textAlign: 'center',
      ...style,
    },
    {
      originX: 0.5,
      originY: 0.5,
      ...layout,
    }
  );
}

export function domPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  element: HTMLElement
): Phaser.GameObjects.DOMElement {
  const dom = scene.add.dom(x, y, element);
  dom.setOrigin(0, 0);
  return dom;
}

export function stopPointerBubble(element: HTMLElement): void {
  element.addEventListener('pointerdown', (event) => event.stopPropagation());
  element.addEventListener('wheel', (event) => event.stopPropagation(), {
    passive: true,
  });
}
