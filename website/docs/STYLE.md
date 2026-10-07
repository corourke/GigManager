# User guide style guide

Rules for every page under `src/content/docs/`. They apply to new pages and to any
page you touch. For the build, drafts and publishing workflow, see
[README.md](./README.md). This guide covers the user guide only; the app's own UI
style guide is [`docs/design/STYLE_GUIDE.md`](../../docs/design/STYLE_GUIDE.md).

## Who we write for

People who run or crew live events: owners, production managers, engineers and
stagehands. They know their trade but not our app. Write for someone who has the app
open in another tab and wants to get one thing done.

## Voice

- **Second person, present tense, active voice.** "Select **Save**." Not "The user
  should click the Save button."
- **Plain and short.** Lead with the task. One idea per sentence, and three to five
  sentences per paragraph at most.
- **Say what happens.** After a step that changes something, say what the reader
  sees next.
- **No marketing.** Skip "powerful", "seamless", "simply" and "just". Write
  "GigWrangler shows…", not "GigWrangler makes it easy to…".
- **No internals.** Don't mention table names, RLS, edge functions, migrations or
  issue numbers. If a limit matters to the reader, describe what they see ("Staff
  can't see pay rates"), not why.
- US English.

## Names and terms

- The product is **GigWrangler**. Never "GigManager", "Gig Wrangler" or "the app"
  in headings.
- Roles are capitalized: **Admin**, **Manager**, **Staff**, **Viewer**.
- Use the glossary terms (`reference/glossary.md`) consistently: *gig*, *organization*,
  *participant*, *asset*, *kit*, *purchase*, *money in / money out*. Don't swap
  synonyms between pages ("event", "show" and "job" are not substitutes for *gig* in
  instructions).
- Statuses and other values appear exactly as the app shows them (**Date Hold**,
  **Confirmed**, **Settled**…).

## Naming UI elements

The on-screen label is the source of truth. Check it in the code (`src/components/`)
or the running app before you write it, and update the page when the label changes.

| Element | How to write it | Example |
|---|---|---|
| Button, tab, menu item, field label, option | **Bold**, exact text and case, no quotes | Select **New Gig**. |
| Navigation path | Bold labels joined by → | **Financials → Purchases** |
| Account menu | "the avatar menu (top right)" | Open the avatar menu → **Settings**. |
| Message or dialog text | In quotes, not bold | You'll see "Please check your email…" |
| What the reader types | `Code` | Enter `Load-in` in **Title**. |
| Icon-only button | Its tooltip or `aria-label` in bold, then the icon in brackets | **Edit** (pencil) |

Verbs:
- **Select** for buttons, tabs, menu items and options. Not "click", "press", "hit"
  or "tap". (Mobile pages may use "tap".)
- **Open** for menus, pages and records. **Choose** for picking from a list.
- **Enter** for typing into a field. **Turn on / turn off** for switches.

## Page structure

Every page follows this shape:

1. **Frontmatter:** `title`, `description` and `sidebar.order`. Keep `draft: true` until the
   page has been verified (see README).
   - `title` uses sentence case and the reader's words, ideally the screen's name:
     "Purchases", "Creating a gig".
   - `description` is one sentence of about 160 characters or fewer. It appears in
     search results and social cards.
2. **Opening paragraph, with no heading.** Two or three sentences: what this is,
   who can use it (if not everyone), and where to find it in the app.
3. **Sections (`##`)**, one per task or screen area. Name task sections with a
   gerund or a noun phrase: "Adding a gig", "The gig list". Use `###` for detail
   inside a section. Don't go deeper than `###`.
4. **Steps** are numbered lists, one action per step. Use bullets for options and
   facts, not for sequences.
5. **Related pages** at the end, only when they add something. Up to three links,
   as a bullet list under `## Related`.

Section overview pages (`*/overview.md`) open with one paragraph on the area, then
list the section's pages as bullets, each with a bold link and one line.

Who-can-do-what: when an action is limited by role, say so where the action is
described ("Admins and Managers also see **Delete**"). Don't add per-page role
tables; [Roles & access](/reference/roles-and-access/) is the one table.

## Admonitions

Use them sparingly, at most two per page.

- `:::note`: background the reader may need but can skip.
- `:::tip`: a shortcut or better way.
- `:::caution`: something that loses work, money or access, or a known gap
  ("This page is out of date for…").
- `:::danger`: irreversible deletion only.

Give a custom title only when it helps scanning: `:::note[Tax time]`.

## Links

- Link to other guide pages with root-relative paths ending in a slash:
  `[Purchases](/financials/purchases/)`. Use `#anchors` for sections.
- The link text is the page or section title, not "here" or "this page".
- Link the first mention of a feature on a page, not every one.
- Don't link to GitHub, `docs/` or internal plans from published pages.
- External links only to stable vendor help (for example, Google Calendar sharing
  settings).

## Screenshots

**Where they live:** `src/assets/screenshots/<section>/<page>-<what>.png`, for example
`src/assets/screenshots/gigs/creating-a-gig-form.png`. Reference them with a relative
Markdown path so Astro optimizes them:

```md
![The New Gig form with Title, Status and Dates filled in](../../../assets/screenshots/gigs/creating-a-gig-form.png)
```

**Rules:**

- **Demo data only.** Take every screenshot while signed in as a demo user in the
  "Demo Sound & Lighting" organization on dev (`scripts/seed-demo.sh`). Never use
  real customer data, real people's names, real email addresses or production.
- **Light theme**, the default app theme, browser at **1440 × 900** with device
  scale factor 2. Mobile pages use **390 × 844** at scale 2.
- **Crop to the subject:** the dialog, panel or table being described, plus enough
  context to find it. Use the full window only on overview pages. No browser
  chrome, no OS cursor.
- **Purpose and placement:** one screenshot per task or screen, placed right after
  the paragraph or step that introduces it. Don't screenshot what one sentence can
  say.
- **No annotations** (arrows, boxes) unless a control is genuinely hard to find. If
  you do add one, use a single 3 px rounded box in the app's primary color.
- **Alt text:** describe what the image shows, in a sentence. Don't start with
  "Screenshot of".
- **Reproducible:** take shots with the Playwright script in `scripts/screenshots/` (being set up), so they can be retaken
  when the UI changes. Retake the shots for a page in the same PR that changes its
  text, whenever the UI they show has changed.
- **Format and size:** PNG, under about 300 KB each after optimizing.

## Drafts and TODOs

- Draft stubs keep their **Cover / Screenshots / Source** checklist until written.
  When you write the page, delete the checklist.
- In a published page, leave a `<!-- TODO … -->` only for a missing screenshot or a
  known follow-up, and record it in the WORK_PLAN §5 table. No TODOs for prose.

## Checklist before opening a PR

- [ ] Every label checked against the code or the running app.
- [ ] Follows the page structure; headings in sentence case; no `####`.
- [ ] Links root-relative and resolving; no GitHub or `docs/` links on published pages.
- [ ] Screenshots from demo data, light theme, cropped, with alt text.
- [ ] `cd website/docs && npm ci && npm run build` passes.
- [ ] WORK_PLAN §5 table row updated.
