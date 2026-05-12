import { revokeAppPassword } from '../../utils/nc-api'
import { clearNcSession, getActiveSession } from '../../utils/nc-session'

export default defineEventHandler(async (event) => {
  const session = await getActiveSession(event)
  if (session) {
    await revokeAppPassword(session)
  }

  await clearNcSession(event)

  return {
    ok: true,
  }
})
