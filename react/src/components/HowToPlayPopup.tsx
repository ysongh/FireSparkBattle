import type React from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface PopupProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export const Popup: React.FC<PopupProps> = ({ isOpen, onClose, title, children, className = "" }) => {
  const [mounted, setMounted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Handle mounting on client side only
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, [])

  // Close on escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden"; // Prevent scrolling when popup is open
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = ""; // Restore scrolling when popup is closed
    }
  }, [isOpen, onClose])

  // Close when clicking outside
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  }

  // Focus trap
  useEffect(() => {
    if (!isOpen || !popupRef.current) return;

    const focusableElements = popupRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    if (focusableElements.length) {
      (focusableElements[0] as HTMLElement).focus();
    }
  }, [isOpen])

  if (!mounted) return null;

  return mounted && isOpen
    ? createPortal(
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleOverlayClick}
          aria-modal="true"
          role="dialog"
        >
          <div
            ref={popupRef}
            className={`relative max-h-[90vh] w-full max-w-md overflow-auto rounded-lg bg-white p-6 shadow-xl animate-in fade-in zoom-in duration-300 dark:bg-gray-800 ${className}`}
          >
            <div className="flex items-center justify-between">
              {title && <h2 className="text-xl font-semibold">{title}</h2>}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                aria-label="Close popup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4">{children}</div>
          </div>
        </div>,
        document.body,
      )
    : null
}

interface HowItWorksPopupProps {
  isOpen: boolean
  onClose: () => void
  title?: string
}

export const HowToPlayPopup = ({ isOpen, onClose, title } : HowItWorksPopupProps) => {
  return (
    <Popup isOpen={isOpen} onClose={onClose} title={title}>
      <div className="text-sm space-y-1">
        <h3 className="text-xl font-bold text-blue-400 mb-3 flex items-center">
          🎮 Controls
        </h3>
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-3">
            <span className="bg-gray-200 px-2 py-1 rounded text-sm">↑↓←→</span>
            <span>or</span>
            <span className="bg-gray-200 px-2 py-1 rounded text-sm">WASD</span>
            <span>Move Player</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-gray-200 px-2 py-1 rounded text-sm">Firework Button</span>
            <span>or</span>
            <span className="bg-gray-200 px-2 py-1 rounded text-sm">Space</span>
            <span>or</span>
            <span className="bg-gray-200 px-2 py-1 rounded text-sm">Enter</span>
            <span>Drop Fireworks</span>
          </div>
        </div>
        <p>Drop Firework: Space or Enter</p>
        <p>Destroy boxes (📦) to earn points!</p>
        <p>Collect power-ups:</p>
        <p className="ml-4">⭐ Increase explosion range by 1</p>
        <p className="ml-4">💣 Increase max bombs by 1</p>
        <p>Avoid explosions (💥) or you'll lose!</p>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={() => setIsOpen(false)}
          className="px-4 py-2 bg-red-400 hover:bg-red-600 rounded"
        >
          Close
        </button>
      </div>
    </Popup>
  )
}