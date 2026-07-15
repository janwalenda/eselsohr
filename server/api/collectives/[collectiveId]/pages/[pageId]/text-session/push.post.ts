import { proxyTextSessionAction } from '../../../../../../utils/nc-text'

export default defineEventHandler(event => proxyTextSessionAction(event, 'push'))
