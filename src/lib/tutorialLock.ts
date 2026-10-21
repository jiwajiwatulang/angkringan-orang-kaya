import type { GuideStep } from './firstRunGuide';

const selectors: Partial<Record<GuideStep, string>> = {
  shift: '[data-guide="shift"] form',
  catalog: '[data-guide-product]:not(:disabled)',
  cart: '[data-guide-quantity], [data-guide-checkout]',
  payment: '[data-guide="payment"] input, [data-guide="payment"] textarea, [data-guide-payment-detail], [data-guide-payment-method], [data-guide-payment-cash], [data-guide-payment-confirm], [data-guide-payment-proof]',
};

function visible(element: HTMLElement): boolean {
  return element.getClientRects().length > 0 && !element.closest('[hidden]');
}

export function tutorialTargets(doc: Document, step: GuideStep): HTMLElement[] {
  if (step === 'catalog') {
    const options = [...doc.querySelectorAll<HTMLElement>('[data-guide="options"]')].filter(visible);
    if (options.length) return options;
  }
  const targets = [...doc.querySelectorAll<HTMLElement>(selectors[step] || '[data-no-tutorial-target]')].filter(visible);
  // Teach one available product; opening variants temporarily replaces this target.
  return step === 'catalog' ? targets.slice(0, 1) : targets;
}

export function installTutorialLock(doc: Document, panel: HTMLElement, step: GuideStep, onTargets: (targets: HTMLElement[]) => void): () => void {
  let roots: HTMLElement[] = [];
  const changed = new Map<HTMLElement, boolean>();
  const restoreInert = () => { for (const [element, original] of changed) element.inert = original; changed.clear(); };
  const refresh = () => {
    restoreInert();
    roots = tutorialTargets(doc, step);
    const readable = ['cart', 'payment', 'receipt'].includes(step)
      ? [...doc.querySelectorAll<HTMLElement>(`[data-guide="${step}"]`)].filter(visible) : [];
    const keep = [...roots, ...readable, panel];
    const visit = (element: HTMLElement) => {
      if (keep.includes(element)) return;
      if (keep.some(root => element.contains(root))) {
        [...element.children].forEach(child => visit(child as HTMLElement));
      } else {
        changed.set(element, element.inert);
        element.inert = true;
      }
    };
    [...doc.body.children].forEach(child => visit(child as HTMLElement));
    for (const area of readable) {
      for (const control of area.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]')) {
        if (!roots.some(root => root.contains(control))) { changed.set(control, control.inert); control.inert = true; }
      }
    }
    onTargets(readable.length ? readable : roots);
  };
  const allowed = (target: EventTarget | null) => target instanceof doc.defaultView!.Node && (panel.contains(target) || roots.some(root => root.contains(target)));
  const block = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation(); };
  const guard = (event: Event) => { if (!allowed(event.target)) block(event); };
  const focusable = () => [...doc.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex="0"]')]
    .filter(element => allowed(element) && visible(element) && !element.closest('[inert]') && !element.matches(':disabled'));
  const onFocus = (event: Event) => { if (!allowed(event.target)) { block(event); panel.focus({ preventScroll: true }); } };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      block(event);
      panel.querySelector<HTMLElement>('[data-guide-skip]')?.focus();
      return;
    }
    if (event.key === 'Tab') {
      const targets = focusable();
      const index = targets.indexOf(doc.activeElement as HTMLElement);
      const nextIndex = index < 0 ? (event.shiftKey ? targets.length - 1 : 0) : (index + (event.shiftKey ? -1 : 1) + targets.length) % targets.length;
      const next = targets[nextIndex];
      block(event);
      (next || panel).focus();
      return;
    }
    if (/^F\d+$/.test(event.key) || ((event.ctrlKey || event.metaKey) && !['a', 'c', 'v', 'x', 'z', 'y'].includes(event.key.toLowerCase()))) { block(event); return; }
    const editable = event.target instanceof doc.defaultView!.Element && event.target.matches('input, textarea, select, [contenteditable="true"]');
    if (!editable && !['Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) { block(event); return; }
    guard(event);
  };
  const onScroll = (event: Event) => {
    const target = event.target;
    if (step === 'catalog' && target instanceof doc.defaultView!.Element && !panel.contains(target) && !target.closest('[data-guide="options"]')) { block(event); return; }
    const scrollArea = target instanceof doc.defaultView!.Element && target.closest(`[data-guide="${step}"], [data-guide="options"]`);
    if (!allowed(target) && !scrollArea) block(event);
  };
  const events = ['click', 'dblclick', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'contextmenu', 'dragstart', 'drop', 'submit'];
  refresh();
  const Observer = doc.defaultView!.MutationObserver;
  const observer = new Observer(refresh);
  observer.observe(doc.body, { childList: true, subtree: true });
  events.forEach(name => doc.addEventListener(name, guard, { capture: true, passive: false }));
  doc.addEventListener('keydown', onKey, true);
  doc.addEventListener('focusin', onFocus, true);
  doc.addEventListener('wheel', onScroll, { capture: true, passive: false });
  doc.addEventListener('touchmove', onScroll, { capture: true, passive: false });
  doc.defaultView!.addEventListener('resize', refresh);
  return () => {
    observer.disconnect(); restoreInert();
    events.forEach(name => doc.removeEventListener(name, guard, true));
    doc.removeEventListener('keydown', onKey, true);
    doc.removeEventListener('focusin', onFocus, true);
    doc.removeEventListener('wheel', onScroll, true);
    doc.removeEventListener('touchmove', onScroll, true);
    doc.defaultView!.removeEventListener('resize', refresh);
  };
}
