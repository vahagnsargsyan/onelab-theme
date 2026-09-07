# Shopify Theme Store — Development Prompt

Paste this at the start of any session that touches theme code, or keep it as
`CLAUDE.md` inside the theme folder so it loads automatically.

Source: https://shopify.dev/docs/storefronts/themes/store/requirements (read 2026-09-03).
Requirements change — re-read the page before a submission cycle.

---

## Role

You are building a theme for submission to the **Shopify Theme Store**. Every
requirement below is a pass/fail gate at review. A theme that misses any one of
them is rejected, and repeated rejections can suspend the Partner account. Treat
these as hard constraints, not suggestions.

When a change would violate a rule, say so and propose a compliant alternative
instead of implementing it.

## Non-negotiables (fail the review outright)

- **Base codebase**: build only on Shopify's **Skeleton Theme**. Themes derived
  from Dawn or Horizon are ineligible. Do not copy Dawn/Horizon sections in
  wholesale — reference for patterns only, then write original code.
- **Uniqueness**: the theme must be fundamentally different from what is already
  on the Theme Store, across core templates as a whole. Color swaps, spacing
  tweaks, and animation changes are not differentiation. Headers, navigation,
  product cards, and page structure need a deliberate design system.
- **No Sass.** No `.scss` or `.scss.liquid` files. Native CSS only, in `.css` or
  `.css.liquid`.
- **No minified `.css`/`.js`** except ES6 modules and third-party libraries.
- **No `config/markets.json`.** No `robots.txt.liquid`.
- **No designer credits, affiliate links, or backlinks** anywhere in theme or demo.
- **No app dependencies.** The theme must work fully without any app installed,
  and must not implement app-like features that need API access to function.
- **No dark patterns**: no fake countdown timers, fake stock counters, fake
  "N people viewing", or any misleading urgency.
- **Scripts must be hosted on Shopify's servers**, except approved third-party
  libraries. Never modify or parse `content_for_header`.
- **Branded button colors are locked**: dynamic/accelerated checkout buttons and
  the **Follow on Shop** button keep their branded colors.
- Links to Shopify domains carry `rel="nofollow"`. Use protocol-relative URLs —
  never hard-code `http://` or `https://`.

## Score gates

Averaged across home, collection, and product templates, on **both** desktop and
mobile, with realistic (non-empty) sections containing real images and content:

| Metric | Minimum |
| --- | --- |
| Lighthouse performance | **60** |
| Lighthouse accessibility | **90** |

Run these before declaring any performance-affecting work done.

## Required files

Layout: `theme.liquid`
Templates: `404.json`, `article.json`, `blog.json`, `cart.json`,
`collection.json`, `index.json`, `list-collections.json`, `page.json`,
`page.contact.json`, `password.json`, `product.json`, `search.json`,
`gift_card.liquid`
Config: `settings_data.json`, `settings_schema.json`

Every JSON template supports sections (except customer accounts, gift card, and
checkout). Header and footer use **section groups**. A **Custom Liquid** section
is available on every template that supports sections. The main product section
and featured product section must accept **app blocks** (`type: "@app"`), with
Custom Liquid blocks as insertion points.

## Required features

Sections Everywhere (OS 2.0) · discounts shown per-item and per-order in cart,
checkout, and order templates · accelerated checkout buttons on product and cart,
**enabled by default** · faceted filtering on collection and search (availability,
price, type, vendor, variant options) · gift card template + issued gift card
display · image focal points · `page_image` for social thumbnails · country/region
and language selectors · multi-level menus · newsletter form · pickup availability
on product · product recommendations **and** complementary products · rich media
(3D models, video, Vimeo, YouTube) in product template, featured product, and
quick view · search box + search template + predictive search · selling plans
shown in cart · Shop Pay Installments banner on `product.liquid` · unit pricing on
collection, product, and cart · variant images · Follow on Shop button via the
`login_button` filter · `<shopify-account>` in **both** desktop and mobile header.

## Per-template checklists

**Layout** — `<html lang="{{ request.locale.iso_code }}">`; payment icons via
`enabled_payment_types` and the payment filters, full color; all dynamic URLs
from the `routes` object.

**Product** — `product.title` untruncated, `variant.price`, `variant.unit_price`,
variant compare-at price, `product.description`, option names and values. All
product images viewable; varying aspect ratios must not break layout. Variant
image swaps on selection. `cart.taxes_included` drives the tax-inclusive note.
Separated variant options, quantity input, add-to-cart disabled for unavailable
variants, price updates via callback, first *available* variant loads. Gift card
products support recipient fields (`form.email`, `form.name`, `form.message`,
`send_on`). Swatches render via `swatch.image` / `swatch.color`.

**Collection** — `collection.title` untruncated, `collection.description`,
`collection.image`. Cards: `product.title` untruncated and linked to
`product.url`, `product.price`, `product.images`, `variant.unit_price`, at least
one media item. Mixed aspect ratios must not break the grid. Sale badge or
`product.compare_at_price_max` where applicable. `product.price_varies` when
variants differ. Sorting. Empty-collection message. Pagination or lazy loading.

**Collection list** — `collection.title` untruncated,
`collection.featured_image`, pagination or lazy loading.

**Cart** — per line item: `title`, `unit_price`, `image`, `final_price`,
`quantity`, `options_with_values`. `cart.total_price` visible.
`cart.taxes_included` note. Checkout button. Quantity editing that refreshes line
items. Empty-cart message. Cart notes, selling plans, automatic discounts, and
accelerated checkout enabled by default.

**Page** — `page.title`, `page.content`, plus the alternate contact form template.

**Blog** — `blog.title`; per article `article.title` untruncated and linked,
`article.image`, `article.excerpt_or_content` (never `article.content`);
pagination or lazy loading.

**Article** — `article.title` untruncated, `article.comments` (paginated),
`article.published_at` (not `created_at`). Comment flow works without moderation,
with success and error messages rendered.

**Search** — no-results message, multiple `object_type`s (products, blogs,
pages), pagination or lazy loading.

**404** — plain "page not found" message plus a way forward (search or home link).

**Gift card** — Apple Wallet support, gift card code, QR code at 120×120px
minimum, logo or `shop.name`.

**Password** — logo or `shop.name`, `shop.password_message`, and the
`storefront_password` form tag.

## Accessibility

Everything keyboard-operable, including dropdown navigation. Visible focus state
on every focusable element. Focus order matches DOM order. `alt` on every image
(`image.alt` or `image_tag: alt:`). Form inputs have unique IDs with matching
`for` labels. Valid HTML. Contrast 4.5:1 for body text, 3:1 for 18pt+ text and
non-text elements. Touch targets at least 24×24 CSS px. `h1`–`h6` visually
distinct from one another.

## SEO and social

SEO metadata snippet with title, meta description, and canonical URL. Google rich
product snippets. Open Graph and Twitter card tags. A set of social icons to pick
from, with placeholder text left empty.

## Images and fonts

Responsive image strategy everywhere except small icons; images load only as
needed. Fonts use the `font_picker` setting type with a default, must be
currently available, and CSS loads bold, italic, and bold-italic via
`font_modify`. Custom font uploads are not accepted.

## Settings and copy

At least 4 colors; every background color setting has a matching foreground
setting; all use `type: color`. Favicon setting. Logo upload tolerates any aspect
ratio. Every setting has a `label`. `theme_info` section present. Header/footer
`link_list` settings default to `main-menu` / `footer`. Resource-based defaults
must reference resources that exist in every store. `metaobject` and
`metaobject_list` settings use standard definitions only. Theme editor changes
must reflect in the preview (`request.design_mode` for debugging).

Copy rules: sentence case for section names, American English, no ampersands,
declarative statements not questions, active voice, buttons and actions start
with a verb, descriptive option names, no numbered options, no Lorem Ipsum.

Shopify terminology — use the left, never the right:
home page / homepage · slideshow / slider · checkout / check out · heading /
title · signup / sign-up · favicon / shortcut icon · social media / social
sharing · social media icons / social media buttons · navigation, main menu /
menus, menu · cart type / Ajax cart.
Verb choice: **use** for actionable options, **show** for show/hide, **enable**
for app-related options.

## Naming

1–2 words, under 30 characters, a noun, easy to spell and pronounce, unique on
the Theme Store, distinct from Shopify products/events and from industry names.
No company or Partner account name, no reference to other platforms or SEO
claims. One preset matches the parent theme name. Presets live under
`listings/<preset-name>/templates/*.json` (plus optional `sections/`).

## Demo stores

Every preset ships at least one demo store, matching the theme's industry and
catalog size, and the install state must mirror the demo (layout, colors,
typography, copy). Authentic content only — no Lorem Ipsum, no profanity. Bogus
Gateway or Shopify Payments test mode on, all other checkout options off. No
apps (free review and translation apps excepted, fully translated).
`powered_by_link` unaltered. No affiliate links. No embedded text in images
except on physical products, infographics, or badges. No animated GIFs that could
be mistaken for theme functionality. Rights secured for every asset.

## Browser support

Desktop: Safari (latest 2, Mac), Chrome (latest 3, Mac + PC), Firefox (latest 3,
Mac + PC), Edge (latest 2, PC).
Mobile: Mobile Safari (latest 2, iOS), Chrome Mobile (latest 3, Android + iOS),
Samsung Internet (latest 2, Android).
Webviews: Instagram, Facebook, Pinterest — latest release, Android + iOS.

## Theme conventions (Onelab)

These are project rules on top of the Theme Store requirements. Treat a
violation the same way as a requirement violation: flag it, don't ship it.

- **Every section uses the shared layout.** The root element is rendered with
  `{% render 'layout-style', s: section.settings, class: '...' %}`, followed by
  `{% render 'layout-background', s: section.settings %}`, with blocks wrapped
  in `.layout__content > .layout__blocks`. The section's schema includes the
  canonical settings JSON from the `{% doc %}` block of
  `snippets/layout-style.liquid`, verbatim. Sections own no layout, padding,
  border, background, or color-scheme CSS of their own —
  `sections/custom-section.liquid` is the reference.
- **Change shared settings in one place.** Edit the canonical JSON in
  `layout-style.liquid` first, then propagate to every section. Schemas cannot
  include each other, so this is a manual sync — grep for `"id": "padding_top"`
  to find every copy.
- **Sections read custom properties, never `settings.*`.** Typography comes from
  `--text-{style}-*`, colors from `--color-*`, layout from `--layout-*`. A section
  reading `settings.h1_size` directly is a bug.
- **Text is one block.** Headings, subheadings, and paragraphs all use
  `blocks/text.liquid` with the Preset setting; do not add separate heading or
  paragraph blocks. The visual preset and the HTML tag stay independent settings.
- **Every section accepts `@theme` and `@app` blocks.**
- **Every new `t:` key lands in `locales/en.default.schema.json` in the same
  change.** Theme check enforces this; don't leave it for later.

## Working agreement

1. Before writing code for a template or feature, restate which requirements
   above it touches.
2. After a change, run `shopify theme check` and report the output honestly.
3. Before claiming a task is done, walk its checklist section and state which
   items are verified, which are assumed, and which are outstanding.
4. Never silently drop a requirement to make something work. Flag the conflict.
5. If a requirement here contradicts the live docs, the live docs win — re-fetch
   and update this file.

## Pre-submission gate

- [ ] `shopify theme check` clean
- [ ] Lighthouse performance ≥ 60 average (home, collection, product; desktop + mobile)
- [ ] Lighthouse accessibility ≥ 90 average (same pages, both form factors)
- [ ] All required templates and config files present
- [ ] Every required feature implemented and reachable
- [ ] Keyboard-only pass through the whole storefront
- [ ] No Sass, no minified first-party assets, no `markets.json`, no `robots.txt.liquid`
- [ ] Theme functions with zero apps installed
- [ ] Settings copy audited against terminology and text-style rules
- [ ] Demo store parity with install state, authentic content, test payments only
- [ ] Documentation and public support contact form live and linked
- [ ] Version number and release notes prepared

## Post-launch obligations

Merchant support is a full-time commitment: replies within two business days,
theme bugs (broken layouts, dead links, logic errors) are yours to fix, and
critical bugs must be fixed immediately or the theme can be pulled from the
store. Documentation and the support contact form must exist before launch, stay
grammatically clean, match the theme's settings copy, include an FAQ, and be kept
current with Shopify's changes.
