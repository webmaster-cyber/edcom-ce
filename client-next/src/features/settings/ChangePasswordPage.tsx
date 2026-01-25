import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'
import api from '../../config/api'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<{ current?: string; password?: string; confirm?: string }>({})

  const validate = (): boolean => {
    const newErrors: { current?: string; password?: string; confirm?: string } = {}

    if (!currentPassword) {
      newErrors.current = 'Current password is required'
    }

    if (!password) {
      newErrors.password = 'New password is required'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (!confirmPassword) {
      newErrors.confirm = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      newErrors.confirm = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsSaving(true)
    try {
      // First verify the current password by attempting a login
      await api.post('/api/login', {
        email: user?.email,
        pass: currentPassword,
      })

      // If login succeeds, change the password
      await api.post('/api/reset/password', { pass: password })
      toast.success('Password changed successfully')
      navigate('/')
    } catch (err: unknown) {
      console.error('Failed to change password:', err)
      const axiosErr = err as { response?: { status?: number } }
      if (axiosErr.response?.status === 401) {
        setErrors({ current: 'Current password is incorrect' })
      } else {
        toast.error('Failed to change password')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Change Password</h1>
        <p className="mt-1 text-sm text-text-muted">Update your account password</p>
      </div>

      <div className="mx-auto max-w-md">
        <div className="card p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Lock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-text-primary">Change Password</h2>
              <p className="text-sm text-text-muted">Enter your current and new password</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              error={errors.current}
              placeholder="Enter current password"
            />

            <hr className="my-4 border-border" />

            <Input
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              placeholder="Enter new password"
            />

            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirm}
              placeholder="Confirm new password"
            />

            <div className="pt-2">
              <Button type="submit" loading={isSaving} className="w-full">
                Change Password
              </Button>
            </div>
          </form>
        </div>

        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h4 className="text-sm font-medium text-blue-800">Password Requirements</h4>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-700">
            <li>At least 8 characters long</li>
            <li>Use a mix of letters, numbers, and symbols</li>
            <li>Avoid common words or personal information</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
