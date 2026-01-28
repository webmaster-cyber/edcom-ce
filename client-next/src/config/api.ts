import axios from 'axios'

const api = axios.create({
  baseURL: '/',
})

export function configureInterceptors(
  getAuth: () => { uid: string; cookie: string; impersonate: string },
  onUnauthorized: () => void
) {
  api.interceptors.request.use((config) => {
    const { uid, cookie, impersonate } = getAuth()
    if (uid && cookie && config.url?.startsWith('/api') && config.url !== '/api/login') {
      config.headers['X-Auth-UID'] = uid
      config.headers['X-Auth-Cookie'] = cookie
      // Don't send impersonate header for admin-level endpoints
      // These endpoints need admin context, not impersonated customer context
      const adminEndpoints = ['/api/sinks', '/api/dkimentries', '/api/companies', '/api/frontends', '/api/policies', '/api/routes', '/api/domaingroups', '/api/routepolicies', '/api/mailgun', '/api/ses', '/api/smtprelays', '/api/userlogs', '/api/allstats', '/api/ipstats', '/api/companybroadcasts', '/api/warmups', '/api/plans', '/api/billing/gateways']
      const isAdminEndpoint = adminEndpoints.some(ep => config.url?.startsWith(ep))
      if (impersonate && !isAdminEndpoint) {
        config.headers['X-Auth-Impersonate'] = impersonate
      }
    }
    return config
  })

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        onUnauthorized()
      }
      return Promise.reject(error)
    }
  )
}

export default api
