---
trigger: always_on
---

# Project Architecture & Overview

**Project Name:** ZenTech-FE (Frontend)
**Domain:** Sci-Fi Gaming Gear E-commerce
**Framework:** Angular (Standalone APIs heavily utilized)
**Styling:** Tailwind CSS (Strictly follow `style-color-project.md` and `style-font-project.md`)
**State Management:** NgRx ComponentStore

## 1. Core Principles & Architecture Pattern

This project strictly follows a **Modular Architecture** divided into three main layers: `core`, `shared`, and feature modules (`site-management`).
* **Strict Separation of Concerns:** Dumb components must not inject services or call APIs. Smart components handle state and pass data down via `@Input()` and listen via `@Output()`.
* **Lazy Loading:** All feature modules must be lazy-loaded via `app.routes.ts`.

---

## 2. Folder Structure Guidelines

All source code is located under `src/app/`. The AI assistant MUST follow this structure when creating or modifying files:

### 2.1. `src/app/core/` (The Brain - Singleton)
Contains global, singleton services, interceptors, and configurations. **Loaded exactly once** by the root application. Do NOT import UI components here.
* **`api/`**: Wrapper for `HttpClient` (`api.service.ts`) and constant API endpoint strings (`api-endpoints.ts`). Group endpoints by feature.
* **`interceptors/`**: HTTP interceptors.
  * `error.interceptor.ts`: Catches global errors (e.g., 401, 500) and triggers the ToastService.
  * `token.interceptor.ts`: Attaches Bearer tokens to outgoing requests.
* **`services/`**: Global state services (e.g., `error-state.service.ts`).
* **`errors/`**: Global error handlers (`global-error-handler.ts`).
* **`tokens/`**: Angular Injection Tokens (e.g., `api-context.token.ts` used to bypass global loading/toast for specific requests).

### 2.2. `src/app/shared/` (The Arsenal - Reusable UI & Utils)
Contains purely presentational (Dumb) components, directives, pipes, and utility functions. **No business logic allowed here.**
* **`components/`**:
  * Simple UI elements: `button`, `input-error`, `confirm-dialog`.
  * **Co-location Rule:** For global UI elements like `toast` or `loading-spinner`, the UI (`.html`, `.ts`, `.scss`) and its controlling Service (`toast.service.ts`, `loading.service.ts` provided in 'root') MUST be kept together in the same folder.
* **`utils/`**: Helper functions (e.g., Date formatting, Regex validators).

### 2.3. `src/app/site-management/` (The Feature Factory)
Contains domain-specific feature modules (e.g., Auth, Product, User). Each feature is an isolated module.
* **Structure inside a specific feature (e.g., `product/`):**
  * `product.routes.ts` / `product.module.ts`: Routing and declarations for the feature.
  * `data-access/`: The data layer. Contains Models (DTO interfaces), API Services (calling Core ApiService), and NgRx ComponentStore (`product.store.ts`) for local state management.
  * `components/`: Feature-specific Dumb components (e.g., `product-card`, `product-filter`).
  * `pages/`: Smart components (Routed components like `product-list`). These inject the Store, fetch data, and pass it to the Dumb components.

### 2.4. Root Level (`src/app/`)
* `app.routes.ts`: Main routing configuration (implements Lazy Loading to `site-management` features).
* `app.config.ts`: Global providers (HttpClient, Router).
* `app.component.ts` / `app.html`: The root shell containing `<router-outlet>`, `<app-toast>`, and `<app-loading-spinner>`.

---

## 3. Coding Conventions

1. **Component Design:**
  * **Smart Components (Pages):** Fetch data via Store/Services, handle events, manage state.
  * **Dumb Components:** Only use `@Input()` to receive data and `@Output()` to emit events. No API calls.
2. **File Naming:** Use `kebab-case` for file names (e.g., `product-list.component.ts`).
3. **Class Naming:** Use `PascalCase` for classes and interfaces (e.g., `ProductListComponent`, `IProductResponse`).
4. **Error Handling:** Let the `error.interceptor.ts` handle generic HTTP errors. Only handle component-specific errors locally if absolutely necessary.
