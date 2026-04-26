import {
  DASHBOARD_CARD_HEIGHTS,
  type DashboardCardHeight,
  type DashboardCardId,
  type DashboardCardSize,
} from '@bonistore/shared'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties, ReactNode } from 'react'

import { CARD_HEIGHT_PX } from './dashboardLayout'

interface SortableCardProps {
  id: DashboardCardId
  size: DashboardCardSize
  height: DashboardCardHeight
  editing: boolean
  onToggleSize: (id: DashboardCardId) => void
  onSetHeight: (id: DashboardCardId, height: DashboardCardHeight) => void
  children: ReactNode
}

const editChrome: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '0.5rem',
  flexWrap: 'wrap',
}

const handleStyle: CSSProperties = {
  cursor: 'grab',
  padding: '0.25rem 0.5rem',
  background: 'var(--black3)',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius)',
  color: 'var(--gray)',
  fontFamily: 'var(--font-label)',
  fontSize: '0.7rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  userSelect: 'none',
  touchAction: 'none',
}

const toggleButton = (active: boolean): CSSProperties => ({
  padding: '0.25rem 0.6rem',
  background: active ? 'var(--white)' : 'transparent',
  border: '1px solid var(--black4)',
  borderRadius: 'var(--radius)',
  color: active ? 'var(--black)' : 'var(--gray)',
  fontFamily: 'var(--font-label)',
  fontSize: '0.7rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  fontWeight: active ? 600 : 400,
})

const HEIGHT_LABELS: Record<DashboardCardHeight, string> = {
  thin: 'S',
  medium: 'M',
  large: 'G',
}

export function SortableCard({
  id,
  size,
  height,
  editing,
  onToggleSize,
  onSetHeight,
  children,
}: SortableCardProps) {
  const sortable = useSortable({ id, disabled: !editing })
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable

  // Em modo edição reservamos espaço extra pro chrome (botões em cima do card).
  // Isso evita "comer" altura do conteúdo só pra mostrar os controles.
  const chromeOffsetPx = editing ? 48 : 0
  const cellHeightPx = CARD_HEIGHT_PX[height] + chromeOffsetPx

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: size === 'full' ? '1 / -1' : 'span 1',
    height: `${cellHeightPx}px`,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative',
    zIndex: isDragging ? 5 : 'auto',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  }

  return (
    <div ref={setNodeRef} style={style} data-card-id={id}>
      {editing && (
        <div style={editChrome}>
          <button
            type="button"
            {...attributes}
            {...listeners}
            style={handleStyle}
            aria-label={`Arrastar card ${id}`}
            data-testid={`drag-handle-${id}`}
          >
            ⋮⋮ Arrastar
          </button>
          <div
            style={{
              display: 'flex',
              gap: '0.25rem',
              border: '1px solid var(--black4)',
              borderRadius: 'var(--radius)',
              padding: '2px',
            }}
            role="group"
            aria-label={`Largura do card ${id}`}
          >
            <button
              type="button"
              onClick={() => {
                if (size !== 'half') onToggleSize(id)
              }}
              style={toggleButton(size === 'half')}
              aria-pressed={size === 'half'}
              data-testid={`size-half-${id}`}
            >
              ½
            </button>
            <button
              type="button"
              onClick={() => {
                if (size !== 'full') onToggleSize(id)
              }}
              style={toggleButton(size === 'full')}
              aria-pressed={size === 'full'}
              data-testid={`size-full-${id}`}
            >
              1
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '0.25rem',
              border: '1px solid var(--black4)',
              borderRadius: 'var(--radius)',
              padding: '2px',
            }}
            role="group"
            aria-label={`Altura do card ${id}`}
          >
            {DASHBOARD_CARD_HEIGHTS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => {
                  if (height !== h) onSetHeight(id, h)
                }}
                style={toggleButton(height === h)}
                aria-pressed={height === h}
                data-testid={`height-${h}-${id}`}
              >
                {HEIGHT_LABELS[h]}
              </button>
            ))}
          </div>
        </div>
      )}
      <div
        style={{
          outline: editing ? '1px dashed var(--black4)' : 'none',
          borderRadius: 'var(--radius-lg)',
          padding: editing ? '0.25rem' : 0,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </div>
  )
}
