# CLAUDE.md — RestaurantHandler

Guide lu à chaque session Claude Code. Règles d'abord.

## Projet

- Client web Angular 22 de RestaurantHandler : prise de commande sur tablette, écran cuisine (KDS), encaissement, administration du restaurant.
- Backend et **documentation de référence** : dépôt frère `../Template` (ASP.NET Core .NET 10, dev sur `http://localhost:5216` / `https://localhost:7273`). Lire `../Template/docs/` avant toute fonctionnalité.
- État : scaffold CLI (`app.routes.ts` vide, `app.html` par défaut, ni `HttpClient`, ni proxy, ni i18n). Les jalons du front (J4, J5) sont décrits dans `../Template/docs/50-feuille-de-route/01-feuille-de-route.md`.
- Interface en **français**, i18n Angular (`@angular/localize`) prête pour d'autres langues.

## Commandes

- `npm start` (`ng serve`) : serveur de dev sur http://localhost:4200.
- `npm run build` : build de production dans `dist/` (budgets : 500 kB / 1 MB bundle initial, 4 kB / 8 kB style par composant).
- `npm run watch` : build de développement en continu.
- `npm test` (`ng test`) : tests Vitest via `@angular/build:unit-test` (jsdom).
  - Un fichier : `ng test --include src/app/app.spec.ts` · un test : `ng test --filter "should create"` · sans surveillance : `ng test --watch=false`.
- Formatage : `npx prettier --write <fichiers>` (`printWidth` 100, guillemets simples, parseur Angular pour `*.html`). Pas encore de linter (ESLint prévu en M0).
- Pas encore d'E2E (Playwright prévu en M2).
- Serveur MCP Angular CLI dans `.mcp.json` : préférer `list_projects`, `get_best_practices`, `search_documentation`, `devserver_start`, `run_target` aux commandes shell. Projet unique : `RestaurantHandler`.

## Architecture

- Amorçage : `src/main.ts` → `bootstrapApplication(App, appConfig)`. Fournisseurs globaux dans `src/app/app.config.ts`, routes dans `src/app/app.routes.ts` (chaque feature chargée à la demande).
- **Zoneless** : pas de `zone.js` ; la vue ne se met à jour que par signals et événements. Interdit : modifier un champ simple dans un `setTimeout` ou un abonnement en attendant un rafraîchissement.
- Structure cible :
  ```
  src/app/core/        auth/ http/ realtime/ i18n/   (session, intercepteurs, SignalR, langue)
  src/app/shared/ui/   composants génériques accessibles
  src/app/features/    floor/ ordering/ kitchen/ billing/ menu-admin/ staff/ settings/ closing/ reports/
                       chacun : routes, pages, composants, data-access/ (API + état en signals)
  ```
  Une feature n'importe jamais une autre feature ; le partagé descend dans `shared/` ou `core/`.
- Lectures par `httpResource` / `resource`, écritures par `HttpClient` ; types d'API générés depuis l'OpenAPI du backend.
- Temps réel : un service `core/realtime` gère la connexion SignalR (`/hubs/restaurant`), la reconnexion, le rattrapage par numéro de séquence et un signal d'état de connexion affiché en permanence. Le hub ne fait que pousser : toutes les actions passent par l'API REST.
- Nommage v20+ sans suffixe de type : `app.ts`, `app.html`, `app.scss`, `app.spec.ts`. Préfixe de sélecteur `app`, styles SCSS. Fichiers statiques dans `public/`.
- Tests : globals Vitest (`describe`, `it`, `expect`, `vi`) ; ni `jasmine` ni `karma`.
- `tsconfig.json` n'active pas encore `strict` ni `strictTemplates` (prévu en M0) : écrire du code qui compile en mode strict.

## Sécurité côté client

- Authentification par **cookie de session `HttpOnly`** posé par l'API : aucun jeton dans `localStorage`, `sessionStorage`, IndexedDB ou en mémoire ; jamais de JWT.
- SPA et API sur la **même origine** : en dev via un proxy `ng serve` (`/api`, `/hubs` → `http://localhost:5216`) ; URLs d'API relatives ; pas de CORS.
- `provideHttpClient(withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }))` ; ne jamais désactiver la protection XSRF.
- Chaque action modifiante envoie un en-tête `Idempotency-Key` (UUID par action utilisateur, réutilisé en cas de nouvel essai) et la version (`If-Match`) quand l'API la demande.
- Les permissions reçues de l'API servent **uniquement** à masquer l'interface (gardes de route, boutons) ; le serveur décide.
- Erreurs : afficher les ProblemDetails via un intercepteur ; 401 → écran de connexion ; 409 → recharger et prévenir ; jamais de détail technique à l'écran.
- Interdits : `innerHTML` et `bypassSecurityTrust*` (sauf revue de sécurité), scripts ou styles externes non approuvés (CSP stricte).
- Données de session : rien de personnel dans les logs de la console en production.

## Bonnes pratiques TypeScript

- Typage strict ; inférence quand le type est évident ; pas de `any` (`unknown` si incertain).

## Bonnes pratiques Angular

- Composants standalone uniquement. Ne **pas** écrire `standalone: true` (défaut depuis v20).
- Ne **pas** écrire `changeDetection: ChangeDetectionStrategy.OnPush` (défaut depuis v22).
- Signals pour l'état ; routes de features chargées à la demande.
- Pas de `@HostBinding` / `@HostListener` : utiliser l'objet `host` du décorateur.
- `NgOptimizedImage` pour toutes les images statiques (pas pour les images base64 en ligne).

### Composants

- Petits, une seule responsabilité ; gabarits en ligne pour les petits composants ; chemins relatifs au fichier TS pour les gabarits et styles externes.
- `input()` et `output()` plutôt que les décorateurs ; `model()` pour la liaison bidirectionnelle `[(prop)]`.
- `computed()` pour l'état dérivé ; `linkedSignal()` pour un état dérivé de plusieurs sources qui doit rester synchronisé.
- Formulaires : **Signal Forms** (`@angular/forms/signals`) ; sinon formulaires réactifs, jamais pilotés par le gabarit.
- Pas de `ngClass` / `ngStyle` : liaisons `class` et `style`.
- Pas de `CommonModule` : importer seulement les directives et pipes utilisés (`AsyncPipe`, `DatePipe`…).

### État

- Signals pour l'état local ; transformations pures et prévisibles ; `update` ou `set`, jamais `mutate`.

### Gabarits

- Simples, sans logique complexe ; contrôle de flux natif (`@if`, `@for`, `@switch`) ; pipe `async` pour les observables.
- Ne pas supposer de globals (`new Date()`…) dans les gabarits.
- Tout texte visible balisé pour l'i18n (`i18n`, `$localize`).

### Services

- Une responsabilité par service ; singletons avec `@Service` (v22+) plutôt que `@Injectable({ providedIn: 'root' })`.
- `inject()` plutôt que l'injection par constructeur.

## Accessibilité et ergonomie

- Doit passer tous les contrôles **axe** et respecter **WCAG 2.2 AA** : focus, contraste, attributs ARIA.
- Cibles tactiles ≥ 44 × 44 px ; utilisable d'une main sur tablette ; KDS lisible à 2 m, contraste élevé.
- Jamais d'information portée par la couleur seule (statuts cuisine : couleur + libellé ou icône).

## À ne pas faire

- Dupliquer une règle métier du serveur (calcul de TVA, transitions d'état) comme source de vérité côté client.
- Ajouter une bibliothèque d'état global, de composants ou d'i18n sans ADR.
- Écrire la documentation fonctionnelle ici : elle va dans `../Template/docs/`.

## Documentation (dans `../Template/docs/`)

Point d'entrée : `README.md` (ordre de lecture et index). En cas de désaccord entre ce fichier et la doc backend, la doc backend fait foi.

- `00-vision/` : `01-vision-objectifs.md` (périmètre V1) · `02-acteurs-parcours.md` (acteurs, appareils, parcours 1 à 5) · `03-glossaire.md`.
- `10-cahier-des-charges/` : `README.md` (format des stories) puis une épopée par fichier ; écrans du client : `E04-commande-en-ligne.md`, `E06-comptoir.md` (back-office), `E07-cuisine-kds.md`, `E08-suivi-client.md`, `E09-statistiques.md`, `E10-administration.md`.
- `20-regles-metier/` : `01-regles-commande.md` (R2 total calculé par le serveur, R10 idempotence) · `02-machine-etats-commande.md` · `03-roles-permissions.md` · `04-conformite-legale.md` (allergènes, RGPD, CGV).
- `30-technique/` : `01-architecture.md` (§ Temps réel, § Front — PWA Angular mobile-first) · `04-securite.md` (§ Authentification et session, § Front) · `03-exploitation.md` (§ Mode dégradé) · `05-tests.md`.
- `40-decisions/` : `README.md` (index des ADR) ; pour le front : `ADR-0002-auth-cookies-httponly.md`, `ADR-0009-compte-client-obligatoire.md`, `ADR-0011-francais-uniquement.md`.
- `50-feuille-de-route/` : `01-feuille-de-route.md` (front : jalons J4 PWA client et J5 back-office & KDS) · `02-questions-ouvertes.md` · `03-risques-dette.md`.
