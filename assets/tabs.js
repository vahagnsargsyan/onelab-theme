/**
 * Tabs.
 *
 * The markup ships as a list of links to panels that are all rendered, so the
 * content is reachable and findable with scripting off. This upgrades that
 * strip in place to the ARIA tabs pattern: one panel open at a time, arrow keys
 * moving between tabs, and the duplicated panel headings hidden once the strip
 * is carrying that job.
 *
 * Driven entirely by data attributes, so the product page's tabs and the
 * tabbed collections section share it without sharing a single class name.
 */
class ContentTabs extends HTMLElement {
  connectedCallback() {
    this.tabs = Array.from(this.querySelectorAll('[data-tab]'));
    this.panels = Array.from(this.querySelectorAll('[data-panel]'));
    if (this.tabs.length < 2) return;

    this.querySelector('[data-tab-list]')?.setAttribute('role', 'tablist');

    this.tabs.forEach((tab, index) => {
      tab.setAttribute('role', 'tab');
      tab.addEventListener('click', (event) => {
        event.preventDefault();
        this.select(index);
      });
      tab.addEventListener('keydown', (event) => this.onKeydown(event, index));
    });

    this.panels.forEach((panel) => {
      panel.setAttribute('role', 'tabpanel');
      // Focusable, so a keyboard reaches the panel content after the strip.
      panel.setAttribute('tabindex', '0');
      panel.querySelector('[data-panel-heading]')?.setAttribute('hidden', '');
    });

    // A link to one panel should still land on it, wherever it came from.
    const linked = this.panels.findIndex((panel) => `#${panel.id}` === window.location.hash);
    this.select(linked > -1 ? linked : 0);

    // Selecting a tab in the theme editor brings its panel forward.
    document.addEventListener('shopify:block:select', (event) => {
      const index = this.panels.indexOf(event.target.closest('[data-panel]'));
      if (index > -1) this.select(index);
    });
  }

  select(index) {
    this.index = index;

    this.tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      // Roving tabindex: the strip is one tab stop, arrows move within it.
      tab.setAttribute('tabindex', active ? '0' : '-1');
      tab.classList.toggle('is-active', active);
    });

    this.panels.forEach((panel, i) => {
      panel.hidden = i !== index;
    });
  }

  onKeydown(event, index) {
    const steps = { ArrowRight: 1, ArrowLeft: -1 };
    let next;

    if (event.key in steps) {
      next = (index + steps[event.key] + this.tabs.length) % this.tabs.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = this.tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    this.select(next);
    this.tabs[next].focus();
  }
}

if (!customElements.get('content-tabs')) customElements.define('content-tabs', ContentTabs);
