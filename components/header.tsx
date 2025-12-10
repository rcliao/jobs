'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ProfileSelector } from './profile-selector'

const navLinks = [
  { href: '/', label: 'Discovery' },
  { href: '/companies', label: 'Companies' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/config', label: 'Config' },
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-14">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-lg font-semibold text-gray-900">
              JobScout
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href ||
                  (link.href !== '/' && pathname.startsWith(link.href))
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:block">Profile:</span>
            <ProfileSelector />
          </div>
        </div>
      </div>
    </header>
  )
}
