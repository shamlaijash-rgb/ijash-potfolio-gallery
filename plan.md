# IJ Designz — cinematic portfolio update plan

## Implementation and structure

Rework the existing buildless static homepage in place on the current GitHub feature branch. Keep the existing domain, canonical and Open Graph metadata, structured data, all 39 entries in `dist/projects.json`, each project page and gallery, local artwork, and all contact destinations. Do not create or publish a second site.

Keep `dist/index.html` as the semantic homepage and progressive-enhancement host. Add `dist/cinematic-gallery.css` after the current styles as the final visual layer. Preserve `dist/style.css`, the original theme and component styles, `dist/event-lab.css`, `dist/seo.css`, and `dist/editorial-redesign.css` as the working base. Keep the original hero asset at `dist/assets/event-studio-hero.webp` and retain its existing motion and pause control.

Use the Higgsfield Elin Marlow portfolio demonstration only as a reference for full-image emphasis, restrained viewfinder marks, film-frame labels, floating information panels, and brief focus transitions. Reuse IJ Designz's own existing images, text, project descriptions, and branding. Do not use or imply the reference photographer's identity, work, claims, or assets. Do not add video playback: project videos stay deferred until the owner supplies the binaries. Keep normal page scrolling and use short cinematic scenes rather than a long pinned sequence.

Project structure and responsibilities:
- `dist/index.html`: semantic content, navigation, accessible controls, forms, dialogs, canonical URL and structured data.
- `dist/cinematic-gallery.css`: final responsive film/viewfinder treatment, scoped to the homepage.
- `dist/editorial-redesign.css` and existing stylesheets: reusable layout, component styling, interactive studio and SEO-link styles.
- `dist/app.js`, `dist/project-search.js`, `dist/interview.js`, `dist/event-lab.js`, `dist/portfolio-polish.js`, `dist/creative-motion.js`, `dist/hero-people.js`: current project rendering, filters, galleries, enquiry flow, studio controls, navigation and motion; keep their contracts intact.
- `dist/projects.json`, `dist/projects/`, `dist/assets/`: project data, individual pages, galleries and the owner's supplied images.

## Design description

- **Design movement:** Cinematic technical gallery: an exhibition-design portfolio framed like a refined camera viewfinder, inspired by the Elin Marlow showcase's still-image film treatment.
- **Core principles:** Let real project imagery lead; place concise metadata in glass-like floating panels; make the concept/on-site distinction unmistakable; keep browsing and enquiry actions easy to reach.
- **Color philosophy:** Midnight navy and ink create a focused viewing environment. Warm paper surfaces keep long-form information comfortable to read. IJ Designz peach/orange stays the unmistakable accent, not a generic neon color.
- **Layout paradigm:** One image-led opening frame followed by two short featured-project scenes; then return to a navigable catalogue and ordinary scrolling for the 39-project index, designer profile, process, studio lab and contact. No scroll hijacking or long pinned sequence.
- **Signature elements:** Fine viewfinder corner marks; compact mono frame/category labels; translucent caption panels and a restrained top progress line.
- **Interaction philosophy:** Keep existing search, category/type filters, mobile navigation, accessible galleries, zoom, swipe, keyboard controls, enquiry flows and studio builder. Use normal anchor scrolling; transitions never block input.
- **Animation:** Preserve the original hero illustration movement and pause control. Add only short image-scale and panel reveal transitions. Disable or settle them for `prefers-reduced-motion`.
- **Typography system:** Use the current system sans-serif for interface and body copy, a restrained editorial face for headline accents, and monospace for technical labels. Preserve legibility at phone widths.
- **Brand essence:** An independent portfolio for exhibition, event and spatial design that presents concepts alongside installed work; imaginative, considered and precise.
- **Brand voice:** Concrete, visual and uninflated. Existing examples remain “Big ideas deserve a remarkable stage.” and “Explore the idea. Then see it in the room.”
- **Wordmark & logo:** Retain the outlined IJ DESIGNZ wordmark exactly, including the peach/orange final Z.
- **Signature brand color:** Existing IJ Designz peach/orange, approximately `#efae79`.

Reference sources: https://higgsfield.ai/skills/website ; https://elin-marlow.higgsfield.app/ ; https://static.higgsfield.ai/skills-landing/website/photographer-portfolio.mp4


## Interactive cursor refinement (2026-10-21)

Keep the existing cinematic/editorial direction, navy/cream/peach palette and broad content structure. Current inspiration research supports bold, expressive typography, restrained motion/micro-interactions, and cursor-led affordances; the specific interaction is adapted to this portfolio rather than copying another site's visual identity. Add one context cue—an “OPEN CASE” badge that follows the pointer over project cards—using the existing peach accent. Keep the native cursor everywhere else, make the cue aria-hidden and non-interactive, and disable it for touch/coarse pointers and reduced-motion preferences. No external runtime library, replacement artwork, content change, scroll hijack or new publication target.

Research references: [Figma — Web design trends](https://www.figma.com/resource-library/web-design-trends/) (bold typography and motion/micro-interactions, balanced with sustainable and accessible implementation); [Awwwards — Hovers, Cursors and Cute Interactions](https://www.awwwards.com/awwwards/collections/hovers-cursors-and-cute-interactions/) (portfolio cursor-interaction examples).


## Scroll-reactive background refinement (2026-10-21)

Extend the existing fixed, aria-hidden `#scroll-atmosphere`; do not add a second background or visual asset. Reuse the motion layer's existing passive, requestAnimationFrame-batched `scrollJobs` loop. During normal motion, drift the existing peach and blue ambient light pools at subtly different transform-only rates, and let the thin viewfinder line travel slowly across the viewport as document scroll progresses. The user scrolls normally; the background remains `pointer-events:none`, does not obscure content, and falls back to its current still appearance if JavaScript or motion is unavailable. Keep desktop movement restrained and reduce the travel on touch-sized screens. Turn the effect off for `prefers-reduced-motion`, including when the preference changes during the session; retain all existing content and project interactions.

Research notes: Figma's 2026 trend article highlights immersive depth and motion storytelling; Awwwards' parallax collection demonstrates layered scroll depth; Lovable's 2026 scrolling-pattern guide recommends matching parallax to narrative use and warns against overusing pinned/horizontal scrolling; MDN documents native scroll-driven timelines and explicitly warns that large panning can trigger vestibular discomfort, reinforcing this small transform-only enhancement with a still reduced-motion state. References: [Figma — Web design trends](https://www.figma.com/resource-library/web-design-trends/); [Awwwards — Parallax collection](https://www.awwwards.com/awwwards/collections/parallax/); [Lovable — Scrolling designs](https://lovable.dev/guides/scrolling-designs-patterns-when-to-use); [MDN — CSS scroll-driven animations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations); [MDN — prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/%40media/prefers-reduced-motion).


## Homepage layout refinement (2026-10-21)

Keep the current broad section order and cinematic-editorial identity, but use available space more deliberately: turn the hero copy into an asymmetric two-column composition and use its underfilled right side for a compact factual 39-project index panel linked to the catalogue; keep About as the existing profile-only block containing the name, introduction and “LET’S TALK” contact link; and regroup the existing interview, contact channels and enquiry form into a two-column desktop composition with the FAQ spanning below. At phone widths every unit returns to a readable single-column document order. Preserve the existing full-bleed hero artwork and its pause control, the project wall and every existing section. No new claim, stock image, testimonial, location detail, dependency or scroll-pinning behavior.

Implementation: append one homepage-scoped `dist/layout-refresh.css` after the current interaction styles; add only accessible, data-grounded markup for the hero project index. Do not add About panels or labels. Keep existing JS contracts, anchor behavior, dialog, search, filters, mobile menu, WhatsApp form and individual project pages untouched. Reuse the previously consulted Figma editorial/motion guidance as inspiration; retain the owner's established midnight navy, ivory and IJ peach instead of copying an external visual identity.


## Owner correction and PR-only Vercel preview (2026-10-21)

Keep About limited to IJashul’s existing name, introduction copy and “LET’S TALK” contact link. Retain the factual 39-project hero index, redesigned enquiry area, cursor/background interactions, all content/assets and normal mobile behavior.

Keep all changes on the existing `codex/interactive-cursor-refresh` branch in PR #9. Compare the failed head author metadata with the existing `main` history. For one new, additive follow-up commit only, reuse the exact Git author/committer identity already used by `shamlaijash-rgb` commits on `main`; do not invent or expose email values, rewrite or force-push history, change Vercel/GitHub account security, or change repository visibility. Check the automatically triggered Vercel Preview and link only to it if it succeeds. Do not merge, deploy to production, create another host, or change `https://ij-designz-portfolio.vercel.app/`; if Vercel still requires the owner to link accounts, report the exact steps and leave the deployment blocked rather than changing settings.


Vercel accepted the additive identity-corrected PR commit `2d6d405` and marked its PR-specific Preview Ready. An unauthenticated HTTP check redirects to the existing Vercel sign-in gate. Preserve that protection; the preview link is for an authorized project/team account. Production and `main` remain unchanged.
