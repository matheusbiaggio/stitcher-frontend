/**
 * Boni Store PDV — Shared UI style constants
 *
 * Import from this file instead of re-defining styles per-page.
 * All page components must use these tokens to stay visually consistent.
 *
 * ─── CSS variables (defined in index.css) ──────────────────────────────────
 *   --black   #0a0a0a   Page background
 *   --black2  #111111   Card / sidebar / form panel background
 *   --black3  #1a1a1a   Input background / inline form background
 *   --black4  #2a2a2a   Borders
 *   --white   #f5f5f5   Primary text / primary button background
 *   --gray    #888888   Labels / secondary text
 *   --gray2   #444444   Disabled button background
 *   --danger  #ef4444   Errors / deactivate actions
 *   --info    #3b82f6   Info badges (SKU, status)
 *   --success #22c55e   Success states
 *
 * ─── Font families ──────────────────────────────────────────────────────────
 *   --font-display   Bebas Neue         — page H1 titles
 *   --font-label     Barlow Condensed   — section headers, buttons, badges
 *   --font-body      Barlow             — body text, input values
 *
 * ─── Radii ──────────────────────────────────────────────────────────────────
 *   --radius    4px    — cards, inputs, buttons
 *   --radius-lg 8px    — form panels
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { CSSProperties } from 'react'

// ─── Typography ───────────────────────────────────────────────────────────────

/** Page H1 — Bebas Neue, large, for "PRODUTOS", "CLIENTES", etc. */
export const pageTitle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '2rem',
  letterSpacing: '0.05em',
  color: 'var(--white)',
  marginBottom: '2rem',
}

/** Section H2 — Barlow Condensed, small caps, gray. Used above lists and form panels. */
export const sectionHeader: CSSProperties = {
  fontFamily: 'var(--font-label)',
  fontSize: '0.8rem',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'var(--gray)',
  marginBottom: '1rem',
}

/** Form panel title — same as sectionHeader but with more bottom margin. */
export const formPanelTitle: CSSProperties = {
  ...sectionHeader,
  marginBottom: '1.25rem',
}

// ─── Layout ───────────────────────────────────────────────────────────────────

/**
 * Standard two-column page layout: content list (flex) + fixed-width form panel.
 *
 * Usage:
 *   <div style={listFormLayout}>
 *     <section>…list…</section>
 *     <section style={formPanel}>…form…</section>
 *   </div>
 */
export const listFormLayout: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 380px',
  gap: '2rem',
  alignItems: 'start',
}

// ─── Containers ───────────────────────────────────────────────────────────────

/** Right-side form panel — dark card with rounded corners. Always visible on the page. */
export const formPanel: CSSProperties = {
  background: 'var(--black2)',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius-lg)',
  padding: '1.5rem',
}

/** List item card — used for each row in a data list. */
export const card: CSSProperties = {
  background: 'var(--black2)',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius)',
  padding: '0.875rem 1rem',
}

/**
 * Inline edit/detail form that slides open below a list card.
 * Apply marginTop: '0.25rem' to separate it from the card above.
 */
export const inlineForm: CSSProperties = {
  background: 'var(--black3)',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius)',
  padding: '0.75rem 1rem',
  marginTop: '0.25rem',
}

// ─── Form fields ──────────────────────────────────────────────────────────────

/** Label above every form field. */
export const label: CSSProperties = {
  fontFamily: 'var(--font-label)',
  fontSize: '0.75rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--gray)',
  display: 'block',
  marginBottom: '0.375rem',
}

/** Standard text/number/email input. Apply `borderColor: 'var(--danger)'` override on error. */
export const input: CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  background: 'var(--black3)',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius)',
  color: 'var(--white)',
  fontSize: '0.875rem',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  boxSizing: 'border-box',
}

/** Compact input for inline row-level edit forms. */
export const inputSmall: CSSProperties = {
  ...input,
  padding: '0.375rem 0.5rem',
  fontSize: '0.8rem',
}

/** Red error text rendered below a field when validation fails. */
export const fieldError: CSSProperties = {
  color: 'var(--danger)',
  fontSize: '0.75rem',
  fontFamily: 'var(--font-body)',
  marginTop: '0.25rem',
}

// ─── Buttons ──────────────────────────────────────────────────────────────────

/**
 * Primary submit button — full-width, white background.
 * Pass `disabled=true` to render the grayed-out state.
 *
 * Usage:
 *   <button disabled={isPending} style={primaryButton(isPending)}>Submit</button>
 */
export function primaryButton(disabled = false): CSSProperties {
  return {
    width: '100%',
    padding: '0.75rem',
    background: disabled ? 'var(--gray2)' : 'var(--white)',
    color: 'var(--black)',
    fontFamily: 'var(--font-label)',
    fontSize: '0.8rem',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    borderRadius: 'var(--radius)',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
  }
}

/** Secondary / cancel button — transparent with subtle border. */
export const secondaryButton: CSSProperties = {
  padding: '0.625rem 1rem',
  background: 'transparent',
  color: 'var(--gray)',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius)',
  fontFamily: 'var(--font-label)',
  fontSize: '0.75rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
}

/**
 * Small ghost action button inside list row action areas.
 * Used for "Editar", "Estoque +", etc.
 */
export const rowActionButton: CSSProperties = {
  padding: '0.3rem 0.6rem',
  background: 'transparent',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius)',
  color: 'var(--gray)',
  fontFamily: 'var(--font-label)',
  fontSize: '0.65rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
}

/** Danger variant of rowActionButton — for "Desativar". */
export const rowDangerButton: CSSProperties = {
  ...rowActionButton,
  border: '1px solid var(--danger)',
  color: 'var(--danger)',
}

// ─── Badges ───────────────────────────────────────────────────────────────────

/**
 * Inline status badge — "Inativo", "SKU", role labels, etc.
 *
 * Usage:
 *   <span style={badge('danger')}>Inativo</span>
 *   <span style={badge('info')}>{product.sku}</span>
 */
export function badge(color: 'danger' | 'info' | 'success' | 'gray' = 'gray'): CSSProperties {
  const colors = {
    danger: 'var(--danger)',
    info: 'var(--info)',
    success: 'var(--success)',
    gray: 'var(--gray)',
  }
  return {
    fontFamily: 'var(--font-label)',
    fontSize: '0.65rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: colors[color],
    padding: '0.2rem 0.45rem',
    background: 'var(--black3)',
    borderRadius: '4px',
    flexShrink: 0,
  }
}
