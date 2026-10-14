import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AppShell } from '@/components/layout/app-shell'
import { AuthProvider } from '@/contexts/auth-context'
import { AddBuildPage } from '@/pages/add-build'
import { BuildDetailPage } from '@/pages/build-detail'
import { BuildHistoryPage } from '@/pages/build-history'
import { DashboardPage } from '@/pages/dashboard'
import { LoginPage } from '@/pages/login'
import { OfflinePage } from '@/pages/offline'
import { ProjectDetailPage } from '@/pages/project-detail'
import { ProjectsPage } from '@/pages/projects'
import { SettingsPage } from '@/pages/settings'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/offline" element={<OfflinePage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/builds" element={<BuildHistoryPage />} />
            <Route path="/builds/new" element={<AddBuildPage />} />
            <Route path="/builds/:id" element={<BuildDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-right" closeButton />
    </AuthProvider>
  )
}
