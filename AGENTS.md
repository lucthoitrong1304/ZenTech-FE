# 📄 AGENTS.md — ZenTech-FE Guidelines

## 🧠 Overview

This project uses:

* **Angular 21 (Standalone APIs & Signal-based Reactivity)**
* **NgRx SignalStore** (Primary) & **NgRx ComponentStore** (Fallback)
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

## 🔁 Main Flow (MANDATORY)

```text
UI → Page → SignalStore → Service → ApiService → Backend
```

❗ Never break this flow

---

## 🧩 Feature Structure

```text
feature/
├── data-access/
│   ├── models/
│   ├── services/
│   └── store/ (SignalStore by default)
├── components/
├── pages/
├── feature.routes.ts
```

---

## 🧠 State Management (Signal-First)

Use **NgRx SignalStore** as the primary state management solution.

**Rules:**

* **SignalStore First:** Always start with SignalStore. Only fallback to NgRx ComponentStore if you encounter a highly specific, complex scenario that SignalStore cannot cleanly resolve.
* **Let Angular Track It:** Strictly use `signal`, `computed`, and `linkedSignal` for reactive state derivation. Let Angular's reactivity graph automatically track dependencies. **Do not** track state changes or dependencies manually.
* **Single Source of Truth:** The store is the sole owner of the state. No local state in components unless it is purely UI-driven (e.g., dropdown toggle).
* **Side Effects:** API calls and asynchronous operations must be handled within store methods (e.g., `rxMethod` in SignalStore or `effects` in ComponentStore).
* **No Direct Mutation:** State must be updated immutably via the store's updater functions.

---

## 🧱 Component Rules

### Pages (Smart)

* Inject and use the Store (SignalStore).
* Handle events and orchestrate data flow.
* Expose state to the template via Signals.

### Components (Dumb)

* Use Signal Inputs (`input()`, `input.required()`) and Outputs (`output()`) only.
* No API calls.
* No business logic.
* No service injection.

---

## 🔌 API Rules

* All API calls → **Service → ApiService**
* Never use `HttpClient` directly in components.
* Interceptors handle:
  * Authentication tokens
  * Global error handling

---

## 🎨 UI Rules

### Tailwind & Aesthetic

* Adhere to the **Kinetic Monolith** design system: aim for minimalist sci-fi aesthetics, high-contrast layouts, and eliminate traditional border lines where possible.
* Use utility classes directly in HTML.
* Use `@apply` only when strictly necessary for heavily reused component styles.
* Favor fixed tech aesthetics over bouncy hover effects (e.g., avoid skew on hover).

### PrimeNG

* Use for common, complex UI elements (dialogs, menus, tables, etc.).
* Do not rebuild existing components from scratch unless performance dictates raw HTML/CSS refactoring.

### Lucide Angular

* Use for all icons exclusively.

---

## ⚠️ Forbidden

* API calls in components.
* Business logic in `shared/`.
* Using `any` types.
* Mixing smart & dumb roles.
* Duplicating state or bypassing the Store.
* Manual dependency tracking instead of using `computed()`.
* Using other UI/icon libraries.

---

## 🔁 Development Flow

1. Define models.
2. Create service.
3. Create **SignalStore**.
4. Create page (smart component).
5. Create components (dumb components using `input()`).
6. Bind UI → Store using Signals.

---

## ✅ Checklist

* Correct architectural layer?
* Using SignalStore (or justified ComponentStore)?
* Leveraging `computed()` for derived state?
* API via service?
* No business logic in UI?
* Tailwind used properly (Kinetic Monolith aesthetic applied)?
* PrimeNG used when possible?
* Lucide icons used?
* No unnecessary `any`?

---

## 🚀 Principle

> **Scalability > Clean Architecture > Maintainability > Speed**

When unsure → choose the cleaner architecture.
