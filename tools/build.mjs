// Generator pentru site-ul static wastely.ro.
//
// Citește textele legale din aplicație (wastly-app/src/content/legal/*.ts) și le
// transformă în pagini HTML, FĂRĂ să le rescrie. Folosește aceleași reguli de
// formatare ca ecranul din aplicație (src/components/legal/RichText.tsx):
//   ## titlu / ### subtitlu, - liste, tabele | a | b |, **îngroșat**,
//   [text](url), [text](doc:<id>) și linkuri simple https://...
//
// Rulare (din folderul wastely-site):
//   node tools/build.mjs [calea/către/wastly-app]
//
// Rezultatul se scrie în public/ (index.html, legal/*.html, 404.html,
// sitemap.xml, robots.txt). Imaginile și style.css din public/assets/ se
// editează direct.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(HERE, '..');
const PUBLIC = path.join(SITE_ROOT, 'public');
const APP_ROOT = path.resolve(process.argv[2] ?? path.join(SITE_ROOT, '..', 'wastly-app'));
const LEGAL_SRC = path.join(APP_ROOT, 'src', 'content', 'legal');

const BASE_URL = 'https://wastely.ro';
const BUILD_DATE = '2026-11-13';
const BUILD_DATE_RO = '13 noiembrie 2026';

// Date firmă — aceleași ca în wastly-app/src/config/legal.ts (COMPANY_INFO).
const COMPANY = {
  name: 'CYBER SALES SRL',
  cui: '50233851',
  reg: 'J2024000328364',
  address: 'Sat Maliuc, Comuna Maliuc, Str. Berzelor, Nr. 6, Jud. Tulcea',
  email: 'shop.comenzi@gmail.com',
  phone: '0755 482 293',
};
const PHONE_HREF = 'tel:+40755482293';

// Titlurile sunt cele din wastly-app/src/content/legal/index.ts.
const DOCS = [
  { id: 'privacy-policy', title: 'Politica de confidențialitate', group: 'privacy', desc: 'Ce date personale prelucrează Wastely, de ce, cui le transmitem și ce drepturi ai.' },
  { id: 'gdpr-rights', title: 'Drepturile mele GDPR', group: 'privacy', desc: 'Drepturile tale privind datele personale și cum le poți exercita.' },
  { id: 'delete-account', title: 'Ștergerea contului și a datelor', group: 'privacy', desc: 'Cum îți ștergi contul Wastely și datele asociate, din aplicație sau prin email.', custom: true },
  { id: 'trackers-policy', title: 'Politica privind trackerele și SDK-urile terțe', group: 'privacy', desc: 'SDK-urile terțe folosite în aplicația Wastely și ce date prelucrează.' },
  { id: 'ad-consent', title: 'Setări de consimțământ reclame', group: 'privacy', desc: 'Informații despre reclamele din aplicația Wastely și consimțământul pentru ele.' },
  { id: 'terms', title: 'Termeni și condiții de utilizare', group: 'use', desc: 'Termenii de utilizare ai aplicației mobile Wastely.' },
  { id: 'expiry-disclaimer', title: 'Disclaimer date de expirare', group: 'use', desc: 'Datele de expirare din Wastely sunt estimative: ce trebuie să știi înainte să te bazezi pe ele.' },
  { id: 'recipes-allergens-disclaimer', title: 'Disclaimer rețete și alergeni', group: 'use', desc: 'Informații importante despre rețetele și alergenii din aplicația Wastely.' },
  { id: 'sales-terms', title: 'Termeni și condiții de vânzare', group: 'shop', desc: 'Termenii de vânzare pentru kiturile, etichetele și rolele Wastely.' },
  { id: 'delivery-returns', title: 'Livrare și retur', group: 'shop', desc: 'Cum se livrează comenzile Wastely și cum poți returna produsele.' },
  { id: 'withdrawal', title: 'Dreptul de retragere', group: 'shop', desc: 'Dreptul de retragere din contract în 14 zile și formularul de retragere.' },
  { id: 'warranty', title: 'Garanție produse', group: 'shop', desc: 'Garanția legală pentru produsele Wastely.' },
  { id: 'consumer-protection', title: 'Protecția consumatorului', group: 'shop', desc: 'ANPC, soluționarea alternativă a litigiilor (SAL) și contactul nostru.' },
];
const GROUPS = [
  ['privacy', 'Date personale și cont'],
  ['use', 'Folosirea aplicației'],
  ['shop', 'Cumpărături și consumator'],
];

// ------------------------------------------------------------------ utilitare

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Extrage lastUpdated și body dintr-un fișier .ts (template literal), exact ca în aplicație.
function readDoc(id) {
  const src = fs.readFileSync(path.join(LEGAL_SRC, `${id}.ts`), 'utf8');
  const lu = src.match(/lastUpdated:\s*'([^']+)'/);
  const bodyStart = src.indexOf('body: `');
  const bodyEnd = src.lastIndexOf('`,\n};');
  if (!lu || bodyStart < 0 || bodyEnd < 0) throw new Error(`Nu pot citi ${id}.ts`);
  const raw = src.slice(bodyStart + 'body: `'.length, bodyEnd);
  if (raw.includes('${')) throw new Error(`${id}.ts conține interpolări \${...}, nesuportate de generator`);
  // evaluăm template literal-ul (procesează escape-urile, ex. \\n sau \\`)
  const text = new Function('return `' + raw + '`')();
  return { lastUpdated: lu[1], body: text };
}

// ------------------------------------------------- randare (ca RichText.tsx)

const INLINE_SRC = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)|(https?:\/\/[^\s)]+)/g.source;

function inline(text) {
  let out = '';
  let last = 0;
  let m;
  const INLINE = new RegExp(INLINE_SRC, "g");
  while ((m = INLINE.exec(text))) {
    out += esc(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out += `<strong>${inline(m[1])}</strong>`;
    } else if (m[2] !== undefined) {
      const label = m[2];
      const target = m[3];
      const href = target.startsWith('doc:') ? `${target.slice(4)}.html` : target;
      const external = /^https?:/.test(href);
      out += `<a href="${esc(href)}"${external ? ' rel="noopener" target="_blank"' : ''}>${esc(label)}</a>`;
    } else {
      let url = m[4];
      let tail = '';
      const t = url.match(/[.,;:]+$/); // punctuația de la final nu face parte din URL
      if (t) { tail = t[0]; url = url.slice(0, -tail.length); }
      out += `<a href="${esc(url)}" rel="noopener" target="_blank">${esc(url)}</a>${esc(tail)}`;
    }
    last = m.index + m[0].length;
  }
  return out + esc(text.slice(last));
}

const splitRow = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

function parse(body) {
  const blocks = [];
  let para = [];
  let list = null;
  let table = null;
  const flush = () => {
    if (para.length) blocks.push({ type: 'p', text: para.join('\n') });
    if (list) blocks.push({ type: 'ul', items: list });
    if (table && table.length) blocks.push({ type: 'table', header: table[0], rows: table.slice(1) });
    para = []; list = null; table = null;
  };
  for (const raw of body.split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) flush();
    else if (line.startsWith('### ')) { flush(); blocks.push({ type: 'h3', text: line.slice(4) }); }
    else if (line.startsWith('## ')) { flush(); blocks.push({ type: 'h2', text: line.slice(3) }); }
    else if (line.startsWith('|')) {
      if (!table) { flush(); table = []; }
      if (!/^\|[\s|:-]+\|?$/.test(line)) table.push(splitRow(line));
    } else if (/^(- |• )/.test(line)) {
      if (!list) { flush(); list = []; }
      list.push(line.slice(2));
    } else {
      if (list || table) flush();
      para.push(line);
    }
  }
  flush();
  return blocks;
}

function render(body) {
  return parse(body).map((b) => {
    switch (b.type) {
      case 'h2': return `<h2>${inline(b.text)}</h2>`;
      case 'h3': return `<h3>${inline(b.text)}</h3>`;
      case 'p': return `<p>${b.text.split('\n').map(inline).join('<br>\n')}</p>`;
      case 'ul': return `<ul>\n${b.items.map((i) => `<li>${inline(i)}</li>`).join('\n')}\n</ul>`;
      case 'table': {
        const head = b.header.map((h) => `<th scope="col">${inline(h)}</th>`).join('');
        const rows = b.rows.map((r) =>
          `<tr>${r.map((c, i) => `<td data-label="${esc(b.header[i] ?? '')}">${inline(c)}</td>`).join('')}</tr>`).join('\n');
        return `<div class="table-wrap"><table>\n<thead><tr>${head}</tr></thead>\n<tbody>\n${rows}\n</tbody>\n</table></div>`;
      }
    }
  }).join('\n');
}

// ------------------------------------------------------------ șablon pagină

const ICONS = {
  snow: '<path d="M12 2v20M4.9 6.5l14.2 11M19.1 6.5l-14.2 11M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5M3 9.5l3.5.6.4-3.6M21 14.5l-3.5-.6-.4 3.6M21 9.5l-3.5.6-.4-3.6M3 14.5l3.5-.6.4 3.6"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M11 8v8M15 8v8M18 8v8"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
};
const icon = (n) => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

function head({ title, description, path: p, root, noindex = false }) {
  const url = `${BASE_URL}${p}`;
  return `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}<meta name="theme-color" content="#1F7A4E">
<link rel="canonical" href="${url}">
<link rel="icon" href="${root}favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="${root}favicon-32.png">
<link rel="apple-touch-icon" href="${root}apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:locale" content="ro_RO">
<meta property="og:site_name" content="Wastely">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE_URL}/assets/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="${root}assets/style.css">
</head>
<body>
<a class="skip" href="#continut">Sari la conținut</a>
<header class="site-header">
<div class="wrap bar">
<a class="brand" href="${root || './'}"><img src="${root}assets/logo-512.png" alt="" width="40" height="40"><span>Wastely</span></a>
<nav aria-label="Navigare principală">
<a href="${root}#functii">Funcții</a>
<a href="${root}#cum-functioneaza">Cum funcționează</a>
<a href="${root}legal/">Documente legale</a>
</nav>
</div>
</header>
`;
}

function footer(root) {
  return `<footer class="site-footer">
<div class="wrap foot">
<div>
<strong>${COMPANY.name}</strong><br>
CUI ${COMPANY.cui} · Nr. Reg. Com. ${COMPANY.reg}<br>
${esc(COMPANY.address)}
</div>
<div>
<strong>Contact</strong><br>
<a href="mailto:${COMPANY.email}">${COMPANY.email}</a><br>
<a href="${PHONE_HREF}">${COMPANY.phone}</a>
</div>
<div>
<strong>Legal</strong><br>
<a href="${root}legal/privacy-policy.html">Confidențialitate</a> · <a href="${root}legal/terms.html">Termeni</a><br>
<a href="${root}legal/delete-account.html">Ștergerea contului</a> · <a href="${root}legal/">Toate documentele</a>
</div>
</div>
<p class="wrap copy">© 2026 ${COMPANY.name}. Wastely este un instrument de organizare: datele de expirare sunt orientative. Site fără cookie-uri și fără urmărire.</p>
</footer>
</body>
</html>
`;
}

const write = (rel, content) => {
  const f = path.join(PUBLIC, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
};

// ----------------------------------------------------------- pagina de start

function indexPage() {
  const features = [
    ['scan', 'Inventar pe coduri de bare', 'Scanezi codul de pe etichetă și produsul intră în inventar, cu cantitate, data congelării și locul de depozitare. Poți introduce codul și manual.'],
    ['bell', 'Alerte de expirare', 'Primești notificări înainte să expire un produs, în intervalul ales de tine. Notificările sunt programate chiar pe telefon.'],
    ['book', 'Rețete din ce ai în casă', 'Sugestii de rețete pe baza produselor din inventar, ca să gătești întâi ce expiră mai repede.'],
    ['cal', 'Plan săptămânal de meniu', 'Îți planifici mesele pe zile și știi din timp ce scoți din congelator.'],
    ['cart', 'Listă de cumpărături', 'Ce îți lipsește ajunge într-o listă pe care o bifezi la cumpărături.'],
    ['users', 'Un cont, mai multe telefoane', 'Aceeași gospodărie vede același inventar, pe mai multe dispozitive, cu un singur cont.'],
  ];
  const steps = [
    ['1', 'Adaugi produsul', 'Scanezi codul de bare al etichetei de pe pachet sau îl introduci manual, apoi alegi cantitatea și locul de depozitare.'],
    ['2', 'Vezi ce expiră', 'Wastely estimează data de expirare și te avertizează din timp, ca să consumi produsele la timp.'],
    ['3', 'Gătești fără risipă', 'Primești idei de rețete din ce ai deja, îți faci planul săptămânii și lista de cumpărături.'],
  ];
  const desc = 'Wastely este aplicația românească pentru inventarul alimentelor congelate: alerte de expirare, rețete, plan săptămânal și listă de cumpărături. Mai puțină risipă, mai multă ordine.';
  return head({ title: 'Wastely — aplicația pentru inventarul alimentelor congelate', description: desc, path: '/', root: '' }) +
`<main id="continut">
<section class="hero">
<div class="wrap hero-grid">
<div class="hero-text">
<p class="kicker">Aplicație românească · Gratuită</p>
<h1>Ține evidența congelatorului. Nu mai arunca mâncare bună.</h1>
<p class="lead">Wastely îți arată ce ai în congelator și ce expiră în curând, îți trimite alerte la timp și îți propune rețete din ce ai deja în casă.</p>
<div class="stores" role="group" aria-label="Descărcare aplicație">
<span class="store" aria-disabled="true"><span class="store-small">Descarcă din</span><span class="store-big">Google Play</span><span class="soon">în curând</span></span>
<span class="store" aria-disabled="true"><span class="store-small">Descarcă din</span><span class="store-big">App Store</span><span class="soon">în curând</span></span>
</div>
<p class="note">Aplicația este în curs de lansare. Linkurile de descărcare apar aici imediat ce este publicată.</p>
</div>
<div class="hero-logo"><img src="assets/logo-512.png" alt="Wastely — logo: container de congelator cu fulg de nea și frunze verzi" width="360" height="360"></div>
</div>
</section>

<section id="functii" class="section">
<div class="wrap">
<h2>Tot ce ai nevoie pentru un congelator organizat</h2>
<p class="section-lead">Wastely este un instrument de organizare pentru alimentele din congelator și din cămară.</p>
<div class="grid">
${features.map(([i, t, d]) => `<article class="card feature">${icon(i)}<h3>${t}</h3><p>${d}</p></article>`).join('\n')}
</div>
</div>
</section>

<section id="cum-functioneaza" class="section alt">
<div class="wrap">
<h2>Cum funcționează</h2>
<ol class="steps">
${steps.map(([n, t, d]) => `<li class="card"><span class="num" aria-hidden="true">${n}</span><h3>${t}</h3><p>${d}</p></li>`).join('\n')}
</ol>
<p class="small">Datele de expirare sunt estimative. Citește <a href="legal/expiry-disclaimer.html">disclaimerul privind datele de expirare</a> și verifică mereu starea alimentelor înainte de consum.</p>
</div>
</section>

<section class="section">
<div class="wrap privacy-box card">
${icon('lock')}
<div>
<h2>Datele tale, sub controlul tău</h2>
<p>Nu vindem datele tale, nu folosim analytics și nu urmărim comportamentul. Inventarul este stocat în Uniunea Europeană, iar contul și toate datele asociate pot fi șterse oricând din aplicație.</p>
<p><a href="legal/privacy-policy.html">Politica de confidențialitate</a> · <a href="legal/delete-account.html">Cum îți ștergi contul</a> · <a href="legal/">Toate documentele legale</a></p>
</div>
</div>
</section>

<section class="section alt">
<div class="wrap contact">
<h2>Contact</h2>
<p>Ai o întrebare, o sugestie sau o problemă? Scrie-ne la <a href="mailto:${COMPANY.email}">${COMPANY.email}</a> sau sună la <a href="${PHONE_HREF}">${COMPANY.phone}</a>.</p>
</div>
</section>
</main>
` + footer('');
}

// ------------------------------------------------------- paginile legale

function docPage(doc, { lastUpdated, bodyHtml, extraHtml = '' }) {
  return head({ title: `${doc.title} — Wastely`, description: doc.desc, path: `/legal/${doc.id}.html`, root: '../' }) +
`<main id="continut">
<div class="wrap doc">
<p class="crumbs"><a href="../">Acasă</a> › <a href="./">Documente legale</a></p>
<h1>${esc(doc.title)}</h1>
<p class="updated">Ultima actualizare: ${esc(lastUpdated)}</p>
<article class="card prose">
${bodyHtml}
</article>
${extraHtml}
<p class="back"><a href="./">← Toate documentele legale</a></p>
</div>
</main>
` + footer('../');
}

function deleteAccountBody() {
  const subject = encodeURIComponent('Cerere de ștergere cont');
  const mailBody = encodeURIComponent('Solicit ștergerea contului Wastely asociat acestei adrese de email și a tuturor datelor asociate.');
  const mailto = `mailto:${COMPANY.email}?subject=${subject}&amp;body=${mailBody}`;
  return `<p>Această pagină explică cum îți poți șterge contul Wastely și datele asociate lui. Aplicația este oferită de ${COMPANY.name}.</p>

<h2>1. Din aplicație (cel mai rapid)</h2>
<ol>
<li>Deschide aplicația Wastely și autentifică-te în contul pe care vrei să îl ștergi.</li>
<li>Mergi la <strong>Setări → Informații cont</strong>.</li>
<li>Apasă <strong>Șterge contul</strong> și confirmă. Ți se cere confirmarea de două ori, pentru că ștergerea este definitivă.</li>
<li>Dacă nu te-ai autentificat recent, introdu parola contului, ca să confirmi că ești tu.</li>
</ol>
<p>După confirmare, contul și datele sunt șterse, iar aplicația te duce la ecranul de autentificare. Aceeași opțiune se găsește și în <strong>Setări → Legal → Contul meu → Ștergerea contului</strong>.</p>

<h2>2. Prin email, dacă nu mai ai aplicația</h2>
<p>Dacă ai dezinstalat aplicația sau nu te mai poți autentifica, ne poți cere să îți ștergem contul. Trimite un email la <a href="mailto:${COMPANY.email}">${COMPANY.email}</a>, cu subiectul <strong>„Cerere de ștergere cont”</strong>, <strong>de pe adresa de email asociată contului Wastely</strong>. Așa putem verifica faptul că cererea vine de la tine și nu ștergem contul altei persoane. Dacă avem dubii rezonabile asupra identității tale, îți putem cere informații suplimentare.</p>
<p><a class="button" href="${mailto}">Trimite cererea de ștergere</a></p>
<p>Îți răspundem în cel mult 30 de zile de la primirea cererii, iar ștergerea este gratuită. Detalii despre drepturile tale găsești în pagina <a href="gdpr-rights.html">Drepturile mele GDPR</a>.</p>

<h2>3. Ce se șterge</h2>
<ul>
<li>Contul tău: adresa de email, parola și numele sau pseudonimul ales.</li>
<li>Toate alimentele din inventar, inclusiv cele consumate sau aruncate.</li>
<li>Locațiile de depozitare create de tine.</li>
<li>Notificările și alertele de expirare salvate în cont.</li>
<li>Profilul și setările salvate în cont (de exemplu intervalele alertelor de expirare).</li>
<li>Pe telefonul de pe care ștergi contul: poza de profil, planul săptămânal de meniu, bifele din lista de cumpărături, preferințele, notificările programate, fotografiile de produs și copia parolei din spațiul securizat al telefonului.</li>
</ul>

<h2>4. Ce nu se șterge</h2>
<ul>
<li><strong>Codurile de bare folosite.</strong> Codurile sunt un stoc comun de etichete pretipărite, nu date personale. Un cod folosit nu mai poate fi refolosit de nimeni, deci rămâne marcat ca folosit în sistem, fără nicio legătură cu persoana ta după ștergerea contului.</li>
<li><strong>Documentele financiar-contabile ale comenzilor</strong>, dacă ai cumpărat produse din Magazin. Le păstrăm pe durata impusă de legislația contabilă, conform <a href="privacy-policy.html">Politicii de confidențialitate</a>.</li>
</ul>

<h2>5. Cât durează și ce se întâmplă după</h2>
<ul>
<li>Ștergerea contului este <strong>definitivă</strong>: datele din inventar nu pot fi recuperate.</li>
<li>Datele sunt șterse din sistemele active imediat sau în cel mult 30 de zile. Copiile de siguranță ale furnizorilor noștri pot păstra date pentru o perioadă limitată, după care sunt suprascrise automat.</li>
<li>Conturile în care nu te autentifici timp de 24 de luni sunt șterse automat, împreună cu datele lor.</li>
</ul>

<h2>Contact</h2>
<p>${COMPANY.name}<br>
Email: <a href="mailto:${COMPANY.email}">${COMPANY.email}</a><br>
Telefon: <a href="${PHONE_HREF}">${COMPANY.phone}</a></p>`;
}

function withdrawalExtra() {
  // Formularul din aplicație (WithdrawalScreen) pregătește un email cu aceste câmpuri;
  // aici îl oferim ca model, pentru cine citește pagina pe web.
  const body = encodeURIComponent([
    'Declarație de retragere din contract (14 zile)',
    '',
    'Nume:',
    'Email cont:',
    'Număr comandă:',
    'Produse:',
    'Motiv (opțional):',
    'IBAN și titular cont (doar pentru plata ramburs):',
    '',
    'Declar că mă retrag din contractul de vânzare pentru produsele de mai sus.',
  ].join('\n'));
  const mailto = `mailto:${COMPANY.email}?subject=${encodeURIComponent('Retragere comandă')}&amp;body=${body}`;
  return `<section class="card prose" aria-labelledby="formular">
<h2 id="formular">Formular de retragere</h2>
<p>Poți folosi acest model sau formularul din aplicație (Setări → Legal → Dreptul de retragere). Completează în email: numele complet, adresa de email a contului, numărul comenzii, produsele returnate, motivul (opțional) și, doar pentru plata ramburs, IBAN-ul și titularul contului.</p>
<p><a class="button" href="${mailto}">Deschide emailul de retragere</a></p>
</section>`;
}

function legalIndex() {
  const sections = GROUPS.map(([g, label]) => `<section class="card">
<h2>${label}</h2>
<ul class="menu">
${DOCS.filter((d) => d.group === g).map((d) => `<li><a href="${d.id}.html"><span>${esc(d.title)}</span><small>${esc(d.desc)}</small></a></li>`).join('\n')}
</ul>
</section>`).join('\n');
  return head({
    title: 'Documente legale — Wastely',
    description: 'Politica de confidențialitate, termeni și condiții, ștergerea contului și celelalte documente legale ale aplicației Wastely.',
    path: '/legal/', root: '../',
  }) +
`<main id="continut">
<div class="wrap doc">
<p class="crumbs"><a href="../">Acasă</a> › Documente legale</p>
<h1>Documente legale</h1>
<p class="updated">${COMPANY.name} · CUI ${COMPANY.cui}</p>
${sections}
</div>
</main>
` + footer('../');
}

function notFound() {
  return head({ title: 'Pagina nu a fost găsită — Wastely', description: 'Pagina căutată nu există.', path: '/404.html', root: '/', noindex: true }) +
`<main id="continut">
<div class="wrap doc center">
<img src="/assets/logo-512.png" alt="" width="160" height="160">
<h1>Pagina nu a fost găsită</h1>
<p>Adresa pe care ai deschis-o nu există sau a fost mutată.</p>
<p><a class="button" href="/">Înapoi la pagina principală</a></p>
<p><a href="/legal/">Documente legale</a></p>
</div>
</main>
` + footer('/');
}

// ------------------------------------------------------------------- rulare

const placeholders = [];
const urls = [{ loc: '/', prio: '1.0' }, { loc: '/legal/', prio: '0.6' }];

for (const doc of DOCS) {
  let lastUpdated, bodyHtml, extraHtml = '';
  if (doc.custom) {
    lastUpdated = BUILD_DATE_RO;
    bodyHtml = deleteAccountBody();
  } else {
    const src = readDoc(doc.id);
    lastUpdated = src.lastUpdated;
    bodyHtml = render(src.body);
    // placeholdere de tip [...] (care nu sunt linkuri markdown)
    for (const m of src.body.matchAll(/\[([^\]]+)\](?!\()/g)) placeholders.push(`${doc.id}: [${m[1]}]`);
    if (doc.id === 'withdrawal') extraHtml = withdrawalExtra();
  }
  write(`legal/${doc.id}.html`, docPage(doc, { lastUpdated, bodyHtml, extraHtml }));
  urls.push({ loc: `/legal/${doc.id}.html`, prio: doc.id === 'privacy-policy' || doc.id === 'delete-account' ? '0.8' : '0.5' });
}
write('legal/index.html', legalIndex());
write('index.html', indexPage());
write('404.html', notFound());
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>${BASE_URL}${u.loc}</loc><lastmod>${BUILD_DATE}</lastmod><priority>${u.prio}</priority></url>`).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`);

console.log(`Gata: ${DOCS.length} pagini legale + index + 404 + sitemap.xml + robots.txt în ${PUBLIC}`);
console.log(placeholders.length ? `Placeholdere rămase în texte:\n  ${placeholders.join('\n  ')}` : 'Fără placeholdere [...] în texte.');
