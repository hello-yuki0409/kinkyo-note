import type {
  CreatedClassmate,
  CreatedGroup,
  CurrentUser,
  EditableClassmate,
  Group,
  GroupInput,
  MyClassmateSummary,
  ClassmateInput,
  PublicClassmate,
  UpdateClassmateResult,
} from '../../shared/classmate'

type ApiErrorBody = {
  classmate?: {
    id: number
  }
  message?: string
}

export class ApiError extends Error {
  body: ApiErrorBody
  status: number

  constructor(status: number, message: string, body: ApiErrorBody = {}) {
    super(message)
    this.name = 'ApiError'
    this.body = body
    this.status = status
  }
}

let csrfTokenPromise: Promise<string> | null = null

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const requestInit = { ...init }
  const headers = new Headers(requestInit.headers)
  const method = requestInit.method?.toUpperCase() ?? 'GET'

  if (requestInit.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (shouldAttachCsrfToken(method, path)) {
    headers.set('X-CSRF-Token', await getCsrfToken())
  }

  const response = await fetch(path, {
    ...requestInit,
    headers,
  })

  const body = (await response.json().catch(() => ({}))) as ApiErrorBody

  if (!response.ok) {
    if (response.status === 403) {
      csrfTokenPromise = null
    }
    throw new ApiError(response.status, body.message ?? '通信に失敗しました', body)
  }

  return body as T
}

async function getCsrfToken() {
  csrfTokenPromise ??= request<{ csrfToken: string }>('/api/session/csrf-token').then(
    (response) => response.csrfToken,
  )
  return csrfTokenPromise
}

function shouldAttachCsrfToken(method: string, path: string) {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method) && path !== '/api/session/csrf-token'
}

export async function fetchGroup(slug: string) {
  return request<{ group: Group }>(`/api/groups/${slug}`)
}

export async function fetchClassmates(slug: string) {
  return request<{ classmates: PublicClassmate[] }>(`/api/groups/${slug}/classmates`)
}

export async function createClassmate(slug: string, input: ClassmateInput) {
  return request<{ classmate: CreatedClassmate }>(`/api/groups/${slug}/classmates`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function createGroup(input: GroupInput) {
  return request<{ group: CreatedGroup }>('/api/groups', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function fetchCurrentUser() {
  return request<{ user: CurrentUser | null }>('/api/me')
}

export async function fetchMyClassmates(slug: string) {
  return request<{ classmates: MyClassmateSummary[] }>(`/api/me/groups/${slug}/classmates`)
}

export async function fetchMyClassmate(slug: string, classmateId: number) {
  return request<{ classmate: EditableClassmate }>(
    `/api/me/groups/${slug}/classmates/${classmateId}`,
  )
}

export async function updateMyClassmate(
  slug: string,
  classmateId: number,
  input: ClassmateInput,
) {
  return request<{ classmate: UpdateClassmateResult }>(
    `/api/me/groups/${slug}/classmates/${classmateId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  )
}

export async function logout() {
  const response = await request<{ ok: true }>('/api/session', {
    method: 'DELETE',
  })
  csrfTokenPromise = null
  return response
}
