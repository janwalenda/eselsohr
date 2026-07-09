import type { NcCredentials } from './nc-api'
import { hasCollectivesCapability, ncFetchJsonWithCredentials } from './nc-api'
import { isLandingPage } from '../../shared/collectives'

const COLLECTIVES_API = '/ocs/v2.php/apps/collectives/api/v1.0'

type OcsResponse<T> = {
  ocs?: {
    data?: T
  }
}

type NcCollectiveResponse = {
  collectives?: Array<{
    id: number
    canEdit?: boolean
  }>
}

type NcPagesResponse = {
  pages?: Array<{
    id: number
    parentId: number
    fileName: string
    filePath: string
  }>
}

type NcPageResponse = {
  page?: {
    id: number
  }
}

export type CollectivesWriteValidationFailureReason =
  | 'no_collectives_app'
  | 'no_editable_collective'
  | 'write_probe_failed'

export type CollectivesWriteValidationResult =
  | { ok: true }
  | {
    ok: false
    reason: CollectivesWriteValidationFailureReason
    message: string
  }

async function collectivesRequestWithCredentials<T>(
  credentials: NcCredentials,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  if (init.body) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await ncFetchJsonWithCredentials<OcsResponse<T>>(
    credentials,
    `${COLLECTIVES_API}${path}`,
    {
      ...init,
      headers,
    },
  )

  return (response.ocs?.data ?? {}) as T
}

async function probeCollectiveWriteAccess(
  credentials: NcCredentials,
  collectiveId: number,
): Promise<boolean> {
  const pagesData = await collectivesRequestWithCredentials<NcPagesResponse>(
    credentials,
    `/collectives/${collectiveId}/pages`,
  )

  const landingPage = (pagesData.pages ?? []).find(page => isLandingPage(page))
  if (!landingPage) {
    return false
  }

  const probeTitle = `__eselsohr-auth-probe-${Date.now()}`
  const created = await collectivesRequestWithCredentials<NcPageResponse>(
    credentials,
    `/collectives/${collectiveId}/pages/${landingPage.id}`,
    {
      method: 'POST',
      body: JSON.stringify({
        title: probeTitle,
        parentId: landingPage.id,
        templateId: null,
      }),
    },
  )

  if (created.page?.id) {
    try {
      await collectivesRequestWithCredentials(
        credentials,
        `/collectives/${collectiveId}/pages/${created.page.id}`,
        { method: 'DELETE' },
      )
    }
    catch {
      // Best-effort cleanup of the probe page.
    }
  }

  return true
}

export async function validateCollectivesWriteAccess(
  credentials: NcCredentials,
): Promise<CollectivesWriteValidationResult> {
  const hasCollectives = await hasCollectivesCapability(credentials)
  if (!hasCollectives) {
    return {
      ok: false,
      reason: 'no_collectives_app',
      message: 'Auf dieser Nextcloud-Instanz ist die Collectives-App nicht installiert oder nicht aktiv.',
    }
  }

  let collectivesData: NcCollectiveResponse
  try {
    collectivesData = await collectivesRequestWithCredentials<NcCollectiveResponse>(
      credentials,
      '/collectives',
    )
  }
  catch {
    return {
      ok: false,
      reason: 'write_probe_failed',
      message: 'Die Nextcloud-Zugangsdaten konnten nicht gegen Collectives geprüft werden.',
    }
  }

  const editableCollectives = (collectivesData.collectives ?? []).filter(collective => collective.canEdit !== false)
  if (editableCollectives.length === 0) {
    return {
      ok: false,
      reason: 'no_editable_collective',
      message: 'Mit diesen Zugangsdaten ist kein bearbeitbares Collective verfügbar.',
    }
  }

  for (const collective of editableCollectives) {
    try {
      if (await probeCollectiveWriteAccess(credentials, collective.id)) {
        return { ok: true }
      }
    }
    catch {
      // Try the next editable collective before failing validation.
    }
  }

  return {
    ok: false,
    reason: 'write_probe_failed',
    message: 'Diese Zugangsdaten können in Collectives keine Seiten erstellen. Bitte nutze ein manuell erstelltes App-Passwort.',
  }
}
