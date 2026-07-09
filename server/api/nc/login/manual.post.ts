import { COLLECTIVES_WRITE_AUTH_ERROR_CODE } from '../../../../shared/api-errors'
import { normalizeNcUrl } from '../../../utils/nc-api'
import { validateCollectivesWriteAccess } from '../../../utils/nc-auth-validation'
import { promoteToActive } from '../../../utils/nc-session'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    ncUrl?: string
    loginName?: string
    appPassword?: string
  }>(event)

  const ncUrl = normalizeNcUrl(body?.ncUrl || '')
  const loginName = body?.loginName?.trim()
  const appPassword = body?.appPassword?.trim()

  if (!loginName) {
    throw createError({ statusCode: 400, statusMessage: 'Nextcloud login name is required' })
  }
  if (!appPassword) {
    throw createError({ statusCode: 400, statusMessage: 'Nextcloud app password is required' })
  }

  const credentials = {
    ncUrl,
    loginName,
    appPassword,
  }

  const validation = await validateCollectivesWriteAccess(credentials)
  if (!validation.ok) {
    throw createError({
      statusCode: validation.reason === 'no_collectives_app' ? 412 : 422,
      statusMessage: validation.message,
      data: {
        code: COLLECTIVES_WRITE_AUTH_ERROR_CODE,
        reason: validation.reason,
        fallback: 'manual',
      },
    })
  }

  await promoteToActive(event, credentials)

  return {
    ok: true,
    session: {
      ncUrl: credentials.ncUrl,
      loginName: credentials.loginName,
    },
  }
})
