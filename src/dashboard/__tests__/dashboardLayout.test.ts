import { DASHBOARD_CARD_IDS, type DashboardLayout } from '@bonistore/shared'
import { describe, expect, it } from 'vitest'

import {
  DEFAULT_DASHBOARD_LAYOUT,
  normalizeDashboardLayout,
  reorderLayout,
  setCardHeight,
  toggleCardSize,
} from '../dashboardLayout'

describe('normalizeDashboardLayout', () => {
  it('returns the default layout when given null', () => {
    const result = normalizeDashboardLayout(null)
    expect(result).toEqual(DEFAULT_DASHBOARD_LAYOUT)
  })

  it('returns the default layout when given undefined', () => {
    const result = normalizeDashboardLayout(undefined)
    expect(result).toEqual(DEFAULT_DASHBOARD_LAYOUT)
  })

  it('preserves a valid layout that contains every known card', () => {
    const layout: DashboardLayout = DEFAULT_DASHBOARD_LAYOUT.slice().reverse()
    expect(normalizeDashboardLayout(layout)).toEqual(layout)
  })

  it('drops unknown card ids and appends missing ones at the end', () => {
    const layout = [
      { id: 'vendas-hoje', size: 'half', height: 'thin' },
      { id: 'phantom-card', size: 'full' },
    ] as DashboardLayout
    const result = normalizeDashboardLayout(layout)
    expect(result[0]).toEqual({ id: 'vendas-hoje', size: 'half', height: 'thin' })
    expect(result.length).toBe(DASHBOARD_CARD_IDS.length)
    expect(result.find((i) => i.id === ('phantom-card' as never))).toBeUndefined()
  })

  it('drops duplicates, keeping the first occurrence', () => {
    const layout: DashboardLayout = [
      { id: 'vendas-hoje', size: 'half', height: 'thin' },
      { id: 'vendas-hoje', size: 'full', height: 'large' },
      { id: 'receita-hoje', size: 'full', height: 'medium' },
    ]
    const result = normalizeDashboardLayout(layout)
    const vendas = result.filter((i) => i.id === 'vendas-hoje')
    expect(vendas).toHaveLength(1)
    expect(vendas[0].size).toBe('half')
  })

  it('always returns every known card exactly once', () => {
    const result = normalizeDashboardLayout([])
    const ids = result.map((i) => i.id).sort()
    const expected = [...DASHBOARD_CARD_IDS].sort()
    expect(ids).toEqual(expected)
  })

  it('fills missing height with the per-card default (back-compat)', () => {
    const layout: DashboardLayout = [
      { id: 'vendas-hoje', size: 'half' },
      { id: 'birthdays', size: 'full' },
    ]
    const result = normalizeDashboardLayout(layout)
    const vendas = result.find((i) => i.id === 'vendas-hoje')!
    const birthdays = result.find((i) => i.id === 'birthdays')!
    expect(vendas.height).toBe('thin')
    expect(birthdays.height).toBe('large')
  })

  it('preserves an explicit height when provided', () => {
    const layout: DashboardLayout = [{ id: 'vendas-hoje', size: 'half', height: 'large' }]
    const result = normalizeDashboardLayout(layout)
    expect(result.find((i) => i.id === 'vendas-hoje')!.height).toBe('large')
  })
})

describe('reorderLayout', () => {
  const layout: DashboardLayout = [
    { id: 'vendas-hoje', size: 'half', height: 'thin' },
    { id: 'receita-hoje', size: 'half', height: 'thin' },
    { id: 'birthdays', size: 'full', height: 'large' },
  ]

  it('moves an item from its index to the target index', () => {
    const result = reorderLayout(layout, 'vendas-hoje', 'birthdays')
    expect(result.map((i) => i.id)).toEqual(['receita-hoje', 'birthdays', 'vendas-hoje'])
  })

  it('returns the same layout when from and to are equal', () => {
    expect(reorderLayout(layout, 'vendas-hoje', 'vendas-hoje')).toBe(layout)
  })

  it('returns the same layout when an id is not found', () => {
    expect(reorderLayout(layout, 'recent-sales', 'birthdays')).toBe(layout)
  })
})

describe('toggleCardSize', () => {
  const layout: DashboardLayout = [
    { id: 'vendas-hoje', size: 'half', height: 'thin' },
    { id: 'birthdays', size: 'full', height: 'large' },
  ]

  it('flips half to full', () => {
    const result = toggleCardSize(layout, 'vendas-hoje')
    expect(result[0].size).toBe('full')
  })

  it('flips full to half', () => {
    const result = toggleCardSize(layout, 'birthdays')
    expect(result[1].size).toBe('half')
  })

  it('does not touch other cards or the height field', () => {
    const result = toggleCardSize(layout, 'vendas-hoje')
    expect(result[0].height).toBe('thin')
    expect(result[1].size).toBe('full')
  })
})

describe('setCardHeight', () => {
  const layout: DashboardLayout = [
    { id: 'vendas-hoje', size: 'half', height: 'thin' },
    { id: 'birthdays', size: 'full', height: 'large' },
  ]

  it('sets the height of the matching card', () => {
    const result = setCardHeight(layout, 'vendas-hoje', 'medium')
    expect(result[0].height).toBe('medium')
  })

  it('does not touch other cards or the size field', () => {
    const result = setCardHeight(layout, 'vendas-hoje', 'large')
    expect(result[0].size).toBe('half')
    expect(result[1]).toEqual({ id: 'birthdays', size: 'full', height: 'large' })
  })
})
