# How to add a new channel

This guide explains how to add a brand-new social channel (for example, an
"X / Twitter Thread" or a "YouTube Description") to Insight Cascade.

It's written for **non-developers**. You'll edit two files and add one document.
Take it slowly and follow each step exactly. If something breaks, you can always
undo your change and try again — nothing here is permanent until you save.

> **Tip:** Make these edits in a code editor like
> [Visual Studio Code](https://code.visualstudio.com/) (free). It highlights
> mistakes (like a missing comma) before you even run the app.

---

## The big picture

A "channel" in this app is made of three things:

1. **A playbook** — a markdown document that tells the AI how to write for that
   channel (its format, tone, and structure).
2. **A registry entry** — one short block of code that lists the channel so the
   app knows it exists.
3. **(Automatic) UI** — the checkboxes in Step 2 of the pipeline are built from
   the registry, so once you add the registry entry, the channel shows up on its
   own. You do **not** need to edit the UI by hand.

Let's do it.

---

## Step 1 — Create the playbook document

1. Open the app and go to the **Knowledge Base** page.
2. In the **Upload a document** box, upload a new markdown (`.md`) file, OR
   create one on your computer first. Name it clearly, for example:
   `playbook-x-thread.md`.
3. Write the playbook: describe the format, the ideal length, the tone, and
   include a short example. Use the existing `playbook-linkedin-founder.md` as a
   model — copy its structure and adapt it.
4. Save it. Remember the filename **without** the `.md` ending
   (e.g. `playbook-x-thread`). You'll need it in the next step.

---

## Step 2 — Add the channel to the registry

This is the one bit of code you'll touch. It lives in:

```
src/agents/types.ts
```

Open that file and find the section labelled **CHANNEL REGISTRY**. You'll see a
list called `CHANNELS` with entries that look like this:

```ts
{
  id: "linkedin-founder",
  platform: "LinkedIn",
  label: "LinkedIn Founder Post",
  format: "Founder Post",
  playbookDoc: "playbook-linkedin-founder",
  suggestedForPillars: ["perspectives", "proof", "differentiator"],
},
```

Copy one of those blocks, paste it as a new entry in the list, and change the
values for your new channel. For an X / Twitter thread it might look like:

```ts
{
  id: "x-thread",                         // a unique, lowercase id (no spaces)
  platform: "LinkedIn",                   // see the note below about platform
  label: "X / Twitter Thread",            // shown on the checkbox
  format: "Thread",                       // shown as a badge in Step 3
  playbookDoc: "playbook-x-thread",       // the filename WITHOUT ".md"
  suggestedForPillars: ["perspectives", "proof"], // which pillars pre-tick it
},
```

**Important details:**

- `id` must be unique and contain no spaces (use dashes).
- `playbookDoc` must EXACTLY match your file's name without `.md`.
- `platform` controls the coloured badge. Today the app supports `"LinkedIn"`
  and `"Instagram"`. If you want a new platform colour (e.g. an "X" badge), see
  the optional step at the bottom.
- Make sure every entry ends with a comma `,` and the punctuation matches the
  examples. A missing comma is the #1 cause of errors.

Save the file.

---

## Step 3 — Restart and test

1. If the app is running locally, stop it (press `Ctrl + C` in the terminal) and
   start it again with `npm run dev`. (If it's deployed on Vercel, push your
   change — Vercel rebuilds automatically.)
2. Go to the **Pipeline** page and run it.
3. In **Step 2 — Review key ideas**, your new channel should now appear as a
   checkbox on every idea.
4. Tick it and click **Generate Channel Content**. You should get a piece of
   content written using your new playbook.

That's it — you've added a channel.

---

## Optional — add a new platform badge colour

If your channel belongs to a brand-new platform (not LinkedIn or Instagram) and
you want its own badge colour:

1. In `src/agents/types.ts`, widen the `platform` type in `ChannelDefinition`
   to include your platform name, e.g. `"LinkedIn" | "Instagram" | "X"`.
2. In `src/components/ui/Badge.tsx`, add a new tone (e.g. `x`) with the colour
   classes you want, and add it to the `Tone` type and `TONE_CLASSES` map.
3. In `src/components/pipeline/ChannelContentReview.tsx`, find where the platform
   badge is rendered and map your platform to its new tone.

This is more advanced — if you're unsure, just reuse an existing platform value
for `platform`; the channel will still work, it'll just share a badge colour.
