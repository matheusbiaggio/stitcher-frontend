import {
  DASHBOARD_CARD_IDS,
  type DashboardCardHeight,
  type DashboardCardId,
  type DashboardLayout,
  type DashboardLayoutItem,
} from '@bonistore/shared'

import { api } from '../lib/api'

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = [
  { id: 'vendas-hoje', size: 'half', height: 'thin' },
  { id: 'receita-hoje', size: 'half', height: 'thin' },
  { id: 'birthdays', size: 'full', height: 'large' },
  { id: 'daily-revenue-chart', size: 'full', height: 'medium' },
  { id: 'recent-sales', size: 'full', height: 'large' },
  { id: 'low-stock', size: 'full', height: 'large' },
  { id: 'lembretes', size: 'full', height: 'large' },
]

/** Pixels que cada altura representa no grid. */
export const CARD_HEIGHT_PX: Record<DashboardCardHeight, number> = {
  thin: 140,
  medium: 280,
  large: 440,
}

/**
 * Garante que o layout exibido contém todos os cards conhecidos exatamente uma
 * vez e que cada item tem `size` e `height` definidos.
 *
 * - Cards desconhecidos (ids antigos que sumiram do código) são descartados.
 * - Cards novos que não estão no layout salvo são acrescentados ao final.
 * - Cards duplicados ficam só com a primeira ocorrência.
 * - Itens sem `height` (layouts antigos pre-feature) ganham o default do card.
 */
export function normalizeDashboardLayout(layout: DashboardLayout | null | undefined): DashboardLayout {
  const known = new Set<DashboardCardId>(DASHBOARD_CARD_IDS)
  const seen = new Set<DashboardCardId>()
  const out: DashboardLayoutItem[] = []

  function defaultHeightFor(id: DashboardCardId): DashboardCardHeight {
    return DEFAULT_DASHBOARD_LAYOUT.find((d) => d.id === id)?.height ?? 'medium'
  }

  if (layout) {
    for (const item of layout) {
      if (!known.has(item.id) || seen.has(item.id)) continue
      out.push({ ...item, height: item.height ?? defaultHeightFor(item.id) })
      seen.add(item.id)
    }
  }

  for (const id of DASHBOARD_CARD_IDS) {
    if (!seen.has(id)) {
      const fallback = DEFAULT_DASHBOARD_LAYOUT.find((d) => d.id === id)
      out.push(fallback ?? { id, size: 'full', height: 'medium' })
    }
  }

  return out
}

export function reorderLayout(
  layout: DashboardLayout,
  fromId: DashboardCardId,
  toId: DashboardCardId,
): DashboardLayout {
  if (fromId === toId) return layout
  const fromIdx = layout.findIndex((i) => i.id === fromId)
  const toIdx = layout.findIndex((i) => i.id === toId)
  if (fromIdx === -1 || toIdx === -1) return layout
  const next = layout.slice()
  const [moved] = next.splice(fromIdx, 1)
  next.splice(toIdx, 0, moved)
  return next
}

export function toggleCardSize(layout: DashboardLayout, id: DashboardCardId): DashboardLayout {
  return layout.map((it) =>
    it.id === id ? { ...it, size: it.size === 'half' ? 'full' : 'half' } : it,
  )
}

export function setCardHeight(
  layout: DashboardLayout,
  id: DashboardCardId,
  height: DashboardCardHeight,
): DashboardLayout {
  return layout.map((it) => (it.id === id ? { ...it, height } : it))
}

export async function saveDashboardLayout(layout: DashboardLayout): Promise<DashboardLayout> {
  const res = await api.patch<{ layout: DashboardLayout }>('/auth/me/dashboard-layout', { layout })
  return res.data.layout
}
