# Eselsohr

Nuxt-4-Frontend für Nextcloud **Collectives** mit **Login Flow v2** und **shadcn-vue**-Styling.

## Voraussetzungen

- [Node.js](https://nodejs.org/) (npm inklusive), z. B. 22+

## Setup (im Projektordner)

```bash
cd /Users/jan/repos/eselsohr   # bzw. dein Clone-Pfad
npm install
cp .env.example .env           # Werte eintragen
npm run dev
```

### Production-Build (`npm run build`)

Läuft im Production-Modus mit Node Functions. Für die verschlüsselten Session-Cookies muss
**`NUXT_SESSION_PASSWORD`** gesetzt sein (mindestens 32 Zeichen).

Am Anfang von [`nuxt.config.ts`](nuxt.config.ts) werden **`.env.local`** und **`.env`** per **`dotenv`** geladen (ohne bestehende `process.env` zu überschreiben — CI bleibt unberührt).

## Login-Ablauf

1. Nutzer gibt in Eselsohr die URL der eigenen Nextcloud-Instanz an.
2. Eselsohr startet **Nextcloud Login Flow v2** über `POST /index.php/login/v2`.
3. Nextcloud öffnet den Login-/Freigabe-Dialog in einem separaten Tab.
4. Eselsohr pollt serverseitig den von Nextcloud gelieferten Poll-Endpunkt.
5. Nach erfolgreicher Freigabe speichert Eselsohr die Verbindung in einem verschlüsselten
   Session-Cookie.
6. Vor dem finalen Login prüft Eselsohr, ob die **Collectives-App** auf der Nextcloud-Instanz
   installiert ist. Fehlt sie, wird das erzeugte App-Passwort sofort wieder widerrufen und der
   Login abgebrochen.

Es ist **keine** OAuth2-Client-Registrierung in Nextcloud nötig.

## Graph View

In der Seitenleiste erscheint unter dem aktiven Collective-Eintrag der Link **Graph** (Branch-Icon). Die Ansicht liegt unter `/app/:collectiveId/graph`.

Zwei Modi lassen sich oben rechts umschalten:

- **Links:** Verbindungen aus Obsidian-Wiki-Links `[[Seitentitel]]` (optional `[[Seite|Alias]]`, `[[Seite#Überschrift]]`). Die Punktgröße entspricht der Anzahl verbundener Notizen. Nicht auflösbare Wiki-Links erscheinen als hellgraue Punkte; ein Klick erstellt eine neue Seite unter der Landing-Page (`Readme.md`).
- **Ordner:** Verbindungen zwischen einer Seite und ihren direkten Unternotizen (Collectives-Hierarchie). Keine broken Links.

**Hinweis:** Collectives-Smart-Picker-Links (`[Titel](/pfad?fileId=…)`) werden im Link-Modus nicht ausgewertet — nur `[[…]]`-Syntax. Bei doppelten Seitentiteln wird die erste passende Seite (inkl. Frontmatter-`aliases`) verwendet.

## Netlify

- **Preset:** `npm run build` → **`nuxt build --preset netlify`** (Node Functions). **`SERVER_PRESET` / `NITRO_PRESET` nicht auf `netlify-edge`** setzen — Edge (Deno) ist für diesen Server-Flow unpassend.
- **Alte Edge-Artefakte:** Falls im Repo noch **`.netlify/edge-functions/`** liegt (früher committed), entfernen und **nicht** einchecken (Ordner **`.netlify`** ist in `.gitignore`).
- **Publish directory:** Für Nuxt 4 ist **`dist`** meist falsch — eher **`.output`** bzw. [Netlify + Nuxt](https://nitro.unjs.io/deploy/providers/netlify) befolgen.
