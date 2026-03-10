import type { H3Event } from 'h3'
import { getHeader, setResponseHeader } from 'h3'

function rejectRequest(event: H3Event): never {
  setResponseHeader(event, 'WWW-Authenticate', 'Basic realm="KSB Katzenstation"')

  throw createError({
    statusCode: 401,
    statusMessage: 'Authentifizierung erforderlich'
  })
}

export default defineEventHandler((event) => {
  if (import.meta.dev) {
    return
  }

  const config = useRuntimeConfig(event)
  const authorization = getHeader(event, 'authorization')

  if (!authorization?.startsWith('Basic ')) {
    rejectRequest(event)
  }

  try {
    const decoded = Buffer.from(authorization.slice(6), 'base64').toString('utf8')
    const separatorIndex = decoded.indexOf(':')

    if (separatorIndex === -1) {
      rejectRequest(event)
    }

    const username = decoded.slice(0, separatorIndex)
    const password = decoded.slice(separatorIndex + 1)

    if (username !== config.basicAuthUser || password !== config.basicAuthPass) {
      rejectRequest(event)
    }
  } catch {
    rejectRequest(event)
  }
})
