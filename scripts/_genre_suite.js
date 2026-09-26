// 재사용 장르 도구 워크플로: 리서치(장르 분석) → 14종 도구 저작. args 로 장르 지정.
// 호출: Workflow({ scriptPath: ".../_genre_suite.js", args: { genre, prefix, idprefix, signature } })
export const meta = {
  name: 'genre-suite',
  description: '장르 전용 도구 14종 — 대표작·관습·작법 리서치 후 근거 기반 저작(지식/어휘/장치/생성기/구조 등)',
  phases: [{ title: 'Research', detail: '장르 분석 도시에' }, { title: 'Author', detail: '14개 도구 병렬 저작' }],
}
// ── 장르마다 이 4개 상수만 바꿔 scriptPath 로 호출(인라인 args 미사용: 전달 불안정) ──
const GENRE = '액션·전쟁'
const PREFIX = 'Action'        // 파일/컴포넌트 접두(PascalCase, 장르마다 유일)
const IDP = 'action'           // id 접두(kebab, 장르마다 유일)
const SIGNATURE = '액션 시퀀스 생성기 — 무대×무기/전술×적 유형×장애물/변수×반전×대가/부상 슬롯 조합(조합 1조 이상 지향)'

phase('Research')
const dossier = await agent(
  '너는 장르소설 평론가이자 작법 연구자다. 다음 장르를 분석해 "집필 도구 제작용 도시에"를 작성하라: ' + GENRE + '\n' +
  '국내외 대표작·계보, 독자 기대와 필수 관습, 이 장르 고유의 서사 장치(구체적으로), 전개·구조 패턴과 페이싱, 클라이맥스 관습, 특수 어휘·표현·클리셰, 배경·세계관 요소, 흔한 함정. ' +
  '실제 장르 통념·대표작에 근거해 구체적으로. 한국어. 도구 저자들이 바로 쓸 수 있도록 항목별로 풍부하게(불릿).',
  { label: 'dossier:' + IDP, phase: 'Research' }
)
const CONV = String.raw`
[도구 규약] 파일 src/tools/<PascalName>.tsx 를 Write. 형식:
  import { useState, useEffect, useRef } from 'react'
  import { ... } from './linkbus'
  export const meta = { id:'<kebab>', name:'<한국어>', icon:'<이모지>', group:'<하위유형>', genre:'__GENRE__', intro:'<한 줄>', w:<폭>, h:<높이> }
  export default function <PascalName>({ payload }: { payload?: Record<string, unknown> }) { ... }
필수: meta.genre 를 정확히 '__GENRE__' 로. 파일/컴포넌트/ id 는 지정된 접두를 붙여 충돌 방지.
규칙: react 와 './linkbus' 외 import 금지. 전부 로컬(외부 API 안 씀), 아래 '장르 도시에'에 근거한 풍부한 자작 데이터(장르 특화·구체적, 일반론 금지). 생성기는 슬롯 풀 무작위(잠금/재생성)+조합수 표시, 조합수 1억 이상(핵심 생성기는 1조 이상 지향). 사전류는 카테고리 펼침+검색+무작위+클릭복사. CRUD 는 localStorage 'scrivweb:tool:<id>'. 언마운트 정리. UI 한국어, 인라인 style+CSS변수, 버튼 'minibtn'/'btn-primary'/'linkbtn', height:100% flex column, overflow:auto.
[연계 필수] addToProject({kind?,root?,folder?,title,bodyHtml?(escape &<>),character?,meta?})+hasProjectBridge() 로 "📄 프로젝트에 추가", 생성 글감은 addToLibrary('snippets'|'characters'|'places',item), 관련 도구 openToolLinked(id). payload.genre 활용. 코드만 출력.

[장르 도시에]
__DOSSIER__`.replace(/__GENRE__/g, GENRE).replace('__DOSSIER__', String(dossier || '').slice(0, 6000))

const SCHEMA = { type: 'object', additionalProperties: false, properties: { file: { type: 'string' }, ok: { type: 'boolean' } }, required: ['file', 'ok'] }
const ARCH = [
  { s: 'Knowledge', grp: '지식 사전', d: '장르 지식·소재 사전: 이 장르에서 자주 쓰는 소재·설정·고증 지식을 카테고리로 풍부하게(도시에 근거). 펼침+검색+무작위+복사.' },
  { s: 'Lexicon', grp: '어휘·표현', d: '특수 어휘·표현 사전: 이 장르 특유의 단어·관용표현·말투·상투구·전문용어를 카테고리로(도시에 근거). 클릭복사, 무작위, 스니펫 저장.' },
  { s: 'Devices', grp: '장치·전개', d: '서사 장치·전개법 사전: 이 장르 고유의 서사 장치와 전개/구조 패턴·페이싱·클라이맥스 관습을 정의+사용법+예시+비틀기(도시에 근거). 펼침+검색+무작위.' },
  { s: 'EventForge', grp: '생성기', d: '사건·소재 대형 생성기(조합 1조 지향): 이 장르 핵심 사건 요소 슬롯들 조합. 잠금/재생성, 조합수 표시. addToProject(folder:"사건")·스니펫.' },
  { s: 'CharForge', grp: '캐릭터', d: '장르 캐릭터 생성기: 이 장르의 인물 원형×역할×동기×결점×관계 슬롯 조합(조합 1억+). 인물 시트/라이브러리/프로젝트(인물) 연계.' },
  { s: 'SettingForge', grp: '배경', d: '배경·현장 생성기(조합 1억+): 이 장르다운 장소·분위기·디테일 슬롯 조합. addToProject(kind:setting, folder:"장소")·장소 라이브러리.' },
  { s: 'WorldBuilder', grp: '세계관', d: '세계관/설정 빌더: 이 장르에 필요한 설정 항목(도시에 근거)을 질문·입력으로 구조화. addToProject(kind:text, root:research, folder:"세계관"). localStorage.' },
  { s: 'PlotLogic', grp: '플롯', d: '플롯·진행곡선(로직) 템플릿: 이 장르의 표준 구조/비트와 페이싱을 단계 입력 시트로(도시에 근거). 진행률. addToProject(folder:"구조").' },
  { s: 'Tropes', grp: '구상·정리', d: '트로프·관습 체크리스트: 이 장르의 독자 기대·필수 요소·흔한 함정·클리셰(+비틀기)를 체크리스트로. addToProject(folder:"기획").' },
  { s: 'ConflictForge', grp: '생성기', d: '갈등·딜레마 생성기(조합 1억+): 이 장르다운 갈등 구도 슬롯 조합. addToProject(folder:"갈등")·스니펫.' },
  { s: 'Synopsis', grp: '구조', d: '시놉시스 빌더: 이 장르 관습에 맞는 항목으로 시놉시스를 채워 자동 종합. addToProject(folder:"기획","시놉시스").' },
  { s: 'Outline', grp: '구조', d: '개요(아웃라인) 빌더: 이 장르 표준 구조에 맞춘 장/막 개요 템플릿을 채운다. 항목 추가/순서. addToProject(folder:"개요").' },
  { s: 'Signature', grp: '생성기', d: '장르 시그니처 대형 생성기(조합 1조 지향): ' + SIGNATURE + ' 잠금/재생성, 조합수 표시. addToProject·스니펫.' },
  { s: 'SceneForge', grp: '생성기', d: '장르 장면 생성기(전개법 적용, 조합 1억+): 이 장르 전형 장면(도시에 근거)을 요소 슬롯으로 생성. addToProject(folder:"장면")·스니펫.' },
]
phase('Author')
const r = await parallel(ARCH.map((a) => () =>
  agent('너는 장르소설 집필 도구 전문 저자다. "' + GENRE + '" 장르에 특화된 도구를 도시에 근거해 충실히 구현하라.\n\n' + CONV +
    '\n\n파일: src/tools/' + PREFIX + a.s + '.tsx (컴포넌트 ' + PREFIX + a.s + ', id "' + IDP + '-' + a.s.toLowerCase() + '")\nmeta.genre="' + GENRE + '" · group="' + a.grp + '"\n사양: ' + a.d + '\nWrite 후 점검: meta.genre 정확·접두 id·react/linkbus 외 import 없음·조합수·연계/프로젝트 버튼. 보고.',
    { label: IDP + ':' + a.s, phase: 'Author', schema: SCHEMA })
))
return { genre: GENRE, tools: r.filter(Boolean).length }
