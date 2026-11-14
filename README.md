# Site wastely.ro

Site static (HTML + CSS, fără backend, fără cookie-uri, fără scripturi de tracking) pentru aplicația Wastely.

Tot ce se publică stă în folderul **`public/`**:

```
public/
  index.html                  pagina de prezentare
  legal/index.html            lista documentelor legale
  legal/<nume>.html           cele 13 pagini legale (adresele din aplicație)
  404.html  robots.txt  sitemap.xml  favicon.ico  CNAME  _headers
  assets/                     style.css, logo, imagine Open Graph
```

Adresele cerute de aplicație (`https://wastely.ro/legal/<nume>.html`):
`privacy-policy`, `terms`, `sales-terms`, `delete-account`, `expiry-disclaimer`, `recipes-allergens-disclaimer`,
`delivery-returns`, `withdrawal`, `warranty`, `consumer-protection`, `gdpr-rights`, `trackers-policy`, `ad-consent`.

Pentru Google Play:
- URL politică de confidențialitate: `https://wastely.ro/legal/privacy-policy.html`
- URL ștergere cont: `https://wastely.ro/legal/delete-account.html`

> Pe Cloudflare Pages adresele cu `.html` sunt redirecționate automat către varianta fără extensie
> (`/legal/privacy-policy`). Ambele funcționează, deci linkurile din aplicație rămân valabile.

## Ce trebuie completat înainte de publicare

Două texte din documentele legale încă au placeholdere `[...]` (se completează în aplicație, apoi se regenerează site-ul):
- `expiry-disclaimer`: `[SURSA EXACTĂ, ex. USDA FoodKeeper]`
- `recipes-allergens-disclaimer`: `[actualizează dacă le adaugi]`

Butoanele „Google Play" / „App Store" din `index.html` sunt dezactivate („în curând"). După lansare, înlocuiește în
`tools/build.mjs` cele două `<span class="store" ...>` cu linkuri `<a class="store" href="...">` și rulează din nou generatorul.

## Cum actualizezi textele legale

Textele vin direct din aplicație (`wastly-app/src/content/legal/*.ts`) și nu se editează de mână în HTML. După orice
modificare în aplicație, rulează (este nevoie de [Node.js](https://nodejs.org) 18+):

```bash
node tools/build.mjs
```

Scriptul rescrie paginile din `public/`. Pagina `delete-account` este scrisă direct în `tools/build.mjs` (nu există ca
text în aplicație); datele firmei din subsol sunt tot acolo (constanta `COMPANY`).

## Verificare locală

Orice server static merge, de exemplu, din folderul `public/`:

```bash
npx http-server public -p 8080
```

apoi deschide http://localhost:8080.

---

## Publicare — varianta A: Cloudflare Pages (recomandată, fără Git)

Gratuit, HTTPS automat. Cere ca domeniul să folosească serverele de nume (nameservers) Cloudflare.

1. Creează un cont gratuit pe https://dash.cloudflare.com.
2. **Add a site** → scrie `wastely.ro` → planul **Free**. Cloudflare îți arată două nameservere (de forma `xxx.ns.cloudflare.com`).
3. La registrarul unde ai cumpărat domeniul (secțiunea DNS / Nameservers), înlocuiește nameserverele existente cu cele două de la Cloudflare. Propagarea durează de la câteva minute la câteva ore.
4. În Cloudflare: **Workers & Pages** → **Create** → **Pages** → **Upload assets** → nume proiect `wastely` →
   încarcă folderul **`public`** (drag & drop) → **Deploy**.
5. În proiect: **Custom domains** → **Set up a custom domain** → `wastely.ro` → confirmă (Cloudflare adaugă singur înregistrarea DNS).
   Repetă pentru `www.wastely.ro`, dacă vrei și varianta cu www.
6. După 1–5 minute, `https://wastely.ro` este activ cu certificat HTTPS.

Pentru modificări ulterioare: rulezi `node tools/build.mjs`, apoi în proiect **Create deployment** și încarci din nou folderul `public`.

## Publicare — varianta B: GitHub Pages

Gratuit, funcționează cu DNS-ul rămas la registrar (nu trebuie schimbate nameserverele). Cere un repository **public** pe cont gratuit.

1. Creează un cont pe https://github.com și un repository nou (public), de exemplu `wastely-site`.
2. Urcă în repository conținutul folderului `wastely-site` (inclusiv `public/` și `.github/`), pe ramura `main`.
3. În repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
   Workflow-ul `.github/workflows/pages.yml` publică automat folderul `public/` la fiecare push.
4. Tot în **Settings → Pages → Custom domain** scrie `wastely.ro` și salvează (fișierul `public/CNAME` conține deja domeniul).
5. La registrar, în zona DNS a domeniului `wastely.ro`, adaugă:

   | Tip   | Nume / Host | Valoare                |
   |-------|-------------|------------------------|
   | A     | `@`         | `185.199.108.153`      |
   | A     | `@`         | `185.199.109.153`      |
   | A     | `@`         | `185.199.110.153`      |
   | A     | `@`         | `185.199.111.153`      |
   | CNAME | `www`       | `<utilizator>.github.io` |

   (Opțional, pentru IPv6: patru înregistrări AAAA pentru `@`: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`.)
   Șterge înregistrările A/AAAA vechi ale registrarului pentru `@`, dacă există (de exemplu pagina de parcare).
6. Așteaptă verificarea DNS (de obicei sub o oră), apoi bifează **Enforce HTTPS** în **Settings → Pages**.

> Verifică valorile și pașii în documentația oficială, deoarece interfețele se schimbă:
> https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site

## După publicare

1. Deschide pe telefon și pe calculator `https://wastely.ro` și toate cele 13 adrese de mai sus.
2. În aplicație (`wastly-app/src/config/legal.ts`) schimbă `WEB_BASE` în `https://wastely.ro/legal`.
3. În Google Play Console completează URL-ul politicii de confidențialitate și URL-ul pentru ștergerea contului (adresele de mai sus).
4. (Opțional) În Google Search Console adaugă `https://wastely.ro/sitemap.xml`.
