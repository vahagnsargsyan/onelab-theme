/**
 * Faceted filtering and sorting.
 *
 * The markup is a working GET form on its own: every control carries the
 * parameter name Shopify expects, so Apply submits and the page filters with no
 * script at all. This intercepts that submit and re-renders the section through
 * the Section Rendering API instead, so filtering does not cost a full page
 * load — and, because the results come back rendered by Liquid, there is no
 * second templating layer here that could drift from the section.
 */
class FacetFilters extends HTMLElement {
  connectedCallback() {
    this.dialog = this.querySelector('[data-facet-dialog]');
    this.results = this.querySelector('[data-facet-results]');

    this.addEventListener('click', (event) => this.onClick(event));
    this.addEventListener('submit', (event) => this.onSubmit(event));
    this.addEventListener('change', (event) => this.onChange(event));
    this.addEventListener('input', (event) => this.onInput(event));

    this.unlockPriceFields();

    // Back and forward have to filter too, or the URL starts lying.
    window.addEventListener('popstate', () => this.render(window.location.href, false));
  }

  /** Re-read every time: the form's contents are replaced on each render. */
  get form() {
    return this.querySelector('[data-facet-form]');
  }

  /**
   * The price fields ship read-only so that, without this script, they read as
   * the readouts they are rather than looking editable and doing nothing.
   */
  unlockPriceFields() {
    this.querySelectorAll('[data-price-from-text], [data-price-to-text]').forEach((input) => {
      input.removeAttribute('readonly');
    });
  }

  onClick(event) {
    if (event.target.closest('[data-facet-open]')) {
      this.open();
      return;
    }

    if (event.target.closest('[data-facet-close]')) {
      this.close();
      return;
    }

    const clear = event.target.closest('[data-facet-clear]');
    if (clear) {
      event.preventDefault();
      this.close();
      this.render(clear.href);
      return;
    }

    const link = event.target.closest('[data-facet-link]');
    if (link) {
      event.preventDefault();
      this.render(link.href);
    }
  }

  onSubmit(event) {
    if (!event.target.matches('[data-facet-form]')) return;
    event.preventDefault();
    this.close();
    this.render(this.buildUrl());
  }

  onChange(event) {
    // Sorting applies straight away; there is nothing to confirm.
    if (event.target.matches('[data-facet-sort]')) {
      this.render(this.buildUrl());
      return;
    }

    // A typed price is only meaningful once the field is done being typed in.
    if (event.target.matches('[data-price-from-text], [data-price-to-text]')) {
      this.syncFromText(event.target);
    }
  }

  onInput(event) {
    if (event.target.matches('[data-price-from], [data-price-to]')) {
      this.syncFromSlider(event.target);
    }
  }

  /** Slider moved: clamp it against its partner, then mirror it into the field. */
  syncFromSlider(slider) {
    const group = slider.closest('price-range');
    if (!group) return;

    const from = group.querySelector('[data-price-from]');
    const to = group.querySelector('[data-price-to]');
    if (!from || !to) return;

    // The handles must not cross, or the range reads backwards.
    if (Number(from.value) > Number(to.value)) {
      if (slider === from) {
        from.value = to.value;
      } else {
        to.value = from.value;
      }
    }

    group.querySelector('[data-price-from-text]').value = from.value;
    group.querySelector('[data-price-to-text]').value = to.value;
  }

  /** Field typed in: push the value back onto the slider that carries the name. */
  syncFromText(field) {
    const group = field.closest('price-range');
    if (!group) return;

    const isFrom = field.matches('[data-price-from-text]');
    const slider = group.querySelector(isFrom ? '[data-price-from]' : '[data-price-to]');
    if (!slider) return;

    const min = Number(group.dataset.boundMin);
    const max = Number(group.dataset.boundMax);
    const value = Math.min(Math.max(Number(field.value) || min, min), max);

    slider.value = value;
    this.syncFromSlider(slider);
  }

  /** The form's state as a URL, minus everything that would filter nothing. */
  buildUrl() {
    const form = this.form;
    if (!form) return window.location.href;

    const params = new URLSearchParams();
    new FormData(form).forEach((value, key) => {
      if (value !== '') params.append(key, value);
    });

    // A price handle sitting on its own bound excludes nothing, so it does not
    // belong in the URL — otherwise "no filters" would still look filtered.
    this.querySelectorAll('price-range').forEach((group) => {
      const from = group.querySelector('[data-price-from]');
      const to = group.querySelector('[data-price-to]');

      if (from && Number(from.value) <= Number(group.dataset.boundMin)) params.delete(from.name);
      if (to && Number(to.value) >= Number(group.dataset.boundMax)) params.delete(to.name);
    });

    const query = params.toString();
    return query ? `${form.action}?${query}` : form.action;
  }

  async render(url, push = true) {
    const section = this.dataset.sectionId;
    if (!section) return;

    this.setAttribute('aria-busy', 'true');

    try {
      const target = new URL(url, window.location.origin);
      target.searchParams.set('section_id', section);

      const response = await fetch(target.toString());
      if (!response.ok) {
        // Better a full page load than a page that silently stopped filtering.
        window.location.href = url;
        return;
      }

      const parsed = new DOMParser().parseFromString(await response.text(), 'text/html');

      const nextResults = parsed.querySelector('[data-facet-results]');
      if (nextResults && this.results) this.results.innerHTML = nextResults.innerHTML;

      // The filter list itself changes: counts, and which values are still
      // reachable. Swapping it keeps the drawer honest about what is left.
      const nextForm = parsed.querySelector('[data-facet-form]');
      if (nextForm && this.form) this.form.innerHTML = nextForm.innerHTML;

      this.unlockPriceFields();

      // Anything watching for new content — reveal-on-scroll, at present.
      document.dispatchEvent(new CustomEvent('theme:contentchange'));

      if (push) window.history.pushState({}, '', url);
    } catch (error) {
      window.location.href = url;
    } finally {
      this.removeAttribute('aria-busy');
    }
  }

  open() {
    if (!this.dialog) return;
    if (typeof this.dialog.showModal === 'function') {
      this.dialog.showModal();
    } else {
      this.dialog.setAttribute('open', '');
    }
  }

  close() {
    this.dialog?.close();
  }
}

if (!customElements.get('facet-filters')) customElements.define('facet-filters', FacetFilters);
