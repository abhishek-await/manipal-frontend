
import React from 'react'
import { cookies as nextCookies } from 'next/headers'
import CreatePostClient from '@/features/support_groups/CreatePostClient'

export default async function PageCreatePost(props: PageProps<'/support-group/[id]/create-post'>) {
  const { id } = await props.params
  const groupId = id
  if (!groupId) return <div>Group id missing</div>

  const cookieStore = await nextCookies()
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ')
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? process.env.BACKEND_URL ?? ''
  const serverBase = process.env.NEXT_SERVER_URL ?? `http://localhost:3000`;

  async function forwardFetchJson(path: string, method = 'GET') {
    try {
      const payload = { path, method }
      const res = await fetch(`${serverBase}/api/forward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cookieHeader ? { cookie: cookieHeader } : {}),
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      })
      if (!res.ok) return null
      return await res.json().catch(() => null)
    } catch (e) {
      console.error('forwardFetchJson error', e)
      return null
    }
  }

  // fetch current user server-side via forwarder
  let initialCurrentUser: any | null = null
  try {
    const me = await forwardFetchJson(`${API_BASE}/accounts/user`, 'GET')
    initialCurrentUser = me ?? null
  } catch (e) {
    console.warn('Could not fetch current user server-side', e)
    initialCurrentUser = null
  }

  // SSR: fetch minimal group info (title + avatar) to render header
  let rawGroup: any = null
  try {
    rawGroup = await forwardFetchJson(`${API_BASE}/support-groups/groups/${groupId}`, 'GET')
  } catch (e) {
    console.warn('Could not fetch group server-side', e)
    rawGroup = null
  }

  const groupTitle = rawGroup?.title ?? 'Support group'
  const groupAvatar = rawGroup?.image_url ?? '/images/group-thumb.png'

  return (
    <CreatePostClient
      groupId={groupId}
      groupTitle={groupTitle}
      groupAvatar={groupAvatar}
      initialCurrentUser={initialCurrentUser}
    />
  )
}
