# IJ Designz — Ijashul Haque

Static designer portfolio source and images, exported from the live Sites version 73.

Live website: https://ijas-design-portfolio.shamlaijash.chatgpt.site

## Preview

From the repository root, run:

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. No npm install, framework or build step is required.

## Files

- `dist/index.html`: homepage
- `dist/projects.json`: 40 portfolio projects and media descriptions
- `dist/films.json`: 17 catalogued event clips (one linked, sixteen unlinked) and their Drive links (see the note in that file)
- `dist/projects/`: individual project pages
- `dist/assets/`: local portfolio images and video preview stills
- `dist/app.js`: project filtering, galleries, fullscreen image viewer and interaction logic
- `dist/brief-flow.mjs` and `dist/interview.js`: guided project enquiry
- `scripts/build-seo.py`: regenerate project pages and SEO files when project data changes
- `MANUS_BRIEF.md`: requested editing workflow and brand constraints
- `dist/creative-motion.css`: final motion, responsive, accessibility and art-direction refinements, loaded after the existing style layers
- `dist/motion-studio.css`: homepage motion-studio layer — cinematic entrances, scroll-linked depth, the discipline ticker, micro-interactions, the command palette, the reading layer (split display type, atmosphere, grain, chapter rail and sound) and a small project-page treatment
- `dist/motion-studio.js`: the motion engine for the layer above (intro film gate, hero word reveal, FLIP filtering, back-to-top ring, header yield). It only adds body classes and effects; every animation is disabled without it or under `prefers-reduced-motion`
- Entrance (in the same two files, on the homepage): arriving should feel like a stage being lit for a show — a dark house clears over the opening scene, one warm sweep crosses the frame, the picture settles out of a slow push-in (on the image and on the WebGL people canvas alike), and the headline rises from below into focus while the masthead settles in. It is all CSS animation whose finished state is the plain page, gated behind the motion class, cancelled under reduced motion, and released after a few seconds by a safety class so the hero can never be left dimmed or scaled
- Event films (`dist/films.json`, `dist/motion-studio.js`): 17 clips are catalogued; one currently has a Drive link and sixteen are unlinked. Only clips with a valid, non-empty Drive value produce a film count and a single play cue. Still-only cards show neither. Linked film cards open Google Drive in a new tab; the portfolio does not embed or play video. Adding a valid Drive share link (or bare file ID) enables that clip automatically, including the film filter and EVENT FILMS label. With zero linked clips, the label and all film cues/counts stay hidden. Confirm sharing permissions before adding any link. No private media is uploaded by the site.
- Gallery wall and layout switch (in the same two files): the index is the gallery — every project hangs as a case on the dark wall, the work shown uncropped with a hairline where a mount would sit, and a frosted glass bar floating over it carrying the project's title, with the arrow that opens it. The cases are laid out edge to edge in assorted sizes from a repeating rhythm (a large feature, a wide letterbox, two portrait cases and standard cases between them) and the bands share one height, so the wall has no ragged holes; a project keeps its shape when the list is filtered, so nothing is reshuffled. Hovering brings the work forward inside its case (`scale(1.05)`, and nothing moves under reduced motion). A Wall / Rows switch beside the filters keeps the quieter reading list one click away, and the choice is remembered for the session. Nothing is framed in white any more: a white board on a white mount read as an empty box, so the case is dark glass instead. The status tag is a small glass pill pinned to the top-left — it used to inherit a `top` offset from one layer and a `bottom` offset from another on the film card, which stretched it into a full-height panel over the work — and the hover dots sit at the top centre so no pill ever covers the artwork. The identity rail that used to lead the section is gone at the owner's request — the page belongs to the work. Search, category/status filters, the live count, the palette, hover previews and keyboard browsing all keep working on the cases, `contain` is still never broken, and without the script that adds `.ij-gallery` the section keeps the card grid it has always had
- Work header (in the same two files): the section begins with the page's own disciplines, followed by its display heading, supporting note and the live catalogue total (39). The project renders stay in the gallery below and are shown uncropped. The tool row places search, the visual-type select and the Wall / Rows switch alongside each other; its two named icon buttons retain accessible labels. Discipline labels and project totals come from the existing site data.
- Reading list (in the same two files): the `Rows` option turns the same 39 projects into one full-width line of reading each — thumbnail, title, subtitle, the project's own description and a metadata line — with a hairline between rows, no lift and no tilt. It is the profile-page arrangement the section used to have, kept as a quieter way through the work
- Reading layer (inside the same two files): display headings split into masked word units, a scroll-lit atmosphere and film grain, a repeating discipline ticker, a quiet chapter rail, and an off-by-default synthesised room tone that only starts after a click and is remembered for the session. Reduced-motion preferences remain respected.
- Interaction layer (inside the same two files): filter chips show live counts, the result total tweens, `/` focuses search with a clear button, arrow keys browse the project grid, hovering a card cycles that project's own gallery with a dot indicator, primary actions ripple and lean towards the pointer, a soft torch follows the cursor, and the full-screen viewer answers double-click and Ctrl/Cmd + wheel. It also adds a keyboard command palette (Ctrl/Cmd + K: recently viewed, all 39 projects, sections and actions, matched word-start first and highlighted, with motion toggle, copy-link, WhatsApp and clear-filters actions) All of it is delegated, reduced-motion aware and additive — the static site is unchanged without it
- `dist/editorial-redesign.css`: responsive editorial base styling for the homepage
- `dist/cinematic-gallery.css`: cinematic viewfinder treatment after the base styles; uses the owner's local imagery and does not add video playback (`case-cursor.css` is the final homepage-only interaction layer)
- `dist/creative-motion.js`: motion controls and context-aware positioning for the floating contact shortcut
- `dist/case-cursor.css` and `dist/case-cursor.js`: desktop-only, reduced-motion-aware “OPEN CASE” pointer cue for project cards
- Scroll-reactive background (in `motion-studio.js`/`.css`): peach and blue light pools drift at different transform-only rates, while the fine viewfinder line glides with page progress. The effect reuses the passive shared scroll loop, moves less on touch-sized screens, and settles to the static backdrop for reduced motion.
- `dist/layout-refresh.css`: homepage-only asymmetric hero with the factual 39-project archive link, a three-part designer-practice board drawn from existing content, and a clearer desktop enquiry layout that stacks on mobile. The section order, brand, project data, artwork and all existing controls remain intact.

The concept-to-on-site comparison slider was removed at the owner's request: a project's images are shown separately, as they were before, in the dialog carousel and as individual figures on the project pages. The feature still exists in the history (the commit that added it, and the ones that refined it) if it is ever wanted back.

Stylesheets are intentionally loaded in order; later files override earlier ones. `motion-studio.css` is scoped to the existing body classes (`portfolio-editorial`, `portfolio-cinema`), so project pages, which use `project-pages.css`, only pick up the small treatment that is written for them. The homepage keeps its existing project data and interaction scripts while the cinematic stylesheet supplies viewfinder framing and short scene transitions; `case-cursor.css` and `layout-refresh.css` are the final homepage-only interaction and layout layers. Inspect the cascade before changing it.

## Local checks

Optional, and only for development:

```sh
  cd .tooling && npm ci           # pinned css-tree + jsdom, not needed to view the site
node check-css.js ../dist/motion-studio.css ../dist/case-cursor.css ../dist/layout-refresh.css
node smoke.js                   # loads the homepage and a project page in jsdom
```

`smoke.js` serves `dist/` locally, waits for the app-ready state, and exercises
its project catalogue, search and keyboard controls, gallery/dialog, motion
layers, responsive hero/About/enquiry layout, scroll-reactive background and project pages. Layout checks verify the actual 39-project archive, profile-only About content, mobile stacking and retained contact controls. Background checks verify opposing ambient-light drift and line movement; the reduced-motion state keeps the effect still. Film checks assert safe external Google Drive links rather
than an embedded player, and the cursor tests verify decorative, non-blocking
behavior and restoration of the native pointer outside project cards. Run it
with `BROKEN_IO=1` to simulate a frame where
`IntersectionObserver` never reports; nothing may be left hidden in either mode.

## Publishing

This repository is a private editable handoff, not an automatic deployment connection. Changes here do not automatically update the existing live Sites URL. Return the edited code or a pull request for review and publication through the existing Sites project. Hosting credentials and internal source history are not included.

## Videos deferred by the owner
Video binaries are intentionally excluded to save upload time. Their preview stills are displayed instead. `videos-to-add-later.json` records the original project IDs and video paths for later restoration after the owner supplies the clips. Do not restore video playback until the files exist. The original live website is unchanged.

## Missing media in the handoff

From `source/`, run `python3 download-media.py` to restore the public assets listed in `MEDIA-LINKS.json`. The three reported missing homepage covers are `event-video-01.webp`, `eastern-province-municipality-layered-stage.webp`, and `acdelco-front-installation.webp`. This patch does not substitute imagery or add private video.


## Interactive cursor refinement

The homepage adds `dist/case-cursor.css` and `dist/case-cursor.js`: on a fine desktop pointer, hovering a project card shows a small peach “OPEN CASE” cue that follows the pointer. It is decorative, does not intercept clicks, and is disabled for touch layouts and reduced-motion preferences. The existing project-card hover preview, tilt and page spotlight remain in place.

