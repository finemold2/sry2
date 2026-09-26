// 한국어 의성어·의태어 사전 — 소리(의성어)·모양/움직임(의태어)·감정·동작·자연 등 카테고리별로
// 풍부하게 모은 로컬 대량 사전. 각 표제어에 어감·강도 변형(작은말/큰말)과 짝말, 쓰임 풀이, 예문을 붙였다.
// 자급식: 외부 네트워크·미디어·라이브러리 없음. react + './linkbus' 만 import.
// 모든 표현·풀이·예문은 직접 작성한 자작 데이터(백과 베끼기 금지). 제어문자 없음(일반 문자만).
// localStorage(펼친 카테고리·종류·즐겨찾기·필터) 영속, Math.random 무작위, 클립보드 복사, 언마운트 타이머 정리.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToStash, addToLibrary, addToProject, hasProjectBridge, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'onomatopoeia-ref', name: '의성어·의태어 사전', icon: '🔔', group: '언어·어휘', intro: '쿵·철썩·반짝·흐물… 소리와 모양을 그리는 한국어 흉내말을 작은말/큰말 어감 변형과 예문으로 풍부하게', w: 680, h: 680 }

// ---------- 데이터 모델 ----------
// type: 의성어(소리 흉내) / 의태어(모양·움직임 흉내) / 의성의태(둘 다)
type WordType = 'onoma' | 'mimetic' | 'both'
interface Variant {
  form: string      // 변형된 흉내말
  feel: string      // 작은말/큰말/된소리/거센소리 등 어감 라벨
}
interface Entry {
  word: string      // 표제 흉내말
  type: WordType
  gloss: string     // 무엇을 흉내내는지(짧은 뜻)
  note?: string     // 어감·쓰임 풀이
  example?: string  // 예문(자작)
  variants?: Variant[]  // 강도/어감 변형(작은말↔큰말 등)
}
interface CatDef {
  key: string
  label: string
  icon: string
  blurb: string     // 카테고리 한 줄 설명
  entries: Entry[]
}

// ---------- 자작 의성어·의태어 사전(카테고리 10 × 항목 다수) ----------
const CATS: CatDef[] = [
  {
    key: 'impact', label: '충돌·타격 소리', icon: '💥',
    blurb: '부딪치고 두드리고 터지는 소리. 무게와 단단함에 따라 모음·받침이 바뀐다.',
    entries: [
      { word: '쿵', type: 'onoma', gloss: '무겁고 큰 것이 떨어지거나 부딪는 소리', note: '바닥을 울리는 묵직한 한 방.', example: '문이 쿵 닫혔다.', variants: [{ form: '콩', feel: '작은말(가볍게)' }, { form: '쾅', feel: '거센말(더 세게)' }, { form: '쿵쾅', feel: '연달아 울리는 소리' }] },
      { word: '쾅', type: 'onoma', gloss: '문·물건이 세게 부딪쳐 울리는 소리', note: '쿵보다 날카롭고 폭발적.', example: '대문을 쾅 차고 들어왔다.', variants: [{ form: '꽝', feel: '터지듯 더 큰말' }, { form: '쾅쾅', feel: '거듭 두드림' }] },
      { word: '탁', type: 'onoma', gloss: '가볍고 단단한 것이 부딪는 소리', note: '책상·탁자에 짧게 내려놓을 때.', example: '잔을 탁 내려놨다.', variants: [{ form: '딱', feel: '된소리(더 또렷)' }, { form: '톡', feel: '작은말(가벼이)' }, { form: '탁탁', feel: '잇따라' }] },
      { word: '딱', type: 'onoma', gloss: '단단한 것이 맞부딪거나 갈라지는 소리', note: '맞아떨어질 때의 ‘딱’ 비유로도 쓰임.', example: '나뭇가지가 딱 부러졌다.', variants: [{ form: '똑', feel: '작은말' }, { form: '딱딱', feel: '거듭' }] },
      { word: '퍽', type: 'onoma', gloss: '물기 있는·무른 것이 세게 부딪는 둔탁한 소리', note: '주먹이 박히는 둔한 충격.', example: '주먹이 벽을 퍽 쳤다.', variants: [{ form: '팍', feel: '날카롭게' }, { form: '퍽퍽', feel: '거듭' }, { form: '뻑', feel: '된소리(더 둔하게)' }] },
      { word: '쨍그랑', type: 'onoma', gloss: '유리·쇠붙이가 깨지거나 부딪는 맑은 소리', note: '날카롭고 길게 울리는 금속·유리음.', example: '접시가 쨍그랑 깨졌다.', variants: [{ form: '쟁그랑', feel: '작은말' }, { form: '쩌렁', feel: '크게 울려 퍼짐' }] },
      { word: '와장창', type: 'onoma', gloss: '여러 물건이 한꺼번에 부서지는 소리', note: '난장판이 되는 큰 파열.', example: '선반이 와장창 무너졌다.', variants: [{ form: '와르르', feel: '쏟아져 무너짐' }] },
      { word: '쩍', type: 'onoma', gloss: '단단한 것이 갈라지거나 들러붙은 것이 떨어지는 소리', note: '입을 크게 벌릴 때도.', example: '얼음장이 쩍 갈라졌다.', variants: [{ form: '짝', feel: '작은말·박수' }, { form: '쩍쩍', feel: '거듭' }] },
      { word: '우당탕', type: 'onoma', gloss: '요란하게 넘어지고 부딪는 소리', note: '몸이 굴러떨어지는 소란.', example: '계단에서 우당탕 굴렀다.', variants: [{ form: '우당탕탕', feel: '더 길게 요란히' }] },
      { word: '철썩', type: 'onoma', gloss: '물·납작한 것이 세게 부딪거나 때리는 소리', note: '파도·손바닥의 젖은 타격.', example: '파도가 바위에 철썩 부딪쳤다.', variants: [{ form: '찰싹', feel: '작은말(가볍게)' }, { form: '철썩철썩', feel: '거듭' }] },
      { word: '쿵쿵', type: 'onoma', gloss: '무거운 발걸음·심장이 거듭 울리는 소리', note: '두려움·긴장의 심장 박동에도.', example: '계단을 쿵쿵 올라왔다.', variants: [{ form: '콩콩', feel: '작은말·가벼운 박동' }] },
      { word: '똑', type: 'onoma', gloss: '작고 단단한 것이 부러지거나 떨어지는 소리', note: '물방울·가지에 두루.', example: '연필심이 똑 부러졌다.', variants: [{ form: '뚝', feel: '큰말(더 묵직)' }, { form: '똑똑', feel: '문 두드리는 소리' }] },
    ],
  },
  {
    key: 'water', label: '물·액체 소리', icon: '💧',
    blurb: '흐르고 떨어지고 솟구치는 물의 소리. 양과 기세에 따라 어감이 달라진다.',
    entries: [
      { word: '졸졸', type: 'onoma', gloss: '가는 물이 잇따라 흐르는 소리', note: '시냇물·작은 물줄기.', example: '도랑물이 졸졸 흘렀다.', variants: [{ form: '줄줄', feel: '큰말(더 많이)' }, { form: '쫄쫄', feel: '된소리·메마름의 비유' }] },
      { word: '콸콸', type: 'onoma', gloss: '굵은 물이 세차게 쏟아지는 소리', note: '수도꼭지·폭포의 기세.', example: '수도에서 물이 콸콸 나왔다.', variants: [{ form: '괄괄', feel: '작은말' }, { form: '콸콸콸', feel: '더 세게' }] },
      { word: '철철', type: 'onoma', gloss: '액체가 넘쳐흐르는 소리·모양', note: '잔이 넘치도록.', example: '국물이 철철 넘쳤다.', variants: [{ form: '찰찰', feel: '작은말(찰랑이게)' }] },
      { word: '똑똑', type: 'onoma', gloss: '물방울이 하나씩 떨어지는 소리', note: '낙숫물·수도 새는 소리.', example: '수도꼭지에서 물이 똑똑 떨어졌다.', variants: [{ form: '뚝뚝', feel: '큰말(굵은 방울)' }, { form: '똑', feel: '한 방울' }] },
      { word: '첨벙', type: 'onoma', gloss: '물에 크게 뛰어들거나 빠지는 소리', note: '물보라가 튀는 입수.', example: '아이가 웅덩이에 첨벙 뛰어들었다.', variants: [{ form: '참방', feel: '작은말' }, { form: '첨벙첨벙', feel: '거듭 텀벙대며' }, { form: '텀벙', feel: '더 깊고 묵직하게' }] },
      { word: '출렁', type: 'both', gloss: '담긴 물이 크게 흔들리는 소리·모양', note: '물결·살집의 흔들림에도.', example: '양동이 물이 출렁 넘쳤다.', variants: [{ form: '촐랑', feel: '작은말(가볍게)' }, { form: '출렁출렁', feel: '거듭 흔들림' }] },
      { word: '찰랑', type: 'both', gloss: '물이 가득 차 가볍게 넘실대는 소리·모양', note: '머릿결·잔물결에도.', example: '잔에 술이 찰랑 차올랐다.', variants: [{ form: '철렁', feel: '큰말·가슴이 내려앉음' }, { form: '찰랑찰랑', feel: '거듭' }] },
      { word: '보글보글', type: 'onoma', gloss: '액체가 작은 거품을 내며 끓는 소리·모양', note: '찌개가 알맞게 끓을 때.', example: '된장찌개가 보글보글 끓었다.', variants: [{ form: '부글부글', feel: '큰말·분노의 비유' }, { form: '뽀글뽀글', feel: '된소리(잘게)' }] },
      { word: '쏴', type: 'onoma', gloss: '물·비가 세차게 쏟아지거나 스치는 소리', note: '소나기·파도의 긴 소리.', example: '소나기가 쏴 내렸다.', variants: [{ form: '솨', feel: '작은말' }, { form: '쏴아', feel: '길게 이어짐' }] },
      { word: '주르륵', type: 'both', gloss: '액체가 줄기를 이루어 흘러내리는 소리·모양', note: '눈물·빗물에 두루.', example: '눈물이 주르륵 흘렀다.', variants: [{ form: '조르륵', feel: '작은말(가는 줄기)' }, { form: '쭈르륵', feel: '된소리' }] },
      { word: '꿀꺽', type: 'onoma', gloss: '액체를 단숨에 삼키는 소리', note: '침을 삼키는 긴장에도.', example: '물을 꿀꺽 들이켰다.', variants: [{ form: '꼴깍', feel: '작은말' }, { form: '꿀꺽꿀꺽', feel: '연거푸 들이킴' }] },
    ],
  },
  {
    key: 'animal', label: '동물·울음 소리', icon: '🐦',
    blurb: '짐승과 새, 벌레의 울음·움직임 소리. 한국어 동물 소리 표현을 모았다.',
    entries: [
      { word: '멍멍', type: 'onoma', gloss: '개가 짖는 소리', note: '큰 개는 ‘왈왈’, 위협은 ‘으르렁’.', example: '강아지가 멍멍 짖었다.', variants: [{ form: '왈왈', feel: '거세게' }, { form: '컹컹', feel: '큰 개의 깊은 소리' }] },
      { word: '야옹', type: 'onoma', gloss: '고양이가 우는 소리', note: '응석은 ‘야옹야옹’, 위협은 ‘하악’.', example: '고양이가 야옹 하고 울었다.', variants: [{ form: '냐옹', feel: '응석 섞인 어감' }, { form: '가르릉', feel: '만족스러운 목울림' }] },
      { word: '짹짹', type: 'onoma', gloss: '작은 새가 지저귀는 소리', note: '참새·아침 새소리.', example: '참새들이 짹짹 지저귀었다.', variants: [{ form: '째잭', feel: '한 번씩' }, { form: '지지배배', feel: '제비가 재잘대듯' }] },
      { word: '꼬끼오', type: 'onoma', gloss: '수탉이 새벽에 우는 소리', note: '새벽을 알리는 길게 빼는 울음.', example: '새벽닭이 꼬끼오 울었다.', variants: [{ form: '꼬꼬댁', feel: '암탉이 알 낳고 우는 소리' }] },
      { word: '음매', type: 'onoma', gloss: '소가 우는 소리', note: '길게 빼는 묵직한 울음.', example: '송아지가 음매 하고 울었다.', variants: [{ form: '엄매', feel: '낮고 굵게' }] },
      { word: '개굴개굴', type: 'onoma', gloss: '개구리가 우는 소리', note: '비 온 뒤 무논의 합창.', example: '논에서 개구리가 개굴개굴 울었다.', variants: [{ form: '개골개골', feel: '작은말' }] },
      { word: '맴맴', type: 'onoma', gloss: '매미가 우는 소리', note: '한여름의 쟁쟁한 울음.', example: '매미가 맴맴 울어댔다.', variants: [{ form: '쓰름쓰름', feel: '쓰름매미의 울음' }] },
      { word: '꿀꿀', type: 'onoma', gloss: '돼지가 우는 소리', note: '먹이를 보채는 소리.', example: '돼지가 꿀꿀거렸다.', variants: [{ form: '꿀꿀꿀', feel: '연달아' }] },
      { word: '어흥', type: 'onoma', gloss: '호랑이가 으르대는 소리', note: '옛이야기 속 호랑이의 위협.', example: '호랑이가 어흥 하고 다가왔다.', variants: [{ form: '으르렁', feel: '낮게 위협함' }, { form: '크르릉', feel: '목 깊은 으름장' }] },
      { word: '꽥꽥', type: 'onoma', gloss: '오리가 우는 소리', note: '시끄럽게 내지르는 소리.', example: '오리들이 꽥꽥 시끄러웠다.', variants: [{ form: '꿱꿱', feel: '더 거칠게' }] },
      { word: '윙윙', type: 'onoma', gloss: '벌·모기가 날며 내는 소리', note: '귓가를 맴도는 날갯소리.', example: '벌이 윙윙 날아다녔다.', variants: [{ form: '앵앵', feel: '모기의 가는 소리' }, { form: '붕붕', feel: '큰 곤충의 굵은 소리' }] },
      { word: '히힝', type: 'onoma', gloss: '말이 우는 소리', note: '투레질하며 빼는 울음.', example: '말이 히힝 울며 앞발을 들었다.', variants: [{ form: '푸르릉', feel: '코를 떨며 투레질' }] },
    ],
  },
  {
    key: 'nature', label: '자연·바람·날씨', icon: '🍃',
    blurb: '바람과 비, 천둥과 나뭇잎의 소리. 세기와 결에 따라 흉내말이 달라진다.',
    entries: [
      { word: '솔솔', type: 'both', gloss: '바람·냄새·잠이 부드럽게 스며드는 소리·모양', note: '봄바람·졸음에 두루.', example: '봄바람이 솔솔 불었다.', variants: [{ form: '술술', feel: '큰말·막힘없이' }, { form: '쏠쏠', feel: '된소리' }] },
      { word: '휘잉', type: 'onoma', gloss: '바람이 세차게 길게 부는 소리', note: '겨울 골목의 찬 바람.', example: '찬 바람이 휘잉 불었다.', variants: [{ form: '휭', feel: '짧고 빠르게' }, { form: '휘이잉', feel: '더 길게 울며' }] },
      { word: '쏴아', type: 'onoma', gloss: '바람에 나뭇잎이 한꺼번에 스치는 소리', note: '숲·대숲을 훑는 바람.', example: '대숲이 바람에 쏴아 흔들렸다.', variants: [{ form: '솨', feel: '작은말' }] },
      { word: '바스락', type: 'onoma', gloss: '마른 잎·종이가 가볍게 스치는 소리', note: '낙엽·과자봉지에도.', example: '낙엽이 발밑에서 바스락 소리를 냈다.', variants: [{ form: '버스럭', feel: '큰말' }, { form: '바스락바스락', feel: '거듭' }, { form: '와삭', feel: '더 크고 마른 소리' }] },
      { word: '우르릉', type: 'onoma', gloss: '천둥·먼 굉음이 길게 울리는 소리', note: '폭풍 전의 하늘.', example: '하늘에서 우르릉 천둥이 울렸다.', variants: [{ form: '우르르', feel: '여럿이 몰려 무너짐' }, { form: '쾅', feel: '벼락이 떨어짐' }] },
      { word: '후드득', type: 'onoma', gloss: '빗방울·낟알이 한꺼번에 떨어지는 소리', note: '소나기 첫 방울·새가 날아오를 때.', example: '굵은 빗방울이 후드득 떨어졌다.', variants: [{ form: '후두둑', feel: '더 굵고 무겁게' }, { form: '호도독', feel: '작은말' }] },
      { word: '부슬부슬', type: 'both', gloss: '비가 가늘게 소리 없이 내리는 모양', note: '안개비·이슬비의 결.', example: '가을비가 부슬부슬 내렸다.', variants: [{ form: '보슬보슬', feel: '작은말(더 가늘게)' }] },
      { word: '쨍', type: 'mimetic', gloss: '햇볕이 강하게 내리쬐는 모양', note: '구름 없이 맑게 갠 하늘.', example: '한낮의 해가 쨍 내리쬐었다.', variants: [{ form: '쨍쨍', feel: '거듭 강하게' }] },
      { word: '살랑', type: 'both', gloss: '바람이 가볍게 한 번 부는 소리·모양', note: '꼬리·옷자락이 흔들릴 때도.', example: '봄바람이 살랑 불어왔다.', variants: [{ form: '설렁', feel: '큰말' }, { form: '살랑살랑', feel: '거듭 흔들흔들' }] },
      { word: '꽁꽁', type: 'mimetic', gloss: '아주 단단히 얼어붙은 모양', note: '추위로 굳어버린 상태.', example: '강이 꽁꽁 얼었다.', variants: [{ form: '꽝꽝', feel: '더 두껍고 단단히' }] },
    ],
  },
  {
    key: 'shine', label: '빛·반짝임 모양', icon: '✨',
    blurb: '빛나고 번쩍이고 흐릿한 모양. 의태어로 시각적 인상을 그린다.',
    entries: [
      { word: '반짝', type: 'mimetic', gloss: '빛이 잠깐 빛났다 사라지는 모양', note: '별·보석·아이디어가 떠오를 때.', example: '별이 반짝 빛났다.', variants: [{ form: '번쩍', feel: '큰말(더 강하게)' }, { form: '반짝반짝', feel: '거듭 빛남' }, { form: '빤짝', feel: '된소리(또렷이)' }] },
      { word: '번쩍', type: 'mimetic', gloss: '강한 빛이 갑자기 나타나는 모양', note: '번개·정신이 드는 순간에도.', example: '번개가 번쩍 쳤다.', variants: [{ form: '번쩍번쩍', feel: '거듭' }, { form: '반짝', feel: '작은말' }] },
      { word: '아른아른', type: 'mimetic', gloss: '무엇이 흐릿하게 어른거리는 모양', note: '아지랑이·그리운 모습에도.', example: '더위에 아지랑이가 아른아른 피어올랐다.', variants: [{ form: '어른어른', feel: '큰말(크게 흔들리듯)' }] },
      { word: '가물가물', type: 'mimetic', gloss: '멀거나 희미해 잘 보이지 않는 모양', note: '기억·불빛이 흐려질 때.', example: '먼 불빛이 가물가물했다.', variants: [{ form: '거물거물', feel: '큰말' }, { form: '까물까물', feel: '된소리(꺼질 듯)' }] },
      { word: '깜박', type: 'mimetic', gloss: '불빛·눈이 잠깐 꺼졌다 켜지는 모양', note: '깜박이는 등·졸음에도.', example: '신호등이 깜박 깜박였다.', variants: [{ form: '깜빡', feel: '된소리' }, { form: '껌벅', feel: '큰말(크게 끔벅)' }, { form: '깜박깜박', feel: '거듭' }] },
      { word: '훤하다', type: 'mimetic', gloss: '환하게 밝거나 트인 모양', note: '아는 길·동틀 녘에도(‘훤히’).', example: '새벽이 훤하게 밝아왔다.', variants: [{ form: '환하다', feel: '작은말(밝고 환히)' }] },
      { word: '어슴푸레', type: 'mimetic', gloss: '빛이 약해 희미하고 어둑한 모양', note: '새벽·달빛의 어스름.', example: '달빛이 어슴푸레 비쳤다.', variants: [{ form: '어슴어슴', feel: '거듭 어둑이' }] },
      { word: '눈부시다', type: 'mimetic', gloss: '빛이 강해 바로 보기 어려운 모양', note: '아름다움의 비유로도.', example: '햇살이 눈부시게 쏟아졌다.' },
      { word: '알록달록', type: 'mimetic', gloss: '여러 빛깔이 어우러진 모양', note: '단풍·옷·구슬에 두루.', example: '단풍이 알록달록 물들었다.', variants: [{ form: '얼룩덜룩', feel: '큰말(고르지 않게)' }, { form: '울긋불긋', feel: '붉고 누른 빛이 섞임' }] },
      { word: '반들반들', type: 'mimetic', gloss: '윤이 나도록 매끄러운 모양', note: '닦은 마룻바닥·이마에도.', example: '구두를 반들반들 닦았다.', variants: [{ form: '번들번들', feel: '큰말(기름지게)' }, { form: '빤들빤들', feel: '된소리·게으름의 비유' }] },
    ],
  },
  {
    key: 'texture', label: '감촉·질감 모양', icon: '🫧',
    blurb: '말랑하고 까칠하고 미끈한 촉감의 모양. 손끝의 인상을 흉내낸다.',
    entries: [
      { word: '말랑말랑', type: 'mimetic', gloss: '부드럽고 탄력 있게 무른 모양', note: '떡·볼·젤리의 촉감.', example: '갓 빚은 떡이 말랑말랑했다.', variants: [{ form: '몰랑몰랑', feel: '작은말(앙증맞게)' }, { form: '물렁물렁', feel: '큰말(더 무르게)' }] },
      { word: '흐물흐물', type: 'mimetic', gloss: '힘없이 늘어져 물러진 모양', note: '푹 익거나 지쳐 늘어질 때.', example: '오래 끓인 호박이 흐물흐물해졌다.', variants: [{ form: '하물하물', feel: '작은말' }] },
      { word: '보들보들', type: 'mimetic', gloss: '살갗에 닿는 느낌이 보드라운 모양', note: '아기 살결·고운 천.', example: '아기 볼이 보들보들했다.', variants: [{ form: '부들부들', feel: '큰말·떨림의 뜻도' }] },
      { word: '까칠까칠', type: 'mimetic', gloss: '표면이 거칠고 깔끄러운 모양', note: '메마른 피부·수염에도.', example: '수염이 까칠까칠 돋았다.', variants: [{ form: '꺼칠꺼칠', feel: '큰말' }, { form: '가칠가칠', feel: '예사소리(덜 거칠게)' }] },
      { word: '미끈', type: 'mimetic', gloss: '매끄러워 손에 잘 안 잡히는 모양', note: '비누·미꾸라지·매끈한 다리에도.', example: '비누가 손에서 미끈 빠져나갔다.', variants: [{ form: '매끈', feel: '작은말(맵시 있게)' }, { form: '미끈미끈', feel: '거듭 미끄럽게' }] },
      { word: '보송보송', type: 'mimetic', gloss: '물기 없이 보드랍고 마른 모양', note: '잘 마른 수건·아기 살결.', example: '빨래가 보송보송 말랐다.', variants: [{ form: '부숭부숭', feel: '큰말' }, { form: '뽀송뽀송', feel: '된소리(더 깔끔히)' }] },
      { word: '쫀득쫀득', type: 'mimetic', gloss: '차지고 질겨 끈기 있게 씹히는 모양', note: '인절미·젤리의 식감.', example: '인절미가 쫀득쫀득했다.', variants: [{ form: '쫄깃쫄깃', feel: '탄력 있게 씹힘' }] },
      { word: '바삭', type: 'both', gloss: '마르고 단단한 것이 가볍게 부서지는 소리·모양', note: '튀김·과자의 식감.', example: '튀김이 바삭 부서졌다.', variants: [{ form: '바삭바삭', feel: '거듭' }, { form: '버석', feel: '큰말(메마르게)' }, { form: '와삭', feel: '더 크게' }] },
      { word: '끈적끈적', type: 'mimetic', gloss: '들러붙어 끈끈한 모양', note: '꿀·땀·진득한 분위기에도.', example: '손이 꿀 때문에 끈적끈적했다.', variants: [{ form: '끈끈', feel: '간결하게' }, { form: '찐득찐득', feel: '된소리(더 진득)' }] },
      { word: '폭신폭신', type: 'mimetic', gloss: '부드럽게 푹 들어가는 탄력 있는 모양', note: '솜·이불·구름빵.', example: '소파가 폭신폭신했다.', variants: [{ form: '푹신푹신', feel: '큰말(더 깊이)' }] },
    ],
  },
  {
    key: 'move', label: '걸음·움직임 모양', icon: '🚶',
    blurb: '걷고 구르고 흔들리는 몸짓의 모양. 속도와 기세를 흉내낸다.',
    entries: [
      { word: '아장아장', type: 'mimetic', gloss: '어린아이가 위태롭게 걷는 모양', note: '첫걸음의 귀여운 걸음.', example: '아기가 아장아장 걸어왔다.', variants: [{ form: '어정어정', feel: '큰말·느릿하게' }] },
      { word: '뒤뚱뒤뚱', type: 'mimetic', gloss: '균형을 못 잡고 좌우로 흔들리며 걷는 모양', note: '오리·뚱뚱한 걸음에도.', example: '펭귄이 뒤뚱뒤뚱 걸었다.', variants: [{ form: '디뚱디뚱', feel: '작은말' }, { form: '뒤뚱', feel: '한 번 기우뚱' }] },
      { word: '성큼성큼', type: 'mimetic', gloss: '다리를 크게 떼며 빠르게 걷는 모양', note: '거침없이 다가오는 걸음.', example: '그가 성큼성큼 다가왔다.', variants: [{ form: '겅중겅중', feel: '껑충 뛰듯이' }] },
      { word: '살금살금', type: 'mimetic', gloss: '들키지 않게 가만가만 움직이는 모양', note: '몰래 다가갈 때.', example: '고양이가 살금살금 다가왔다.', variants: [{ form: '슬금슬금', feel: '큰말(슬며시)' }, { form: '살그머니', feel: '한 번 가만히' }] },
      { word: '비틀비틀', type: 'mimetic', gloss: '몸을 못 가누고 흔들리며 걷는 모양', note: '취하거나 어지러울 때.', example: '술에 취해 비틀비틀 걸었다.', variants: [{ form: '배틀배틀', feel: '작은말' }, { form: '휘청', feel: '한 번 크게 흔들림' }] },
      { word: '데굴데굴', type: 'mimetic', gloss: '둥근 것이 잇따라 굴러가는 모양', note: '공·구슬·웃다가 구를 때도.', example: '구슬이 데굴데굴 굴러갔다.', variants: [{ form: '대굴대굴', feel: '작은말' }, { form: '떼굴떼굴', feel: '된소리(빠르게)' }] },
      { word: '흔들흔들', type: 'mimetic', gloss: '이리저리 자꾸 흔들리는 모양', note: '나뭇가지·이의 흔들림.', example: '그네가 흔들흔들 움직였다.', variants: [{ form: '한들한들', feel: '작은말(가볍게)' }, { form: '건들건들', feel: '큰말·건들거림' }] },
      { word: '폴짝', type: 'mimetic', gloss: '가볍게 한 번 뛰어오르는 모양', note: '토끼·개구리의 도약.', example: '개구리가 폴짝 뛰었다.', variants: [{ form: '풀쩍', feel: '큰말(더 높이)' }, { form: '폴짝폴짝', feel: '거듭' }, { form: '깡충', feel: '귀엽게 한 번' }] },
      { word: '꾸물꾸물', type: 'mimetic', gloss: '느리고 게으르게 움직이는 모양', note: '벌레·미적대는 사람에도.', example: '아침에 꾸물꾸물 늑장을 부렸다.', variants: [{ form: '꼬물꼬물', feel: '작은말(꼬무락대게)' }] },
      { word: '쏜살같이', type: 'mimetic', gloss: '쏜 화살처럼 매우 빠르게 움직이는 모양', note: '순식간의 질주.', example: '아이가 쏜살같이 달려나갔다.' },
      { word: '엉금엉금', type: 'mimetic', gloss: '큰 동작으로 느리게 기어가는 모양', note: '거북·기어가는 걸음.', example: '거북이 엉금엉금 기어갔다.', variants: [{ form: '암금암금', feel: '작은말' }, { form: '엉금', feel: '한 번 기는 모양' }] },
    ],
  },
  {
    key: 'emotion', label: '감정·마음 모양', icon: '💗',
    blurb: '두근거리고 울적하고 들뜬 마음의 모양. 가슴속 움직임을 흉내낸다.',
    entries: [
      { word: '두근두근', type: 'mimetic', gloss: '심장이 설레거나 긴장해 빠르게 뛰는 모양', note: '설렘·기대·두려움에 두루.', example: '발표 직전 가슴이 두근두근했다.', variants: [{ form: '두근', feel: '한 번 크게' }, { form: '콩닥콩닥', feel: '작은말(설레게)' }, { form: '쿵쾅쿵쾅', feel: '큰말(요란히)' }] },
      { word: '울컥', type: 'mimetic', gloss: '감정이 갑자기 북받쳐 오르는 모양', note: '서러움·분노·감동에 두루.', example: '편지를 읽다 울컥 눈물이 났다.', variants: [{ form: '왈칵', feel: '큰말(왈칵 쏟아짐)' }] },
      { word: '설레설레', type: 'mimetic', gloss: '마음이 들떠 가만히 있지 못하는 모양', note: '설렘으로 들뜬 상태.', example: '소풍 전날 마음이 설레설레했다.', variants: [{ form: '들썩들썩', feel: '몸까지 들먹임' }] },
      { word: '조마조마', type: 'mimetic', gloss: '잘못될까 봐 마음 졸이는 모양', note: '아슬아슬한 순간.', example: '결과를 기다리며 조마조마했다.', variants: [{ form: '조바심', feel: '명사화된 졸임' }] },
      { word: '뭉클', type: 'mimetic', gloss: '감동·애틋함이 가슴에 차오르는 모양', note: '가슴이 뜨거워지는 느낌.', example: '아버지의 손을 보니 뭉클했다.', variants: [{ form: '뭉클뭉클', feel: '거듭 차오름' }] },
      { word: '울적', type: 'mimetic', gloss: '마음이 가라앉아 답답하고 쓸쓸한 모양', note: '비 오는 날의 기분에도.', example: '괜히 마음이 울적했다.', variants: [{ form: '울적울적', feel: '내내 가라앉음' }] },
      { word: '싱숭생숭', type: 'mimetic', gloss: '마음이 들떴다 가라앉아 갈피를 못 잡는 모양', note: '봄날·이별 앞의 마음.', example: '봄바람에 마음이 싱숭생숭했다.' },
      { word: '오싹', type: 'mimetic', gloss: '소름이 돋듯 갑자기 서늘해지는 모양', note: '무섭거나 추울 때.', example: '뒤에서 인기척에 오싹했다.', variants: [{ form: '으쓱', feel: '큰말·어깨가 으쓱(다른 뜻)' }, { form: '오싹오싹', feel: '거듭 소름이' }] },
      { word: '안절부절', type: 'mimetic', gloss: '마음이 불안해 어쩔 줄 모르는 모양', note: '‘안절부절못하다’로 씀.', example: '소식을 기다리며 안절부절못했다.' },
      { word: '벅차다', type: 'mimetic', gloss: '감격이 가슴 가득 차오르는 모양', note: '기쁨·자랑이 넘칠 때.', example: '꿈을 이룬 순간 가슴이 벅찼다.' },
    ],
  },
  {
    key: 'laughcry', label: '웃음·울음·말소리', icon: '😄',
    blurb: '웃고 울고 떠드는 사람의 소리. 입에서 나는 흉내말을 모았다.',
    entries: [
      { word: '하하', type: 'onoma', gloss: '크고 시원하게 웃는 소리', note: '거리낌 없는 웃음.', example: '그가 하하 크게 웃었다.', variants: [{ form: '허허', feel: '점잖고 너그럽게' }, { form: '호호', feel: '입을 가리고 곱게' }, { form: '히히', feel: '장난스럽게' }] },
      { word: '깔깔', type: 'onoma', gloss: '못 참고 자지러지게 웃는 소리', note: '재미있어 까르르.', example: '아이들이 깔깔 웃어댔다.', variants: [{ form: '껄껄', feel: '큰말(호탕하게)' }, { form: '까르르', feel: '터지듯 한꺼번에' }] },
      { word: '키득키득', type: 'onoma', gloss: '웃음을 참다 새어 나오는 소리', note: '몰래 웃을 때.', example: '뒤에서 키득키득 웃었다.', variants: [{ form: '키들키들', feel: '잇따라 새듯' }, { form: '낄낄', feel: '음흉하거나 짓궂게' }] },
      { word: '엉엉', type: 'onoma', gloss: '큰 소리로 서럽게 우는 소리', note: '참았던 울음이 터질 때.', example: '아이가 엉엉 울었다.', variants: [{ form: '앙앙', feel: '작은말(어린아이가)' }, { form: '왕왕', feel: '큰말(요란히)' }] },
      { word: '훌쩍훌쩍', type: 'onoma', gloss: '콧물을 들이켜며 흐느껴 우는 소리', note: '소리 죽인 울음.', example: '코를 훌쩍훌쩍하며 울었다.', variants: [{ form: '훌쩍', feel: '한 번 코를 들이켬' }, { form: '흑흑', feel: '흐느낌의 소리' }] },
      { word: '흐느끼다', type: 'onoma', gloss: '소리를 죽여 들썩이며 우는 모양·소리', note: '어깨를 떨며.', example: '그녀는 어깨를 떨며 흐느꼈다.' },
      { word: '소곤소곤', type: 'onoma', gloss: '남이 못 듣게 작은 소리로 말하는 소리', note: '귓속말·비밀 이야기.', example: '둘이 소곤소곤 속삭였다.', variants: [{ form: '수군수군', feel: '큰말(수군대며)' }, { form: '도란도란', feel: '정답게 나직이' }] },
      { word: '재잘재잘', type: 'onoma', gloss: '쉴 새 없이 빠르게 떠드는 소리', note: '아이들·새의 수다.', example: '아이들이 재잘재잘 떠들었다.', variants: [{ form: '조잘조잘', feel: '작은말(앙증맞게)' }, { form: '지절지절', feel: '큰말' }] },
      { word: '와글와글', type: 'onoma', gloss: '여럿이 한데 모여 시끄럽게 떠드는 소리', note: '시장·교실의 소란.', example: '광장이 사람들로 와글와글했다.', variants: [{ form: '왁자지껄', feel: '뒤섞여 떠들썩하게' }, { form: '웅성웅성', feel: '술렁이며 수군대듯' }] },
      { word: '중얼중얼', type: 'onoma', gloss: '혼잣말처럼 낮게 자꾸 말하는 소리', note: '불평·외우는 소리.', example: '무어라 중얼중얼 혼잣말을 했다.', variants: [{ form: '종알종알', feel: '작은말(종알대며)' }, { form: '투덜투덜', feel: '불만 섞어' }] },
    ],
  },
  {
    key: 'eat', label: '먹고 마시는 소리·모양', icon: '🍚',
    blurb: '씹고 마시고 삼키는 식사의 소리. 식감과 기세를 흉내낸다.',
    entries: [
      { word: '아삭아삭', type: 'both', gloss: '연하고 싱싱한 것을 베어 무는 소리·모양', note: '사과·오이·김치의 식감.', example: '오이를 아삭아삭 베어 물었다.', variants: [{ form: '어석어석', feel: '큰말' }, { form: '아삭', feel: '한 번' }] },
      { word: '오물오물', type: 'mimetic', gloss: '입을 작게 움직여 천천히 씹는 모양', note: '아이·노인의 작은 입질.', example: '아기가 오물오물 씹었다.', variants: [{ form: '우물우물', feel: '큰말(입 안에서)' }, { form: '오몰오몰', feel: '더 작게' }] },
      { word: '냠냠', type: 'onoma', gloss: '맛있게 먹는 소리·모양', note: '아이들의 입소리.', example: '냠냠 맛있게 먹었다.', variants: [{ form: '얌얌', feel: '작은말' }] },
      { word: '후루룩', type: 'onoma', gloss: '국수·국물을 빨아들이며 먹는 소리', note: '면치기·뜨거운 국물.', example: '국수를 후루룩 들이켰다.', variants: [{ form: '호로록', feel: '작은말(가늘게)' }, { form: '후루룩후루룩', feel: '거듭' }] },
      { word: '쩝쩝', type: 'onoma', gloss: '입맛을 다시며 소리 내어 먹는 소리', note: '아쉬움의 입맛에도.', example: '쩝쩝 소리를 내며 먹었다.', variants: [{ form: '짭짭', feel: '작은말' }, { form: '쩝', feel: '한 번 입맛 다심' }] },
      { word: '꿀꺽꿀꺽', type: 'onoma', gloss: '액체를 연거푸 시원하게 삼키는 소리', note: '갈증을 풀 때.', example: '시원한 물을 꿀꺽꿀꺽 마셨다.', variants: [{ form: '꼴깍꼴깍', feel: '작은말' }] },
      { word: '와그작', type: 'onoma', gloss: '단단한 것을 거칠게 씹어 부수는 소리', note: '얼음·과자를 깨물 때.', example: '얼음을 와그작 씹었다.', variants: [{ form: '와그작와그작', feel: '거듭' }, { form: '우그적', feel: '큰말' }] },
      { word: '쪽', type: 'onoma', gloss: '빨아들이거나 입맞춤하는 소리', note: '빨대·뽀뽀에 두루.', example: '주스를 쪽 빨아 마셨다.', variants: [{ form: '쪽쪽', feel: '거듭' }, { form: '쭉', feel: '큰말(길게 빨아)' }] },
      { word: '꾸역꾸역', type: 'mimetic', gloss: '입에 잔뜩 밀어 넣어 먹는 모양', note: '내키지 않아도 욱여넣을 때.', example: '밥을 꾸역꾸역 밀어 넣었다.', variants: [{ form: '꼬역꼬역', feel: '작은말' }] },
      { word: '질겅질겅', type: 'mimetic', gloss: '질긴 것을 오래 씹는 모양', note: '껌·오징어를 씹을 때.', example: '껌을 질겅질겅 씹었다.', variants: [{ form: '잘강잘강', feel: '작은말' }] },
    ],
  },
]

const TYPE_LABEL: Record<WordType, string> = { onoma: '의성어', mimetic: '의태어', both: '의성·의태어' }
const TYPE_ICON: Record<WordType, string> = { onoma: '🔊', mimetic: '👁️', both: '🔁' }
const TYPE_DESC: Record<WordType, string> = {
  onoma: '소리를 흉내낸 말(쿵·철썩·멍멍)',
  mimetic: '모양·움직임을 흉내낸 말(반짝·아장아장·흐물흐물)',
  both: '소리와 모양을 함께 흉내내는 말(출렁·바삭)',
}
const TYPES: WordType[] = ['onoma', 'mimetic', 'both']

const LS = 'sry:tool:onomatopoeia-ref:'
const ALL = '__all__'

interface Row { cat: CatDef; entry: Entry }
const rowsOfCat = (c: CatDef): Row[] => c.entries.map((entry) => ({ cat: c, entry }))
const flatAll = (): Row[] => CATS.flatMap(rowsOfCat)

export default function OnomatopoeiaRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.cat 으로 특정 카테고리를 펼쳐 열 수 있게(연계 진입)
  const initialCat = typeof payload?.cat === 'string' && CATS.some((c) => c.key === payload.cat)
    ? (payload.cat as string) : ALL

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    if (initialCat !== ALL) return initialCat
    try { const raw = localStorage.getItem(LS + 'cat'); if (raw && (raw === ALL || CATS.some((c) => c.key === raw))) return raw } catch { /* ignore */ }
    return ALL
  })
  const [type, setType] = useState<WordType | 'all'>(() => {
    try { const raw = localStorage.getItem(LS + 'type'); if (raw === 'onoma' || raw === 'mimetic' || raw === 'both' || raw === 'all') return raw } catch { /* ignore */ }
    return 'all'
  })
  // 펼친 카테고리 카드(아코디언). 빈 객체면 모두 접힘.
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try { const raw = localStorage.getItem(LS + 'open'); if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> } } catch { /* ignore */ }
    return initialCat !== ALL ? { [initialCat]: true } : { impact: true }
  })
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try { const raw = localStorage.getItem(LS + 'favs'); if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> } } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<Row | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'type', type) } catch { /* ignore */ } }, [type])
  useEffect(() => { try { localStorage.setItem(LS + 'open', JSON.stringify(open)) } catch { /* ignore */ } }, [open])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 언마운트 정리 — 복사/토스트 타이머
  const copiedTimer = useRef(0)
  const toastTimer = useRef(0)
  useEffect(() => () => {
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
  }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.entries.length, 0), [])
  const variantCount = useMemo(() => CATS.reduce((n, c) => n + c.entries.reduce((m, e) => m + (e.variants ? e.variants.length : 0), 0), 0), [])

  const favKey = (ck: string, word: string) => `${ck}::${word}`

  // 검색·필터 적용 전의 풀(무작위 뽑기 공용)
  const pool = useMemo(() => {
    let base = cat === ALL ? flatAll() : (CATS.find((c) => c.key === cat) ? rowsOfCat(CATS.find((c) => c.key === cat)!) : [])
    if (type !== 'all') base = base.filter((r) => r.entry.type === type)
    if (onlyFav) base = base.filter((r) => favs[favKey(r.cat.key, r.entry.word)])
    return base
  }, [cat, type, onlyFav, favs])

  const q = query.trim().toLowerCase()
  const matches = useCallback((r: Row): boolean => {
    if (!q) return true
    return r.entry.word.toLowerCase().includes(q)
      || r.entry.gloss.toLowerCase().includes(q)
      || (r.entry.note ? r.entry.note.toLowerCase().includes(q) : false)
      || (r.entry.example ? r.entry.example.toLowerCase().includes(q) : false)
      || (r.entry.variants ? r.entry.variants.some((v) => v.form.toLowerCase().includes(q) || v.feel.toLowerCase().includes(q)) : false)
  }, [q])

  // 카테고리별 그룹핑(검색·필터 적용)
  const grouped = useMemo(() => {
    return CATS.map((c) => {
      if (cat !== ALL && cat !== c.key) return { cat: c, rows: [] as Row[] }
      let rows = rowsOfCat(c)
      if (type !== 'all') rows = rows.filter((x) => x.entry.type === type)
      if (onlyFav) rows = rows.filter((x) => favs[favKey(c.key, x.entry.word)])
      rows = rows.filter(matches)
      return { cat: c, rows }
    }).filter((g) => g.rows.length > 0 || (cat !== ALL && cat === g.cat.key))
  }, [cat, type, onlyFav, favs, matches])

  const shownCount = useMemo(() => grouped.reduce((n, g) => n + g.rows.length, 0), [grouped])

  const toggleOpen = (ck: string) => setOpen((prev) => ({ ...prev, [ck]: !prev[ck] }))
  const expandAll = () => setOpen(Object.fromEntries(CATS.map((c) => [c.key, true])))
  const collapseAll = () => setOpen({})

  const rollRandom = useCallback(() => {
    if (!pool.length) { setRandom(null); flashToast('뽑을 흉내말이 없습니다. 필터를 풀어 보세요.'); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.entry.word === prev.entry.word && pick.cat.key === prev.cat.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      setOpen((o) => (o[pick.cat.key] ? o : { ...o, [pick.cat.key]: true }))
      return pick
    })
  }, [pool])

  const toggleFav = (ck: string, word: string) => {
    const fk = favKey(ck, word)
    setFavs((prev) => { const next = { ...prev }; if (next[fk]) delete next[fk]; else next[fk] = true; return next })
  }

  const flashToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  // 복사용 한 줄(흉내말 — 뜻 / 변형 / 예문)
  const plainOf = (r: Row): string => {
    const e = r.entry
    let s = `${e.word} — ${e.gloss}`
    if (e.note) s += ` (${e.note})`
    if (e.variants && e.variants.length) s += ` / 변형: ${e.variants.map((v) => `${v.form}(${v.feel})`).join(', ')}`
    if (e.example) s += ` / 예: ${e.example}`
    return s
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current)
      copiedTimer.current = window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* 클립보드 거부 graceful */ })
  }

  const escapeHtml = (str: string) =>
    String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // [연계 1] 수집함에 담기
  const sendToStash = (r: Row) => {
    addToStash({ kind: 'note', label: `흉내말(${r.cat.label}·${TYPE_LABEL[r.entry.type]})`, text: plainOf(r) })
    flashToast(`수집함에 담았습니다 — “${r.entry.word}”`)
  }
  // [연계 2] 공유 스니펫 라이브러리에 저장
  const saveSnippet = (r: Row) => {
    addToLibrary('snippets', { text: plainOf(r), source: `의성어·의태어 사전 (${r.cat.label})`, tags: [r.cat.label, TYPE_LABEL[r.entry.type]] })
    flashToast(`스니펫으로 저장했습니다 — “${r.entry.word}”`)
  }
  // [연계 3] 프로젝트 자료 〈흉내말 노트〉 폴더에 추가
  const addRowToProject = (r: Row) => {
    if (!hasProjectBridge()) return
    const e = r.entry
    const vars = e.variants && e.variants.length
      ? `<p><b>어감 변형</b></p><ul>${e.variants.map((v) => `<li><b>${escapeHtml(v.form)}</b> — ${escapeHtml(v.feel)}</li>`).join('')}</ul>` : ''
    const bodyHtml = [
      `<p><b>${escapeHtml(r.cat.icon + ' ' + r.cat.label + ' · ' + TYPE_LABEL[e.type])}</b></p>`,
      `<p><b>${escapeHtml(e.word)}</b> — ${escapeHtml(e.gloss)}</p>`,
      e.note ? `<p>${escapeHtml(e.note)}</p>` : '',
      vars,
      e.example ? `<p><i>예문</i>: ${escapeHtml(e.example)}</p>` : '',
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '흉내말 노트', title: `${e.word} (${r.cat.label})`, bodyHtml })
    if (id) flashToast(`프로젝트 자료 〈흉내말 노트〉에 “${e.word}”를 추가했습니다.`)
  }
  // 카테고리 전체를 한 문서로 프로젝트에 추가
  const addCatToProject = (c: CatDef) => {
    if (!hasProjectBridge()) return
    const lis = c.entries.map((e) => {
      const vs = e.variants && e.variants.length ? ` <span>[변형: ${escapeHtml(e.variants.map((v) => `${v.form}(${v.feel})`).join(', '))}]</span>` : ''
      const ex = e.example ? ` — <i>${escapeHtml(e.example)}</i>` : ''
      return `<li><b>${escapeHtml(e.word)}</b> (${escapeHtml(TYPE_LABEL[e.type])}) — ${escapeHtml(e.gloss)}${vs}${ex}</li>`
    }).join('')
    const bodyHtml = `<p><b>${escapeHtml(c.icon + ' ' + c.label)}</b></p><p>${escapeHtml(c.blurb)}</p><ul>${lis}</ul>`
    const id = addToProject({ kind: 'text', root: 'research', folder: '흉내말 노트', title: `${c.label} 흉내말 정리`, bodyHtml })
    if (id) flashToast(`프로젝트 자료 〈흉내말 노트〉에 〈${c.label} 흉내말 정리〉를 추가했습니다.`)
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10 }
  const chip = (on: boolean): React.CSSProperties => ({ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' })

  const renderVariants = (vs?: Variant[]) => {
    if (!vs || !vs.length) return null
    return (
      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
        {vs.map((v) => (
          <button
            key={v.form}
            className="minibtn"
            title={`${v.feel} · 클릭하면 복사`}
            onClick={() => copy(v.form, 'var:' + v.form)}
            style={{ fontSize: 12 }}
          >
            <b>{copiedKey === 'var:' + v.form ? '✓' : v.form}</b>
            <span style={{ color: 'var(--muted)', marginLeft: 5, fontSize: 11 }}>{v.feel}</span>
          </button>
        ))}
      </div>
    )
  }

  const renderRow = (r: Row) => {
    const fk = favKey(r.cat.key, r.entry.word)
    const isFav = !!favs[fk]
    const cid = 'item:' + fk
    const e = r.entry
    return (
      <div key={fk} style={{ ...card, padding: '9px 11px', background: 'var(--paper)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }} title={TYPE_DESC[e.type]}><Emoji e={TYPE_ICON[e.type]} /> {TYPE_LABEL[e.type]}</span>
          <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(r.cat.key, e.word)} style={{ marginLeft: 'auto', flexShrink: 0, ...chip(isFav) }}>{isFav ? '★' : '☆'}</button>
        </div>
        <div style={{ marginTop: 5, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 16, fontWeight: 800 }}>{e.word}</span>
          <span style={{ color: 'var(--muted)' }}>—</span>
          <span style={{ fontSize: 13.5, color: 'var(--ok)' }}>{e.gloss}</span>
        </div>
        {e.note && <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 4, color: 'var(--muted)' }}>{e.note}</div>}
        {e.example && <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 4, fontStyle: 'italic', color: 'var(--text)' }}>“{e.example}”</div>}
        {renderVariants(e.variants)}
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <button className="minibtn" onClick={() => copy(e.word, cid + ':w')}>{copiedKey === cid + ':w' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 흉내말</>}</button>
          <button className="minibtn" onClick={() => copy(plainOf(r), cid)}>{copiedKey === cid ? <>✓ 복사됨</> : <><Emoji e="📋" /> 전체</>}</button>
          {hasStash() && <button className="linkbtn" onClick={() => sendToStash(r)} title="플로팅 수집함에 담기"><Emoji e="📎" /> 수집함</button>}
          <button className="linkbtn" onClick={() => saveSnippet(r)} title="공유 스니펫 라이브러리에 저장"><Emoji e="✂️" /> 스니펫</button>
          {hasProjectBridge() && <button className="linkbtn" onClick={() => addRowToProject(r)} title="프로젝트 자료 〈흉내말 노트〉에 추가"><Emoji e="📄" /> 프로젝트</button>}
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={hint}>
        소리(의성어)와 모양·움직임(의태어)을 그리는 한국어 흉내말 <b>{total}개</b>를 카테고리별로 모았습니다. 표제어마다 작은말/큰말 등 <b>어감 변형 {variantCount}개</b>와 예문을 붙였습니다. 카테고리를 펼쳐 보고, 클릭해 복사하거나 본문에 바로 쓰세요.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="흉내말·뜻·예문으로 검색 (예: 반짝, 철썩, 두근, 말랑, 아장)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL)} aria-pressed={cat === ALL} style={chip(cat === ALL)}><Emoji e="✨" /> 전체</button>
        {CATS.map((c) => (
          <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={cat === c.key} style={chip(cat === c.key)} title={c.blurb}><Emoji e={c.icon} /> {c.label}</button>
        ))}
      </div>

      {/* 종류 필터(의성/의태) */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={() => setType('all')} aria-pressed={type === 'all'} style={chip(type === 'all')}><Emoji e="📚" /> 전체</button>
        {TYPES.map((t) => (
          <button key={t} className="minibtn" onClick={() => setType(t)} aria-pressed={type === t} style={chip(type === t)} title={TYPE_DESC[t]}><Emoji e={TYPE_ICON[t]} /> {TYPE_LABEL[t]}</button>
        ))}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 흉내말</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav} style={chip(onlyFav)}>{onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}</button>
        <button className="minibtn" onClick={expandAll}>⊞ 모두 펼치기</button>
        <button className="minibtn" onClick={collapseAll}>⊟ 모두 접기</button>
        <button className="linkbtn" onClick={() => openToolLinked('sensory-palette')} title="관련 도구: 오감 묘사 팔레트 열기"><Emoji e="🔗" /> 오감 팔레트</button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{shownCount}개 표시</span>
      </div>

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label} · <Emoji e={TYPE_ICON[random.entry.type]} /> {TYPE_LABEL[random.entry.type]}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ margin: '6px 0 2px', display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{random.entry.word}</span>
            <span style={{ color: 'var(--muted)' }}>—</span>
            <span style={{ fontSize: 14, color: 'var(--ok)' }}>{random.entry.gloss}</span>
          </div>
          {random.entry.note && <div style={{ fontSize: 13, lineHeight: 1.55, margin: '4px 0', color: 'var(--muted)' }}>{random.entry.note}</div>}
          {random.entry.example && <div style={{ fontSize: 13, lineHeight: 1.55, margin: '4px 0', fontStyle: 'italic' }}>“{random.entry.example}”</div>}
          {renderVariants(random.entry.variants)}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            <button className="minibtn" onClick={() => copy(random.entry.word, 'rand:w')}>{copiedKey === 'rand:w' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 흉내말</>}</button>
            <button className="minibtn" onClick={() => copy(plainOf(random), 'rand')}>{copiedKey === 'rand' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 전체</>}</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.entry.word)}>{favs[favKey(random.cat.key, random.entry.word)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}</button>
            <button className="minibtn" onClick={rollRandom}><Emoji e="🎲" /> 다시</button>
          </div>
          {/* 연계 4종 */}
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            {hasStash() && <button className="linkbtn" onClick={() => sendToStash(random)} title="플로팅 수집함에 담기"><Emoji e="📎" /> 수집함</button>}
            <button className="linkbtn" onClick={() => saveSnippet(random)} title="공유 스니펫 라이브러리에 저장"><Emoji e="✂️" /> 스니펫 저장</button>
            <button className="linkbtn" onClick={() => addRowToProject(random)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈흉내말 노트〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
            <button className="linkbtn" onClick={() => openToolLinked('sensory-palette')} title="관련 도구: 오감 묘사 팔레트 열기"><Emoji e="🔗" /> 오감 팔레트</button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5 }}>✓ {toast}</div>
      )}

      {/* 카테고리별 아코디언 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
        {grouped.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 흉내말이 없습니다. 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          grouped.map((g) => {
            const c = g.cat
            const isOpen = !!open[c.key]
            return (
              <div key={c.key} style={card}>
                {/* 카테고리 헤더(펼침/접기) */}
                <button
                  onClick={() => toggleOpen(c.key)}
                  aria-expanded={isOpen}
                  style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 9 }}
                >
                  <span style={{ fontSize: 18 }}><Emoji e={c.icon} /></span>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{c.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{g.rows.length}개</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 13 }}>{isOpen ? '▾' : '▸'}</span>
                </button>

                {isOpen && (
                  <div style={{ padding: '0 13px 13px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {/* 카테고리 설명 */}
                    <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px' }}>
                      <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--muted)' }}>{c.blurb}</div>
                      {hasProjectBridge() && (
                        <div style={{ marginTop: 8 }}>
                          <button className="linkbtn" onClick={() => addCatToProject(c)} title="이 카테고리의 흉내말 전체를 한 문서로 프로젝트에 추가"><Emoji e="📄" /> 이 카테고리 통째로 프로젝트에 추가</button>
                        </div>
                      )}
                    </div>
                    {/* 흉내말 목록 */}
                    {g.rows.length === 0
                      ? <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: '6px 2px' }}>이 조건에 해당하는 흉내말이 없습니다.</div>
                      : g.rows.map(renderRow)}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 저작권 표기 */}
      <div className="license-note">
        수록 흉내말의 뜻풀이·어감 변형·예문은 모두 직접 작성한 자작 데이터입니다. 의성어·의태어는 우리말이 오래 써 온 표현이며, 풀이와 예문은 창작 표현입니다.
        <span className="license-badge" style={{ marginLeft: 6 }}>자작 데이터</span>
      </div>
    </div>
  )
}
