import React, { useState, useRef } from "react"
import { Trash2 } from "lucide-react"

interface SwipeToDeleteItemProps {
  children: React.ReactNode
  onDelete: () => void
  disabled?: boolean
  className?: string
  deleteLabel?: string
}

export default function SwipeToDeleteItem({
  children,
  onDelete,
  disabled = false,
  className = "",
  deleteLabel = "Delete",
}: SwipeToDeleteItemProps) {
  const [offsetX, setOffsetX] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const isDragging = useRef(false)
  const isHorizontalScroll = useRef<boolean | null>(null)
  const BUTTON_WIDTH = 76

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    startX.current = clientX
    startY.current = clientY
    isDragging.current = true
    isHorizontalScroll.current = null
  }

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging.current || disabled) return
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY

    const deltaX = clientX - startX.current
    const deltaY = clientY - startY.current

    if (isHorizontalScroll.current === null) {
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        isHorizontalScroll.current = Math.abs(deltaX) > Math.abs(deltaY)
      }
    }

    if (!isHorizontalScroll.current) return

    if (isOpen) {
      const newOffset = Math.min(0, Math.max(-BUTTON_WIDTH, -BUTTON_WIDTH + deltaX))
      setOffsetX(newOffset)
    } else {
      if (deltaX < 0) {
        const newOffset = Math.max(-BUTTON_WIDTH, deltaX)
        setOffsetX(newOffset)
      }
    }
  }

  const handleTouchEnd = () => {
    if (!isDragging.current) return
    isDragging.current = false

    if (isOpen) {
      if (offsetX > -BUTTON_WIDTH / 2) {
        setOffsetX(0)
        setIsOpen(false)
      } else {
        setOffsetX(-BUTTON_WIDTH)
        setIsOpen(true)
      }
    } else {
      if (offsetX < -BUTTON_WIDTH / 2.5) {
        setOffsetX(-BUTTON_WIDTH)
        setIsOpen(true)
      } else {
        setOffsetX(0)
        setIsOpen(false)
      }
    }
  }

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOffsetX(0)
    setIsOpen(false)
    onDelete()
  }

  const handleRowClick = () => {
    if (isOpen) {
      setOffsetX(0)
      setIsOpen(false)
    }
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl select-none ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
      onClick={handleRowClick}
    >
      <div className="absolute inset-y-0 right-0 w-[76px] bg-red-500 hover:bg-red-600 active:bg-red-700 text-white flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors z-0">
        <button
          type="button"
          onClick={handleActionClick}
          className="w-full h-full flex flex-col items-center justify-center gap-1 text-white cursor-pointer active:scale-95 transition-transform"
          title={deleteLabel}
          aria-label={deleteLabel}
        >
          <Trash2 className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[11px] font-bold tracking-tight">{deleteLabel}</span>
        </button>
      </div>

      <div
        className="relative z-10 w-full transition-transform ease-out"
        style={{
          transform: `translateX(${offsetX}px)`,
          transitionDuration: isDragging.current ? "0ms" : "220ms",
        }}
      >
        {children}
      </div>
    </div>
  )
}
