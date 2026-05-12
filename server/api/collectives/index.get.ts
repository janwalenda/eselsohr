import { listCollectives } from '../../utils/nc-collectives'

export default defineEventHandler(async (event) => {
  const collectives = await listCollectives(event)
  return {
    collectives,
  }
})
