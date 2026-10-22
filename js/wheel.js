/**
 * Wheel – a vertical scroll-snap picker.
 *
 * Native scrolling (touch, mouse wheel, trackpad, drag) + CSS scroll-snap.
 * The selected item is the one in the centre row. We read it back when
 * scrolling settles ('scrollend' where supported, debounced 'scroll' otherwise,
 * never while a finger is still on the wheel).
 *
 * Features
 *   - loop: true      the list wraps around (59 → 00 → 01 …). Implemented by
 *                     rendering several copies of the items and silently
 *                     re-centring on the middle copy once scrolling settles.
 *   - tap to type     tapping the highlighted (centre) row opens a numeric
 *                     input; Enter/blur/`maxDigits` digits commit, Escape cancels.
 *
 * onChange only fires when the settled value differs from the last *committed*
 * value. setValue() commits without firing, so programmatic scrolls never echo
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
   * @param {boolean} [opts.loop=false]        wrap around at the ends
   * @param {number}  [opts.maxDigits=2]       auto-commit typed input at this many digits
   * @param {string}  [opts.ariaLabel]
   */
  constructor(el, { items, onChange, loop = false, maxDigits = 2, ariaLabel = '' }) {
    this.el = el;
    this.onChange = onChange;
    this.loop = loop;
    this.maxDigits = maxDigits;
    this.items = [];
    this.n = 0;          // logical item count
    this.copies = 1;     // physical copies of the list (loop only)
    this.midStart = 0;   // physical index of the first row in the middle copy
    this.index = 0;      // physical index currently highlighted (live while scrolling)
    this.committed = 0;  // last logical index reported to / set by the outside
    this.scrollTimer = null;
    this.touching = false;
    this.editing = false;

    el.classList.add('wheel');
    if (ariaLabel) el.setAttribute('aria-label', ariaLabel);

    // Scroll container (masked, snapping) …
    this.scroller = document.createElement('div');
    this.scroller.className = 'wheel-scroll';
    this.scroller.tabIndex = 0;
    this.scroller.setAttribute('role', 'listbox');
    el.appendChild(this.scroller);

    this.list = document.createElement('div');
    this.list.className = 'wheel-list';
    this.scroller.appendChild(this.list);

    // … and the inline editor, overlaid on the centre row.
    this.input = document.createElement('input');
    this.input.className = 'wheel-input';
    this.input.type = 'text';
    this.input.inputMode = 'numeric';
    this.input.pattern = '[0-9]*';
    this.input.autocomplete = 'off';
    this.input.enterKeyHint = 'done';
    this.input.tabIndex = -1;
    if (ariaLabel) this.input.setAttribute('aria-label', ariaLabel);
    el.appendChild(this.input);

    const sc = this.scroller;
    sc.addEventListener('scroll', () => this.handleScroll(), { passive: true });
    if (SUPPORTS_SCROLLEND) {
      sc.addEventListener('scrollend', () => this.settle());
    }
    sc.addEventListener('touchstart', () => { this.touching = true; }, { passive: true });
    const touchDone = () => {
      this.touching = false;
      this.scheduleSettle();
    };
    sc.addEventListener('touchend', touchDone, { passive: true });
    sc.addEventListener('touchcancel', touchDone, { passive: true });
    sc.addEventListener('keydown', (e) => this.handleKey(e));
    this.list.addEventListener('click', (e) => {
      const row = e.target.closest('.wheel-item');
      if (!row) return;
      const idx = Number(row.dataset.index);
      if (idx === this.index) this.openEditor();
      else this.select(idx, true);
    });

    this.input.addEventListener('input', () => {
      const digits = this.input.value.replace(/\D+/g, '');
      if (digits !== this.input.value) this.input.value = digits;
      if (digits.length >= this.maxDigits) this.commitEdit();
    });
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.commitEdit(); }
      else if (e.key === 'Escape') { e.preventDefault(); this.closeEditor(); }
    });
    this.input.addEventListener('blur', () => this.commitEdit());

    this.setItems(items, undefined);
  }

  /* ---------- geometry ---------- */

  get rowHeight() {
    // offsetHeight is 0 before layout (e.g. display:none ancestor) – fall back to the CSS var.
    const first = this.list.firstElementChild;
    if (first && first.offsetHeight) return first.offsetHeight;
    const css = parseFloat(getComputedStyle(this.el).getPropertyValue('--row'));
    return Number.isFinite(css) && css > 0 ? css : 48;
  }

  get logicalIndex() {
    return this.n ? ((this.index % this.n) + this.n) % this.n : 0;
  }

  get value() {
    return this.items[this.logicalIndex]?.value;
  }

  /** Physical index in the middle copy for a logical index. */
  physicalFor(logical) {
    return this.midStart + logical;
  }

  clampIndex(idx) {
    return Math.max(0, Math.min(this.n * this.copies - 1, idx));
  }

  /* ---------- items ---------- */

  /** Rebuild the rows. Keeps `value` selected if given (no onChange). */
  setItems(items, value) {
    this.closeEditor();
    this.items = items;
    this.n = items.length;
    if (this.loop && this.n > 1) {
      // Enough rows that a hard fling never reaches a physical end before settling.
      let c = Math.max(5, Math.ceil(200 / this.n));
      if (c % 2 === 0) c += 1;
      this.copies = c;
    } else {
      this.copies = 1;
    }
    this.midStart = Math.floor(this.copies / 2) * this.n;

    this.list.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let c = 0; c < this.copies; c++) {
      items.forEach((it, i) => {
        const row = document.createElement('div');
        row.className = 'wheel-item';
        row.dataset.index = String(c * this.n + i);
        row.setAttribute('role', 'option');
        row.textContent = it.label;
        frag.appendChild(row);
      });
    }
    this.list.appendChild(frag);
    this.index = -1; // force re-align
    this.setValue(value);
  }

  nearestLogical(value) {
    let idx = this.items.findIndex((it) => it.value === value);
    if (idx < 0 && typeof value === 'number' && Number.isFinite(value)) {
      let best = Infinity;
      this.items.forEach((it, i) => {
        const d = Math.abs(it.value - value);
        if (d < best) { best = d; idx = i; }
      });
    }
    return idx < 0 ? 0 : idx;
  }

  /** Select `value` without firing onChange. Picks the nearest item if not found. */
  setValue(value) {
    const li = this.nearestLogical(value);
    this.committed = li;
    // Stay in the current copy if we're already showing this value (avoids a visible jump
    // while the user's own scroll is still settling); otherwise go to the middle copy.
    const target = this.index >= 0 && this.logicalIndex === li ? this.index : this.physicalFor(li);
    this.scrollToIndex(target, false);
  }

  /** User-initiated selection (click / keyboard): scroll smoothly and report. */
  select(idx, smooth) {
    this.scrollToIndex(idx, smooth);
    this.commit();
  }

  /* ---------- scrolling ---------- */

  scrollToIndex(idx, smooth) {
    idx = this.clampIndex(idx);
    this.index = idx;
    this.markSelected();
    const top = idx * this.rowHeight;
    if (Math.abs(this.scroller.scrollTop - top) < 0.5) return;
    if (smooth) this.scroller.scrollTo({ top, behavior: 'smooth' });
    else this.scroller.scrollTop = top;
  }

  markSelected() {
    const rows = this.list.children;
    const li = this.logicalIndex;
    for (let i = 0; i < rows.length; i++) {
      const sel = this.loop ? i % this.n === li : i === this.index;
      rows[i].classList.toggle('is-selected', sel);
      rows[i].setAttribute('aria-selected', sel ? 'true' : 'false');
    }
  }

  handleScroll() {
    // Live highlight while scrolling.
    const idx = this.clampIndex(Math.round(this.scroller.scrollTop / this.rowHeight));
    if (idx !== this.index) {
      this.index = idx;
      this.markSelected();
    }
    if (!SUPPORTS_SCROLLEND || this.touching) this.scheduleSettle();
  }

  scheduleSettle() {
    clearTimeout(this.scrollTimer);
    this.scrollTimer = setTimeout(() => this.settle(), 140);
  }

  settle() {
    if (this.touching) return; // wait for the finger to lift
    clearTimeout(this.scrollTimer);
    const idx = this.clampIndex(Math.round(this.scroller.scrollTop / this.rowHeight));
    this.index = idx;
    this.markSelected();
    this.commit();
    this.recentre();
  }

  /** Loop only: jump (instantly, invisibly) back to the middle copy of the list. */
  recentre() {
    if (!this.loop) return;
    const mid = this.physicalFor(this.logicalIndex);
    if (mid === this.index) return;
    this.index = mid;
    this.scroller.scrollTop = mid * this.rowHeight;
  }

  commit() {
    const li = this.logicalIndex;
    if (li === this.committed) return;
    this.committed = li;
    this.onChange(this.value);
  }

  /* ---------- keyboard ---------- */

  handleKey(e) {
    if (e.key >= '0' && e.key <= '9') {
      // Start typing straight away.
      this.openEditor();
      this.input.value = e.key;
      e.preventDefault();
      if (this.input.value.length >= this.maxDigits) this.commitEdit();
      return;
    }
    let step = 0;
    switch (e.key) {
      case 'ArrowUp': step = -1; break;
      case 'ArrowDown': step = 1; break;
      case 'PageUp': step = -10; break;
      case 'PageDown': step = 10; break;
      case 'Home': step = -Infinity; break;
      case 'End': step = Infinity; break;
      case 'Enter': this.openEditor(); e.preventDefault(); return;
      default: return;
    }
    e.preventDefault();
    const target = step === -Infinity ? this.physicalFor(0)
      : step === Infinity ? this.physicalFor(this.n - 1)
      : this.index + step;
    this.select(target, true);
  }

  /* ---------- tap to type ---------- */

  openEditor() {
    if (this.editing || !this.n) return;
    this.editing = true;
    this.input.value = '';
    this.input.placeholder = this.items[this.logicalIndex]?.label ?? '';
    this.el.classList.add('is-editing');
    this.input.focus({ preventScroll: true });
  }

  closeEditor() {
    if (!this.editing) return;
    this.editing = false;
    this.el.classList.remove('is-editing');
    if (document.activeElement === this.input) this.input.blur();
  }

  commitEdit() {
    if (!this.editing) return;
    const text = this.input.value;
    this.closeEditor();
    if (text === '') return;
    const v = Number(text);
    if (!Number.isFinite(v)) return;
    const li = this.nearestLogical(v);
    this.scrollToIndex(this.physicalFor(li), false);
    this.commit();
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
