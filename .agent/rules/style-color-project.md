---
trigger: always_on
---

# 🚀 UI/UX Design System Guide

**Theme:** Premium Tech E-commerce  
**Direction:** Clean · Professional · High Conversion · Subtle Cyberpunk  
**Use Case:** Gaming Gear Store & RAG AI Sales Assistant  
**Design Goal:** High-clarity product display · Strong CTA visibility · Minimal sci-fi aesthetic

---

## 🎨 1. Color System

### Brand Accent (Primary & Secondary)
Colors are focused on conversion rates and a refined technological aesthetic.

| Role | State/Target | Hex Code | Contrast / Rules |
| :--- | :--- | :--- | :--- |
| **Primary CTA** | Default | `#FFC700` | Must be the strongest visual element on the screen. |
| | Hover | `#FFD633` | |
| | Text on CTA | `#111827` | **CRITICAL:** Do not use white text to ensure readability. |
| **Secondary CTA**| Default | `#4F46E5` | Refined Indigo tone (Tech hardware, not "web3"). |
| | Hover | `#4338CA` | Use for "Buy Now" / Secondary Actions. |
| **Semantic** | Alert/Error/Sale| `#E11D48` | Use for warnings or discount labels. |

> **CTA Design Rules:**
> * Must strictly use `rounded-full`.
> * Solid colors only (No Glow, No Neon, No heavy gradients).

### Background System (Structured Layers)
A background system that creates depth and clearly separates UI layers.

| Layer | Hex Code | Usage |
| :--- | :--- | :--- |
| **Header / Nav** | `#101010` | Creates high contrast for brand identity. |
| **Main Content** | `#FFFFFF` | White background ensures maximum product image clarity. |
| **Surface / Card** | `#F9FAFB` | Soft background to separate UI layers (Inputs, Cards). |
| **AI Chat Bubble**| `#F0FDF4` | Background color for AI Assistant messages. |
| **User Chat Bubble**|`#F3F4F6` | Background color for user messages. |

### Typography & Text Colors

| Hierarchy | Light Background | Dark Background | Usage / Rules |
| :--- | :--- | :--- | :--- |
| **Primary Text** | `#111827` | `#FFFFFF` | Titles must always have the highest contrast. |
| **Secondary Text**| `#374151` | - | Standard body text. |
| **Muted Text** | `#6B7280` | - | Placeholder / Metadata / Old price (Secondary info). |
| **Semantic Text** | `#16A34A` | - | Success messages or AI status text. |

> **🚨 E-commerce Pricing Rules:**
> * **Original Price:** `#6B7280` + `line-through`.
> * **Sale Price:** `#E11D48` + `font-semibold`. Never use low-contrast colors for pricing or CTAs.

### Borders & Dividers
* **Default:** `#E5E7EB`
* **Focus:** `#4F46E5`
* **Rules:** Use only `1px` borders. Avoid heavy outlines. Use borders to support visual hierarchy, not to overpower the UI.

---

## 🧩 2. Component System

### Border Radius
| Component | Token | Notes |
| :--- | :--- | :--- |
| **Button / Input** | `rounded-full` | Creates a friendly, action-oriented feel. |
| **Card** | `rounded-xl` | Moderate rounding for product/content cards. |
| **Modal / Dialog** | `rounded-2xl` | |

### Shadow Hierarchy (Depth Layers)
* **Card:** `shadow-sm` (Slight elevation from the background).
* **Dropdown / Popover:** `shadow-md` (Floating menu elevation).
* **Chat Container:** `shadow-lg` (Creates clear depth, making it stand out from the main UI).

### Spacing System (8px Grid)
Use a consistent spacing scale: **4 / 8 / 12 / 16 / 24 / 32 / 48**

---

## 🕹️ 3. Interaction & States

### Button States
| State | Style Rules |
| :--- | :--- |
| **Default** | `bg-primary` |
| **Hover** | `bg-primary-hover` |
| **Disabled** | `bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed` |

### Input States & Accessibility
* **Default:** `border-[#E5E7EB]`
* **Focus:** `border-[#4F46E5] ring-1 ring-[#4F46E5]`
* **Focus Accessibility (Mandatory for all interactive elements):**
  * `focus-visible:outline-none`
  * `focus-visible:ring-2 focus-visible:ring-[#4F46E5]`

---

## 🤖 4. RAG Chatbot UI System

| Element | Background | Text Color | Shape / Border Radius | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **AI Bubble** | `#F0FDF4` | `#16A34A` | `rounded-xl rounded-tl-none` | Emphasizes the "Success/Safe" nature of the AI. |
| **User Bubble** | `#F3F4F6` | Default | `rounded-xl rounded-tr-none` | |
| **Chat Container**| `#FFFFFF` | Default | `rounded-2xl shadow-lg` | Completely stands out from the main layout. |
| **Chat Input** | `#F9FAFB` | Default | `rounded-full` (Focus: `#4F46E5`)| Smooth, frictionless design. |

---

## 🛍️ 5. Design Principles & Usage

1. **Brand Contrast:** Header is always Dark, Content is always Light, and CTAs must have the highest contrast (Yellow).
2. **Clean E-commerce First (Hierarchy):**
  * Prioritize visual order: `Product Image` ➡️ `Product Title` ➡️ `Price` ➡️ `CTA`.
  * *Absolutely no UI element should compete with the CTA for attention.*
3. **Flat Design Rules:**
  * **DO USE:** Solid colors, clean typography, minimal shadow.
  * **AVOID:** Gradients, glow, or over-designed cyberpunk effects.
