import { useEffect, useRef, useState } from 'react'
import { useFetcher } from 'react-router'

/**
 * Drag-and-drop ordering for a list of categories (native HTML5 drag, no
 * library). The list rearranges live while dragging and the new order is
 * saved when the item is dropped: one POST of intent=reorder with the ids.
 *
 *   const { order, itemProps, handleProps } = useDragReorder(items, { axis: 'x' })
 *
 * itemProps(item) goes on each item; handleProps(item, rowRef) on a grip when
 * only part of the item should start the drag (the row is used as the image).
 */
export function useDragReorder(items, { axis = 'y' } = {}) {
  const [order, setOrder] = useState(items)
  const orderRef = useRef(items)
  const dragId = useRef(null)
  const startIds = useRef('')
  const fetcher = useFetcher()

  useEffect(() => { setOrder(items); orderRef.current = items }, [items])

  const apply = (next) => { orderRef.current = next; setOrder(next) }
  const ids = (list) => list.map((x) => x.id).join(',')

  const start = (item) => (e) => {
    dragId.current = item.id
    startIds.current = ids(orderRef.current)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(item.id))
  }
  const end = () => {
    if (dragId.current == null) return
    dragId.current = null
    const now = ids(orderRef.current)
    if (now !== startIds.current) fetcher.submit({ intent: 'reorder', ids: now }, { method: 'post' })
  }

  const itemProps = (item, { draggable = true } = {}) => ({
    draggable,
    onDragStart: draggable ? start(item) : undefined,
    onDragEnd: end,
    onDragOver: (e) => {
      if (dragId.current == null || dragId.current === item.id) return
      // Only reorder within this list: a chip dragged from another category's list is ignored.
      if (!orderRef.current.some((x) => x.id === dragId.current)) return
      e.preventDefault()
      const r = e.currentTarget.getBoundingClientRect()
      const after = axis === 'x' ? e.clientX > r.left + r.width / 2 : e.clientY > r.top + r.height / 2
      const list = orderRef.current.filter((x) => x.id !== dragId.current)
      const moving = orderRef.current.find((x) => x.id === dragId.current)
      const at = list.findIndex((x) => x.id === item.id) + (after ? 1 : 0)
      list.splice(at, 0, moving)
      if (ids(list) !== ids(orderRef.current)) apply(list)
    },
    onDrop: (e) => e.preventDefault(),
    'data-dragging': dragId.current === item.id || undefined,
  })

  const handleProps = (item, rowRef) => ({
    draggable: true,
    onDragStart: (e) => {
      start(item)(e)
      if (rowRef?.current) e.dataTransfer.setDragImage(rowRef.current, 24, 24)
    },
    onDragEnd: end,
  })

  return { order, itemProps, handleProps, saving: fetcher.state !== 'idle' }
}
