# 📄 AGENTS.md — ZenTech-FE Guidelines

## 🧠 Overview

This project uses:

* **Angular 21 (Standalone APIs)**
* **NgRx ComponentStore (v21 practices)**
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
UI → Page → Store → Service → ApiService → Backend
```

❗ Never break this flow

---

## 🧩 Feature Structure

```text
feature/
├── data-access/
│   ├── models/
│   ├── services/
│   └── store/
├── components/
├── pages/
├── feature.routes.ts
```

---

## 🧠 State Management

Use **NgRx ComponentStore**

Rules:

* Store = single source of truth
* API calls only in `effects`
* No state in components
* No direct mutation

---

## 🧱 Component Rules

### Pages (Smart)

* Use Store
* Handle events
* Orchestrate data

### Components (Dumb)

* `@Input()` / `@Output()` only
* No API calls
* No business logic
* No service injection

---

## 🔌 API Rules

* All API calls → **Service → ApiService**
* Never use `HttpClient` directly in components
* Interceptors handle:

  * token
  * global errors

---

## 🎨 UI Rules

### Tailwind

* Use utility classes in HTML
* Use `@apply` if needed
* Avoid custom CSS when possible

### PrimeNG

* Use for common UI (dialog, menu, table, etc.)
* Do not rebuild existing components

### Lucide Angular

* Use for all icons only

---

## ⚠️ Forbidden

* API calls in components
* Business logic in `shared/`
* Using `any`
* Mixing smart & dumb roles
* Duplicating state
* Skipping Store
* Using other UI/icon libraries

---

## 🔁 Development Flow

1. Define models
2. Create service
3. Create store
4. Create page (smart)
5. Create components (dumb)
6. Bind UI → Store

---

## ✅ Checklist

* Correct layer?
* Using Store?
* API via service?
* No business logic in UI?
* Tailwind used properly?
* PrimeNG used when possible?
* Lucide icons used?
* No unnecessary `any`?

---

## 🚀 Principle

> **Scalability > Clean Architecture > Maintainability > Speed**

When unsure → choose the cleaner architecture.
