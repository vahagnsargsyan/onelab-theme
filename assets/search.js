/**
 * Predictive search.
 *
 * Wraps a real <form action="/search">. With this script blocked, typing and
 * pressing Enter runs an ordinary search — the results panel is the only thing
 * that stops working.
 *
 * Results come from the Section Rendering API rather than suggest.json, so the
 * markup is rendered by Liquid with the storefront's own money format,
 * translations, and market. No client-side templating.
 */
const SEARCH_DEBOUNCE = 250;

class PredictiveSearch extends HTMLElement {
  connectedCallback() {
    this.input = this.querySelector('[data-search-input]');
    this.results = this.querySelector('[data-search-results]');
    this.status = this.querySelector('[data-search-status]');
    this.clearButton = this.querySelector('[data-search-clear]');
    if (!this.input || !this.results) return;

    this.limit = this.dataset.limit || 6;
    this.controller = null;
    this.timer = null;

    this.onInput = this.onInput.bind(this);
    this.onKeydown = this.onKeydown.bind(this);

    this.input.addEventListener('input', this.onInput);
    this.addEventListener('keydown', this.onKeydown);
    this.clearButton?.addEventListener('click', () => this.reset({ focus: true }));

    this.setExpanded(false);
  }

  disconnectedCallback() {
    clearTimeout(this.timer);
    this.controller?.abort();
  }

  get routeRoot() {
    return window.Shopify?.routes?.root || '/';
  }

  onInput() {
    clearTimeout(this.timer);
    const term = this.input.value.trim();

    this.clearButton?.toggleAttribute('hidden', term.length === 0);

    if (term.length < 2) {
      this.reset();
      return;
    }

    // Debounced so a fast typist fires one request, not eight.
    this.timer = setTimeout(() => this.search(term), SEARCH_DEBOUNCE);
  }

  onKeydown(event) {
    if (event.key === 'Escape') {
      if (this.input.value) {
        this.reset({ focus: true });
        event.stopPropagation();
      }
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    const items = Array.from(this.querySelectorAll('[data-search-result]'));
    if (items.length === 0) return;

    event.preventDefault();
    const current = items.indexOf(document.activeElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    // From the input, ArrowUp wraps to the last result.
    const next = current === -1 ? (step === 1 ? 0 : items.length - 1) : current + step;

    if (next < 0) {
      this.input.focus();
    } else {
      items[Math.min(next, items.length - 1)].focus();
    }
  }

  async search(term) {
    // Abort the in-flight request so a slow early response cannot overwrite a
    // newer one — the classic out-of-order autocomplete bug.
    this.controller?.abort();
    this.controller = new AbortController();

    const params = new URLSearchParams({
      q: term,
      section_id: 'predictive-search',
      'resources[type]': 'product,article,page',
      'resources[limit]': this.limit,
    });

    this.classList.add('is-loading');

    try {
      const response = await fetch(`${this.routeRoot}search/suggest?${params}`, {
        signal: this.controller.signal,
      });
      if (!response.ok) throw new Error(response.statusText);

      const markup = await response.text();
      const parsed = new DOMParser().parseFromString(markup, 'text/html');
      const inner = parsed.querySelector('[data-search-inner]');

      this.results.innerHTML = inner ? inner.innerHTML : '';
      this.setExpanded(true);
      this.announce();
    } catch (error) {
      if (error.name === 'AbortError') return;
      this.results.innerHTML = '';
      this.setExpanded(false);
    } finally {
      this.classList.remove('is-loading');
    }
  }

  /** Moves the rendered count into the live region so it is spoken once. */
  announce() {
    if (!this.status) return;
    const announcement = this.results.querySelector('[data-search-announce]');
    this.status.textContent = announcement ? announcement.textContent.trim() : '';
  }

  setExpanded(expanded) {
    this.input.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    this.results.toggleAttribute('hidden', !expanded);
  }

  reset({ focus = false } = {}) {
    clearTimeout(this.timer);
    this.controller?.abort();
    this.input.value = '';
    this.results.innerHTML = '';
    this.clearButton?.setAttribute('hidden', '');
    this.setExpanded(false);
    if (this.status) this.status.textContent = '';
    if (focus) this.input.focus();
  }
}

if (!customElements.get('predictive-search')) {
  customElements.define('predictive-search', PredictiveSearch);
}

/**
 * Opens and closes the search dialog. Kept separate from the element above so
 * the search itself works anywhere, dialog or not.
 */
class SearchToggle extends HTMLElement {
  connectedCallback() {
    this.dialog = this.querySelector('dialog');
    if (!this.dialog) return;

    document.querySelectorAll('[data-search-open]').forEach((button) => {
      button.addEventListener('click', () => this.open());
    });

    this.querySelectorAll('[data-search-close]').forEach((button) => {
      button.addEventListener('click', () => this.dialog.close());
    });

    // Clicking the backdrop closes; clicking the panel must not.
    this.dialog.addEventListener('click', (event) => {
      if (event.target === this.dialog) this.dialog.close();
    });

    this.dialog.addEventListener('close', () => {
      this.querySelector('predictive-search')?.reset();
    });
  }

  open() {
    if (typeof this.dialog.showModal === 'function') {
      this.dialog.showModal();
    } else {
      this.dialog.setAttribute('open', '');
    }
    this.querySelector('[data-search-input]')?.focus();
  }
}

if (!customElements.get('search-toggle')) {
  customElements.define('search-toggle', SearchToggle);
}
