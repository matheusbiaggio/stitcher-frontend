import {
  type DashboardCardHeight,
  type DashboardCardId,
  type DashboardLayout,
} from '@bonistore/shared'
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { ReactNode } from 'react'

import { reorderLayout, setCardHeight, toggleCardSize } from './dashboardLayout'
import { SortableCard } from './SortableCard'

interface DashboardGridProps {
  layout: DashboardLayout
  editing: boolean
  cards: Record<DashboardCardId, ReactNode>
  onLayoutChange: (next: DashboardLayout) => void
}

export function DashboardGrid({ layout, editing, cards, onLayoutChange }: DashboardGridProps) {
  // PointerSensor com `distance: 6` evita iniciar drag em cliques curtos —
  // botões dentro dos cards continuam funcionando.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    onLayoutChange(reorderLayout(layout, active.id as DashboardCardId, over.id as DashboardCardId))
  }

  function handleToggleSize(id: DashboardCardId) {
    onLayoutChange(toggleCardSize(layout, id))
  }

  function handleSetHeight(id: DashboardCardId, height: DashboardCardHeight) {
    onLayoutChange(setCardHeight(layout, id, height))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={layout.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1rem',
            // Cada card declara a própria altura via px (CARD_HEIGHT_PX).
            // alignItems:start mantém a altura escolhida em vez de esticar
            // pra row track — assim "thin" ao lado de "large" preserva ambos
            // os tamanhos (com vão visual abaixo do menor, esperado).
            alignItems: 'start',
          }}
          data-testid="dashboard-grid"
        >
          {layout.map((item) => (
            <SortableCard
              key={item.id}
              id={item.id}
              size={item.size}
              height={item.height ?? 'medium'}
              editing={editing}
              onToggleSize={handleToggleSize}
              onSetHeight={handleSetHeight}
            >
              {cards[item.id]}
            </SortableCard>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
