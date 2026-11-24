# CLAUDE.md — RestaurantHandler

Guide lu à chaque session Claude Code. Règles d'abord.

## Projet

- Client web Angular 22 de RestaurantHandler : prise de commande sur tablette, écran cuisine (KDS), encaissement, administration du restaurant.
- Backend et **documentation de référence** : dépôt frère `../RestaurantHandlerAPI` (ASP.NET Core .NET 10, dev avec le profil `https` sur `https://localhost:7113` / `http://localhost:5113`, ou le profil `http` sur `http://localhost:5152`). Lire `../RestaurantHandlerAPI/docs/` avant toute fonctionnalité.
- État : page d'accueil, feature `auth` (connexion, inscription, mot de passe oublié, activation) et back-office Manager `/gestion` (coquille `shared/ui/admin-layout`, `features/dashboard`, `features/menu-admin` : catégories, produits, groupes d'options partagés, photos, menus, ruptures) et `features/settings` (horaires, fermetures, pause, paramètres du restaurant ; état d'ouverture dans la barre du haut) et le temps réel `core/realtime` (connexion SignalR depuis `/gestion`, indicateur de connexion) et `features/ordering` (saisie comptoir, commandes du jour, détail et encaissement ; commandes à valider signalées par `shared/services/approval-alert.service.ts`) et `features/kitchen` (écran cuisine plein écran `/cuisine`) et le pilotage F7 : `features/reports` (statistiques `/gestion/statistiques`, période dans l'adresse) et `features/staff` (utilisateurs `/gestion/utilisateurs`, création d'un Manager, bannissement, levée des non-venues) et la commande en ligne F8a : logique de personnalisation partagée `shared/ordering/`, carte publique `shared/services/public-store.service.ts`, `features/shop` (carte `/commander`, fiche produit, menu, panier `/panier` conservé sur l'appareil, validation `/commander/valider`) et `features/tracking` (historique `/commandes`, suivi `/commandes/:id` — adresse de retour SumUp, ne pas la renommer —, reçu `/commandes/:id/recu`), bandeau « commande en cours », `features/legal` (CGV, confidentialité, mentions, allergènes) et la PWA (`ngsw-config.json` : seules `/api/menu` et `/api/restaurant/info` en cache, jamais commandes ni paiements ; tester le service worker sur `dist/`, pas avec `ng serve`) en place. Avancement et suite des écrans : `../RestaurantHandlerAPI/docs/50-feuille-de-route/04-feuille-de-route-front.md` (à tenir à jour à chaque étape), déclinaison des jalons J4 et J5 de `01-feuille-de-route.md`.
- Interface en **français**, i18n Angular (`@angular/localize`) prête pour d'autres langues.

## Commandes

- `npm start` (`ng serve`) : serveur de dev sur http://localhost:4200.
- `npm run build` : build de production dans `dist/` (budgets : 500 kB / 1 MB bundle initial, 4 kB / 8 kB style par composant si exception).
- `npm run watch` : build de développement en continu.
- `npm test` (`ng test`) : tests Vitest via `@angular/build:unit-test` (jsdom).
  - Un fichier : `ng test --include src/app/app.spec.ts` · un test : `ng test --filter "should create"` · sans surveillance : `ng test --watch=false`.
- Formatage : `npx prettier --write <fichiers>` (`printWidth` 100, guillemets simples, parseur Angular pour `*.html`). Pas encore de linter (ESLint prévu en M0).
- Pas encore d'E2E (Playwright prévu en M2).
- Client API : `npm run api:update` (backend lancé) télécharge `openapi/swagger.json` puis régénère `src/app/core/api/generated/` (ng-openapi-gen, config `ng-openapi-gen.json`) ; `npm run api:gen` régénère depuis le fichier versionné sans backend. Ne jamais éditer le dossier généré à la main.
- Serveur MCP Angular CLI dans `.mcp.json` : préférer `list_projects`, `get_best_practices`, `search_documentation`, `devserver_start`, `run_target` aux commandes shell. Projet unique : `RestaurantHandler`.

## Architecture

- Amorçage : `src/main.ts` → `bootstrapApplication(App, appConfig)`. Fournisseurs globaux dans `src/app/app.config.ts`, routes dans `src/app/app.routes.ts` (chaque feature chargée à la demande).
- **Zoneless** : pas de `zone.js` ; la vue ne se met à jour que par signals et événements. Interdit : modifier un champ simple dans un `setTimeout` ou un abonnement en attendant un rafraîchissement.
- Structure cible :
  ```
  src/app/core/        auth/ http/ realtime/ i18n/   (session, intercepteurs, SignalR, langue)
                       api/generated/   client généré (ng-openapi-gen), ne pas éditer
  src/app/shared/ui/   composants génériques accessibles
  src/app/shared/services/  store + services d'accès aux données partagées
  src/app/features/    floor/ ordering/ kitchen/ billing/ menu-admin/ staff/ settings/ closing/ reports/
                       chacun : routes, pages, composants, data-access/ (API + état en signals)
  ```
  Une feature n'importe jamais une autre feature ; le partagé descend dans `shared/` ou `core/`.
- Lectures par `httpResource` / `resource` / `rxResource`, écritures par `HttpClient` ; types d'API générés depuis l'OpenAPI du backend. Les composants n'appellent jamais `core/api/generated` directement : chaque service généré (`XxxApi`) a son wrapper `shared/services/xxx.service.ts`, même sans cache, qui renvoie `data` désenveloppé (`unwrap`) ou `Page<T>` pour les listes paginées (`unwrapPage`). Après une régénération, ajouter au wrapper les nouvelles méthodes.
- Données qui changent rarement (catégories, produits, ingrédients, menus, horaires, fermetures, réglages, rôles) : cache dans `shared/services/store.service.ts`, un `Cached<T>` (`rxResource`) par entité. Un composant appelle `store.x.load()` puis lit `store.x.value()` / `isLoading()` / `error()`. Les écritures passent par le service wrapper de l'entité (`categories.service.ts`…), qui appelle le service généré (`CategoriesApi`), renvoie `data` désenveloppé et recharge via `refresh(...)` tous les caches touchés (ex. produit → produits, catégories, menus).
- Temps réel : un service `core/realtime` gère la connexion SignalR (`/hubs/realtime`), la reconnexion et un signal d'état de connexion affiché en permanence (`shared/ui/connection-status`). L'API n'a pas de numéro de séquence : le rattrapage est une relecture REST, déclenchée par `realtime.resync` à chaque (re)connexion et retour au premier plan ; un écran s'abonne à `realtime.on('Événement')` et à `resync`. Le hub ne fait que pousser : toutes les actions passent par l'API REST.
- Styles : **globaux, par classes**. Point d'entrée `src/styles.scss`, qui charge les partiels voisins de `src/styles/` : `_tokens.scss` (propriétés CSS : couleurs, surfaces, bordures, typo, espacements), `_base.scss` (éléments natifs), `_layout.scss` (structure, en-tête, pied de page, sections, `.gutter`), `_components.scss` (`.btn`, `.facts`…). Un nouveau partiel thématique au même endroit si besoin (ex. `_forms.scss`), importé dans `styles.scss`.
  - Éviter les styles propres aux composants (`styleUrl`, `styles`) : un composant applique des classes globales. Exception à justifier : un style vraiment indissociable d'un seul composant et impossible à exprimer en classe partagée.
  - Classes nommées en BEM léger (`.bloc`, `.bloc__element`, `.bloc--variante`), réutilisables, sans référence à une page. Réutiliser une classe existante avant d'en créer une.
  - Thèmes clair et sombre, **Système** par défaut (suit l'appareil) ; choix forcé par `data-theme="light|dark"` sur `<html>` (`core/theme/theme.service.ts`, `public/theme-init.js` contre le flash, sélecteur `shared/ui/theme-switcher`). Chaque couleur est déclarée une seule fois dans `_tokens.scss` avec `light-dark(clair, sombre)` ; un composant n'utilise que des `var(--…)` et n'écrit jamais de règle propre à un thème. Contraste AA à vérifier dans les deux thèmes.
  - Monochrome, coins droits, sans ombre. Toujours `var(--…)`, jamais de couleur en dur ; texte jamais plus clair que `--color-muted`.
- Composants réutilisables privilégiés (en-tête, pied de page, champs, cartes…) dans `shared/ui/`, sans excès : extraire un composant quand un motif revient ou porte un comportement, pas pour un simple élément stylé (une classe suffit).
- Nommage v20+ sans suffixe de type : `app.ts`, `app.html`, `app.spec.ts`. Préfixe de sélecteur `app`. Fichiers statiques dans `public/`.
- Tests : globals Vitest (`describe`, `it`, `expect`, `vi`) ; ni `jasmine` ni `karma`.
- `tsconfig.json` n'active pas encore `strict` ni `strictTemplates` (prévu en M0) : écrire du code qui compile en mode strict.

## Sécurité côté client

- Cible : authentification par **cookie de session `HttpOnly`** posé par l'API (ADR-0002) : aucun jeton dans `localStorage`, `sessionStorage` ou IndexedDB.
  - **Exception temporaire, tant que l'API n'applique pas ADR-0002** : l'API renvoie un JWT d'accès court et pose un cookie `refreshToken` `HttpOnly`. Le JWT vit **uniquement en mémoire** dans `core/auth/session.service.ts` (un signal) ; `core/auth/auth.interceptor.ts` l'ajoute en `Authorization: Bearer` aux appels `/api/`, renouvelle une fois sur 401 via `/auth/refresh-token`, sinon renvoie vers `/auth/connexion?returnUrl=…`. Au démarrage, `provideAppInitializer` reprend la session grâce au cookie. Jamais de jeton ailleurs.
  - Gardes : `authGuard` / `guestGuard` (`core/auth/auth.guards.ts`) ; retour après connexion filtré par `safeReturnUrl` (pas de redirection ouverte).
  - Routes `auth/reset-password`, `auth/password-reset-success`, `auth/email-confirmation-success`, `auth/email-confirmation-failed` : chemins imposés par les liens des e-mails de l'API, ne pas les renommer.
  - Google : `GOOGLE_CLIENT_ID` (`core/auth/auth.config.ts`, vide = bouton masqué) ; le script `https://accounts.google.com/gsi/client` est chargé à la demande et devra être autorisé dans la CSP.
- SPA et API sur la **même origine** : en dev via `proxy.conf.mjs` (`/api` → `API_URL`, par défaut `http://localhost:5113`, avec le préfixe `/api` retiré ; `/hubs` idem ; autre port : `API_URL=http://localhost:5152 npm start`) ; `provideApiConfiguration('/api')` ; URLs d'API relatives ; pas de CORS. L'API n'a pas de préfixe : sans `/api`, ses routes `/auth/...` entreraient en collision avec celles du front.
- Réponses de l'API : enveloppe `{ message, status, data }` (pas encore de ProblemDetails) ; afficher le `message` via `apiErrorMessage` (`core/http/api-error.ts`), jamais de détail technique. Certaines routes ne renvoient pas de `data` : le wrapper utilise alors `toVoid()`, pas `unwrap()`.
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

- Petits, une seule responsabilité ; gabarits en ligne pour les petits composants ; chemin relatif au fichier TS pour un gabarit externe ; pas de styles de composant (voir Architecture › Styles).
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
- Écrire la documentation fonctionnelle ici : elle va dans `../RestaurantHandlerAPI/docs/`.

## Documentation (dans `../RestaurantHandlerAPI/docs/`)

Point d'entrée : `README.md` (ordre de lecture et index). En cas de désaccord entre ce fichier et la doc backend, la doc backend fait foi.

- `00-vision/` : `01-vision-objectifs.md` (périmètre V1) · `02-acteurs-parcours.md` (acteurs, appareils, parcours 1 à 5) · `03-glossaire.md`.
- `10-cahier-des-charges/` : `README.md` (format des stories) puis une épopée par fichier ; écrans du client : `E04-commande-en-ligne.md`, `E06-comptoir.md` (back-office), `E07-cuisine-kds.md`, `E08-suivi-client.md`, `E09-statistiques.md`, `E10-administration.md`.
- `20-regles-metier/` : `01-regles-commande.md` (R2 total calculé par le serveur, R10 idempotence) · `02-machine-etats-commande.md` · `03-roles-permissions.md` · `04-conformite-legale.md` (allergènes, RGPD, CGV).
- `30-technique/` : `01-architecture.md` (§ Temps réel, § Front — PWA Angular mobile-first) · `04-securite.md` (§ Authentification et session, § Front) · `03-exploitation.md` (§ Mode dégradé) · `05-tests.md`.
- `40-decisions/` : `README.md` (index des ADR) ; pour le front : `ADR-0002-auth-cookies-httponly.md`, `ADR-0009-compte-client-obligatoire.md`, `ADR-0011-francais-uniquement.md`.
- `50-feuille-de-route/` : `01-feuille-de-route.md` (jalons J4 PWA client et J5 back-office & KDS) · `04-feuille-de-route-front.md` (étapes F0 à F9 du front) · `02-questions-ouvertes.md` · `03-risques-dette.md`.
