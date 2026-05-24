import type { CreatedClassmate, ClassmateInput, Group, PublicClassmate } from '../../shared/classmate'

type ApiErrorBody = {
  message?: string
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  })

  const body = (await response.json().catch(() => ({}))) as ApiErrorBody

  if (!response.ok) {
    throw new ApiError(response.status, body.message ?? '通信に失敗しました')
  }

  return body as T
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
