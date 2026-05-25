# Insight Cascade

Insight Cascade is a content distribution tool for branding agencies. You paste
in one long-form blog post (the "hero asset"), and the app uses AI to break it
into four key ideas, then writes ready-to-publish LinkedIn and Instagram posts
for each idea — all in your client's specific brand voice. A human reviews and
edits at every step, so you stay in control. Think of it as turning one big
piece of content into a whole cascade of social posts.

---

## Table of contents

1. [What this app does](#1-what-this-app-does)
2. [How to set it up](#2-how-to-set-it-up)
3. [How to use it](#3-how-to-use-it)
4. [How to customize](#4-how-to-customize)
5. [Project structure](#5-project-structure)
6. [Known limitations](#6-known-limitations)

---

## 1. What this app does

The app runs a simple, three-step **pipeline**:

1. **Analyze** — You paste a blog post. The AI reads it and maps out its main
   argument, themes, and proof points.
2. **Extract** — The AI breaks the post into **four key ideas**, one for each
   "content pillar" (Perspectives, Proof, Creative Work, Differentiator). You
   review and edit these, and choose which channels you want.
3. **Generate** — The AI writes a finished post for each idea and channel,
   following your channel "playbooks". You edit, copy, and export the results.

The AI's quality comes from your **Knowledge Base** — markdown documents (brand
voice guide + channel playbooks) that you can edit right inside the app.

---

## 2. How to set it up

This section assumes you have **never used a terminal before**. Follow each step
in order. A "terminal" is just a text window where you type commands; on a Mac
it's an app called **Terminal**, and on Windows it's **Command Prompt** or
**PowerShell**.

### Step 2.1 — Install Node.js

Node.js is the engine this app runs on.

1. Go to **<https://nodejs.org>**.
2. Download the version labelled **"LTS"** (Long Term Support).
3. Open the downloaded file and click through the installer (the defaults are
   fine).
4. To confirm it worked, open your terminal and type this, then press Enter:

   ```bash
   node --version
   ```

   If you see a number like `v22.x.x`, you're good.

### Step 2.2 — Get the app's code

If you received this project as a folder, skip to Step 2.3. Otherwise, to
download it from GitHub, type in your terminal:

```bash
git clone <the-repository-URL-you-were-given>
```

### Step 2.3 — Open the project folder

In your terminal, move into the project folder:

```bash
cd content-distribution
```

(If your folder has a different name, use that name instead.)

### Step 2.4 — Install the app's dependencies

This downloads the building blocks the app needs. Type:

```bash
npm install
```

Wait for it to finish (it can take a minute or two).

### Step 2.5 — Add your API key

The app talks to Claude (the AI) using a secret **API key**.

1. Get a key from **<https://console.anthropic.com>** (sign up, then go to
   **API Keys** and create one). It looks like `sk-ant-...`.
2. In the project folder there's a file called **`.env.example`**. Make a copy
   of it and name the copy **`.env.local`**. You can do this in your terminal:

   ```bash
   cp .env.example .env.local
   ```

3. Open **`.env.local`** in any text editor and paste your key after the `=`:

   ```
   ANTHROPIC_API_KEY=sk-ant-your-real-key-here
   ```

4. Save the file. **Never share this file or commit it to GitHub** — it holds
   your secret. (The app is already set up to keep it private.)

### Step 2.6 — Run the app on your computer

Type:

```bash
npm run dev
```

When you see **"Ready"**, open your web browser and go to:

**<http://localhost:3000>**

The app is now running on your own computer. To stop it, go back to the terminal
and press **`Ctrl + C`**.

### Step 2.7 — Deploy it online with Vercel (optional)

To put the app on the internet so others can use it:

1. Push your code to a GitHub repository.
2. Go to **<https://vercel.com>**, sign up, and click **"Add New… → Project"**.
3. Import your GitHub repository.
4. Before deploying, open **Settings → Environment Variables** and add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** your `sk-ant-...` key
5. Click **Deploy**. Vercel gives you a public link.

Full Vercel guide: <https://vercel.com/docs/deployments/overview>.

> ⚠️ **Note for Vercel:** see [Known limitations](#6-known-limitations) — editing
> knowledge base files won't *save* on Vercel (its file system is read-only).
> Editing works perfectly when running on your own computer.

---

## 3. How to use it

### The Pipeline page (`/pipeline`)

**Step 1 — Paste your blog post.**
Paste the full article into the big box. Optionally add a title, target
audience, and topic. Click **"Analyze & Extract Key Ideas"** and wait.

_(Screenshot placeholder: Step 1 — the paste box)_

**Step 2 — Review key ideas.**
You'll see four cards, one per content pillar. Edit the wording if you like, and
tick the channels you want content for on each idea. Click **"Generate Channel
Content"**.

_(Screenshot placeholder: Step 2 — the four key idea cards)_

**Step 3 — Review channel content.**
You'll see the finished posts, grouped by idea. For each one you can **Edit** it
inline, **Copy** it, or use **Copy All** / **Export as Markdown** at the top to
grab everything at once.

_(Screenshot placeholder: Step 3 — the generated posts)_

### The Knowledge Base page (`/knowledge-base`)

This is where you manage the documents that shape the AI's writing. Click a
document on the left to open it, edit it, and **Save**. You can also upload new
`.md` files or delete ones you don't need.

_(Screenshot placeholder: Knowledge Base page)_

---

## 4. How to customize

### Edit the brand voice or playbooks

Go to the **Knowledge Base** page, click a document, edit the text, and click
**Save**. Your changes immediately affect all new content the AI generates. The
three starter documents are:

- `brand-voice-guide.md` — how the brand sounds.
- `playbook-linkedin-founder.md` — how to write LinkedIn founder posts.
- `playbook-instagram.md` — how to write Instagram carousels and reels.

> The starter documents contain example content so the app works right away.
> Replace them with your client's real guidelines.

### Add a new channel

Want to add X/Twitter, a newsletter, or YouTube? See the step-by-step,
non-technical guide in **[`docs/adding-a-channel.md`](docs/adding-a-channel.md)**.

### Change the AI model

Open **`src/lib/anthropic.ts`** and change the `MODEL` value near the top:

```ts
export const MODEL = "claude-sonnet-4-20250514";
```

You can also adjust `MAX_TOKENS` (how long responses can be) and `TEMPERATURE`
(how creative the AI is, from 0 to 1) in the same file.

---

## 5. Project structure

A quick tour of the folders (you mostly only need the Knowledge Base in the UI):

```
src/
├── app/              The pages and server endpoints (what you see in the browser)
│   ├── page.tsx          Home / dashboard
│   ├── pipeline/         The 3-step pipeline page
│   ├── knowledge-base/   The document manager page
│   └── api/              Behind-the-scenes server endpoints the pages call
│
├── agents/           The AI "agents" — the brains of the app
│   ├── hero-analyzer.ts       Step 1: analyzes the blog post
│   ├── key-idea-extractor.ts  Step 2: extracts the 4 key ideas
│   ├── channel-adapter.ts     Step 3: writes the channel content
│   └── types.ts               Shared data shapes + the CHANNEL registry
│
├── lib/              Helpers shared across the app
│   ├── anthropic.ts        Talks to the Claude AI (model settings live here)
│   ├── knowledge-base.ts   Reads/writes the markdown documents on disk
│   └── prompts.ts          Builds the prompts sent to the AI
│
├── components/       The reusable visual building blocks (buttons, cards, etc.)
│
└── data/             The knowledge base documents, stored per project
    └── projects/serious-business/   The one client project (for now)

docs/                 Extra guides, like how to add a channel
```

### How the architecture is built to grow

- **Modular agents:** each AI step is its own file. Adding a new step means
  adding a file, not rewriting the app.
- **Multi-project ready:** documents are stored per project
  (`data/projects/<project-slug>/`). Today there's one project, but the code
  already uses a project pattern so more can be added later.
- **Knowledge-base driven:** the AI's quality is controlled by editable markdown
  documents, not hardcoded text.

---

## 6. Known limitations

This is an **MVP** (a first working version). On purpose, it does **not** include:

- **No saving on Vercel.** Editing/uploading knowledge base files works on your
  own computer but won't persist on Vercel, because Vercel's file system is
  read-only. (A future version would use a database or cloud storage.)
- **No accounts or login.** Anyone with the link can use it.
- **No database.** Pipeline progress lives only in your browser — if you
  refresh the page mid-pipeline, you start over. That's expected.
- **No Notion integration** (planned for later).
- **No scheduling or publishing.** The app generates content; you copy it into
  your social tools yourself.
- **No version history / undo** for document edits.
- **One project at a time.** The architecture supports more, but the UI shows a
  single project ("Serious Business").
- **No image or design generation.**

These keep the MVP simple and focused on the core value: turning one blog post
into a cascade of on-brand social content.
