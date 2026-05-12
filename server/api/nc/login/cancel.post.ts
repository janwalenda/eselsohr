import { clearNcSession } from '../../../utils/nc-session'

export default defineEventHandler(async (event) => {
  await clearNcSession(event)
  return { ok: true }
})
