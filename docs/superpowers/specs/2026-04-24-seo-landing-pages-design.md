# SEO Landing Pages Design

Date: 2026-04-24
Project: MathSheets (`https://mathsheet.app`)
Status: Approved for spec drafting, pending user review

## Summary

MathSheets already has a basic SEO foundation: route-level titles and descriptions, a sitemap, a robots file, canonical tags, and baseline structured data. The main gap is discoverable topic coverage. The site is currently a client-rendered Vite SPA with very few indexable URLs that match real worksheet search intent.

This design adds a first batch of ten English-language SEO landing pages inside the existing frontend app, without migrating to SSR. Each page will target a specific worksheet intent, include meaningful static content, link to related pages, and send users into the worksheet generator. In parallel, the technical SEO layer will be tightened so crawlers can discover and classify those pages more reliably.

## Goals

1. Increase the number of indexable pages that match real search intent around printable math worksheets.
2. Improve relevance for long-tail queries such as "addition worksheets", "math worksheets with answers", and grade-level worksheet searches.
3. Strengthen technical SEO signals with better crawl directives, structured data, canonical handling, and internal linking.
4. Keep implementation simple and compatible with the existing Vite SPA architecture.

## Non-Goals

1. Do not migrate the site to SSR.
2. Do not introduce a large-scale programmatic SEO system with dozens or hundreds of pages in this pass.
3. Do not build a blog or separate CMS in this pass.
4. Do not attempt backlink acquisition or external distribution work in code.

## Constraints

1. The site remains English-first for this pass.
2. The page set is limited to ten content-rich pages.
3. Pages should feel useful and distinct, not like thin doorway content.
4. Tooling changes should stay minimal and fit the current Vite deployment model.

## Existing State

The current frontend already contains:

1. Route-level title and description metadata in the router.
2. `robots.txt` and `sitemap.xml` in `frontend/public`.
3. Canonical, Open Graph, Twitter, and generic SEO tag support in `frontend/src/lib/seo.ts`.
4. A generic `WebSite` JSON-LD block in `frontend/index.html`.

The main limitations are:

1. Only a small set of URLs are currently indexable.
2. The homepage carries most of the topical SEO burden.
3. There are no dedicated content pages for core worksheet intents.
4. Structured data is generic rather than page-aware.

## Proposed Approach

Create a reusable SEO landing page system inside the frontend. Instead of hand-building ten disconnected pages, define a single typed content source and render it through one shared landing page view. Route metadata, structured data, visible content, internal links, and sitemap entries should all derive from the same content definitions.

This keeps the implementation maintainable, reduces duplicated SEO logic, and makes future page additions straightforward.

## Page Set

The first batch of SEO landing pages will be:

1. `/printable-math-worksheets`
2. `/addition-worksheets`
3. `/subtraction-worksheets`
4. `/multiplication-worksheets`
5. `/division-worksheets`
6. `/mixed-operations-worksheets`
7. `/math-worksheets-with-answers`
8. `/grade-1-math-worksheets`
9. `/grade-2-math-worksheets`
10. `/grade-3-math-worksheets`

These pages balance broad category terms with higher-intent long-tail queries. The grade-level pages should not duplicate the operation pages. They must explain the typical skill focus for that grade and direct users toward appropriate practice types.

## Information Architecture

### Shared Content Model

Add a typed content definition module for SEO pages. Each page definition should include:

1. `slug`
2. `title`
3. `description`
4. `keywords`
5. `h1`
6. Introductory copy
7. Example problems
8. Audience or use-case section
9. FAQ items
10. Related links
11. Generator CTA text

This module becomes the single source of truth for:

1. Route registration
2. SEO metadata
3. Structured data
4. Sitemap generation source data
5. Visible page content

### Reusable Landing View

Create one reusable SEO landing page view that reads the content definition for a slug and renders:

1. Hero section with `H1`
2. Introductory explanatory copy
3. Example problem block
4. "Best for" or use-case guidance
5. FAQ section
6. Related worksheet links
7. Prominent CTA to the worksheet generator

### Internal Linking

Internal links should exist in three places:

1. From the homepage into the key worksheet topic pages
2. Between related SEO pages
3. From each SEO page into the generator route

This improves crawl discovery and makes the SEO pages useful in the actual navigation experience.

## Content Requirements

Each page should include:

1. A unique title tag
2. A unique meta description
3. One clear `H1`
4. Approximately 150 to 300 words of meaningful introductory content
5. Three to five sample problems or concrete examples
6. A short audience-oriented section for teachers, parents, or homeschool use
7. Two to four FAQ entries that are specific to the page topic
8. Links to adjacent worksheet categories
9. A generator CTA with topic-aware wording

The copy must not read like filler. Pages should explain when the worksheet type is useful, what kind of practice it supports, and how it differs from related categories.

## Technical SEO Changes

### Metadata

Extend the SEO helper so landing pages can output:

1. Page-specific canonical URLs
2. Open Graph title, description, and URL
3. Twitter title and description
4. Page-specific keywords

If practical within the existing helper shape, support an explicit social image path for later extension, even if this pass does not generate custom images yet.

### Structured Data

Keep the site-level application schema and expand it:

1. Preserve a base `WebApplication` or equivalent site-level schema describing MathSheets as a web-based educational worksheet generator.
2. Inject page-level `WebPage` schema for each SEO landing page.
3. Inject `FAQPage` schema when a page includes FAQs.

The structured data should come from the same page definitions used by the visible content to avoid drift.

### Robots

Update `robots.txt` to explicitly allow:

1. `User-agent: *`
2. `User-agent: GPTBot`
3. `User-agent: OAI-SearchBot`

The file should continue to expose the sitemap URL.

### Sitemap

Expand `sitemap.xml` to include all ten new landing page URLs. If the sitemap is still manually maintained in this pass, its contents must stay aligned with the shared page definitions.

## Rendering Strategy

Do not introduce SSR. Keep the existing Vite SPA architecture.

Within that constraint:

1. The landing pages should render plain semantic HTML in Vue.
2. Important text content should be visible without requiring user interaction.
3. The page should not depend on client-side data fetching to show the core SEO content.

This does not provide the same SEO ceiling as prerendered HTML, but it materially improves the current state without increasing deployment complexity.

## Testing Strategy

Add or update frontend tests to verify:

1. The shared SEO page definitions contain all expected pages and required fields.
2. Router registration covers the ten new landing page routes.
3. Metadata generation applies correct titles, descriptions, canonicals, and robots values.
4. Structured data output exists for `WebPage` and `FAQPage` where appropriate.
5. A representative landing page renders its `H1`, intro content, FAQ content, related links, and generator CTA.
6. `robots.txt` includes the desired crawler directives.
7. `sitemap.xml` contains the new URLs.

## Rollout Notes

This pass should ship the full technical cleanup together with the first batch of ten pages. That gives search engines enough topical coverage to make the metadata improvements meaningful.

After release, the next likely follow-up work would be:

1. Submit the sitemap in Google Search Console and Bing Webmaster Tools.
2. Add IndexNow support.
3. Measure which pages get indexed and which queries start appearing.
4. Expand into additional long-tail worksheet topics based on early impressions and clicks.

## Risks

1. Because the app remains client-rendered, indexing may still lag behind a prerendered or SSR site.
2. If the pages are too similar, they may underperform despite the increased URL count.
3. If the homepage and app navigation do not link into the new pages clearly, discovery will be weaker than intended.
4. If shared content data and sitemap entries drift apart over time, crawl signals will become inconsistent.

## Success Criteria

This design will be considered successful if:

1. MathSheets ships ten distinct landing pages for core worksheet intents.
2. Each page exposes unique metadata, meaningful visible copy, FAQs, and related links.
3. The sitemap and robots files include the expected crawl signals.
4. The existing app architecture remains simple and deployable without SSR migration.
5. The codebase gains a reusable content-driven foundation for future SEO page expansion.
