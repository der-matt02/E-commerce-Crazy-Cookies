# Dulcerie — Design Tokens & Style Guide

Guía de estilos del e-commerce de repostería Dulcerie. Úsala como referencia al construir cualquier componente nuevo.

---

## Identidad visual

**Estética:** Minimalismo refinado. Espacios generosos, tipografía editorial, sin ornamentos innecesarios. La comida habla sola — la UI no compite con ella.

**Tono:** Artesanal, cálido, elegante. No genérico ni clínico.

---

## Tipografía

```css
/* Fuentes — importar desde Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

--font-serif: 'Cormorant Garamond', serif;   /* Títulos, precios, nombres de producto */
--font-sans:  'DM Sans', sans-serif;          /* Cuerpo, etiquetas, botones, UI */
```

### Escala tipográfica

| Uso                        | Familia | Tamaño     | Peso | Notas                        |
|----------------------------|---------|------------|------|------------------------------|
| Título hero / H1           | serif   | clamp(38px, 4vw, 58px) | 300 | `line-height: 1.15`          |
| Nombre de producto (card)  | serif   | 17px       | 400  | `line-height: 1.3`           |
| Título de sección          | serif   | 28px       | 300  |                              |
| Título de detalle          | serif   | 36px       | 300  |                              |
| Precio                     | serif   | 28px       | 400  |                              |
| Logo / marca               | serif   | 22px       | 400  | `letter-spacing: 0.06em`     |
| Cuerpo / descripción       | sans    | 14px       | 400  | `line-height: 1.7`           |
| Botones                    | sans    | 13px       | 400  | `letter-spacing: 0.06em`     |
| Etiquetas / chips          | sans    | 12–13px    | 400  |                              |
| Microlabels / uppercase    | sans    | 10–11px    | 400–500 | `letter-spacing: 0.10–0.18em; text-transform: uppercase` |
| Breadcrumb / meta          | sans    | 12px       | 400  |                              |

---

## Paleta de colores

```css
:root {
  /* Fondos */
  --cream:       #F9F6F1;   /* Fondo principal de página */
  --cream-dark:  #F0EBE3;   /* Superficies secundarias, fondos de imagen */
  --white:       #FFFFFF;   /* Cards, inputs, fondos elevados */

  /* Texto */
  --ink:         #1A1714;   /* Texto principal, botones primarios */
  --ink-light:   #6B6560;   /* Texto secundario, subtítulos */
  --ink-lighter: #A8A29C;   /* Placeholders, metadata, labels */

  /* Bordes */
  --border:      rgba(26, 23, 20, 0.10);  /* Bordes suaves (divisores, cards) */
  --border-md:   rgba(26, 23, 20, 0.18);  /* Bordes de inputs, botones secundarios */

  /* Acento */
  --accent:       #C4956A;  /* Etiquetas de categoría, detalles decorativos */
  --accent-light: #EDD9C5;  /* Fondos con acento suave */
}
```

### Uso de color por contexto

| Elemento                  | Color                  |
|---------------------------|------------------------|
| Fondo de página           | `--cream`              |
| Fondo de hero / galería   | `--cream-dark`         |
| Cards / inputs            | `--white`              |
| Texto principal           | `--ink`                |
| Texto secundario          | `--ink-light`          |
| Placeholders / metadata   | `--ink-lighter`        |
| Botón primario bg         | `--ink`                |
| Botón primario texto      | `--white`              |
| Tag / categoría           | `--accent`             |
| Divisores y bordes        | `--border` / `--border-md` |

---

## Botones

### Botón primario
```css
.btn-primary {
  padding: 12px 28px;
  background: var(--ink);           /* #1A1714 */
  color: var(--white);
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.06em;
  border: none;
  border-radius: 2px;               /* Esquinas casi rectas — no redondeado */
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}
.btn-primary:hover {
  background: #2d2926;
  transform: translateY(-1px);
}
```

### Botón secundario (outline)
```css
.btn-secondary {
  padding: 12px 28px;
  background: transparent;
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.06em;
  border: 1px solid var(--border-md);
  border-radius: 2px;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-secondary:hover {
  background: var(--cream-dark);
}
```

### Botón ghost (icono)
```css
.btn-ghost {
  width: 48px;
  height: 48px;
  border: 1px solid var(--border-md);
  border-radius: 2px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.btn-ghost:hover {
  background: var(--cream-dark);
}
/* Ícono SVG dentro: stroke var(--ink-light), fill none, stroke-width 1.5, 18×18px */
```

### Botón redondo (nav / acción circular)
```css
.btn-round {
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-md);
  border-radius: 50%;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.btn-round:hover {
  background: var(--cream-dark);
}
/* Ícono SVG: 16×16px, stroke var(--ink), fill none, stroke-width 1.5 */
```

### Botón "agregar" (producto)
```css
.btn-add {
  width: 30px;
  height: 30px;
  border: 1px solid var(--border-md);
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--ink-light);
  line-height: 1;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.btn-add:hover {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--white);
}
```

### Botón full-width (checkout / CTA principal)
```css
.btn-full {
  width: 100%;
  padding: 14px;
  background: var(--ink);
  color: var(--white);
  font-family: var(--font-sans);
  font-size: 13px;         /* o 14px para versión más grande */
  font-weight: 400;
  letter-spacing: 0.06em;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-full:hover {
  background: #2d2926;
}
```

---

## Inputs y formularios

```css
.form-input {
  width: 100%;
  padding: 11px 14px;
  border: 1px solid var(--border-md);
  border-radius: 2px;
  background: var(--white);
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--ink);
  outline: none;
  transition: border-color 0.15s;
  appearance: none;
}
.form-input:focus {
  border-color: var(--ink);
}
.form-input::placeholder {
  color: var(--ink-lighter);
}
textarea.form-input {
  resize: vertical;
  min-height: 80px;
}

/* Label sobre el input */
.form-label {
  font-size: 11px;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-lighter);
  display: block;
  margin-bottom: 7px;
}
```

---

## Chips / filtros

```css
.chip {
  padding: 7px 18px;
  font-size: 12px;
  font-family: var(--font-sans);
  border: 1px solid var(--border-md);
  border-radius: 40px;
  background: transparent;
  color: var(--ink-light);
  cursor: pointer;
  transition: all 0.15s;
  letter-spacing: 0.02em;
}
.chip:hover {
  border-color: var(--ink);
  color: var(--ink);
}
.chip.active {
  background: var(--ink);
  color: var(--white);
  border-color: var(--ink);
}
```

### Option chips (selector de tamaño / sabor)
```css
.option-chip {
  padding: 8px 18px;
  border: 1px solid var(--border-md);
  border-radius: 2px;              /* Cuadrado, no pill */
  font-size: 13px;
  color: var(--ink-light);
  cursor: pointer;
  background: transparent;
  font-family: var(--font-sans);
  transition: all 0.15s;
}
.option-chip:hover {
  border-color: var(--ink);
  color: var(--ink);
}
.option-chip.active {
  background: var(--ink);
  color: var(--white);
  border-color: var(--ink);
}
```

---

## Cards de producto

```css
.product-card {
  background: var(--cream);
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
  overflow: hidden;
}
.product-card:hover {
  background: var(--white);
}

/* Imagen */
.product-img {
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--cream-dark);
}
.product-img-inner {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.product-card:hover .product-img-inner {
  transform: scale(1.04);
}

/* Cuerpo */
.product-body {
  padding: 16px 18px 20px;
}
.product-cat {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-lighter);
  margin-bottom: 4px;
}
.product-name {
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 400;
  color: var(--ink);
  margin-bottom: 8px;
  line-height: 1.3;
}
.product-price {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
}
```

---

## Navegación

```css
nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 48px;
  background: rgba(249, 246, 241, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  z-index: 100;
}

.nav-logo {
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 400;
  letter-spacing: 0.06em;
  color: var(--ink);
}

.nav-link {
  font-size: 13px;
  font-weight: 400;
  color: var(--ink-light);
  text-decoration: none;
  letter-spacing: 0.04em;
  transition: color 0.2s;
}
.nav-link:hover,
.nav-link.active {
  color: var(--ink);
}
```

---

## Divisores y bordes

```css
/* Divisor horizontal estándar */
.divider {
  height: 1px;
  background: var(--border);
  margin: 24px 0;
}

/* Borde de card o sección */
border: 1px solid var(--border);        /* suave */
border: 1px solid var(--border-md);     /* más visible (inputs, botones) */

/* Grid de productos — separación por borde de 1px */
.product-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--border);   /* el "gap" actúa como borde */
  border: 1px solid var(--border);
}
.product-card {
  background: var(--cream);    /* tapa el fondo del grid */
}
```

---

## Radio de borde (border-radius)

| Elemento                        | Valor  |
|---------------------------------|--------|
| Botones (primario, secundario)  | `2px`  |
| Option chips                    | `2px`  |
| Inputs / textareas              | `2px`  |
| Filter chips / pills            | `40px` |
| Cards (product, detail)         | `0px` o `2px` |
| Botones circulares              | `50%`  |

> Regla: usar `2px` por defecto — esquinas casi rectas para una estética sobria. Reservar border-radius mayor solo para chips tipo pill.

---

## Espaciado

```css
/* Padding de página */
--page-padding-x: 48px;   /* desktop */
--page-padding-x: 24px;   /* mobile */

/* Espaciado vertical entre secciones */
--section-gap: 48–80px;

/* Padding interno de cards */
--card-padding: 16px 18px 20px;

/* Padding de nav */
--nav-height: 64px;
```

---

## Íconos SVG

Todos los íconos usan estilo line (outline), nunca fill sólido.

```html
<!-- Ejemplo de ícono estándar -->
<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="1.5"
     stroke-linecap="round" stroke-linejoin="round">
  ...
</svg>
```

| Propiedad       | Valor                        |
|-----------------|------------------------------|
| `fill`          | `none`                       |
| `stroke`        | `currentColor` o `var(--ink-light)` |
| `stroke-width`  | `1.5`                        |
| Tamaño en nav   | `16×16px`                    |
| Tamaño en botón ghost | `18×18px`              |

---

## Micro-interacciones

```css
/* Hover sutil en cards */
transition: background 0.2s;

/* Zoom de imagen en card */
transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
transform: scale(1.04);

/* Elevación de botón primario al hover */
transform: translateY(-1px);
transition: transform 0.15s;

/* Transición de color en links */
transition: color 0.2s;

/* Transición de borde en inputs */
transition: border-color 0.15s;
```

---

## Notas para implementación

- **Nunca usar `box-shadow`** en este sistema — la profundidad se logra solo con color de fondo y bordes.
- **No usar gradientes** — fondos siempre planos (`--cream`, `--cream-dark`, `--white`).
- **Texto en botones**: sin `font-weight: 600/700` — usar `400` o `500` máximo. El `letter-spacing` da presencia.
- **`border-radius: 2px`** es la firma del sistema. No usar valores como `8px`, `12px` ni `rounded-lg` de Tailwind para botones o inputs.
- **Fuente serif** solo para: nombres de producto, títulos, precios, logo. Todo lo demás es sans.
- El acento `--accent: #C4956A` es decorativo y escaso — solo para etiquetas de categoría o detalles puntuales, nunca para botones CTA.
