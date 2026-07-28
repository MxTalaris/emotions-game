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

export interface DomTextHandle {
  element: HTMLSpanElement;
  dom: Phaser.GameObjects.DOMElement;
  setText: (text: string) => void;
  setVisible: (visible: boolean) => void;
  setAlpha: (alpha: number) => void;
}

export function domText(
  scene: Phaser.Scene,
  text: string,
  style: Record<string, string | number> = {}
): DomTextHandle {
  const element = document.createElement('span');
  element.textContent = text;
  element.style.cssText = css({
    fontFamily: GAME_FONT,
    display: 'block',
    margin: 0,
    padding: 0,
    ...style,
  });

  const dom = scene.add.dom(0, 0, element);

  return {
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
