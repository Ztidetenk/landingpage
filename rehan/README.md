# Rehan's Birthday Shrine 🎂💀

A deep-fried birthday web app, built around one legendary text message:

> damn boi cant even call his hb l9oks like u found better hb than me

Everything lives in `index.html`. One file, no build step, no dependencies.

## What's inside

- **The quote** — the original, plus 30 rewritten variants (shakespeare, corporate
  email, legal contract, pirate, noir, wikipedia, speedrun, cave painting…)
- **The meme song** — an original chiptune riff synthesized live with Web Audio,
  in 6 variants: OG, nightcore, slowed + reverb, bass boosted, 8-bit, cursed
- **Soundboard** — 8 pads (airhorn, vine boom, bruh, sad trombone, fanfare,
  wrong, drumroll, yeet). Keys `1`–`8` trigger them too
- **Meme maker** — canvas meme generator with Impact-style text, 5 background
  vibes, 12 subjects, PNG export
- **The cake** — blow out the candles by tapping, or by actually blowing into
  your mic
- **Guilt-o-meter** — betrayal stats, days-since-last-call counter, apology generator
- **Roast or toast** — slot machine that either destroys him or is genuinely nice
- **Certificate + letter** — Best Friend (Grade S+), and a typewriter birthday letter

Easter eggs: type `REHAN` anywhere for deep-fry mode. The `chill mode` button in
the footer kills every animation.

## Make it yours

Everything personal is in one `CONFIG` object at the top of the `<script>`:

```js
const CONFIG = {
  name: "REHAN",
  hbName: "your hb",
  phone: "",            // add his number to make the CALL button actually dial
  daysSinceCall: 69,    // the meme number
  bdayDate: "2026-08-20"
};
```

The birthday letter is the `LETTER` constant a bit further down — rewrite it so
it sounds like you.

## No external assets

Every sound is built from oscillators, noise buffers, a `WaveShaper` for
distortion and a generated impulse response for reverb. Every graphic is canvas
or emoji. The only outside request is Google Fonts, which has a full fallback
stack — the page works offline.

## Deploying

It's a static file, so any free static host works. Open `index.html` directly,
or serve the folder:

```sh
npx serve .
```

To publish on Netlify from this folder:

```sh
npx netlify-cli deploy --prod --dir=.
```
