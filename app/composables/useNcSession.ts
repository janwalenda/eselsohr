type PublicNcSession = {
  ncUrl: string
  loginName: string
}

export function useNcSession() {
  const apiFetch = useApiFetch()
  const session = useState<PublicNcSession | null>('nc-session', () => null)
  const ready = useState<boolean>('nc-session-ready', () => false)
  const pending = useState<boolean>('nc-session-pending', () => false)

  const loggedIn = computed(() => Boolean(session.value))

  async function fetchSession() {
    if (pending.value) {
      return session.value
    }

    pending.value = true
    try {
      session.value = await apiFetch<PublicNcSession | null>('/api/nc/session')
      ready.value = true
      return session.value
    }
    finally {
      pending.value = false
    }
  }

  async function signOut() {
    await apiFetch('/api/nc/logout', { method: 'POST' })
    session.value = null
    ready.value = true
  }

  return {
    session,
    loggedIn,
    ready,
    pending,
    fetchSession,
    signOut,
  }
}
