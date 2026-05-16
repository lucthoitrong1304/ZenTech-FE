# 📄 AGENTS.md — ZenTech-FE Guidelines

## 🧠 Overview

This project uses:

* **Angular 21 (Standalone APIs & Signal-based Reactivity)**
* **NgRx SignalStore** (Primary) & **NgRx ComponentStore** (Fallback)
* **NgRx Entity for SignalStore** (For CRUD collections)
* **PrimeNG (UI components)**
* **Lucide Angular (icons)**
* **Tailwind CSS (styling)**

Goal:

> **Scalable · Clean · Maintainable code — no shortcuts**

---

## 🏗️ Architecture Rules

### Layers

* `core/` → global (API, interceptors, config) — **no UI**
* `shared/` → reusable UI & utils — **no business logic**
* `site-management/` → feature modules (main logic)
* `app/` → root config & routing

---

## 🔁 Flow Definitions

### 1. Main Flow (MANDATORY for simple cases)

```text
UI → Page → SignalStore → Service → ApiService → Backend
```

❗ Never bypass the Store to call Services directly from Components.

### 2. Event-Driven Flow (For complex features)

For screens with complex state interactions, strictly follow the Event-driven pattern:

```text
UI Event (User clicks Create)
→ Page calls `store.dispatch({ type: EventType.CreateClicked })`
→ Store `handleEvent` synchronously updates UI state (opens dialog)
→ User submits form → Page calls `store.createItem(payload)`
→ Store `rxMethod` handles API call asynchronously
→ On success, `rxMethod` dispatches `CreateSucceeded`
→ Store `handleEvent` adds entity using `addEntity()` and closes dialog.

```

---

## 🧩 Feature Structure

```text
feature/
├── data-access/
│   ├── models/
│   │   ├── feature.model.ts
│   │   ├── feature.payload.ts
│   │   └── feature.event.ts       <-- Event Enums & Types
│   ├── services/
│   │   └── feature.service.ts
│   └── store/
│       ├── feature.store.ts
│       ├── feature.store-feature.ts <-- Reusable store chunks
│       └── feature.store-state.ts
├── components/
├── pages/
├── feature.routes.ts

```

---

## 🧠 State Management (Signal-First)

Use **NgRx SignalStore** as the primary state management solution.

### 1. The Rules of Reactive State

* **Let Angular Track It:** Strictly use `signal`, `computed`, and `linkedSignal` for reactive state derivation. **Do not** track state changes manually.
* **Single Source of Truth:** Components must not duplicate business state.
* **Separation of State:** Clearly separate **Entity State** (collections of data) from **UI State** (loading, pagination, selected IDs, dialog modes).

### 2. Event Handling Rules (`feature.event.ts`)

* Events must describe *what happened*, not command *what to do*.
* ✅ Good: `CreateClicked`, `SubmitSucceeded`, `SearchKeywordChanged`.
* ❌ Bad: `OpenDialog`, `CallApi`, `SetLoading`.


* Create a central `handleEvent(event: FeatureEvent)` function inside the store.
* `handleEvent` is for **synchronous state updates only** (using `patchState`). **Never** put API logic inside `handleEvent`.

### 3. Entity Rules (`withEntities`)

Use `withEntities<T>()` when managing collections with CRUD behavior (stable IDs, lists, pagination).

* Use built-in updaters instead of manual array mutations:
* `setAllEntities(items)`
* `addEntity(item)`
* `updateEntity({ id, changes })`
* `removeEntity(id)`


* Avoid manual array mutations like `items.map(...)` or `items.filter(...)` unless the state is strictly not an entity collection.

### 4. Custom Store Features (`withFeature...`)

Extract repeated state patterns into Custom SignalStore Features.

* Create a feature only when the pattern appears in 2-3+ stores (e.g., `withRequestStatus()`, `withPagination()`, `withDialogState()`).
* Features must be generic, not tied to specific business models, and must not call APIs directly.

### 5. Store Workflows (`rxMethod`)

* API calls and asynchronous operations must be handled within `rxMethod`.
* `rxMethod` workflows must call the API through the Feature Service, then trigger internal `handleEvent` updates for Success/Failure states.

---

## 🧱 Component Rules

### Pages (Smart)

* Inject and use the Store (SignalStore).
* Dispatch events via `store.dispatch()` and call Store workflow methods (`rxMethod`).
* Expose state to the template via Signals (`store.vm()`).
* **Never** call API services directly or contain business logic.

### Components (Dumb)

* Use Signal Inputs (`input()`, `input.required()`) and Outputs (`output()`) only.
* Emit user events to the parent (Smart Component).
* No API calls, no business logic, no service injection.

---

## 🔌 API Rules

* All API calls → **Service → ApiService**
* Never use `HttpClient` directly in components or stores.
* Interceptors handle Authentication tokens and Global error handling.
* Services must return strongly typed DTOs or response models.

---

## 🎨 UI Rules

### Tailwind & Aesthetic

* Adhere to the **Kinetic Monolith** design system: minimalist sci-fi aesthetics, high-contrast layouts, clean typography, and eliminate traditional border lines where possible.
* Favor tonal transitions over line dividers.
* Use utility classes directly in HTML.
* Use `@apply` in SCSS only when styles are heavily reused, HTML becomes unreadable, or component-level style grouping is necessary.
* Favor fixed tech aesthetics over bouncy hover effects (avoid skew/bounce).

### PrimeNG

* Use for common, complex UI elements (dialogs, menus, tables, popovers).
* Do not rebuild existing components from scratch unless performance dictates raw HTML/CSS refactoring.

### Lucide Angular

* Use exclusively for all icons. Do not mix icon libraries.

---

## ⚠️ Forbidden

* API calls in components or directly inside `handleEvent()`.
* Calling `ApiService` directly from a Store (must go through Feature Service).
* Business logic in `shared/`.
* Using `any` types.
* Mixing smart & dumb roles.
* Duplicating state or bypassing the Store.
* Manual dependency tracking instead of using `computed()`.
* Manual array mutations for collections (use `withEntities` updaters instead).

---

## 🔁 Development Flow

1. Define models, payloads, and response DTOs.
2. Define Events (`feature.event.ts`) if the UI has complex flows.
3. Create Feature Service.
4. Create **SignalStore** (add `withEntities<T>()` and Custom Features if needed).
5. Add `handleEvent` for synchronous state changes.
6. Add `rxMethod` workflows for async operations.
7. Create page (smart component) and connect to Store `vm`.
8. Create components (dumb components using `input()`).
9. Bind UI → Store using Signals.

---

## ✅ Checklist

* Correct architectural layer?
* Using SignalStore first?
* Using `withEntities<T>()` for CRUD lists instead of manual arrays?
* Do events describe *what happened* (e.g., `SaveClicked`)?
* Is `handleEvent()` strictly updating state synchronously (no APIs)?
* Are API calls wrapped inside `rxMethod` workflows?
* Leveraging `computed()` for derived state?
* No business logic in UI?
* Tailwind used properly (Kinetic Monolith aesthetic applied)?
* PrimeNG used when possible?
* Lucide icons used exclusively?
* No unnecessary `any`?

---

## 🚀 Principle

> **Scalability > Clean Architecture > Maintainability > Speed**

When unsure → choose the cleaner architecture.
