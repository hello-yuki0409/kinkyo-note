import type { ClassmateFormValues } from '../../shared/classmate'

const draftPrefix = 'kinkyo-note:classmate-draft:v1:'

const emptyDraft: ClassmateFormValues = {
  name: '',
  nickname: '',
  currentLocation: '',
  job: '',
  comment: '',
  snsUrl: '',
  visibility: 'public',
}

export function getClassmateDraft(slug: string): ClassmateFormValues {
  try {
    const rawValue = localStorage.getItem(getDraftKey(slug))
    if (!rawValue) return emptyDraft

    const parsedValue = JSON.parse(rawValue) as Partial<ClassmateFormValues>
    return {
      ...emptyDraft,
      ...parsedValue,
      visibility:
        parsedValue.visibility === 'organizer_only'
          ? 'organizer_only'
          : 'public',
    }
  } catch {
    return emptyDraft
  }
}

export function saveClassmateDraft(slug: string, draft: ClassmateFormValues) {
  localStorage.setItem(getDraftKey(slug), JSON.stringify(draft))
}

export function clearClassmateDraft(slug: string) {
  localStorage.removeItem(getDraftKey(slug))
}

function getDraftKey(slug: string) {
  return `${draftPrefix}${slug}`
}
