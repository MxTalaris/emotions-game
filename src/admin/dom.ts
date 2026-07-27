export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'className') {
      node.className = String(value);
    } else if (key === 'text') {
      node.textContent = String(value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();
      node.addEventListener(eventName, value as EventListener);
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.assign(node.dataset, value);
    } else if (typeof value === 'boolean') {
      if (value) node.setAttribute(key, '');
    } else {
      node.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    if (child == null || child === false) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function clear(node: HTMLElement): void {
  node.replaceChildren();
}

export function field(
  labelText: string,
  control: HTMLElement,
  full = false
): HTMLElement {
  return el(
    'div',
    { className: full ? 'field full' : 'field' },
    el('label', { text: labelText }),
    control
  );
}

export function textInput(
  value: string,
  onChange: (v: string) => void,
  attrs: Record<string, string> = {}
): HTMLInputElement {
  const input = el('input', { type: 'text', value, ...attrs }) as HTMLInputElement;
  input.value = value;
  input.addEventListener('input', () => onChange(input.value));
  return input;
}

export function numberInput(
  value: number,
  onChange: (v: number) => void,
  attrs: Record<string, string> = {}
): HTMLInputElement {
  const input = el('input', {
    type: 'number',
    value: String(value),
    ...attrs,
  }) as HTMLInputElement;
  input.value = String(value);
  input.addEventListener('input', () => {
    const n = Number(input.value);
    onChange(Number.isNaN(n) ? 0 : n);
  });
  return input;
}

export function checkboxInput(
  checked: boolean,
  onChange: (v: boolean) => void
): HTMLInputElement {
  const input = el('input', { type: 'checkbox' }) as HTMLInputElement;
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  return input;
}

export function selectInput(
  value: string,
  options: { value: string; label: string }[],
  onChange: (v: string) => void
): HTMLSelectElement {
  const select = el('select') as HTMLSelectElement;
  for (const opt of options) {
    const option = el('option', {
      value: opt.value,
      text: opt.label,
    }) as HTMLOptionElement;
    if (opt.value === value) option.selected = true;
    select.append(option);
  }
  select.value = value;
  select.addEventListener('change', () => onChange(select.value));
  return select;
}

export function button(
  label: string,
  onClick: () => void,
  className = 'btn'
): HTMLButtonElement {
  return el('button', {
    type: 'button',
    className,
    text: label,
    onClick,
  }) as HTMLButtonElement;
}

/** Simple modal overlay. Call close() to remove it from the DOM. */
export function openModal(
  title: string,
  body: HTMLElement,
  actions?: HTMLElement[]
): { overlay: HTMLElement; close: () => void } {
  const overlay = el('div', { className: 'modal-overlay' });
  const dialog = el('div', { className: 'modal-dialog' });
  const close = () => overlay.remove();

  dialog.append(
    el(
      'div',
      { className: 'modal-header' },
      el('h2', { text: title }),
      button('×', close, 'btn small')
    ),
    el('div', { className: 'modal-body' }, body)
  );

  if (actions?.length) {
    dialog.append(el('div', { className: 'modal-actions' }, ...actions));
  }

  overlay.append(dialog);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.body.append(overlay);
  return { overlay, close };
}
