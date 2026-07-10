# 📄 AGENTS.md — ZenTech-FE Guidelines

## 🧠 Overview

This project uses:

* **Angular 21** with Standalone APIs and signal-based reactivity
* **NgRx SignalStore** and `rxMethod` for feature state and async workflows
* **NgRx Entity for SignalStore** for CRUD collections with stable IDs
* **PrimeNG** for complex UI primitives
* **Lucide Angular** for all icons
* **Tailwind CSS** for styling

> **Scalability > Clean Architecture > Maintainability > Speed**

Choose the cleanest architecture that fits the feature; do not add ceremony without a state or workflow need.

---

## 🏗️ Architecture and Boundaries

### Layers

* `core/` → application-wide API infrastructure, interceptors, guards, tokens, global stores, and configuration. **No feature UI.**
* `shared/` → reusable application-wide presentational UI and pure utilities. **No feature business logic or feature state.**
* `site-management/` → feature capabilities, pages, feature components, data access, and business workflows.
* `app/` → root shell, application configuration, and routing composition.

### Feature boundaries

* A feature owns its `data-access`, `pages`, components, routes, models, and business rules.
* `site-management/shared` is only for a genuine cross-feature site capability. Its `data-access` may exist only when it is reused by multiple features and does not contain a single feature's business rule.
* Do not import another feature's internal files. Promote a truly shared contract or presentational component to the appropriate shared boundary instead.
* Keep feature stores route- or feature-scoped by default. Use `providedIn: 'root'` only for application-wide state such as auth session or notifications.

### Suggested feature structure

```text
feature/
├── data-access/
│   ├── models/       # DTOs, domain models, payloads, view models, optional events
│   ├── services/     # Feature Service → ApiService
│   └── store/        # SignalStore and reusable generic store features
├── components/       # Presentational components
├── pages/            # Smart route/page components
└── feature.routes.ts
```

Create files only when they add a useful boundary. For example, an event model or separate store-state file is optional, not mandatory.

---

## 🔁 Data and State Flow

### Default flow

```text
UI → Page → SignalStore → Feature Service → ApiService → Backend
```

* Pages never call a feature service, `ApiService`, or `HttpClient` directly.
* Stores never call `ApiService` or `HttpClient` directly; they call the owning Feature Service.
* Services return strongly typed DTOs or response models. Convert DTOs to domain/view models at a clear feature boundary.
* `HttpClient` is used only inside `ApiService`.

### State ownership

* Use component `signal`, `computed`, and `linkedSignal` for local, presentational state that does not need to outlive or coordinate outside the component.
* Use SignalStore for server state, shared page/feature state, and asynchronous workflows.
* Keep entity state separate from UI state (loading, errors, pagination, selection, draft, and dialog state).
* Use `computed` for derived state. Do not duplicate a value that can be derived from source state.
* Model nullable values explicitly; do not use `any`.

### Collections and entities

Use `withEntities<T>()` for CRUD collections with stable identities. Use named collections when a store contains multiple entity types.

* Use `setAllEntities`, `addEntity`, `updateEntity`, `removeEntity`, and related entity updaters for entity collections.
* Do not manually `map` or `filter` entity collections to perform CRUD updates.
* Plain arrays are valid for transient data, ordered display-only data, or data without stable IDs.

### Async workflows

* Put API calls and other asynchronous workflows in `rxMethod`.
* Each workflow owns its request status: set loading before the request and expose a typed error/success result afterwards.
* Choose the RxJS flattening operator intentionally: cancel stale reads/searches, queue writes that must preserve order, or ignore duplicate submissions when appropriate.
* Do not manually `subscribe()` in a component. Components trigger store workflows and render store signals.
* Extract generic `withFeature...` store features only after the same pattern appears in at least two or three stores. Generic features must not call APIs.

### Event-driven flows

Event reducers are optional and reserved for complex UI flows: multi-step dialogs, optimistic updates, websocket coordination, or workflows with several synchronous UI transitions.

* Events describe facts or user intent, for example `CreateRequested`, `SubmitSucceeded`, or `SearchKeywordChanged`; they do not describe implementation commands.
* Keep `handleEvent(event)` synchronous and limited to `patchState` and entity updaters.
* Never place API calls inside `handleEvent`.
* For ordinary CRUD and simple page interactions, expose typed store methods and `rxMethod` workflows directly instead of adding an event layer.

---

## 🧱 Components and Templates

### Pages (smart components)

* Inject the relevant SignalStore and bind its signals or a computed view model to the template.
* Translate UI events into typed store calls; keep handlers thin.
* Do not call APIs, feature services, or implement business workflows in a page.

### Presentational components

* Prefer signal inputs (`input`, `input.required`) and outputs (`output`) for the component contract.
* Emit user intent to the parent; do not own feature state, API calls, or business logic.
* Framework and UI-only dependencies are allowed when they are purely presentational. Do not inject data-access or business services.

### Template performance rules

* Do not define or call data transformation, filtering, sorting, lookup, or calculation functions from HTML templates.
* Prepare template data in TypeScript with `computed`, signals, or a memoized view model in the page/store.
* Templates should bind signals/properties and use thin event handlers only.
* Use `@for` with a stable `track` expression for rendered collections.
* Keep expensive work out of template expressions and lifecycle render paths.

---

## 🎨 UI Rules

* Follow the **Kinetic Monolith** aesthetic: minimalist sci-fi, high contrast, clean typography, and tonal transitions rather than traditional borders.
* Prefer Tailwind utility classes in templates. Use `@apply` only for heavily repeated or readability-critical component styles.
* Favor fixed technical interactions over bouncy or skewed hover effects.
* Use PrimeNG for common complex controls such as dialogs, menus, tables, and popovers.
* Use Lucide Angular exclusively for icons.

---

## ⚠️ Forbidden

* Calling `ApiService`, `HttpClient`, or a Feature Service directly from a component.
* Calling `ApiService` or `HttpClient` directly from a store.
* API logic inside `handleEvent`.
* Feature business logic or state inside application `shared/`.
* Direct imports of another feature's internals.
* `any`, duplicated derived state, or manual dependency tracking.
* Manual CRUD array mutations for an entity collection.
* Manual `subscribe()` in components.
* Data-processing function calls in HTML templates.

### Existing refactor priorities

Move the direct `ApiService` usage in these pages behind Feature Service and SignalStore first:

* `management/pages/approvals/approvals.component.ts`
* `management/pages/requests/requests.component.ts`
* `management/pages/leave-settings/leave-settings.component.ts`
* `management/pages/pay-periods/pay-periods.component.ts`

---

## ✅ Delivery Checklist

* Is the code in the correct layer and within its feature boundary?
* Does UI flow through Page → Store → Feature Service → ApiService?
* Is the store scoped appropriately: route/feature by default, root only for global state?
* Are async requests in `rxMethod`, with typed loading/error/success state and deliberate concurrency behavior?
* Are stable CRUD collections implemented with `withEntities` and entity updaters?
* Is derived data represented by `computed`/view models rather than duplicated state or template function calls?
* Does every `@for` use stable tracking?
* Are components free of API calls and feature business logic?
* Are DTO/domain/view-model boundaries, nullability, and public types explicit?
* Are tests present for service mapping, store success/error/entity behavior, page-to-store wiring, and computed view models?
* Does the affected feature preserve lazy-route boundaries and avoid unrelated feature imports?
* Does the UI follow Tailwind, PrimeNG, Lucide, and Kinetic Monolith conventions?
