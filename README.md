# LingoDrill-PWA

LingoDrill is a language-learning app for drilling audio fragments. You load an audio file, cut it into fragments, and play them back with repeats, speed changes and subtitles.

It is a Progressive Web App (PWA). You can install it on a phone or computer, and it then runs in its own window and works offline. Audio files, sequences and subtitles are all stored on your device; nothing is uploaded to a server.

**Open the app:** https://cheidru.github.io/LingoDrill-PWA/

## Installing the app

Installation needs the page to be served over HTTPS, which the link above is. Open the app while online at least once. The first visit saves it for offline use.

### Android

**Chrome**

1. Open the app link in Chrome.
2. Tap the **⋮** menu, then **Install app**. Older versions say **Add to Home screen**. Chrome may also show an install banner at the bottom of the screen.
3. Confirm. LingoDrill appears on the home screen and in the app drawer, and opens full-screen without the browser bar.

**Samsung Internet:** tap the menu, then **Add page to → Home screen**.

**Edge:** tap the menu, then **Add to phone**.

### iPhone and iPad

1. Open the app link in **Safari**. On iOS / iPadOS 16.4 or later, Chrome and Edge work too.
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**. If you see an **Open as Web App** switch, leave it on.
4. Tap **Add**.

### Windows, macOS, Linux

**Chrome**

1. Open the app link.
2. Click the install icon at the right end of the address bar (a monitor with a down arrow).
   You can also open the **⋮** menu and choose **Cast, save and share → Install page as app**.
3. Click **Install**. LingoDrill opens in its own window and gets a Start menu, Dock or launcher entry.

**Edge**

1. Open the app link.
2. Click the **App available** icon in the address bar.
   You can also open the **…** menu and choose **Apps → Install this site as an app**.
3. Click **Install**.

**Safari (macOS Sonoma 14 or later)**

1. Open the app link.
2. Choose **File → Add to Dock**, or click the **Share** button and choose **Add to Dock**.
3. Click **Add**.

**Firefox** does not support installing web apps on the desktop. The app still works as a normal website there.

### Uninstalling

- **Android:** long-press the icon, then **Uninstall**. You can also go to **Settings → Apps**.
- **iPhone / iPad:** long-press the icon, then **Remove App → Delete from Home Screen**.
- **Chrome / Edge on desktop:** open the app, then open its window menu (**⋮** or **…**) and choose **Uninstall**.
- **Safari on macOS:** drag the app out of the Dock and delete it from your user **Applications** folder.

**Uninstalling can delete everything you stored in the app,** including audio, sequences and subtitles. Export a `.lingodrill` bundle first if you want to keep your data.

### Good to know

- **Your data stays in the browser you installed from.** On iPhone, iPad and macOS Safari, the installed app keeps its data separate from the browser tab, so files added in a Safari tab won't appear in the installed app. The same is true the other way round. To move data between them, export a `.lingodrill` bundle from one and import it in the other. Chrome and Edge share data between the tab and the installed app.
- **Moving to another device:** export a `.lingodrill` bundle and import it on the other device.
- **Updates** download in the background. A new version takes effect the next time the app is fully closed and reopened.
- **No install option?** Check these:
  - You are using one of the browsers listed above.
  - You are not in a private or incognito window.
  - The address starts with `https://`.
  - If all of that is true, reload the page once and look again.

## Development

```bash
npm install
npm run dev                   # start the dev server
npm run build                 # type-check and build for production
npm run preview               # serve the production build locally
npm run lint                  # run ESLint
npm run deploy                # build and publish to GitHub Pages
npm run generate-pwa-assets   # regenerate install icons from public/favicon.svg
```

The service worker only runs in the production build. To test installing and offline use locally, run `npm run build` and then `npm run preview`.
