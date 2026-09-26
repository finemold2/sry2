// 어원·한자 분해 탐험 — 자주 쓰는 한자어를 구성 한자(뜻·음)로 분해하고, 의미 요소(부수)·유의 계열어를 보여
//  작명·조어·어휘 감각에 활용하는 로컬 사전. 모든 텍스트는 자작 요약(백과 베끼기 금지).
//  외부 네트워크·라이브러리 없음 — react 와 './linkbus' 만 사용. localStorage(즐겨찾기·마지막 탭)만.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToStash, hasStash, addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'etymology-explorer', name: '어원·한자 분해', icon: '🔤', group: '언어·어휘', intro: '한자어를 구성 한자(뜻·음)로 쪼개고 유의 계열어로 작명·조어에 활용', w: 660, h: 600 }

// ---------- 데이터 모델 ----------
// 단일 한자: 글자 / 뜻(훈) / 음 / 부수(의미요소) / 짧은 자작 풀이 / 같은 글자가 들어가는 예시 낱말
interface Hanja {
  ch: string        // 한자
  mean: string      // 새김(훈) — 뜻
  sound: string     // 음
  radical: string   // 부수(의미 요소)
  note: string      // 자작 한 줄 풀이
  words?: string[]  // 이 글자가 쓰인 낱말 예시(자작 선별)
}
// 한자어: 표제어 / 한자 표기 / 자작 뜻풀이 / 구성 한자 분해 / 같은 계열(유의·연관) 낱말
interface Word {
  ko: string         // 한글 표제어
  hanja: string      // 한자 표기
  gloss: string      // 자작 뜻풀이
  parts: { ch: string; mean: string; sound: string }[]   // 글자별 분해
  kin?: string[]     // 유의·계열어(작명·조어 참고)
}
interface WordCat { key: string; label: string; icon: string; items: Word[] }
// 부수(의미 요소) 카테고리: 부수 / 음 / 뜻 / 자작 설명 / 그 요소가 든 글자 예시
interface Radical { rad: string; sound: string; mean: string; note: string; samples: string[] }
interface RadicalCat { key: string; label: string; icon: string; items: Radical[] }

// ===================== 1) 한자어 분해 사전 =====================
const WORD_CATS: WordCat[] = [
  {
    key: 'feel', label: '마음·감정', icon: '💗', items: [
      { ko: '사랑', hanja: '愛情', gloss: '아끼고 그리는 마음의 정. 사람이 사람을 끌어안는 따뜻한 기운.', parts: [{ ch: '愛', mean: '사랑', sound: '애' }, { ch: '情', mean: '뜻·정', sound: '정' }], kin: ['연정(戀情)', '애착(愛着)', '연모(戀慕)', '자애(慈愛)', '정애(情愛)'] },
      { ko: '연모', hanja: '戀慕', gloss: '그리워하며 사모함. 닿지 못한 채 마음만 향하는 애틋함.', parts: [{ ch: '戀', mean: '그리워할', sound: '연' }, { ch: '慕', mean: '사모할', sound: '모' }], kin: ['사모(思慕)', '흠모(欽慕)', '연정(戀情)', '경모(敬慕)'] },
      { ko: '환희', hanja: '歡喜', gloss: '벅차게 솟구치는 기쁨. 몸과 마음이 함께 들뜨는 즐거움.', parts: [{ ch: '歡', mean: '기뻐할', sound: '환' }, { ch: '喜', mean: '기쁠', sound: '희' }], kin: ['희열(喜悅)', '환락(歡樂)', '열락(悅樂)', '희락(喜樂)'] },
      { ko: '비애', hanja: '悲哀', gloss: '가슴을 저미는 슬픔. 어쩌지 못해 차오르는 서러움.', parts: [{ ch: '悲', mean: '슬플', sound: '비' }, { ch: '哀', mean: '슬플', sound: '애' }], kin: ['애수(哀愁)', '비탄(悲歎)', '애상(哀傷)', '애통(哀痛)'] },
      { ko: '분노', hanja: '憤怒', gloss: '치밀어 오르는 노여움. 부당함 앞에서 끓어오르는 격정.', parts: [{ ch: '憤', mean: '분할', sound: '분' }, { ch: '怒', mean: '성낼', sound: '노' }], kin: ['격노(激怒)', '진노(瞋怒)', '울분(鬱憤)', '분개(憤慨)'] },
      { ko: '공포', hanja: '恐怖', gloss: '온몸이 굳는 두려움. 닥쳐올 위험 앞의 떨림.', parts: [{ ch: '恐', mean: '두려울', sound: '공' }, { ch: '怖', mean: '두려울', sound: '포' }], kin: ['경악(驚愕)', '전율(戰慄)', '외경(畏敬)', '겁(怯)'] },
      { ko: '고독', hanja: '孤獨', gloss: '홀로 떨어진 외로움. 곁에 아무도 없다는 시린 느낌.', parts: [{ ch: '孤', mean: '외로울', sound: '고' }, { ch: '獨', mean: '홀로', sound: '독' }], kin: ['적막(寂寞)', '고적(孤寂)', '고립(孤立)', '독거(獨居)'] },
      { ko: '향수', hanja: '鄕愁', gloss: '고향을 그리는 시린 마음. 돌아갈 수 없는 곳을 향한 애틋함.', parts: [{ ch: '鄕', mean: '시골·고향', sound: '향' }, { ch: '愁', mean: '근심', sound: '수' }], kin: ['수심(愁心)', '회향(懷鄕)', '망향(望鄕)', '회한(悔恨)'] },
      { ko: '희망', hanja: '希望', gloss: '바라고 기대하는 마음. 아직 오지 않은 좋음을 향한 빛.', parts: [{ ch: '希', mean: '바랄', sound: '희' }, { ch: '望', mean: '바랄', sound: '망' }], kin: ['소망(所望)', '기대(期待)', '열망(熱望)', '갈망(渴望)'] },
      { ko: '절망', hanja: '絶望', gloss: '바람이 끊긴 마음. 더는 기대할 데가 없는 캄캄함.', parts: [{ ch: '絶', mean: '끊을', sound: '절' }, { ch: '望', mean: '바랄', sound: '망' }], kin: ['낙담(落膽)', '실의(失意)', '비관(悲觀)', '체념(諦念)'] },
      { ko: '평온', hanja: '平穩', gloss: '물결 없이 고요한 상태. 마음과 형편이 모두 안정된 잔잔함.', parts: [{ ch: '平', mean: '평평할', sound: '평' }, { ch: '穩', mean: '편안할', sound: '온' }], kin: ['안온(安穩)', '평정(平靜)', '고요', '정적(靜寂)'] },
      { ko: '동경', hanja: '憧憬', gloss: '멀리 있는 것을 마음으로 좇음. 닿고 싶은 이상을 향한 끌림.', parts: [{ ch: '憧', mean: '그리워할', sound: '동' }, { ch: '憬', mean: '깨달을·그리울', sound: '경' }], kin: ['동망(憧望)', '선망(羨望)', '갈망(渴望)', '연모(戀慕)'] },
      { ko: '환멸', hanja: '幻滅', gloss: '품었던 환상이 깨지는 허탈. 기대가 무너진 자리의 씁쓸함.', parts: [{ ch: '幻', mean: '헛보일', sound: '환' }, { ch: '滅', mean: '멸할', sound: '멸' }], kin: ['실망(失望)', '허무(虛無)', '낙심(落心)', '자조(自嘲)'] },
      { ko: '연민', hanja: '憐憫', gloss: '딱하게 여겨 가엾어함. 약한 이를 향한 따뜻한 안쓰러움.', parts: [{ ch: '憐', mean: '불쌍히여길', sound: '련' }, { ch: '憫', mean: '민망할·가엾을', sound: '민' }], kin: ['측은(惻隱)', '동정(同情)', '자비(慈悲)', '긍휼(矜恤)'] },
      { ko: '회한', hanja: '悔恨', gloss: '뉘우치며 한스러워함. 돌이킬 수 없는 일을 향한 쓰린 후회.', parts: [{ ch: '悔', mean: '뉘우칠', sound: '회' }, { ch: '恨', mean: '한', sound: '한' }], kin: ['후회(後悔)', '회오(悔悟)', '통한(痛恨)', '한탄(恨歎)'] },
      { ko: '환락', hanja: '歡樂', gloss: '마음껏 누리는 즐거움. 흥에 겨워 흐드러진 쾌락.', parts: [{ ch: '歡', mean: '기뻐할', sound: '환' }, { ch: '樂', mean: '즐길', sound: '락' }], kin: ['향락(享樂)', '쾌락(快樂)', '열락(悅樂)', '오락(娛樂)'] },
    ],
  },
  {
    key: 'nature', label: '자연·천체', icon: '🌄', items: [
      { ko: '강산', hanja: '江山', gloss: '강과 산. 곧 한 나라의 자연과 국토를 아우르는 말.', parts: [{ ch: '江', mean: '강', sound: '강' }, { ch: '山', mean: '산', sound: '산' }], kin: ['산천(山川)', '산하(山河)', '하천(河川)', '강호(江湖)'] },
      { ko: '풍월', hanja: '風月', gloss: '바람과 달. 자연의 아름다운 정취, 또는 그것을 읊는 멋.', parts: [{ ch: '風', mean: '바람', sound: '풍' }, { ch: '月', mean: '달', sound: '월' }], kin: ['풍류(風流)', '음풍(吟風)', '청풍(淸風)', '화조(花鳥)'] },
      { ko: '운무', hanja: '雲霧', gloss: '구름과 안개. 산을 휘감아 시야를 가리는 자욱한 기운.', parts: [{ ch: '雲', mean: '구름', sound: '운' }, { ch: '霧', mean: '안개', sound: '무' }], kin: ['운하(雲霞)', '연무(煙霧)', '운연(雲煙)', '안개'] },
      { ko: '설경', hanja: '雪景', gloss: '눈이 쌓인 경치. 온 세상을 하얗게 덮은 겨울 풍경.', parts: [{ ch: '雪', mean: '눈', sound: '설' }, { ch: '景', mean: '경치·볕', sound: '경' }], kin: ['설원(雪原)', '백설(白雪)', '한설(寒雪)', '빙설(氷雪)'] },
      { ko: '해류', hanja: '海流', gloss: '바다의 흐름. 일정한 방향으로 움직이는 거대한 물줄기.', parts: [{ ch: '海', mean: '바다', sound: '해' }, { ch: '流', mean: '흐를', sound: '류' }], kin: ['조류(潮流)', '해조(海潮)', '난류(暖流)', '한류(寒流)'] },
      { ko: '성좌', hanja: '星座', gloss: '별들의 자리. 하늘에 무리지어 모양을 이루는 별의 무리.', parts: [{ ch: '星', mean: '별', sound: '성' }, { ch: '座', mean: '자리', sound: '좌' }], kin: ['성단(星團)', '성운(星雲)', '천체(天體)', '별자리'] },
      { ko: '여명', hanja: '黎明', gloss: '동트기 직전의 어스름. 어둠이 옅어지며 빛이 스미는 새벽.', parts: [{ ch: '黎', mean: '검을·동틀', sound: '려' }, { ch: '明', mean: '밝을', sound: '명' }], kin: ['새벽', '효명(曉明)', '서광(曙光)', '동틀녘'] },
      { ko: '황혼', hanja: '黃昏', gloss: '해 질 무렵의 어스름. 누런 빛이 사위어 가는 저녁의 경계.', parts: [{ ch: '黃', mean: '누를', sound: '황' }, { ch: '昏', mean: '어두울', sound: '혼' }], kin: ['석양(夕陽)', '땅거미', '저녁놀', '모색(暮色)'] },
      { ko: '뇌우', hanja: '雷雨', gloss: '천둥을 동반한 비. 번개와 우렛소리가 함께 쏟아지는 거센 비.', parts: [{ ch: '雷', mean: '우레', sound: '뢰' }, { ch: '雨', mean: '비', sound: '우' }], kin: ['폭우(暴雨)', '소나기', '뇌성(雷聲)', '호우(豪雨)'] },
      { ko: '청천', hanja: '靑天', gloss: '맑게 갠 푸른 하늘. 구름 한 점 없는 드넓은 창공.', parts: [{ ch: '靑', mean: '푸를', sound: '청' }, { ch: '天', mean: '하늘', sound: '천' }], kin: ['창천(蒼天)', '벽공(碧空)', '천공(天空)', '쾌청(快晴)'] },
      { ko: '계곡', hanja: '溪谷', gloss: '시내가 흐르는 골짜기. 산과 산 사이로 물이 굽이치는 깊은 곳.', parts: [{ ch: '溪', mean: '시내', sound: '계' }, { ch: '谷', mean: '골', sound: '곡' }], kin: ['협곡(峽谷)', '계류(溪流)', '심곡(深谷)', '골짜기'] },
      { ko: '폭포', hanja: '瀑布', gloss: '벼랑에서 곧장 쏟아지는 물. 굉음과 물보라를 일으키는 물줄기.', parts: [{ ch: '瀑', mean: '소나기·폭포', sound: '폭' }, { ch: '布', mean: '베·펼', sound: '포' }], kin: ['비류(飛流)', '낙수(落水)', '비폭(飛瀑)', '물줄기'] },
    ],
  },
  {
    key: 'time', label: '시간·세월', icon: '⏳', items: [
      { ko: '세월', hanja: '歲月', gloss: '해와 달이 거듭되며 흐르는 시간. 사람을 늙게 하는 긴 흐름.', parts: [{ ch: '歲', mean: '해', sound: '세' }, { ch: '月', mean: '달', sound: '월' }], kin: ['연월(年月)', '광음(光陰)', '성상(星霜)', '풍상(風霜)'] },
      { ko: '순간', hanja: '瞬間', gloss: '눈 깜짝할 사이. 지나가는 줄도 모르게 짧은 한때.', parts: [{ ch: '瞬', mean: '눈깜짝일', sound: '순' }, { ch: '間', mean: '사이', sound: '간' }], kin: ['찰나(刹那)', '경각(頃刻)', '순식(瞬息)', '잠깐'] },
      { ko: '영원', hanja: '永遠', gloss: '끝없이 이어지는 길고 먼 시간. 다함이 없는 무한.', parts: [{ ch: '永', mean: '길', sound: '영' }, { ch: '遠', mean: '멀', sound: '원' }], kin: ['영겁(永劫)', '항구(恒久)', '불멸(不滅)', '천추(千秋)'] },
      { ko: '과거', hanja: '過去', gloss: '이미 지나가 버린 때. 돌아갈 수 없는 지난날.', parts: [{ ch: '過', mean: '지날', sound: '과' }, { ch: '去', mean: '갈', sound: '거' }], kin: ['지난날', '왕년(往年)', '석일(昔日)', '예전'] },
      { ko: '미래', hanja: '未來', gloss: '아직 오지 않은 때. 앞으로 펼쳐질 다가올 날.', parts: [{ ch: '未', mean: '아닐·아직', sound: '미' }, { ch: '來', mean: '올', sound: '래' }], kin: ['장래(將來)', '훗날', '앞날', '내일(來日)'] },
      { ko: '서막', hanja: '序幕', gloss: '일이 시작되는 첫머리. 막이 오르기 전의 첫 장면.', parts: [{ ch: '序', mean: '차례·실마리', sound: '서' }, { ch: '幕', mean: '장막', sound: '막' }], kin: ['발단(發端)', '시초(始初)', '벽두(劈頭)', '효시(嚆矢)'] },
      { ko: '종막', hanja: '終幕', gloss: '일이 끝나는 마지막. 모든 것이 마무리되는 마지막 장면.', parts: [{ ch: '終', mean: '마칠', sound: '종' }, { ch: '幕', mean: '장막', sound: '막' }], kin: ['종국(終局)', '대미(大尾)', '결말(結末)', '폐막(閉幕)'] },
      { ko: '계절', hanja: '季節', gloss: '한 해를 넷으로 나눈 시기. 자연이 차례로 옷을 갈아입는 주기.', parts: [{ ch: '季', mean: '철·끝', sound: '계' }, { ch: '節', mean: '마디·철', sound: '절' }], kin: ['철', '시절(時節)', '절기(節氣)', '환절(換節)'] },
      { ko: '여운', hanja: '餘韻', gloss: '소리나 일이 끝난 뒤에도 남는 울림. 가시지 않고 맴도는 정취.', parts: [{ ch: '餘', mean: '남을', sound: '여' }, { ch: '韻', mean: '운·울림', sound: '운' }], kin: ['여향(餘響)', '여정(餘情)', '잔향(殘響)', '뒷맛'] },
      { ko: '주야', hanja: '晝夜', gloss: '낮과 밤. 쉼 없이 갈마드는 하루의 두 얼굴.', parts: [{ ch: '晝', mean: '낮', sound: '주' }, { ch: '夜', mean: '밤', sound: '야' }], kin: ['밤낮', '조석(朝夕)', '일야(日夜)', '단야(旦夜)'] },
    ],
  },
  {
    key: 'person', label: '사람·관계', icon: '🧑‍🤝‍🧑', items: [
      { ko: '친구', hanja: '親舊', gloss: '오래 가깝게 사귄 사람. 격의 없이 마음을 나누는 벗.', parts: [{ ch: '親', mean: '친할', sound: '친' }, { ch: '舊', mean: '옛', sound: '구' }], kin: ['벗', '지기(知己)', '동무', '붕우(朋友)'] },
      { ko: '지기', hanja: '知己', gloss: '나를 알아주는 사람. 속을 다 터놓을 만한 깊은 벗.', parts: [{ ch: '知', mean: '알', sound: '지' }, { ch: '己', mean: '몸·자기', sound: '기' }], kin: ['지음(知音)', '심우(心友)', '막역(莫逆)', '벗'] },
      { ko: '연인', hanja: '戀人', gloss: '서로 사랑하는 사이의 사람. 마음을 주고받는 짝.', parts: [{ ch: '戀', mean: '그리워할', sound: '연' }, { ch: '人', mean: '사람', sound: '인' }], kin: ['애인(愛人)', '정인(情人)', '님', '연정(戀情)'] },
      { ko: '은인', hanja: '恩人', gloss: '큰 은혜를 베푼 사람. 잊지 못할 도움을 준 이.', parts: [{ ch: '恩', mean: '은혜', sound: '은' }, { ch: '人', mean: '사람', sound: '인' }], kin: ['시혜자(施惠者)', '구원자(救援者)', '후견(後見)', '구세주(救世主)'] },
      { ko: '적수', hanja: '敵手', gloss: '맞서 겨루는 상대. 만만치 않게 실력이 비슷한 맞상대.', parts: [{ ch: '敵', mean: '대적할·원수', sound: '적' }, { ch: '手', mean: '손', sound: '수' }], kin: ['호적수(好敵手)', '맞수', '경쟁자(競爭者)', '라이벌'] },
      { ko: '제자', hanja: '弟子', gloss: '가르침을 받는 사람. 스승의 학문이나 기예를 이어받는 이.', parts: [{ ch: '弟', mean: '아우', sound: '제' }, { ch: '子', mean: '아들·사람', sound: '자' }], kin: ['문하생(門下生)', '문도(門徒)', '후학(後學)', '제생(諸生)'] },
      { ko: '동반자', hanja: '同伴者', gloss: '길을 함께 가는 사람. 인생이나 일을 나란히 걷는 짝.', parts: [{ ch: '同', mean: '같을', sound: '동' }, { ch: '伴', mean: '짝', sound: '반' }, { ch: '者', mean: '사람', sound: '자' }], kin: ['반려(伴侶)', '길동무', '동행(同行)', '짝'] },
      { ko: '후손', hanja: '後孫', gloss: '뒤를 잇는 자손. 한 사람의 핏줄을 이어받은 뒷사람.', parts: [{ ch: '後', mean: '뒤', sound: '후' }, { ch: '孫', mean: '손자', sound: '손' }], kin: ['자손(子孫)', '후예(後裔)', '후대(後代)', '혈손(血孫)'] },
      { ko: '현인', hanja: '賢人', gloss: '어질고 슬기로운 사람. 도리에 밝아 본받을 만한 이.', parts: [{ ch: '賢', mean: '어질', sound: '현' }, { ch: '人', mean: '사람', sound: '인' }], kin: ['성현(聖賢)', '철인(哲人)', '군자(君子)', '석학(碩學)'] },
    ],
  },
  {
    key: 'mind', label: '정신·지혜', icon: '🧠', items: [
      { ko: '지혜', hanja: '智慧', gloss: '사리를 꿰뚫어 옳게 판단하는 슬기. 앎을 넘어 쓰는 명민함.', parts: [{ ch: '智', mean: '슬기', sound: '지' }, { ch: '慧', mean: '슬기로울', sound: '혜' }], kin: ['예지(叡智)', '명철(明哲)', '슬기', '총명(聰明)'] },
      { ko: '용기', hanja: '勇氣', gloss: '두려움을 무릅쓰는 굳센 기운. 물러서지 않고 나아가는 마음.', parts: [{ ch: '勇', mean: '날랠·용감할', sound: '용' }, { ch: '氣', mean: '기운', sound: '기' }], kin: ['담력(膽力)', '기개(氣槪)', '용맹(勇猛)', '배짱'] },
      { ko: '인내', hanja: '忍耐', gloss: '괴로움을 참고 견딤. 흔들리지 않고 버텨 내는 힘.', parts: [{ ch: '忍', mean: '참을', sound: '인' }, { ch: '耐', mean: '견딜', sound: '내' }], kin: ['끈기', '참을성', '인종(忍從)', '견인(堅忍)'] },
      { ko: '신념', hanja: '信念', gloss: '굳게 믿어 흔들리지 않는 생각. 옳다고 여겨 지키는 마음.', parts: [{ ch: '信', mean: '믿을', sound: '신' }, { ch: '念', mean: '생각', sound: '념' }], kin: ['확신(確信)', '소신(所信)', '신조(信條)', '믿음'] },
      { ko: '각성', hanja: '覺醒', gloss: '깨어 정신을 차림. 잠들었던 의식이 분명해지는 일.', parts: [{ ch: '覺', mean: '깨달을', sound: '각' }, { ch: '醒', mean: '깰', sound: '성' }], kin: ['자각(自覺)', '깨달음', '개안(開眼)', '득오(得悟)'] },
      { ko: '명상', hanja: '冥想', gloss: '눈을 감고 깊이 생각함. 고요 속에서 마음을 들여다보는 일.', parts: [{ ch: '冥', mean: '어두울·그윽할', sound: '명' }, { ch: '想', mean: '생각', sound: '상' }], kin: ['묵상(默想)', '관조(觀照)', '사색(思索)', '정관(靜觀)'] },
      { ko: '통찰', hanja: '洞察', gloss: '속까지 환히 꿰뚫어 봄. 겉을 넘어 본질을 알아채는 눈.', parts: [{ ch: '洞', mean: '꿰뚫을·골', sound: '통' }, { ch: '察', mean: '살필', sound: '찰' }], kin: ['통견(洞見)', '혜안(慧眼)', '직관(直觀)', '안목(眼目)'] },
      { ko: '집념', hanja: '執念', gloss: '한 가지에 매달리는 끈질긴 마음. 놓지 않고 파고드는 생각.', parts: [{ ch: '執', mean: '잡을', sound: '집' }, { ch: '念', mean: '생각', sound: '념' }], kin: ['집착(執着)', '몰두(沒頭)', '일념(一念)', '오기(傲氣)'] },
      { ko: '영감', hanja: '靈感', gloss: '문득 떠오르는 창조의 불꽃. 머릿속을 번뜩 밝히는 착상.', parts: [{ ch: '靈', mean: '신령', sound: '령' }, { ch: '感', mean: '느낄', sound: '감' }], kin: ['착상(着想)', '발상(發想)', '계시(啓示)', '직감(直感)'] },
      { ko: '회의', hanja: '懷疑', gloss: '의심을 품음. 당연하던 것을 다시 물어보는 마음.', parts: [{ ch: '懷', mean: '품을', sound: '회' }, { ch: '疑', mean: '의심할', sound: '의' }], kin: ['의구(疑懼)', '의혹(疑惑)', '불신(不信)', '의문(疑問)'] },
    ],
  },
  {
    key: 'society', label: '사회·세상', icon: '🏛️', items: [
      { ko: '운명', hanja: '運命', gloss: '사람이 어쩌지 못하게 정해진 흐름. 삶을 이끄는 보이지 않는 힘.', parts: [{ ch: '運', mean: '돌·옮길', sound: '운' }, { ch: '命', mean: '목숨·명할', sound: '명' }], kin: ['숙명(宿命)', '천명(天命)', '명운(命運)', '팔자'] },
      { ko: '혁명', hanja: '革命', gloss: '낡은 질서를 뒤엎는 큰 변혁. 가죽을 갈듯 근본을 바꾸는 일.', parts: [{ ch: '革', mean: '가죽·고칠', sound: '혁' }, { ch: '命', mean: '목숨·명할', sound: '명' }], kin: ['변혁(變革)', '개벽(開闢)', '쿠데타', '거사(擧事)'] },
      { ko: '질서', hanja: '秩序', gloss: '제자리에 맞게 짜인 차례. 흐트러지지 않게 잡힌 틀.', parts: [{ ch: '秩', mean: '차례', sound: '질' }, { ch: '序', mean: '차례', sound: '서' }], kin: ['체계(體系)', '규율(規律)', '기강(紀綱)', '정연(整然)'] },
      { ko: '권력', hanja: '權力', gloss: '남을 따르게 만드는 힘. 일을 좌우하는 강한 영향력.', parts: [{ ch: '權', mean: '권세', sound: '권' }, { ch: '力', mean: '힘', sound: '력' }], kin: ['세력(勢力)', '권세(權勢)', '위세(威勢)', '패권(覇權)'] },
      { ko: '정의', hanja: '正義', gloss: '바르고 마땅한 도리. 어느 쪽으로도 기울지 않는 옳음.', parts: [{ ch: '正', mean: '바를', sound: '정' }, { ch: '義', mean: '옳을', sound: '의' }], kin: ['공의(公義)', '의리(義理)', '대의(大義)', '공정(公正)'] },
      { ko: '자유', hanja: '自由', gloss: '얽매임 없이 스스로 정함. 누구의 강요도 받지 않는 상태.', parts: [{ ch: '自', mean: '스스로', sound: '자' }, { ch: '由', mean: '말미암을', sound: '유' }], kin: ['해방(解放)', '방임(放任)', '자재(自在)', '자율(自律)'] },
      { ko: '평화', hanja: '平和', gloss: '다툼 없이 고른 어울림. 전쟁도 갈등도 가라앉은 상태.', parts: [{ ch: '平', mean: '평평할', sound: '평' }, { ch: '和', mean: '화할', sound: '화' }], kin: ['화평(和平)', '안녕(安寧)', '태평(太平)', '화목(和睦)'] },
      { ko: '번영', hanja: '繁榮', gloss: '무성하게 잘됨. 살림과 세상이 한껏 융성한 상태.', parts: [{ ch: '繁', mean: '많을·번성할', sound: '번' }, { ch: '榮', mean: '영화·빛날', sound: '영' }], kin: ['융성(隆盛)', '번성(繁盛)', '창성(昌盛)', '부흥(復興)'] },
      { ko: '쇠퇴', hanja: '衰退', gloss: '기세가 꺾여 물러남. 한껏 성하던 것이 시들어 가는 일.', parts: [{ ch: '衰', mean: '쇠할', sound: '쇠' }, { ch: '退', mean: '물러날', sound: '퇴' }], kin: ['몰락(沒落)', '퇴락(頹落)', '쇠락(衰落)', '쇠망(衰亡)'] },
    ],
  },
  {
    key: 'art', label: '예술·미감', icon: '🎨', items: [
      { ko: '풍류', hanja: '風流', gloss: '멋을 알고 즐기는 운치. 자연과 예술을 누리는 격조 있는 흥취.', parts: [{ ch: '風', mean: '바람', sound: '풍' }, { ch: '流', mean: '흐를', sound: '류' }], kin: ['운치(韻致)', '풍치(風致)', '아취(雅趣)', '멋'] },
      { ko: '여백', hanja: '餘白', gloss: '채우지 않고 비워 둔 자리. 그림과 글에서 숨 쉬게 하는 빈 공간.', parts: [{ ch: '餘', mean: '남을', sound: '여' }, { ch: '白', mean: '흰·빌', sound: '백' }], kin: ['공백(空白)', '빈 자리', '여지(餘地)', '틈'] },
      { ko: '선율', hanja: '旋律', gloss: '높낮이가 이어져 흐르는 가락. 곡의 줄기가 되는 노랫결.', parts: [{ ch: '旋', mean: '돌·돌이킬', sound: '선' }, { ch: '律', mean: '가락·법', sound: '률' }], kin: ['가락', '멜로디', '곡조(曲調)', '음률(音律)'] },
      { ko: '운율', hanja: '韻律', gloss: '소리의 가락과 마디. 시와 노래에 흐르는 리듬과 울림.', parts: [{ ch: '韻', mean: '운·울림', sound: '운' }, { ch: '律', mean: '가락·법', sound: '률' }], kin: ['율격(律格)', '리듬', '음보(音步)', '운(韻)'] },
      { ko: '묘사', hanja: '描寫', gloss: '대상을 그려 내듯 적음. 보이는 그대로 또렷이 풀어 쓰는 일.', parts: [{ ch: '描', mean: '그릴', sound: '묘' }, { ch: '寫', mean: '베낄·그릴', sound: '사' }], kin: ['묘출(描出)', '서술(敍述)', '재현(再現)', '그려냄'] },
      { ko: '서정', hanja: '抒情', gloss: '마음속 정감을 풀어냄. 느낌을 잔잔히 노래로 펼치는 일.', parts: [{ ch: '抒', mean: '풀·펼', sound: '서' }, { ch: '情', mean: '뜻·정', sound: '정' }], kin: ['서경(敍景)', '정취(情趣)', '감성(感性)', '리리시즘'] },
      { ko: '걸작', hanja: '傑作', gloss: '뛰어나게 잘된 작품. 두고두고 회자되는 빼어난 솜씨.', parts: [{ ch: '傑', mean: '뛰어날', sound: '걸' }, { ch: '作', mean: '지을', sound: '작' }], kin: ['명작(名作)', '수작(秀作)', '역작(力作)', '대작(大作)'] },
      { ko: '미학', hanja: '美學', gloss: '아름다움을 따지는 학문이자 안목. 무엇을 곱다고 여기는가의 결.', parts: [{ ch: '美', mean: '아름다울', sound: '미' }, { ch: '學', mean: '배울', sound: '학' }], kin: ['심미(審美)', '미감(美感)', '미의식(美意識)', '안목(眼目)'] },
      { ko: '여흥', hanja: '餘興', gloss: '본 행사가 끝난 뒤 이어 즐기는 흥. 남은 흥을 푸는 한때.', parts: [{ ch: '餘', mean: '남을', sound: '여' }, { ch: '興', mean: '일·흥', sound: '흥' }], kin: ['뒤풀이', '오락(娛樂)', '여운(餘韻)', '흥취(興趣)'] },
    ],
  },
]

// ===================== 2) 부수·의미 요소 사전 =====================
const RAD_CATS: RadicalCat[] = [
  {
    key: 'human', label: '사람·몸', icon: '🧍', items: [
      { rad: '人(亻)', sound: '인', mean: '사람', note: '사람과 관련된 글자에 두루 붙는다. 행위·신분·관계를 나타내는 글자의 뼈대.', samples: ['仁(어질 인)', '休(쉴 휴)', '信(믿을 신)', '伴(짝 반)'] },
      { rad: '口', sound: '구', mean: '입', note: '입·말·먹기·소리와 관련. 말하고 부르고 삼키는 일을 담는다.', samples: ['味(맛 미)', '呼(부를 호)', '吟(읊을 음)', '和(화할 화)'] },
      { rad: '心(忄)', sound: '심', mean: '마음', note: '감정과 생각을 담는 으뜸 요소. 변형 忄은 글자 왼쪽에 선다.', samples: ['情(정 정)', '愛(사랑 애)', '忍(참을 인)', '愁(근심 수)'] },
      { rad: '手(扌)', sound: '수', mean: '손', note: '손으로 하는 동작 전반. 잡고 밀고 그리는 행위에 붙는다.', samples: ['持(가질 지)', '描(그릴 묘)', '抒(펼 서)', '握(쥘 악)'] },
      { rad: '目', sound: '목', mean: '눈', note: '보는 일과 관련. 살피고 바라보는 시선의 글자.', samples: ['看(볼 간)', '眠(잘 면)', '瞬(눈깜짝일 순)', '睡(졸 수)'] },
      { rad: '足', sound: '족', mean: '발', note: '발과 걷기·뛰기에 붙는다. 디딤과 이동의 동작.', samples: ['路(길 로)', '跡(자취 적)', '踏(밟을 답)', '躍(뛸 약)'] },
      { rad: '言', sound: '언', mean: '말씀', note: '말·글·약속과 관련. 입으로 이루는 모든 표현의 요소.', samples: ['語(말씀 어)', '說(말씀 설)', '誓(맹세할 서)', '謠(노래 요)'] },
    ],
  },
  {
    key: 'nature', label: '자연·물질', icon: '🌿', items: [
      { rad: '水(氵)', sound: '수', mean: '물', note: '물·강·바다·액체와 관련. 변형 氵(삼수변)으로 가장 흔히 나타난다.', samples: ['江(강 강)', '海(바다 해)', '流(흐를 류)', '泉(샘 천)'] },
      { rad: '火(灬)', sound: '화', mean: '불', note: '불·열·빛과 관련. 아래에 깔리면 灬(연화발) 모양이 된다.', samples: ['炎(불꽃 염)', '燈(등 등)', '熱(더울 열)', '照(비칠 조)'] },
      { rad: '木', sound: '목', mean: '나무', note: '나무·목재·식물과 관련. 숲과 가구, 자라는 것의 요소.', samples: ['林(수풀 림)', '松(소나무 송)', '根(뿌리 근)', '果(열매 과)'] },
      { rad: '土', sound: '토', mean: '흙', note: '흙·땅·쌓는 일과 관련. 자리와 터를 이루는 요소.', samples: ['地(땅 지)', '城(재·성 성)', '坐(앉을 좌)', '塊(덩이 괴)'] },
      { rad: '金', sound: '금', mean: '쇠', note: '금속·돈·날붙이와 관련. 단단하고 빛나는 광물의 요소.', samples: ['銀(은 은)', '鐵(쇠 철)', '鋒(칼끝 봉)', '錢(돈 전)'] },
      { rad: '石', sound: '석', mean: '돌', note: '돌·바위·광물과 관련. 단단하고 무거운 것의 요소.', samples: ['硏(갈 연)', '磁(자석 자)', '碑(비석 비)', '礎(주춧돌 초)'] },
      { rad: '艸(艹)', sound: '초', mean: '풀', note: '풀·꽃·나물 등 초목과 관련. 머리에 艹(초두머리)로 올라앉는다.', samples: ['花(꽃 화)', '草(풀 초)', '芽(싹 아)', '苦(쓸 고)'] },
      { rad: '雨', sound: '우', mean: '비', note: '비·눈·구름 등 날씨와 관련. 하늘에서 내리는 것의 요소.', samples: ['雪(눈 설)', '雲(구름 운)', '雷(우레 뢰)', '霜(서리 상)'] },
      { rad: '日', sound: '일', mean: '날·해', note: '해·빛·때와 관련. 밝음과 시간을 함께 담는다.', samples: ['明(밝을 명)', '昏(어두울 혼)', '晝(낮 주)', '景(볕 경)'] },
      { rad: '月', sound: '월', mean: '달', note: '달·세월, 또 몸(肉의 변형)과 관련. 차고 기우는 시간의 요소.', samples: ['朗(밝을 랑)', '望(바랄 망)', '朝(아침 조)', '期(기약할 기)'] },
    ],
  },
  {
    key: 'thing', label: '사물·도구', icon: '🛠️', items: [
      { rad: '糸', sound: '멱·사', mean: '실', note: '실·끈·천·맺음과 관련. 잇고 묶고 짜는 일의 요소.', samples: ['線(줄 선)', '結(맺을 결)', '緣(인연 연)', '紋(무늬 문)'] },
      { rad: '刀(刂)', sound: '도', mean: '칼', note: '칼·자르기·날카로움과 관련. 오른쪽에서 刂(선칼도)로 선다.', samples: ['分(나눌 분)', '初(처음 초)', '利(이로울 리)', '判(판단할 판)'] },
      { rad: '門', sound: '문', mean: '문', note: '문·드나듦·집과 관련. 열고 닫는 경계의 요소.', samples: ['開(열 개)', '閉(닫을 폐)', '間(사이 간)', '關(빗장 관)'] },
      { rad: '車', sound: '거·차', mean: '수레', note: '수레·바퀴·운반과 관련. 굴러 옮기는 것의 요소.', samples: ['軍(군사 군)', '輪(바퀴 륜)', '轉(구를 전)', '輝(빛날 휘)'] },
      { rad: '舟', sound: '주', mean: '배', note: '배·물 위 이동과 관련. 강과 바다를 건너는 도구의 요소.', samples: ['船(배 선)', '航(건널 항)', '般(돌·일반 반)', '艦(큰배 함)'] },
      { rad: '玉(王)', sound: '옥', mean: '구슬', note: '옥·보석·아름다운 것과 관련. 王 모양으로 왼쪽에 붙는다.', samples: ['珍(보배 진)', '珠(구슬 주)', '理(다스릴 리)', '瑞(상서로울 서)'] },
    ],
  },
  {
    key: 'abstract', label: '움직임·추상', icon: '🔁', items: [
      { rad: '辶(辵)', sound: '착', mean: '쉬엄쉬엄갈', note: '길·걷기·옮겨감과 관련. 走와 달리 천천히 나아가는 이동.', samples: ['道(길 도)', '通(통할 통)', '遠(멀 원)', '逢(만날 봉)'] },
      { rad: '彳', sound: '척', mean: '조금걸을', note: '걸음·행동·길과 관련. 왼쪽에 서서 ‘다님’의 뜻을 더한다.', samples: ['行(다닐 행)', '往(갈 왕)', '徑(지름길 경)', '從(좇을 종)'] },
      { rad: '攴(攵)', sound: '복', mean: '칠', note: '치고 다그쳐 ‘~하게 함’의 사역·행위를 더한다. 오른쪽 攵으로 흔하다.', samples: ['敎(가르칠 교)', '改(고칠 개)', '故(연고 고)', '敬(공경할 경)'] },
      { rad: '宀', sound: '면', mean: '집', note: '집·지붕 아래의 일과 관련. 머리에 얹혀 ‘덮인 공간’을 뜻한다.', samples: ['安(편안 안)', '家(집 가)', '宿(잘 숙)', '守(지킬 수)'] },
      { rad: '示(礻)', sound: '시', mean: '보일·제사', note: '신·제사·복과 관련. 하늘이 길흉을 ‘보인다’는 데서 비롯한다.', samples: ['神(귀신 신)', '福(복 복)', '禮(예도 례)', '祝(빌 축)'] },
      { rad: '力', sound: '력', mean: '힘', note: '힘·노력·움직임과 관련. 들이는 기운과 작용의 요소.', samples: ['動(움직일 동)', '勇(날랠 용)', '助(도울 조)', '勝(이길 승)'] },
    ],
  },
]

// ---------- 평탄화 헬퍼 ----------
const flatWords = (): { cat: WordCat; w: Word }[] =>
  WORD_CATS.flatMap((c) => c.items.map((w) => ({ cat: c, w })))
const flatRads = (): { cat: RadicalCat; r: Radical }[] =>
  RAD_CATS.flatMap((c) => c.items.map((r) => ({ cat: c, r })))

const LS = 'sry:tool:etymology-explorer:'
const ALL = '__all__'

export default function EtymologyExplorer({ payload }: { payload?: Record<string, unknown> }) {
  // 모드: words(한자어 분해) / rads(부수·의미 요소)
  const [mode, setMode] = useState<'words' | 'rads'>(() => {
    try { const r = localStorage.getItem(LS + 'mode'); if (r === 'words' || r === 'rads') return r } catch { /* ignore */ }
    return 'words'
  })
  const [query, setQuery] = useState<string>(() => {
    const p = payload && typeof payload.query === 'string' ? (payload.query as string) : ''
    return p
  })
  const [wcat, setWcat] = useState<string>(() => {
    try { const r = localStorage.getItem(LS + 'wcat'); if (r && (r === ALL || WORD_CATS.some((c) => c.key === r))) return r } catch { /* ignore */ }
    return ALL
  })
  const [rcat, setRcat] = useState<string>(() => {
    try { const r = localStorage.getItem(LS + 'rcat'); if (r && (r === ALL || RAD_CATS.some((c) => c.key === r))) return r } catch { /* ignore */ }
    return ALL
  })
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try { const r = localStorage.getItem(LS + 'favs'); if (r) { const o = JSON.parse(r); if (o && typeof o === 'object') return o as Record<string, boolean> } } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [randomW, setRandomW] = useState<{ cat: WordCat; w: Word } | null>(null)
  const [randomR, setRandomR] = useState<{ cat: RadicalCat; r: Radical } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  // 카테고리 펼침/접기(전체 보기일 때 그룹 헤더)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toastTimer = useRef<number | null>(null)
  const copyTimer = useRef<number | null>(null)

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'mode', mode) } catch { /* ignore */ } }, [mode])
  useEffect(() => { try { localStorage.setItem(LS + 'wcat', wcat) } catch { /* ignore */ } }, [wcat])
  useEffect(() => { try { localStorage.setItem(LS + 'rcat', rcat) } catch { /* ignore */ } }, [rcat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 언마운트 정리: 토스트/복사 타이머 비움 + 진행 중 타이머 클리어
  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
    }
  }, [])

  const totalW = useMemo(() => WORD_CATS.reduce((n, c) => n + c.items.length, 0), [])
  const totalR = useMemo(() => RAD_CATS.reduce((n, c) => n + c.items.length, 0), [])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2400)
  }, [])

  const copy = useCallback((text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(id)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }, [])

  // ----- 필터 -----
  const filteredWords = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = wcat === ALL ? flatWords() : WORD_CATS.filter((c) => c.key === wcat).flatMap((c) => c.items.map((w) => ({ cat: c, w })))
    if (onlyFav) base = base.filter(({ w }) => favs['w::' + w.ko])
    if (q) {
      base = base.filter(({ w }) =>
        w.ko.toLowerCase().includes(q) ||
        w.hanja.toLowerCase().includes(q) ||
        w.gloss.toLowerCase().includes(q) ||
        w.parts.some((p) => p.ch.includes(q) || p.mean.toLowerCase().includes(q) || p.sound.includes(q)) ||
        (w.kin || []).some((k) => k.toLowerCase().includes(q)))
    }
    return base
  }, [query, wcat, onlyFav, favs])

  const filteredRads = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = rcat === ALL ? flatRads() : RAD_CATS.filter((c) => c.key === rcat).flatMap((c) => c.items.map((r) => ({ cat: c, r })))
    if (onlyFav) base = base.filter(({ r }) => favs['r::' + r.rad])
    if (q) {
      base = base.filter(({ r }) =>
        r.rad.includes(q) || r.sound.includes(q) || r.mean.toLowerCase().includes(q) ||
        r.note.toLowerCase().includes(q) || r.samples.some((s) => s.includes(q)))
    }
    return base
  }, [query, rcat, onlyFav, favs])

  // 전체 보기일 때 카테고리별 그룹핑
  const groupedWords = useMemo(() => {
    const m = new Map<string, { cat: WordCat; items: Word[] }>()
    for (const { cat, w } of filteredWords) {
      if (!m.has(cat.key)) m.set(cat.key, { cat, items: [] })
      m.get(cat.key)!.items.push(w)
    }
    return Array.from(m.values())
  }, [filteredWords])
  const groupedRads = useMemo(() => {
    const m = new Map<string, { cat: RadicalCat; items: Radical[] }>()
    for (const { cat, r } of filteredRads) {
      if (!m.has(cat.key)) m.set(cat.key, { cat, items: [] })
      m.get(cat.key)!.items.push(r)
    }
    return Array.from(m.values())
  }, [filteredRads])

  // ----- 무작위 -----
  const rollWord = useCallback(() => {
    const pool = wcat === ALL ? flatWords() : WORD_CATS.filter((c) => c.key === wcat).flatMap((c) => c.items.map((w) => ({ cat: c, w })))
    if (!pool.length) { setRandomW(null); return }
    setRandomW((prev) => {
      let p = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && p.w.ko === prev.w.ko) p = pool[Math.floor(Math.random() * pool.length)]
      return p
    })
  }, [wcat])
  const rollRad = useCallback(() => {
    const pool = rcat === ALL ? flatRads() : RAD_CATS.filter((c) => c.key === rcat).flatMap((c) => c.items.map((r) => ({ cat: c, r })))
    if (!pool.length) { setRandomR(null); return }
    setRandomR((prev) => {
      let p = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && p.r.rad === prev.r.rad) p = pool[Math.floor(Math.random() * pool.length)]
      return p
    })
  }, [rcat])

  // ----- 즐겨찾기 -----
  const toggleFav = (key: string) => setFavs((prev) => {
    const n = { ...prev }
    if (n[key]) delete n[key]; else n[key] = true
    return n
  })

  // ----- 텍스트 직렬화(복사·연계용) -----
  const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const wordText = (w: Word) => {
    const parts = w.parts.map((p) => `${p.ch}(${p.mean} ${p.sound})`).join(' + ')
    const kin = w.kin && w.kin.length ? `\n계열어: ${w.kin.join(', ')}` : ''
    return `${w.ko} ${w.hanja}\n뜻: ${w.gloss}\n분해: ${parts}${kin}`
  }
  const radText = (r: Radical) =>
    `${r.rad} (${r.mean} ${r.sound})\n${r.note}\n예: ${r.samples.join(', ')}`

  // ----- 연계: 수집함 -----
  const stashWord = (w: Word) => {
    if (!hasStash()) return
    addToStash({ kind: 'note', label: `${w.ko} (${w.hanja})`, text: wordText(w) })
    showToast(`수집함에 ‘${w.ko}’ 분해 메모를 담았습니다.`)
  }
  const stashRad = (r: Radical) => {
    if (!hasStash()) return
    addToStash({ kind: 'note', label: `부수 ${r.rad}`, text: radText(r) })
    showToast(`수집함에 부수 ‘${r.rad}’ 메모를 담았습니다.`)
  }

  // ----- 연계: 프로젝트에 추가 -----
  const projectWord = (w: Word) => {
    if (!hasProjectBridge()) return
    const partsHtml = w.parts.map((p) => `<li><b>${escapeHtml(p.ch)}</b> — ${escapeHtml(p.mean)} (${escapeHtml(p.sound)})</li>`).join('')
    const kinHtml = w.kin && w.kin.length ? `<p><b>계열어</b>: ${escapeHtml(w.kin.join(', '))}</p>` : ''
    const bodyHtml = [
      `<p><b>${escapeHtml(w.ko)} · ${escapeHtml(w.hanja)}</b></p>`,
      `<p>${escapeHtml(w.gloss)}</p>`,
      `<p><b>한자 분해</b></p><ul>${partsHtml}</ul>`,
      kinHtml,
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '어휘', title: `${w.ko} (${w.hanja})`, bodyHtml })
    if (id) showToast(`프로젝트 자료 〈어휘〉에 ‘${w.ko}’를 추가했습니다.`)
  }

  // ----- 연계: 스니펫 라이브러리 저장 -----
  const snippetWord = (w: Word) => {
    addToLibrary('snippets', { text: wordText(w), tags: ['어원', '한자', w.ko] })
    showToast(`스니펫으로 ‘${w.ko}’ 분해를 저장했습니다.`)
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const chip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px 8px', fontSize: 13 }

  // ---------- 렌더: 한자어 카드 ----------
  const renderWordCard = (cat: WordCat, w: Word) => {
    const fk = 'w::' + w.ko
    const isFav = !!favs[fk]
    const cid = 'wcopy::' + w.ko
    return (
      <div key={w.ko} style={card}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={cat.icon} /> {cat.label}</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{w.ko}</span>
          <span style={{ fontSize: 14, color: 'var(--accent)' }}>{w.hanja}</span>
          <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(fk)} style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>{isFav ? '★' : '☆'}</button>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0 8px' }}>{w.gloss}</div>
        {/* 한자 분해 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {w.parts.map((p, i) => (
            <span key={p.ch + i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <span style={{ color: 'var(--muted)' }}>+</span>}
              <button
                className="minibtn"
                title={`${p.ch} 같은 글자가 든 낱말 검색`}
                onClick={() => { setMode('words'); setWcat(ALL); setQuery(p.ch) }}
                style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2, padding: '4px 8px' }}
              >
                <span style={{ fontSize: 17, fontWeight: 700 }}>{p.ch}</span>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>{p.mean} {p.sound}</span>
              </button>
            </span>
          ))}
        </div>
        {/* 계열어 */}
        {w.kin && w.kin.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>계열어</span>
            {w.kin.map((k) => (
              <button key={k} className="minibtn" style={{ fontSize: 12, padding: '2px 7px' }} title={`‘${k}’ 복사`} onClick={() => copy(k, 'kin::' + w.ko + '::' + k)}>
                {copied === ('kin::' + w.ko + '::' + k) ? '✓' : k}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
          <button className="minibtn" onClick={() => copy(wordText(w), cid)}>{copied === cid ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}</button>
          <button className="linkbtn" onClick={() => stashWord(w)} disabled={!hasStash()} title={hasStash() ? '분해 메모를 수집함에 담기' : '수집함을 사용할 수 없습니다'}><Emoji e="📎" /> 수집함</button>
          <button className="linkbtn" onClick={() => projectWord(w)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈어휘〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
          <button className="linkbtn" onClick={() => snippetWord(w)} title="스니펫 라이브러리에 저장"><Emoji e="✂️" /> 스니펫</button>
        </div>
      </div>
    )
  }

  // ---------- 렌더: 부수 카드 ----------
  const renderRadCard = (cat: RadicalCat, r: Radical) => {
    const fk = 'r::' + r.rad
    const isFav = !!favs[fk]
    const cid = 'rcopy::' + r.rad
    return (
      <div key={r.rad} style={card}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={cat.icon} /> {cat.label}</span>
          <span style={{ fontSize: 18, fontWeight: 700 }}>{r.rad}</span>
          <span style={{ fontSize: 13, color: 'var(--accent)' }}>{r.mean} · {r.sound}</span>
          <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(fk)} style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>{isFav ? '★' : '☆'}</button>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0 8px' }}>{r.note}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>이 요소가 든 글자</span>
          {r.samples.map((s) => (
            <span key={s} style={chip}>{s}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
          <button className="minibtn" onClick={() => copy(radText(r), cid)}>{copied === cid ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}</button>
          <button className="linkbtn" onClick={() => stashRad(r)} disabled={!hasStash()} title={hasStash() ? '부수 메모를 수집함에 담기' : '수집함을 사용할 수 없습니다'}><Emoji e="📎" /> 수집함</button>
        </div>
      </div>
    )
  }

  const cats = mode === 'words' ? WORD_CATS : RAD_CATS
  const activeCat = mode === 'words' ? wcat : rcat
  const setActiveCat = mode === 'words' ? setWcat : setRcat
  const filteredCount = mode === 'words' ? filteredWords.length : filteredRads.length

  return (
    <div style={wrap}>
      <div style={hint}>
        한자어를 <b>구성 한자(뜻·음)</b>로 쪼개고, 의미 요소(부수)·유의 계열어를 함께 봅니다. 작명·조어·어휘 감각에 활용하세요.
        지금 <b>한자어 {totalW}개</b>, <b>부수·의미 요소 {totalR}개</b>를 담았습니다.
      </div>

      {/* 모드 전환 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setMode('words')} aria-pressed={mode === 'words'} style={{ borderColor: mode === 'words' ? 'var(--accent)' : 'var(--border)', color: mode === 'words' ? 'var(--text)' : 'var(--muted)' }}><Emoji e="🔤" /> 한자어 분해</button>
        <button className="minibtn" onClick={() => setMode('rads')} aria-pressed={mode === 'rads'} style={{ borderColor: mode === 'rads' ? 'var(--accent)' : 'var(--border)', color: mode === 'rads' ? 'var(--text)' : 'var(--muted)' }}><Emoji e="🧩" /> 부수·의미 요소</button>
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={mode === 'words' ? '한글·한자·뜻·계열어로 검색 (예: 사랑, 愛, 그리워, 永)' : '부수·음·뜻으로 검색 (예: 물, 水, 마음)'}
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setActiveCat(ALL)} aria-pressed={activeCat === ALL} style={{ borderColor: activeCat === ALL ? 'var(--accent)' : 'var(--border)', color: activeCat === ALL ? 'var(--text)' : 'var(--muted)' }}><Emoji e="✨" /> 전체</button>
        {cats.map((c) => {
          const on = activeCat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setActiveCat(c.key)} aria-pressed={on} style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}><Emoji e={c.icon} /> {c.label}</button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={mode === 'words' ? rollWord : rollRad} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 뽑기</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav} style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>{onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}</button>
        {/* 연계: 관련 도구(이름 믹서) 열기 */}
        <button className="linkbtn" onClick={() => openToolLinked('name-mixer')} title="작명 도구 ‘이름 믹서’ 열기"><Emoji e="🔗" /> 이름 믹서 열기</button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filteredCount}개 표시</span>
      </div>

      {/* 무작위 결과 */}
      {mode === 'words' && randomW && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={randomW.cat.icon} /> {randomW.cat.label}</span>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{randomW.w.ko}</span>
            <span style={{ fontSize: 15, color: 'var(--accent)' }}>{randomW.w.hanja}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandomW(null)}>✕</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>{randomW.w.gloss}</div>
          <div style={{ marginTop: 8 }}>{renderWordCard(randomW.cat, randomW.w)}</div>
        </div>
      )}
      {mode === 'rads' && randomR && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={randomR.cat.icon} /> {randomR.cat.label}</span>
            <span style={{ fontSize: 20, fontWeight: 700 }}>{randomR.r.rad}</span>
            <span style={{ fontSize: 14, color: 'var(--accent)' }}>{randomR.r.mean} · {randomR.r.sound}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandomR(null)}>✕</button>
          </div>
          <div style={{ marginTop: 8 }}>{renderRadCard(randomR.cat, randomR.r)}</div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--ok, var(--accent))', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>✓ {toast}</div>
      )}

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filteredCount === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 항목이 없습니다. 카드의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : activeCat === ALL ? (
          // 전체 보기: 카테고리 그룹 펼침/접기
          mode === 'words'
            ? groupedWords.map(({ cat, items }) => {
                const isCol = !!collapsed[mode + '::' + cat.key]
                return (
                  <div key={cat.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button className="minibtn" onClick={() => setCollapsed((p) => ({ ...p, [mode + '::' + cat.key]: !isCol }))} style={{ justifyContent: 'flex-start', fontWeight: 600 }}>
                      {isCol ? '▶' : '▼'} {cat.icon} {cat.label} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({items.length})</span>
                    </button>
                    {!isCol && items.map((w) => renderWordCard(cat, w))}
                  </div>
                )
              })
            : groupedRads.map(({ cat, items }) => {
                const isCol = !!collapsed[mode + '::' + cat.key]
                return (
                  <div key={cat.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button className="minibtn" onClick={() => setCollapsed((p) => ({ ...p, [mode + '::' + cat.key]: !isCol }))} style={{ justifyContent: 'flex-start', fontWeight: 600 }}>
                      {isCol ? '▶' : '▼'} {cat.icon} {cat.label} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({items.length})</span>
                    </button>
                    {!isCol && items.map((r) => renderRadCard(cat, r))}
                  </div>
                )
              })
        ) : (
          // 단일 카테고리: 평탄 목록
          mode === 'words'
            ? filteredWords.map(({ cat, w }) => renderWordCard(cat, w))
            : filteredRads.map(({ cat, r }) => renderRadCard(cat, r))
        )}
      </div>

      <div style={hint}>한자를 누르면 같은 글자가 든 낱말을 모아 봅니다. 계열어를 조합해 인물 이름·지명·기술명을 지어 보세요.</div>
    </div>
  )
}
