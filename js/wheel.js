/**
 * Wheel – a vertical scroll-snap picker.
 *
 * Native scrolling (touch, mouse wheel, trackpad, drag) + CSS scroll-snap.
 * The selected item is the one in the centre row. We read it back when
 * scrolling settles ('scrollend' where supported, debounced 'scroll' otherwise).
 *
 * onChange only fires when the settled index differs from the last *committed*
 * index. setValue() commits without firing, so programmatic scrolls never echo
 * back into state (no feedback loops between linked wheels).
 *
 * Usage:
 *   const w = new Wheel(el, { items: [{ value: 0, label: '00' }, ...], onChange(value) {} });
 *   w.setValue(5);          // scrolls into place, does NOT fire onChange
 *   w.setItems(items, 5);   // rebuild
 */

const SUPPORTS_SCROLLEND = 'onscrollend' in window;

export class Wheel {
  /**
   * @param {HTMLElement} el   container; gets class "wheel"
   * @param {object} opts
   * @param {{value:any,label:string}[]} opts.items
   * @param {(value:any)=>void} opts.onChange
   * @param {string} [opts.ariaLabel]
   */
  constructor(el, { items, onChange, ariaLabel = '' }) {
    this.el = el;
    this.onChange = onChange;
    this.items = [];
    this.index = 0;      // currently highlighted (live while scrolling)
    this.committed = 0;  // last index reported to / set by the outside
    this.scrollTimer = null;

    el.classList.add('wheel');
    el.tabIndex = 0;
    el.setAttribute('role', 'listbox');
    if (ariaLabel) el.setAttribute('aria-label', ariaLabel);

    this.list = document.createElement('div');
    this.list.className = 'wheel-list';
    el.appendChild(this.list);

    el.addEventListener('scroll', () => this.handleScroll(), { passive: true });
    if (SUPPORTS_SCROLLEND) {
      el.addEventListener('scrollend', () => this.settle());
    }
    el.addEventListener('keydown', (e) => this.handleKey(e));
    this.list.addEventListener('click', (e) => {
      const row = e.target.closest('.wheel-item');
      if (!row) return;
      this.select(Number(row.dataset.index), true);
    });

    this.setItems(items, undefined);
  }

  get rowHeight() {
    // offsetHeight is 0 before layout (e.g. display:none ancestor) – fall back to the CSS default.
    const first = this.list.firstElementChild;
    return (first && first.offsetHeight) || 56;
  }

  get value() {
    return this.items[this.index]?.value;
  }

  /** Rebuild the rows. Keeps `value` selected if given (no onChange). */
  setItems(items, value) {
    this.items = items;
    this.list.innerHTML = '';
    const frag = document.createDocumentFragment();
    items.forEach((it, i) => {
      const row = document.createElement('div');
      row.className = 'wheel-item';
      row.dataset.index = String(i);
      row.setAttribute('role', 'option');
      row.textContent = it.label;
      frag.appendChild(row);
    });
    this.list.appendChild(frag);
    this.index = -1; // force re-align
    this.setValue(value);
  }

  /** Select `value` without firing onChange. Picks the nearest item if not found. */
  setValue(value) {
    let idx = this.items.findIndex((it) => it.value === value);
    if (idx < 0 && typeof value === 'number') {
      let best = Infinity;
      this.items.forEach((it, i) => {
        const d = Math.abs(it.value - value);
        if (d < best) { best = d; idx = i; }
      });
    }
    if (idx < 0) idx = 0;
    this.committed = idx;
    this.scrollToIndex(idx, false);
  }

  /** User-initiated selection (click / keyboard): scroll smoothly and report. */
  select(idx, smooth) {
    idx = this.clampIndex(idx);
    this.scrollToIndex(idx, smooth);
    this.commit();
  }

  clampIndex(idx) {
    return Math.max(0, Math.min(this.items.length - 1, idx));
  }

  scrollToIndex(idx, smooth) {
    idx = this.clampIndex(idx);
    this.index = idx;
    this.markSelected();
    const top = idx * this.rowHeight;
    if (Math.abs(this.el.scrollTop - top) >= 0.5) {
      this.el.scrollTo({ top, behavior: smooth ? 'smooth' : 'instant' });
    }
  }

  markSelected() {
    const rows = this.list.children;
    for (let i = 0; i < rows.length; i++) {
      const sel = i === this.index;
      rows[i].classList.toggle('is-selected', sel);
      rows[i].setAttribute('aria-selected', sel ? 'true' : 'false');
    }
  }

  handleScroll() {
    // Live highlight while scrolling.
    const idx = this.clampIndex(Math.round(this.el.scrollTop / this.rowHeight));
    if (idx !== this.index) {
      this.index = idx;
      this.markSelected();
    }
    if (!SUPPORTS_SCROLLEND) {
      clearTimeout(this.scrollTimer);
      this.scrollTimer = setTimeout(() => this.settle(), 120);
    }
  }

  settle() {
    const idx = this.clampIndex(Math.round(this.el.scrollTop / this.rowHeight));
    this.index = idx;
    this.markSelected();
    this.commit();
  }

  commit() {
    if (this.index === this.committed) return;
    this.committed = this.index;
    this.onChange(this.value);
  }

  handleKey(e) {
    let step = 0;
    switch (e.key) {
      case 'ArrowUp': step = -1; break;
      case 'ArrowDown': step = 1; break;
      case 'PageUp': step = -10; break;
      case 'PageDown': step = 10; break;
      case 'Home': step = -Infinity; break;
      case 'End': step = Infinity; break;
      default: return;
    }
    e.preventDefault();
    const target = step === -Infinity ? 0
      : step === Infinity ? this.items.length - 1
      : this.index + step;
    this.select(target, true);
  }
}

/** Helper: build { value, label } items for an integer range, optionally zero-padded. */
export function rangeItems(from, to, pad = 0, suffix = '') {
  const items = [];
  for (let v = from; v <= to; v++) {
    items.push({ value: v, label: String(v).padStart(pad, '0') + suffix });
  }
  return items;
}
