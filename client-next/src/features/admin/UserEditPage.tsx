import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Save, Eye, EyeOff, RefreshCw, Wand2, Copy, Check, X } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Checkbox } from '../../components/ui/Checkbox'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'

interface UserFormData {
  fullname: string
  username: string
  password: string
  disabled: boolean
}

interface User {
  id: string
  fullname: string
  username: string
  disabled: boolean
  apikey: string
}

interface PasswordStrength {
  score: number // 0-4
  label: string
  color: string
  requirements: {
    minLength: boolean
    hasUppercase: boolean
    hasLowercase: boolean
    hasNumber: boolean
    hasSpecial: boolean
  }
}

const DEFAULT_FORM: UserFormData = {
  fullname: '',
  username: '',
  password: '',
  disabled: false,
}

function checkPasswordStrength(password: string): PasswordStrength {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  }

  const score = Object.values(requirements).filter(Boolean).length

  const labels: Record<number, { label: string; color: string }> = {
    0: { label: 'Very Weak', color: 'bg-danger' },
    1: { label: 'Weak', color: 'bg-danger' },
    2: { label: 'Fair', color: 'bg-warning' },
    3: { label: 'Good', color: 'bg-info' },
    4: { label: 'Strong', color: 'bg-success' },
    5: { label: 'Very Strong', color: 'bg-success' },
  }

  return {
    score,
    label: labels[score].label,
    color: labels[score].color,
    requirements,
  }
}

function generateSecurePassword(length = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*()_+-='
  const all = uppercase + lowercase + numbers + special

  // Ensure at least one of each type
  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('')
}

export function UserEditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || 'new'
  const customerId = searchParams.get('cid')
  const isNew = id === 'new'

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<UserFormData>(DEFAULT_FORM)
  const [user, setUser] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isResettingKey, setIsResettingKey] = useState(false)
  const [copied, setCopied] = useState(false)

  const passwordStrength = useMemo(
    () => (formData.password ? checkPasswordStrength(formData.password) : null),
    [formData.password]
  )

  const reload = useCallback(async () => {
    if (isNew) return
    setIsLoading(true)
    try {
      const { data } = await api.get<User>(`/api/users/${id}`)
      setUser(data)
      setFormData({
        fullname: data.fullname || '',
        username: data.username || '',
        password: '',
        disabled: data.disabled || false,
      })
    } finally {
      setIsLoading(false)
    }
  }, [id, isNew])

  useEffect(() => {
    reload()
  }, [reload])

  if (!customerId) {
    navigate('/admin/customers')
    return null
  }

  const handleChange = (field: keyof UserFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword()
    setFormData((prev) => ({ ...prev, password: newPassword }))
    setShowPassword(true) // Show it so admin can see/copy it
  }

  const handleCopyPassword = async () => {
    if (!formData.password) return
    try {
      await navigator.clipboard.writeText(formData.password)
      setCopied(true)
      toast.success('Password copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy password')
    }
  }

  const isPasswordValid = (): boolean => {
    if (!formData.password) return !isNew // OK if editing and no password change
    return passwordStrength !== null && passwordStrength.score >= 3 // Require "Good" or better
  }

  const validateForm = (): boolean => {
    if (!formData.fullname || !formData.username) return false
    if (isNew && !formData.password) return false
    if (formData.password && !isPasswordValid()) return false
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.username)) return false
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      if (formData.password && !isPasswordValid()) {
        toast.error('Password does not meet strength requirements')
      } else {
        toast.error('Please fill in all required fields with valid values')
      }
      return
    }

    setIsSaving(true)
    try {
      const payload: Record<string, unknown> = {
        fullname: formData.fullname,
        username: formData.username,
        disabled: formData.disabled,
      }

      if (formData.password) {
        payload.password1 = formData.password
        payload.password2 = formData.password
      }

      if (isNew) {
        payload.cid = customerId
        await api.post('/api/users', payload)
        toast.success('User created')
      } else {
        await api.patch(`/api/users/${id}`, payload)
        toast.success('User updated')
      }
      navigate(`/admin/customers/users?id=${customerId}`)
    } catch (err: unknown) {
      // Extract error message from API response
      const axiosError = err as { response?: { data?: { title?: string; description?: string } } }
      const message = axiosError.response?.data?.title || axiosError.response?.data?.description || 'Failed to save user'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetApiKey = async () => {
    if (!user) return
    setIsResettingKey(true)
    try {
      await api.post(`/api/users/${id}/resetapikey`)
      toast.success('API key reset')
      await reload()
    } catch {
      toast.error('Failed to reset API key')
    } finally {
      setIsResettingKey(false)
    }
  }

  const goBack = () => {
    navigate(`/admin/customers/users?id=${customerId}`)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <h1 className="text-xl font-semibold text-text-primary">
            {isNew ? 'Create User' : 'Edit User'}
          </h1>
        </div>
        <Button
          onClick={handleSubmit}
          loading={isSaving}
          disabled={!validateForm()}
          icon={<Save className="h-4 w-4" />}
        >
          {isNew ? 'Create User' : 'Save Changes'}
        </Button>
      </div>

      <LoadingOverlay loading={isLoading}>
        <div className="card p-6">
          <div className="max-w-xl space-y-6">
            {/* Full Name */}
            <Input
              label="Full Name"
              value={formData.fullname}
              onChange={(e) => handleChange('fullname', e.target.value)}
              placeholder="John Smith"
              required
            />

            {/* Email */}
            <Input
              label="Email Address"
              type="email"
              value={formData.username}
              onChange={(e) => handleChange('username', e.target.value)}
              placeholder="john@example.com"
              required
              hint="This will be used as the login username"
            />

            {/* Password */}
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Password {isNew && <span className="text-danger">*</span>}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder={isNew ? 'Enter password' : 'Leave blank to keep current'}
                    className="input w-full pr-20"
                  />
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
                    {formData.password && (
                      <button
                        type="button"
                        onClick={handleCopyPassword}
                        className="p-1 text-text-muted hover:text-text-primary"
                        title="Copy password"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-text-muted hover:text-text-primary"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleGeneratePassword}
                  icon={<Wand2 className="h-4 w-4" />}
                  title="Generate secure password"
                >
                  Generate
                </Button>
              </div>

              {/* Password strength indicator */}
              {formData.password && passwordStrength && (
                <div className="mt-3 space-y-2">
                  {/* Strength bar */}
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full transition-all ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      passwordStrength.score >= 3 ? 'text-success' :
                      passwordStrength.score >= 2 ? 'text-warning' : 'text-danger'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>

                  {/* Requirements checklist */}
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <RequirementItem
                      met={passwordStrength.requirements.minLength}
                      label="At least 8 characters"
                    />
                    <RequirementItem
                      met={passwordStrength.requirements.hasUppercase}
                      label="Uppercase letter"
                    />
                    <RequirementItem
                      met={passwordStrength.requirements.hasLowercase}
                      label="Lowercase letter"
                    />
                    <RequirementItem
                      met={passwordStrength.requirements.hasNumber}
                      label="Number"
                    />
                    <RequirementItem
                      met={passwordStrength.requirements.hasSpecial}
                      label="Special character"
                    />
                  </div>

                  {passwordStrength.score < 3 && (
                    <p className="text-xs text-warning">
                      Password must be at least "Good" strength to save
                    </p>
                  )}
                </div>
              )}

              {!isNew && !formData.password && (
                <p className="mt-1 text-xs text-text-muted">
                  Leave blank to keep the current password
                </p>
              )}
            </div>

            {/* API Key (read-only for existing users) */}
            {user && (
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  API Key
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg border border-border bg-gray-50 px-3 py-2 font-mono text-sm">
                    {user.apikey}
                  </code>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleResetApiKey}
                    loading={isResettingKey}
                    icon={<RefreshCw className="h-4 w-4" />}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            )}

            {/* Disabled */}
            <Checkbox
              label="Disable Account"
              checked={formData.disabled}
              onChange={(checked) => handleChange('disabled', checked)}
              description="Disabled users cannot log in or access the API"
            />
          </div>
        </div>
      </LoadingOverlay>
    </div>
  )
}

function RequirementItem({ met, label }: { met: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${met ? 'text-success' : 'text-text-muted'}`}>
      {met ? (
        <Check className="h-3 w-3" />
      ) : (
        <X className="h-3 w-3" />
      )}
      <span>{label}</span>
    </div>
  )
}
