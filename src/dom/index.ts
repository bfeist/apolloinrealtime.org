// Typed DOM helpers — the jQuery shim for the migration. Phase 3 lands this
// shim and bootstrap code uses it. Phases 4-5 migrate engine + panel code
// off jQuery onto these helpers (and remove the `jquery` <script> when done).
//
// Keep the API small and intentional. Add helpers as concrete migration
// sites need them, not speculatively.

/** Single-element querySelector. Returns null if not found. Cast at call site if a more specific element type is needed. */
export function qs(selector: Selector, root: ParentNode = document): HTMLElement | null {
  return root.querySelector(selector);
}

/** Multi-element querySelectorAll, eagerly materialized to an array. */
export function qsa(selector: Selector, root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll(selector));
}

/**
 * Bind an event listener and return an unsubscribe function. Wraps
 * addEventListener with type inference for the common HTMLElement events.
 */
export function on<K extends keyof HTMLElementEventMap>(
  el: EventTarget,
  type: K,
  handler: (ev: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void;
export function on(
  el: EventTarget,
  type: string,
  handler: EventListener,
  options?: AddEventListenerOptions,
): () => void;
export function on(
  el: EventTarget,
  type: string,
  handler: EventListener,
  options?: AddEventListenerOptions,
): () => void {
  el.addEventListener(type, handler, options);
  return () => {
    el.removeEventListener(type, handler, options);
  };
}

/** Set element text content. */
export function setText(el: Element, text: string): void {
  el.textContent = text;
}

/** Set element inner HTML. Caller is responsible for sanitizing input. */
export function setHtml(el: Element, html: string): void {
  el.innerHTML = html;
}

/** Add/remove/toggle a class on one element. */
export const addClass = (el: Element, ...names: string[]): void => {
  el.classList.add(...names);
};
export const removeClass = (el: Element, ...names: string[]): void => {
  el.classList.remove(...names);
};
export const toggleClass = (el: Element, name: string, force?: boolean): boolean =>
  el.classList.toggle(name, force);
export const hasClass = (el: Element, name: string): boolean => el.classList.contains(name);

/** Get/set a single attribute. */
export const setAttr = (el: Element, name: string, value: string): void => {
  el.setAttribute(name, value);
};
export const getAttr = (el: Element, name: string): string | null => el.getAttribute(name);
export const removeAttr = (el: Element, name: string): void => {
  el.removeAttribute(name);
};

/** Show/hide via `display`. Caller is responsible for restoring the original display value. */
export const show = (el: HTMLElement, display = ""): void => {
  el.style.display = display;
};
export const hide = (el: HTMLElement): void => {
  el.style.display = "none";
};

/** Run `cb` once the DOM is ready (DOMContentLoaded, or immediately if already past). */
export function ready(cb: () => void): void {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", cb, { once: true });
    return;
  }
  cb();
}

/**
 * Delegated event listener — attach to `root`, fire `handler` only when the
 * event target matches `selector`. Returns an unsubscribe function.
 */
export function delegate<K extends keyof HTMLElementEventMap>(
  root: Element,
  type: K,
  selector: Selector,
  handler: (ev: HTMLElementEventMap[K], match: HTMLElement) => void,
): () => void {
  const listener = (ev: Event): void => {
    const target = ev.target;
    if (!(target instanceof Element)) return;
    const match = target.closest<HTMLElement>(selector);
    if (match && root.contains(match)) {
      handler(ev as HTMLElementEventMap[K], match);
    }
  };
  root.addEventListener(type, listener);
  return () => {
    root.removeEventListener(type, listener);
  };
}
