import { useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Mail,
  Users,
  Plug,
  BarChart3,
  Server,
  Route,
  Shield,
  FileText,
  Zap,
  Webhook,
  ListFilter,
  FormInput,
  Ban,
  Gauge,
  Download,
  X,
} from 'lucide-react'
import { useBrand } from '../../contexts/BrandContext'
import { useNavigationGuardContext } from '../../contexts/NavigationGuardContext'

interface SidebarProps {
  isAdmin: boolean
  onClose: () => void
}

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const customerNav: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Messages',
    items: [
      { label: 'Broadcasts', href: '/broadcasts', icon: <Mail className="h-4 w-4" /> },
      { label: 'Funnels', href: '/funnels', icon: <Zap className="h-4 w-4" /> },
      { label: 'Transactional', href: '/transactional', icon: <FileText className="h-4 w-4" /> },
      { label: 'Throttles', href: '/domainthrottles', icon: <Gauge className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Contacts',
    items: [
      { label: 'Contact Lists', href: '/contacts', icon: <Users className="h-4 w-4" /> },
      { label: 'Segments', href: '/segments', icon: <ListFilter className="h-4 w-4" /> },
      { label: 'Suppression', href: '/suppression', icon: <Ban className="h-4 w-4" /> },
      { label: 'Forms', href: '/forms', icon: <FormInput className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Integrate',
    items: [
      { label: 'API & SMTP', href: '/connect', icon: <Plug className="h-4 w-4" /> },
      { label: 'Webhooks', href: '/integrations/webhooks', icon: <Webhook className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Data',
    items: [
      { label: 'Exports', href: '/exports', icon: <Download className="h-4 w-4" /> },
    ],
  },
]

const adminNav: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Customers',
    items: [
      { label: 'Customer Accounts', href: '/admin/customers', icon: <Users className="h-4 w-4" /> },
      { label: 'Postal Routes', href: '/admin/routes', icon: <Route className="h-4 w-4" /> },
      { label: 'Sign-up Page', href: '/admin/signup', icon: <FormInput className="h-4 w-4" /> },
    ],
  },
  {
    title: 'MTA',
    items: [
      { label: 'Servers', href: '/admin/servers', icon: <Server className="h-4 w-4" /> },
      { label: 'Delivery Policies', href: '/admin/policies', icon: <Shield className="h-4 w-4" /> },
      { label: 'IP Warmups', href: '/admin/warmups', icon: <BarChart3 className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Connect',
    items: [
      { label: 'SMTP Relay', href: '/admin/smtprelays', icon: <Plug className="h-4 w-4" /> },
      { label: 'Mailgun API', href: '/admin/mailgun', icon: <Plug className="h-4 w-4" /> },
      { label: 'Amazon SES', href: '/admin/ses', icon: <Plug className="h-4 w-4" /> },
      { label: 'SparkPost', href: '/admin/sparkpost', icon: <Plug className="h-4 w-4" /> },
      { label: 'Easylink', href: '/admin/easylink', icon: <Plug className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Reports',
    items: [
      { label: 'Customer Broadcasts', href: '/admin/custbcs', icon: <BarChart3 className="h-4 w-4" /> },
      { label: 'Email Delivery', href: '/admin/emaildelivery', icon: <Mail className="h-4 w-4" /> },
      { label: 'IP Delivery', href: '/admin/ipdelivery', icon: <Server className="h-4 w-4" /> },
      { label: 'Postmaster Activity', href: '/admin/log', icon: <FileText className="h-4 w-4" /> },
    ],
  },
]

function getImagePath(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.pathname
  } catch {
    return url
  }
}

export function Sidebar({ isAdmin, onClose }: SidebarProps) {
  const { loginFrontend } = useBrand()
  const { guardedNavigate } = useNavigationGuardContext()
  const location = useLocation()
  const nav = isAdmin ? adminNav : customerNav

  return (
    <aside className="flex h-full flex-col bg-sidebar-bg text-white">
      {/* Brand logo area */}
      <div className="flex h-[var(--nav-height)] items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {loginFrontend?.image ? (
            <img
              src={getImagePath(loginFrontend.image)}
              alt="Logo"
              className="h-8 max-w-[160px] object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          ) : (
            <span className="text-lg font-bold tracking-tight text-white">SendMail</span>
          )}
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-white/60 hover:text-white lg:hidden">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {nav.map((group) => (
          <div key={group.title} className="mb-6">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-white/40">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <button
                    onClick={() => guardedNavigate(item.href)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      (item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href))
                        ? 'bg-white/10 text-white font-medium'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
