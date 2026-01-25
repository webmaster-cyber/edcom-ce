import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { useBrand } from './contexts/BrandContext'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './features/auth/LoginPage'
import { AdminDashboard } from './features/dashboard/AdminDashboard'
import { CustomerDashboard } from './features/dashboard/CustomerDashboard'
import { BroadcastsPage } from './features/broadcasts/BroadcastsPage'
import { BroadcastSettingsPage } from './features/broadcasts/BroadcastSettingsPage'
import { BroadcastTemplateSelectorPage } from './features/broadcasts/BroadcastTemplateSelectorPage'
import { BroadcastTemplatePage } from './features/broadcasts/BroadcastTemplatePage'
import { BroadcastRecipientsPage } from './features/broadcasts/BroadcastRecipientsPage'
import { BroadcastReviewPage } from './features/broadcasts/BroadcastReviewPage'
import { BroadcastSummaryPage } from './features/broadcasts/BroadcastSummaryPage'
import { BroadcastHeatmapPage } from './features/broadcasts/BroadcastHeatmapPage'
import { BroadcastDomainsPage } from './features/broadcasts/BroadcastDomainsPage'
import { BroadcastDetailsPage } from './features/broadcasts/BroadcastDetailsPage'
import { BroadcastMessagesPage } from './features/broadcasts/BroadcastMessagesPage'
import { BroadcastSummarySettingsPage } from './features/broadcasts/BroadcastSummarySettingsPage'
import { ContactsPage } from './features/contacts/ContactsPage'
import { ContactListEditPage } from './features/contacts/ContactListEditPage'
import { ContactsAddPage } from './features/contacts/ContactsAddPage'
import { ContactsFindPage } from './features/contacts/ContactsFindPage'
import { ContactEditPage } from './features/contacts/ContactEditPage'
import { ContactsDomainsPage } from './features/contacts/ContactsDomainsPage'
import { ContactsTagsPage } from './features/contacts/ContactsTagsPage'
import { SegmentsPage } from './features/contacts/SegmentsPage'
import { SegmentEditorPage } from './features/contacts/SegmentEditorPage'
import { Spinner } from './components/ui/Spinner'
import { useEffect } from 'react'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { uid, isLoading } = useAuth()

  if (!uid) {
    return <Navigate to="/login" replace />
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return <>{children}</>
}

function Dashboard() {
  const { user, impersonate } = useAuth()

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  // Admin not impersonating sees admin dashboard
  if (user.admin && !impersonate) {
    return <AdminDashboard />
  }

  // Customer (or admin impersonating) sees customer dashboard
  return <CustomerDashboard />
}

function ApplyUserBrand() {
  const { user } = useAuth()
  const { applyFrontend } = useBrand()

  useEffect(() => {
    if (user) {
      applyFrontend(user.frontend || null)
    }
  }, [user, applyFrontend])

  return null
}

export default function App() {
  return (
    <>
      <ApplyUserBrand />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppShell>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/broadcasts" element={<BroadcastsPage />} />
                  <Route path="/broadcasts/settings" element={<BroadcastSettingsPage />} />
                  <Route path="/broadcasts/templates" element={<BroadcastTemplateSelectorPage />} />
                  <Route path="/broadcasts/template" element={<BroadcastTemplatePage />} />
                  <Route path="/broadcasts/rcpt" element={<BroadcastRecipientsPage />} />
                  <Route path="/broadcasts/review" element={<BroadcastReviewPage />} />
                  <Route path="/broadcasts/summary" element={<BroadcastSummaryPage />} />
                  <Route path="/broadcasts/heatmap" element={<BroadcastHeatmapPage />} />
                  <Route path="/broadcasts/domains" element={<BroadcastDomainsPage />} />
                  <Route path="/broadcasts/details" element={<BroadcastDetailsPage />} />
                  <Route path="/broadcasts/messages" element={<BroadcastMessagesPage />} />
                  <Route path="/broadcasts/summarysettings" element={<BroadcastSummarySettingsPage />} />
                  <Route path="/contacts" element={<ContactsPage />} />
                  <Route path="/contacts/edit" element={<ContactListEditPage />} />
                  <Route path="/contacts/add" element={<ContactsAddPage />} />
                  <Route path="/contacts/find" element={<ContactsFindPage />} />
                  <Route path="/contacts/contact" element={<ContactEditPage />} />
                  <Route path="/contacts/domains" element={<ContactsDomainsPage />} />
                  <Route path="/contacts/tags" element={<ContactsTagsPage />} />
                  <Route path="/segments" element={<SegmentsPage />} />
                  <Route path="/segments/edit" element={<SegmentEditorPage />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  )
}
