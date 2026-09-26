// BYO-key AI 어시스턴트 — 사용자가 자신의 API 키로 직접 호출(브라우저 → 제공자 API).
// 키는 서버를 거치지 않고 localStorage 에만 보관된다.

export type AiProvider = 'anthropic' | 'openai' | 'custom'

export interface AiSettings {
  provider: AiProvider
  apiKey: string
  model: string
  baseUrl: string // custom(OpenAI 호환) 용
}

const LS_KEY = 'sry:ai'

export const DEFAULT_AI: AiSettings = {
  provider: 'anthropic',
  apiKey: '',
  model: 'claude-opus-4-8',
  baseUrl: '',
}

export function loadAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return { ...DEFAULT_AI, ...JSON.parse(raw) }
  } catch {
    /* noop */
  }
  return { ...DEFAULT_AI }
}

export function saveAiSettings(s: AiSettings) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s))
  } catch {
    /* noop */
  }
}

export const MODEL_SUGGESTIONS: Record<AiProvider, string[]> = {
  anthropic: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1'],
  custom: [],
}

/** system + user 프롬프트로 모델을 1회 호출하고 텍스트 응답을 반환. */
/** 상태 코드를 사용자 친화 메시지로(원문 응답은 콘솔에만 기록 — 키/메타 노출 방지). */
async function friendlyError(res: Response): Promise<Error> {
  let raw = ''
  try {
    raw = await res.text()
  } catch {
    /* noop */
  }
  if (raw) console.debug('AI API 응답:', raw)
  const map: Record<number, string> = {
    401: 'API 키 인증에 실패했습니다. 키를 확인하세요.',
    403: '이 키로는 접근 권한이 없습니다.',
    404: '모델명을 찾을 수 없습니다. 모델을 확인하세요.',
    429: '요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.',
  }
  const msg = map[res.status] || `요청 실패 (HTTP ${res.status}). 설정을 확인하세요.`
  return new Error(msg)
}

export async function runAi(s: AiSettings, system: string, user: string): Promise<string> {
  if (!s.apiKey) throw new Error('API 키가 설정되지 않았습니다.')

  if (s.provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': s.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: s.model,
        max_tokens: 1500,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    })
    if (!res.ok) throw await friendlyError(res)
    const data = await res.json()
    return (data.content || []).map((c: { text?: string }) => c.text || '').join('').trim()
  }

  // OpenAI 호환(openai / custom)
  const base =
    s.provider === 'openai' ? 'https://api.openai.com/v1' : s.baseUrl.replace(/\/$/, '') || 'https://api.openai.com/v1'
  const res = await fetch(base + '/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${s.apiKey}` },
    body: JSON.stringify({
      model: s.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) throw await friendlyError(res)
  const data = await res.json()
  return (data.choices?.[0]?.message?.content || '').trim()
}

export interface AiAction {
  id: string
  label: string
  system: string
  /** 사용자 텍스트를 감싸는 지시(컨텍스트). */
  wrap: (text: string) => string
}

export const AI_ACTIONS: AiAction[] = [
  {
    id: 'summarize',
    label: '요약',
    system: '당신은 한국어 글쓰기 보조원입니다. 핵심만 간결하게 답하세요.',
    wrap: (t) => `다음 글을 3~5문장으로 요약해줘:\n\n${t}`,
  },
  {
    id: 'continue',
    label: '이어쓰기',
    system: '당신은 소설/글쓰기 보조원입니다. 원문의 문체와 어조를 유지하세요.',
    wrap: (t) => `다음 글에 자연스럽게 이어지는 한 단락을 더 써줘. 이어질 부분만 출력해:\n\n${t}`,
  },
  {
    id: 'proofread',
    label: '교정',
    system: '당신은 한국어 교정 전문가입니다. 의미는 유지하고 맞춤법·문장을 다듬으세요.',
    wrap: (t) => `다음 글의 맞춤법과 어색한 문장을 교정해줘. 교정된 전체 글만 출력해:\n\n${t}`,
  },
  {
    id: 'synopsis',
    label: '시놉시스',
    system: '당신은 편집자입니다. 군더더기 없이 답하세요.',
    wrap: (t) => `다음 글의 줄거리를 한두 문장으로 요약한 시놉시스를 만들어줘:\n\n${t}`,
  },
  {
    id: 'rephrase',
    label: '문장 다듬기',
    system: '당신은 한국어 글쓰기 보조원입니다.',
    wrap: (t) => `다음 글을 더 매끄럽고 생생하게 다시 써줘. 다시 쓴 글만 출력해:\n\n${t}`,
  },
]
