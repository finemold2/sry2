// 장면 생성기(SceneForge) — 슬롯 조합으로 1,300억 이상의 무작위 장면을 만든다(완전 로컬).
// 슬롯별 🔒 잠금 + 🎲 부분 재생성. 연계(linkbus): 장면을 장면 목록/배경 라이브러리/스니펫으로 보낸다.
import { useMemo, useState } from 'react'
import { addToLibrary, openToolLinked, addToProject, hasProjectBridge, TOOL_RELATIONS, Emoji, emojify } from './linkbus'

export const meta = { id: 'scene-forge', name: '장면 생성기(1300억+ 조합)', icon: '🎬', group: '영감·발상', intro: '1,300억 가지 이상의 무작위 장면으로 막힌 글을 뚫으세요', w: 480, h: 600 }

// 한국어 조사 선택: 앞 글자 받침 유무로 은/는, 이/가, 을/를, 으로/로 등을 실제로 하나 골라 출력한다.
function hasFinalConsonant(word: string): boolean {
  const ch = word.charCodeAt(word.length - 1)
  if (ch < 0xac00 || ch > 0xd7a3) return false // 한글 음절이 아니면 받침 없음으로 처리
  return (ch - 0xac00) % 28 !== 0
}
// 'ㄹ' 받침은 '으로/로'에서 받침 없는 것처럼 '로'를 쓴다.
function hasFinalConsonantExceptRieul(word: string): boolean {
  const ch = word.charCodeAt(word.length - 1)
  if (ch < 0xac00 || ch > 0xd7a3) return false
  const jong = (ch - 0xac00) % 28
  return jong !== 0 && jong !== 8 // 8 == 'ㄹ'
}
function josa(word: string, withBatchim: string, withoutBatchim: string): string {
  return hasFinalConsonant(word) ? withBatchim : withoutBatchim
}
// 주격/주제 조사: 받침 있으면 은, 없으면 는
const topic = (w: string) => w + josa(w, '은', '는')

const REL_LABEL: Record<string, string> = {
  'scene-list': '📋 장면 목록', 'setting-bible': '🏞 배경 설정집', 'character-sheet': '🪪 인물 시트', 'sensory-palette': '🌫 감각 팔레트', 'plot-pyramid': '🔺 플롯 피라미드',
}

interface Slot { key: string; label: string; options: string[] }
const SLOTS: Slot[] = [
  { key: 'place', label: '장소', options: ['비 내리는 골목', '폐허가 된 성', '새벽 기차역', '눈 덮인 산장', '북적이는 시장', '버려진 등대', '도서관 깊은 서가', '안개 낀 부두', '왕궁의 알현실', '지하 벙커', '사막 한가운데 오아시스', '낡은 극장 무대 뒤', '병원 옥상', '국경 검문소', '심해 잠수정 안', '우주정거장 관측실', '대숲 속 사당', '불타는 들판', '얼어붙은 호수 위', '뒷골목 술집', '낡은 등대지기 오두막', '고층 빌딩 옥상', '수도원 회랑', '난파선 갑판', '지하 투기장', '꽃이 만개한 정원', '폐광 갱도', '국립묘지', '카페 구석 자리', '강변 다리 밑', '연구소 무균실', '낡은 회전목마 앞', '성벽 위 망루', '눈보라 치는 고갯길', '비밀 서재', '버려진 놀이공원', '항구의 창고', '산속 온천', '재판정', '망망대해의 보트'] },
  { key: 'time', label: '시각·날씨', options: ['해 뜨기 직전', '한낮의 폭염', '땅거미 질 무렵', '폭풍우 치는 밤', '첫눈 내리는 아침', '안개 자욱한 새벽', '보름달 뜬 밤', '장맛비 속', '메마른 가뭄의 한낮', '서리 내린 이른 아침', '노을이 붉게 타는 저녁', '천둥 번개 치는 자정', '함박눈 쏟아지는 오후', '미세먼지 짙은 흐린 날', '별이 쏟아지는 깊은 밤', '해무가 밀려오는 정오', '진눈깨비 흩날리는 저녁', '무더운 열대야'] },
  { key: 'subject', label: '시점 인물', options: ['지친 형사', '도망친 공주', '늙은 검객', '어린 견습 마법사', '냉정한 암살자', '순박한 농부', '야심 찬 정치가', '떠돌이 음유시인', '실직한 가장', '비밀을 품은 의사', '복수를 다짐한 고아', '은퇴한 군인', '천재 발명가', '몰락한 귀족', '이중 첩자', '말 없는 아이', '신참 기자', '배신당한 연인', '불치병에 걸린 화가', '기억을 잃은 여행자', '카리스마 있는 사기꾼', '원칙주의 판사'] },
  { key: 'goal', label: '목표', options: ['진실을 밝히려', '누군가를 구하려', '비밀을 지키려', '복수를 끝내려', '도망치려', '약속을 지키려', '용서를 구하려', '권력을 차지하려', '사랑을 고백하려', '배신자를 찾으려', '집으로 돌아가려', '과거를 묻으려', '증거를 없애려', '시간을 벌려', '거래를 성사시키려', '맹세를 깨려', '정체를 숨기려', '마지막 작별을 하려', '빚을 갚으려', '금지된 지식을 얻으려', '아이를 지키려', '진심을 전하려', '함정에서 벗어나려', '운명을 거스르려', '잃은 것을 되찾으려', '한 사람을 설득하려'] },
  { key: 'obstacle', label: '장애물', options: ['시간이 얼마 없다', '믿었던 이가 등을 돌린다', '치명적인 비밀이 드러난다', '몸을 움직일 수 없다', '말이 통하지 않는다', '증인이 사라졌다', '날씨가 길을 막는다', '적이 한발 앞섰다', '돈도 무기도 없다', '거짓말이 들통난다', '사랑하는 이가 인질이다', '기억이 흐릿하다', '규칙이 그를 옭아맨다', '병이 깊어진다', '군중이 적대적이다', '문이 잠겨 있다', '동료가 다쳤다', '선택지가 둘뿐이다', '추격자가 가까이 왔다', '신뢰가 깨졌다', '대가가 너무 크다', '진실이 더 잔인하다', '예언이 어긋난다', '배신의 증거가 본인을 가리킨다', '시간이 거꾸로 흐른다', '구원자가 곧 가해자다'] },
  { key: 'mood', label: '분위기', options: ['숨 막히는 긴장', '쓸쓸한 적막', '불길한 예감', '아련한 그리움', '서늘한 공포', '뜨거운 분노', '묘한 설렘', '체념 어린 슬픔', '불안한 고요', '들뜬 기대', '음울한 절망', '날카로운 의심', '따뜻한 위로', '광기 어린 흥분', '서글픈 평온', '냉소적인 거리감', '경건한 침묵', '아찔한 현기증', '씁쓸한 후회', '결연한 각오', '몽환적인 황홀', '폭발 직전의 침묵'] },
  { key: 'turn', label: '전환·사건', options: ['낯선 이가 문을 두드린다', '죽은 줄 알았던 자가 나타난다', '편지 한 통이 모든 걸 뒤집는다', '총성이 울린다', '비밀번호가 풀린다', '거짓 자백이 시작된다', '불이 꺼진다', '아이가 진실을 말한다', '배가 가라앉기 시작한다', '예언이 실현된다', '얼굴에서 가면이 벗겨진다', '시계가 멈춘다', '폭우가 증거를 씻어낸다', '한 통의 전화가 걸려온다', '바닥이 무너진다', '적이 손을 내민다', '기억이 한꺼번에 돌아온다', '신호탄이 하늘을 가른다', '문서가 불타오른다', '낯익은 향기가 스친다', '거울 속에 다른 얼굴이 보인다', '계약서에 서명이 마른다', '마지막 열차가 떠난다', '봉인이 열린다', '심장이 한 박자 멎는다', '진짜 범인이 웃는다'] },
  { key: 'sensory', label: '감각 디테일', options: ['젖은 흙냄새', '멀리서 들리는 종소리', '혀끝의 쇠 맛', '식은 커피의 온기', '삐걱이는 마룻바닥', '목덜미를 스치는 찬바람', '타들어가는 양초 냄새', '귓가에 맴도는 숨소리', '손끝의 거친 돌결', '코를 찌르는 화약 냄새', '발밑의 깨진 유리', '멀어지는 발소리', '입안에 도는 피 맛', '창을 두드리는 빗방울', '살갗에 닿는 비단', '메마른 입술', '천장에서 떨어지는 물방울', '재가 된 종이 냄새', '심장 박동 소리', '낡은 책의 곰팡내', '얼어붙은 손가락', '멀리서 우는 짐승 소리'] },
  // 추가 슬롯: 시점 인물의 '숨은 동기'(명사구). 다른 슬롯을 전제하지 않는 독립 항목들 — 곱집합으로 섞여도 모순이 없다.
  { key: 'drive', label: '숨은 동기', options: ['인정받고 싶은 갈망', '버림받을지 모른다는 두려움', '오래 묵힌 죄책감', '되갚아야 할 빚진 마음', '잃을 게 없다는 자포자기', '지켜야 할 자존심', '꺼지지 않는 호기심', '뿌리 깊은 의무감', '남몰래 키운 야망', '용서받고 싶은 바람', '끝내 놓지 못한 미련', '들키고 싶지 않은 수치심', '타오르는 질투심', '한 번뿐인 기회라는 절박함', '누구도 믿지 못하는 불신', '대가를 치르겠다는 각오', '운명을 바꾸려는 오기', '사랑받았던 기억에 대한 향수', '두 번 실패할 수 없다는 강박', '진실 앞에 서려는 용기'] },
]

const COMBOS = SLOTS.reduce((n, s) => n * s.options.length, 1)

function randIdx(n: number) { return Math.floor(Math.random() * n) }

export default function SceneForge() {
  const [picks, setPicks] = useState<Record<string, number>>(() => Object.fromEntries(SLOTS.map((s) => [s.key, randIdx(s.options.length)])))
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState('')

  const rollAll = () => setPicks((p) => Object.fromEntries(SLOTS.map((s) => [s.key, locked[s.key] ? p[s.key] : randIdx(s.options.length)])))
  const rollOne = (k: string) => setPicks((p) => ({ ...p, [k]: randIdx(SLOTS.find((s) => s.key === k)!.options.length) }))
  const toggleLock = (k: string) => setLocked((l) => ({ ...l, [k]: !l[k] }))

  const val = (k: string) => SLOTS.find((s) => s.key === k)!.options[picks[k]]
  const sceneText = useMemo(() => {
    return `${val('place')}, ${val('time')}. ${topic(val('subject'))} ${val('drive')}에 이끌려 ${val('goal')} 하지만, ${val('obstacle')}. 분위기는 ${val('mood')}. 그때, ${val('turn')}. (${val('sensory')})`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks])

  const copy = () => { navigator.clipboard?.writeText(sceneText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400) }).catch(() => {}) }
  const flash = (m: string) => { setSaved(m); setTimeout(() => setSaved(''), 1500) }
  const toSceneList = () => { openToolLinked('scene-list', { scene: { title: val('subject') + ' · ' + val('place'), summary: sceneText, pov: val('subject'), place: val('place'), goal: val('goal'), conflict: val('obstacle'), mood: val('mood') } }); flash('장면 목록으로 보냄') }
  const toLibPlace = () => { addToLibrary('places', { name: val('place'), mood: val('mood'), notes: sceneText, fields: { name: val('place'), atmosphere: val('mood'), notes: sceneText }, source: '장면 생성기' }); flash('배경 라이브러리에 장소 저장') }
  const toSnippet = () => { addToLibrary('snippets', { text: sceneText, source: '장면 생성기', tags: ['장면'] }); flash('스니펫으로 저장') }
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const toProject = () => {
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '장면',
      title: val('subject') + ' · ' + val('place'),
      bodyHtml: `<p>${esc(sceneText)}</p>`,
      synopsis: sceneText,
      meta: { 장소: val('place'), POV: val('subject'), 분위기: val('mood') },
    })
    flash(id ? '프로젝트 원고에 장면 추가됨' : '프로젝트에 연결되지 않았습니다')
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        조합 가능 장면 <b style={{ color: 'var(--accent)' }}>{COMBOS.toLocaleString()}</b>가지. 슬롯을 <Emoji e="🔒"/> 잠그고 나머지만 <Emoji e="🎲"/> 돌려 원하는 장면을 찾으세요.
      </div>

      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 14.5, lineHeight: 1.6 }}>
        {sceneText}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SLOTS.map((s) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', width: 64, flexShrink: 0 }}>{s.label}</span>
            <span style={{ flex: 1, fontSize: 13 }}>{s.options[picks[s.key]]}</span>
            <button className="minibtn" title={locked[s.key] ? '잠금 해제' : '이 슬롯 잠금'} onClick={() => toggleLock(s.key)} style={{ color: locked[s.key] ? 'var(--accent)' : 'var(--muted)' }}>{locked[s.key] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
            <button className="minibtn" title="이 슬롯만 다시" onClick={() => rollOne(s.key)} disabled={locked[s.key]}><Emoji e="🎲"/></button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={rollAll}><Emoji e="🎲"/> 장면 생성</button>
        <button className="minibtn" onClick={copy}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
      </div>
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '현재 장면을 프로젝트 원고에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 장면 추가</button>
        <button className="linkbtn" onClick={toSceneList}><Emoji e="📋"/> 장면 목록으로</button>
        <button className="linkbtn" onClick={toLibPlace}><Emoji e="🏞"/> 배경 저장</button>
        <button className="linkbtn" onClick={toSnippet}><Emoji e="📥"/> 스니펫 저장</button>
        {(TOOL_RELATIONS['scene-forge'] || []).filter((id) => id !== 'scene-list' && id !== 'setting-bible').map((id) => (
          <button key={id} className="linkbtn" onClick={() => openToolLinked(id)}>{emojify(REL_LABEL[id] || id)}</button>
        ))}
      </div>
      {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>✓ {saved}</div>}
    </div>
  )
}
