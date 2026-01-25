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
      if (impersonate) {
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
