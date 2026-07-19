# AlgaeTree Website

Marketing site for AlgaeTree built with Next.js App Router, TypeScript, and Tailwind CSS.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4

## Run Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000` in the browser.

## Build

Create a production build:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

## Routes

- `/` home page
- `/solutions/b2c` B2C solutions page
- `/solutions/ccus` CCUS solutions page
- `/technology` technology page
- `/about` about page
- `/team` team page
- `/contact` contact page

## Project Structure

- `app/` route files and page sections
- `app/components/` shared UI such as header, footer, and buttons
- `app/components/sections/technology/` technology page sections
- `app/components/sections/solutions/b2c/` B2C solutions page sections
- `app/components/sections/about/` about page sections
- `app/components/sections/team/` team page sections
- `app/components/sections/contact/` contact page sections
- `public/figma/` exported design assets downloaded from Figma MCP

## Notes

- The About page is implemented against the Figma source for both desktop and mobile variants.
- Assets used by the About page are stored under `public/figma/about/` and `public/figma/about/mobile/`.
- Assets used by the Team page are stored under `public/figma/team/`.
- Assets used by the Contact page are stored under `public/figma/contact/`.
- Assets used by the CCUS solutions page are stored under `public/figma/technology/ccus/`.
- Assets used by the B2C solutions page are stored under `public/figma/solutions/b2c/`.
- The selected mobile Figma frame does not expose prototype animation data through MCP, so the page matches the static design rather than inventing non-source interactions.
- The Team page Figma source only exposes a desktop frame and does not include Team-specific mobile or prototype variants, so responsive behavior and motion are inferred conservatively from the desktop composition.
- The selected Contact page Figma source exposes a desktop frame only, so tablet and mobile behavior are inferred conservatively from the desktop composition.
- The selected CCUS and B2C solution frames expose both desktop and mobile layouts, so those pages follow the paired Figma artboards directly.