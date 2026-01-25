import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, LogOut, KeyRound, FileDown, ChevronDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface TopBarProps {
  onMenuClick: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [menuOpen])

  return (
    <header className="flex h-[var(--nav-height)] items-center justify-between border-b border-border bg-surface px-4">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-text-secondary hover:bg-gray-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User menu */}
      {user && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-gray-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-xs font-medium">
              {user.photo ? (
                <img src={user.photo} alt={user.fullname} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                user.fullname.trim()[0]?.toUpperCase()
              )}
            </span>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-text-primary">{user.fullname}</p>
              <p className="text-xs text-text-muted">{user.companyname}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-text-muted" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-border bg-surface py-1 shadow-lg">
              {user && !user.nodataexport && (!user.admin || sessionStorage.getItem('impersonateid')) && (
                <button
                  onClick={() => { setMenuOpen(false); navigate('/exports') }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-gray-50"
                >
                  <FileDown className="h-4 w-4" />
                  Data Exports
                </button>
              )}
              <button
                onClick={() => { setMenuOpen(false); navigate('/changepass') }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-gray-50"
              >
                <KeyRound className="h-4 w-4" />
                Change Password
              </button>
              <hr className="my-1 border-border" />
              <button
                onClick={() => { setMenuOpen(false); logout() }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
