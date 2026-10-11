// Builds a password-locked copy of letter.html.
//
//   node anniversary/lock.mjs "<password>"
//
// The letter's markup is encrypted with AES-GCM (key derived from the
// password with PBKDF2), so the published index.html can sit on a public
// URL without anyone reading it unless they know the password.
// The password itself is never written to disk or committed.

import { readFile, writeFile } from 'node:fs/promises';
import { webcrypto as crypto } from 'node:crypto';

const ITERATIONS = 250000;
const dir = new URL('.', import.meta.url);

// Lower-cased so phone auto-capitalisation can't lock her out.
const password = (process.argv[2] || '').trim().toLowerCase();
if (!password) {
  console.error('Usage: node anniversary/lock.mjs "<password>"');
  process.exit(1);
}

const src = await readFile(new URL('letter.html', dir), 'utf8');

// Split letter.html into its pieces.
const head   = src.match(/<head>([\s\S]*?)<\/head>/)[1];
const body   = src.match(/<body>([\s\S]*?)<\/body>/)[1];
const markup = body.replace(/<script>[\s\S]*?<\/script>/, '').trim();
const script = body.match(/<script>([\s\S]*?)<\/script>/)[1];

// Encrypt the markup.
const b64  = buf => Buffer.from(buf).toString('base64');
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv   = crypto.getRandomValues(new Uint8Array(12));
const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
  baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
);
const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(markup));
const payload = JSON.stringify({ salt: b64(salt), iv: b64(iv), ct: b64(ct), iterations: ITERATIONS });

const lockStyles = `
  <style>
    /* ---------- Lock screen ---------- */
    .lock {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 24px;
      background: var(--bg);
      transition: opacity .9s ease, visibility .9s ease;
    }
    .lock.is-open { opacity: 0; visibility: hidden; }

    .lock__inner { width: 100%; max-width: 360px; }

    .lock__pin {
      display: block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 0 6px 1px #fff, 0 0 16px 4px var(--glow), 0 0 36px 10px var(--glow-soft);
      margin-bottom: 2.4rem;
      animation: lockPulse 2.8s ease-in-out infinite;
    }
    @keyframes lockPulse { 50% { opacity: .45; } }

    .lock__eyebrow {
      font-size: 11px;
      font-weight: 400;
      letter-spacing: .34em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .lock__title {
      margin: .8rem 0 2.2rem;
      font-size: clamp(1.7rem, 7vw, 2.2rem);
      font-weight: 300;
      line-height: 1.2;
      letter-spacing: -.03em;
    }

    .lock__field {
      display: flex;
      gap: 12px;
      align-items: flex-end;
      border-bottom: 1px solid rgba(243, 239, 232, .22);
      transition: border-color .3s ease;
    }
    .lock__field:focus-within { border-color: var(--glow); }

    .lock__input {
      flex: 1;
      min-width: 0;
      padding: 10px 0;
      background: transparent;
      border: 0;
      outline: 0;
      color: var(--text);
      font: 300 1.1rem/1.4 'Inter', system-ui, sans-serif;
      letter-spacing: .08em;
    }

    .lock__btn {
      padding: 10px 0;
      background: none;
      border: 0;
      color: var(--glow);
      font: 400 11px/1.4 'Inter', system-ui, sans-serif;
      letter-spacing: .34em;
      text-transform: uppercase;
      cursor: pointer;
    }
    .lock__btn:focus-visible { outline: 1px solid var(--glow); outline-offset: 4px; }
    .lock__btn:disabled { opacity: .5; cursor: default; }

    .lock__msg {
      min-height: 1.6em;
      margin-top: 1rem;
      font-size: .9rem;
      color: var(--muted);
    }

    .lock.is-wrong .lock__field { animation: shake .4s ease; }
    @keyframes shake {
      20%, 60% { transform: translateX(-6px); }
      40%, 80% { transform: translateX(6px); }
    }

    @media (prefers-reduced-motion: reduce) {
      .lock__pin, .lock.is-wrong .lock__field { animation: none; }
    }
  </style>`;

const lockMarkup = `
  <div class="lock" id="lock">
    <form class="lock__inner" id="lockForm" autocomplete="off">
      <span class="lock__pin" aria-hidden="true"></span>
      <p class="lock__eyebrow">For Akansha</p>
      <h1 class="lock__title">Something I wrote for you.</h1>
      <label class="lock__field">
        <span class="visually-hidden" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Password</span>
        <input class="lock__input" id="lockInput" type="password" placeholder="Password" autocapitalize="off" autocorrect="off" spellcheck="false" required />
        <button class="lock__btn" id="lockBtn" type="submit">Open</button>
      </label>
      <p class="lock__msg" id="lockMsg" aria-live="polite"></p>
    </form>
  </div>

  <div id="letter"></div>`;

const unlockScript = `
  <script>
    // Encrypted letter (generated by lock.mjs, do not edit by hand)
    const PAYLOAD = ${payload};

    // Everything below startLetter() is the page script from letter.html.
    function startLetter() {${script}}

    (function () {
      const lock  = document.getElementById('lock');
      const form  = document.getElementById('lockForm');
      const input = document.getElementById('lockInput');
      const btn   = document.getElementById('lockBtn');
      const msg   = document.getElementById('lockMsg');
      const fromB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

      async function decrypt(password) {
        const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
        const key = await crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: fromB64(PAYLOAD.salt), iterations: PAYLOAD.iterations, hash: 'SHA-256' },
          baseKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
        );
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(PAYLOAD.iv) }, key, fromB64(PAYLOAD.ct));
        return new TextDecoder().decode(plain);
      }

      form.addEventListener('submit', async e => {
        e.preventDefault();
        btn.disabled = true;
        msg.textContent = '';
        lock.classList.remove('is-wrong');
        try {
          const html = await decrypt(input.value.trim().toLowerCase());
          document.getElementById('letter').innerHTML = html;
          window.scrollTo(0, 0);
          startLetter();
          lock.classList.add('is-open');
          input.blur();
        } catch (err) {
          void lock.offsetWidth; // restart the shake animation
          lock.classList.add('is-wrong');
          msg.textContent = 'Not quite. Try again.';
          input.select();
        } finally {
          btn.disabled = false;
        }
      });

      input.focus();
    })();
  </script>`;

const out = `<!DOCTYPE html>
<html lang="en">
<head>${head}${lockStyles}
</head>

<body>
${lockMarkup}
${unlockScript}
</body>
</html>
`;

await writeFile(new URL('index.html', dir), out);
console.log('Wrote anniversary/index.html (locked).');
