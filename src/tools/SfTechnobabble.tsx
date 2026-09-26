// SF 테크노버블 생성기 — 그럴듯한 가짜 과학용어·장치명·물질명·현상명을 조합형으로 대량 생성한다.
//  방식: 접두(prefix) + 어근(root) + 접미(suffix) 슬롯을 각 카테고리(장치/물질/현상/이론·단위)별 로컬 풀에서 무작위 조합.
//        톤(하드SF / 스페이스오페라) 선택 → 풀과 한국어 의역 어휘가 톤에 맞게 바뀐다.
//  생성기 규약: 슬롯 풀 무작위 + 슬롯 잠금(🔒)/재생성, 가능한 조합수 표시(수억 이상), 한 번에 대량(배치) 생성.
//  자급식: 외부 네트워크·라이브러리 없음(Math.random + localStorage 잠금/즐겨찾기 저장)만 사용.
//  연계: 마음에 든 용어를 스니펫 라이브러리로 저장 / 프로젝트 자료 〈SF 용어〉 폴더에 사전 메모로 추가.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'sf-technobabble', name: 'SF 테크노버블 생성기', icon: '🛰️', group: '생성기', genre: 'SF·과학소설', intro: '그럴듯한 가짜 과학용어·장치명·물질명·현상명을 톤별로 대량 생성하세요(수십억 조합·조사 자동 용례)', w: 600, h: 700 }

// ---------- 톤 ----------
type Tone = 'hard' | 'opera'
const TONES: { key: Tone; label: string; icon: string; desc: string }[] = [
  { key: 'hard', label: '하드SF', icon: '🔬', desc: '실제 물리·공학 용어에 기반한 절제된 어휘(클라크·로빈슨풍)' },
  { key: 'opera', label: '스페이스오페라', icon: '🚀', desc: '웅장하고 화려한 가공 어휘(은하제국·초공간풍)' },
]

// ---------- 카테고리 ----------
type CatKey = 'device' | 'material' | 'phenomenon' | 'theory'
interface Cat { key: CatKey; label: string; icon: string; desc: string }
const CATS: Cat[] = [
  { key: 'device', label: '장치·기술명', icon: '🛠️', desc: '엔진·드라이브·필드 발생기 등 기계·기술의 이름' },
  { key: 'material', label: '물질·원소명', icon: '🧪', desc: '합금·동위원소·결정·플라스마 등 가공 물질의 이름' },
  { key: 'phenomenon', label: '현상·효과명', icon: '🌌', desc: '복사·붕괴·간섭 등 자연·인공 현상의 이름' },
  { key: 'theory', label: '이론·단위·수치명', icon: '📐', desc: '법칙·상수·지수·임계값 등 측정·이론 용어' },
]

// ---------- 어휘 풀 ----------
// 영문 표기(en)와 한국어 표기(ko)를 함께 갖는 형태소. 조합 시 두 표기를 각각 이어붙인다.
interface Morph { en: string; ko: string }

interface SlotPools {
  // 등급·계통 수식어(관형어) — 카테고리 독립. 명사구 앞에 붙는 수식 한정어(시제/표준형/군용 등)
  quality: Morph[]
  // 접두(수식·접두 어근)
  prefix: Morph[]
  // 어근(핵심 개념)
  root: Morph[]
  // 접미(장치·물질·현상·이론 분류 어미)
  suffix: Morph[]
}

// 등급·계통 수식어 풀(톤별) — 어떤 분류·접두·어근과도 충돌 없이 앞에 붙는 독립 관형어.
// 다른 슬롯을 전제하지 않으므로 곱집합으로 섞여도 의미 모순이 없다.
const QUALITY: Record<Tone, Morph[]> = {
  hard: [
    { en: 'Prototype', ko: '시제(試製)' }, { en: 'Standard', ko: '표준형' }, { en: 'Military-grade', ko: '군용' },
    { en: 'Industrial', ko: '산업용' }, { en: 'Experimental', ko: '실험용' }, { en: 'Compact', ko: '소형' },
    { en: 'Heavy', ko: '대형' }, { en: 'Modular', ko: '모듈형' }, { en: 'Redundant', ko: '이중화' },
    { en: 'Calibrated', ko: '교정형' }, { en: 'Shielded', ko: '차폐형' }, { en: 'Adaptive', ko: '적응형' },
    { en: 'High-yield', ko: '고출력' }, { en: 'Low-noise', ko: '저잡음' }, { en: 'Next-gen', ko: '차세대' },
    { en: 'Mass-production', ko: '양산형' },
  ],
  opera: [
    { en: 'Imperial', ko: '제국식(帝國式)' }, { en: 'Ancient', ko: '고대(古代)' }, { en: 'Forbidden', ko: '금단(禁斷)' },
    { en: 'Sacred', ko: '신성(神聖)' }, { en: 'Celestial', ko: '천계(天界)' }, { en: 'Forgotten', ko: '망각(忘却)' },
    { en: 'Royal', ko: '왕가(王家)' }, { en: 'Primordial', ko: '태초(太初)' }, { en: 'Exalted', ko: '숭고(崇高)' },
    { en: 'Ruinous', ko: '폐허(廢墟)' }, { en: 'Eternal', ko: '불멸(不滅)' }, { en: 'Astral', ko: '천상계(天上界)' },
    { en: 'Crowned', ko: '대관(戴冠)' }, { en: 'Hidden', ko: '은밀(隱密)' }, { en: 'Supreme', ko: '지고(至高)' },
    { en: 'Wandering', ko: '유랑(流浪)' },
  ],
}

// 톤별 접두 풀 — 하드SF는 실제 과학 접두사, 오페라는 웅장·신비 어휘
const PREFIX: Record<Tone, Morph[]> = {
  hard: [
    { en: 'Quantum', ko: '양자' }, { en: 'Sub', ko: '아(亞)' }, { en: 'Hyper', ko: '초(超)' },
    { en: 'Iso', ko: '동위(同位)' }, { en: 'Cryo', ko: '극저온' }, { en: 'Magneto', ko: '자기(磁氣)' },
    { en: 'Electro', ko: '전기' }, { en: 'Thermo', ko: '열(熱)' }, { en: 'Baryo', ko: '바리온' },
    { en: 'Photo', ko: '광(光)' }, { en: 'Pico', ko: '피코' }, { en: 'Nano', ko: '나노' },
    { en: 'Tachy', ko: '타키온' }, { en: 'Gravito', ko: '중력(重力)' }, { en: 'Neutrino', ko: '중성미자' },
    { en: 'Poly', ko: '다(多)' }, { en: 'Meta', ko: '메타' }, { en: 'Pseudo', ko: '의사(擬似)' },
    { en: 'Ferro', ko: '강자성' }, { en: 'Pyro', ko: '고열(高熱)' }, { en: 'Bio', ko: '생체(生體)' },
    { en: 'Cyber', ko: '전산(電算)' }, { en: 'Holo', ko: '홀로' }, { en: 'Mono', ko: '단(單)' },
    { en: 'Electrostatic', ko: '정전(靜電)' }, { en: 'Hydro', ko: '수(水)' }, { en: 'Acousto', ko: '음향(音響)' },
    { en: 'Opto', ko: '광학(光學)' }, { en: 'Geo', ko: '지각(地殼)' }, { en: 'Spectro', ko: '분광(分光)' },
    { en: 'Pleo', ko: '복(複)' }, { en: 'Exo', ko: '외(外)' },
  ],
  opera: [
    { en: 'Hyper', ko: '초(超)' }, { en: 'Void', ko: '공허(空虛)' }, { en: 'Astro', ko: '성(星)' },
    { en: 'Chrono', ko: '시(時)' }, { en: 'Aether', ko: '에테르' }, { en: 'Pulsar', ko: '맥동성' },
    { en: 'Solar', ko: '항성(恒星)' }, { en: 'Singular', ko: '특이(特異)' }, { en: 'Warp', ko: '곡률(曲率)' },
    { en: 'Nova', ko: '신성(新星)' }, { en: 'Dark', ko: '암흑(暗黑)' }, { en: 'Gravi', ko: '중력' },
    { en: 'Tesseract', ko: '초입방(超立方)' }, { en: 'Empyrean', ko: '천상(天上)' }, { en: 'Nebula', ko: '성운(星雲)' },
    { en: 'Quantum', ko: '양자' }, { en: 'Ion', ko: '이온' }, { en: 'Plasma', ko: '플라스마' },
    { en: 'Eternal', ko: '영겁(永劫)' }, { en: 'Phase', ko: '위상(位相)' }, { en: 'Stellar', ko: '항성계' },
    { en: 'Abyssal', ko: '심연(深淵)' }, { en: 'Radiant', ko: '광휘(光輝)' }, { en: 'Omni', ko: '전(全)' },
    { en: 'Galactic', ko: '은하(銀河)' }, { en: 'Lunar', ko: '월령(月靈)' }, { en: 'Cosmic', ko: '우주(宇宙)' },
    { en: 'Spectral', ko: '유령(幽靈)' }, { en: 'Verdant', ko: '창생(蒼生)' }, { en: 'Titan', ko: '거신(巨神)' },
    { en: 'Sable', ko: '흑요(黑曜)' }, { en: 'Aureate', ko: '황금(黃金)' },
  ],
}

// 카테고리별 어근 풀(톤별)
const ROOT: Record<CatKey, Record<Tone, Morph[]>> = {
  device: {
    hard: [
      { en: 'flux', ko: '플럭스' }, { en: 'fusion', ko: '융합' }, { en: 'ion', ko: '이온' },
      { en: 'inertial', ko: '관성' }, { en: 'plasma', ko: '플라스마' }, { en: 'gyro', ko: '자이로' },
      { en: 'phase', ko: '위상' }, { en: 'lattice', ko: '격자' }, { en: 'resonance', ko: '공명' },
      { en: 'containment', ko: '봉쇄' }, { en: 'spin', ko: '스핀' }, { en: 'coil', ko: '코일' },
      { en: 'thruster', ko: '추력' }, { en: 'scrubber', ko: '정화' }, { en: 'gradient', ko: '경사' },
      { en: 'manifold', ko: '집합관' }, { en: 'capacitor', ko: '축전' }, { en: 'aperture', ko: '조리개' },
      { en: 'damping', ko: '제동' }, { en: 'cooling', ko: '냉각' }, { en: 'guidance', ko: '유도' },
      { en: 'baffle', ko: '차단판' }, { en: 'rectifier', ko: '정류' }, { en: 'flywheel', ko: '관성륜' },
    ],
    opera: [
      { en: 'warp', ko: '곡률' }, { en: 'singularity', ko: '특이점' }, { en: 'pulse', ko: '맥동' },
      { en: 'lance', ko: '창(槍)' }, { en: 'beam', ko: '광선' }, { en: 'gate', ko: '관문' },
      { en: 'forge', ko: '용광로' }, { en: 'spire', ko: '첨탑' }, { en: 'sentinel', ko: '파수' },
      { en: 'cradle', ko: '요람' }, { en: 'reactor', ko: '노심(爐心)' }, { en: 'oracle', ko: '신탁' },
      { en: 'phalanx', ko: '방진(方陣)' }, { en: 'aegis', ko: '수호막' }, { en: 'leviathan', ko: '거수(巨獸)' },
      { en: 'beacon', ko: '봉화' }, { en: 'lattice', ko: '격자' }, { en: 'crucible', ko: '도가니' },
      { en: 'bastion', ko: '보루' }, { en: 'harbinger', ko: '전령' }, { en: 'monolith', ko: '석주(石柱)' },
      { en: 'sceptre', ko: '홀(笏)' }, { en: 'vortex', ko: '소용돌이' }, { en: 'citadel', ko: '아성(牙城)' },
    ],
  },
  material: {
    hard: [
      { en: 'carbide', ko: '탄화물' }, { en: 'silicate', ko: '규산염' }, { en: 'isotope', ko: '동위원소' },
      { en: 'alloy', ko: '합금' }, { en: 'polymer', ko: '고분자' }, { en: 'crystal', ko: '결정' },
      { en: 'aerogel', ko: '에어로젤' }, { en: 'graphene', ko: '그래핀' }, { en: 'ceramic', ko: '세라믹' },
      { en: 'hydride', ko: '수소화물' }, { en: 'fullerene', ko: '풀러렌' }, { en: 'plasma', ko: '플라스마' },
      { en: 'condensate', ko: '응축물' }, { en: 'filament', ko: '필라멘트' }, { en: 'amalgam', ko: '아말감' },
      { en: 'membrane', ko: '막(膜)' }, { en: 'substrate', ko: '기질(基質)' }, { en: 'oxide', ko: '산화물' },
      { en: 'nitride', ko: '질화물' }, { en: 'foam', ko: '발포체' }, { en: 'gel', ko: '겔상물' },
      { en: 'nanotube', ko: '나노튜브' }, { en: 'glass', ko: '유리질' }, { en: 'resin', ko: '수지(樹脂)' },
    ],
    opera: [
      { en: 'crystal', ko: '정수정(精水晶)' }, { en: 'ore', ko: '광석' }, { en: 'dust', ko: '성진(星塵)' },
      { en: 'steel', ko: '강철' }, { en: 'glass', ko: '유리' }, { en: 'ichor', ko: '영액(靈液)' },
      { en: 'shard', ko: '파편' }, { en: 'essence', ko: '정수(精髓)' }, { en: 'core', ko: '핵' },
      { en: 'matter', ko: '물질' }, { en: 'plasm', ko: '원형질' }, { en: 'ember', ko: '잔불씨' },
      { en: 'mithril', ko: '미스릴' }, { en: 'adamant', ko: '금강(金剛)' }, { en: 'mercury', ko: '수은' },
      { en: 'alloy', ko: '합금' }, { en: 'sap', ko: '수액(樹液)' }, { en: 'flame', ko: '불꽃' },
      { en: 'amber', ko: '호박석(琥珀石)' }, { en: 'obsidian', ko: '흑요석(黑曜石)' }, { en: 'pearl', ko: '진주' },
      { en: 'jade', ko: '비취(翡翠)' }, { en: 'rune', ko: '룬석' }, { en: 'gossamer', ko: '유사(遊絲)' },
    ],
  },
  phenomenon: {
    hard: [
      { en: 'decay', ko: '붕괴' }, { en: 'cascade', ko: '연쇄' }, { en: 'resonance', ko: '공명' },
      { en: 'interference', ko: '간섭' }, { en: 'radiation', ko: '복사' }, { en: 'diffusion', ko: '확산' },
      { en: 'flux', ko: '유속' }, { en: 'feedback', ko: '되먹임' }, { en: 'turbulence', ko: '난류' },
      { en: 'inversion', ko: '역전' }, { en: 'drift', ko: '표류' }, { en: 'collapse', ko: '함몰' },
      { en: 'shear', ko: '전단(剪斷)' }, { en: 'bloom', ko: '발광(發光)' }, { en: 'echo', ko: '반향' },
      { en: 'oscillation', ko: '진동' }, { en: 'discharge', ko: '방전' }, { en: 'leak', ko: '누설' },
      { en: 'scattering', ko: '산란' }, { en: 'attenuation', ko: '감쇠' }, { en: 'ionization', ko: '전리(電離)' },
      { en: 'condensation', ko: '응결' }, { en: 'recoil', ko: '반동' }, { en: 'saturation', ko: '포화' },
    ],
    opera: [
      { en: 'storm', ko: '폭풍' }, { en: 'tide', ko: '조류(潮流)' }, { en: 'rift', ko: '균열' },
      { en: 'maelstrom', ko: '대소용돌이' }, { en: 'halo', ko: '광륜(光輪)' }, { en: 'veil', ko: '장막' },
      { en: 'requiem', ko: '진혼(鎭魂)' }, { en: 'eclipse', ko: '식(蝕)' }, { en: 'flare', ko: '섬광' },
      { en: 'whisper', ko: '속삭임' }, { en: 'cascade', ko: '연쇄' }, { en: 'dawn', ko: '여명' },
      { en: 'dirge', ko: '진혼곡' }, { en: 'shroud', ko: '수의(壽衣)' }, { en: 'bloom', ko: '개화(開花)' },
      { en: 'wail', ko: '울부짖음' }, { en: 'pulse', ko: '맥동' }, { en: 'mirage', ko: '신기루' },
      { en: 'tempest', ko: '광풍(狂風)' }, { en: 'cataract', ko: '대폭류(大瀑流)' }, { en: 'aurora', ko: '극광(極光)' },
      { en: 'quietus', ko: '적멸(寂滅)' }, { en: 'surge', ko: '쇄도(殺到)' }, { en: 'wane', ko: '쇠퇴(衰退)' },
    ],
  },
  theory: {
    hard: [
      { en: 'constant', ko: '상수' }, { en: 'threshold', ko: '임계값' }, { en: 'coefficient', ko: '계수' },
      { en: 'index', ko: '지수' }, { en: 'limit', ko: '한계' }, { en: 'tensor', ko: '텐서' },
      { en: 'principle', ko: '원리' }, { en: 'equation', ko: '방정식' }, { en: 'invariant', ko: '불변량' },
      { en: 'metric', ko: '척도' }, { en: 'horizon', ko: '지평선' }, { en: 'quotient', ko: '몫' },
      { en: 'frequency', ko: '진동수' }, { en: 'differential', ko: '미분' }, { en: 'parity', ko: '반전성' },
      { en: 'entropy', ko: '엔트로피' }, { en: 'flux', ko: '플럭스' }, { en: 'symmetry', ko: '대칭성' },
      { en: 'eigenvalue', ko: '고윳값' }, { en: 'gradient', ko: '기울기 값' }, { en: 'amplitude', ko: '진폭' },
      { en: 'momentum', ko: '운동량' }, { en: 'curvature', ko: '곡률값' }, { en: 'distribution', ko: '분포' },
    ],
    opera: [
      { en: 'edict', ko: '율법(律法)' }, { en: 'paradox', ko: '역설' }, { en: 'horizon', ko: '지평선' },
      { en: 'covenant', ko: '계약' }, { en: 'axiom', ko: '공리' }, { en: 'prophecy', ko: '예언식' },
      { en: 'doctrine', ko: '교리' }, { en: 'genesis', ko: '창생(創生)' }, { en: 'requiem', ko: '진혼율' },
      { en: 'spectrum', ko: '스펙트럼' }, { en: 'conjecture', ko: '추측' }, { en: 'singularity', ko: '특이점' },
      { en: 'theorem', ko: '정리(定理)' }, { en: 'cipher', ko: '암호수' }, { en: 'cycle', ko: '주기' },
      { en: 'lattice', ko: '격자' }, { en: 'gradient', ko: '경도(傾度)' }, { en: 'continuum', ko: '연속체' },
      { en: 'mandate', ko: '천명(天命)' }, { en: 'litany', ko: '연도(連禱)' }, { en: 'sigil', ko: '인장수(印章數)' },
      { en: 'tenet', ko: '신조(信條)' }, { en: 'cadence', ko: '운율(韻律)' }, { en: 'omen', ko: '점괘(占卦)' },
    ],
  },
}

// 카테고리별 접미(분류 어미) 풀(톤별)
const SUFFIX: Record<CatKey, Record<Tone, Morph[]>> = {
  device: {
    hard: [
      { en: 'drive', ko: '드라이브' }, { en: 'array', ko: '어레이' }, { en: 'reactor', ko: '반응로' },
      { en: 'injector', ko: '주입기' }, { en: 'modulator', ko: '변조기' }, { en: 'dampener', ko: '감쇠기' },
      { en: 'emitter', ko: '방출기' }, { en: 'regulator', ko: '조절기' }, { en: 'matrix', ko: '매트릭스' },
      { en: 'core', ko: '코어' }, { en: 'conduit', ko: '도관' }, { en: 'chamber', ko: '챔버' },
      { en: 'turbine', ko: '터빈' }, { en: 'manifold', ko: '매니폴드' }, { en: 'projector', ko: '투사기' },
      { en: 'compressor', ko: '압축기' }, { en: 'amplifier', ko: '증폭기' }, { en: 'condenser', ko: '응축기' },
      { en: 'stabilizer', ko: '안정기' }, { en: 'collider', ko: '충돌기' },
    ],
    opera: [
      { en: 'cannon', ko: '포(砲)' }, { en: 'engine', ko: '기관' }, { en: 'drive', ko: '항법기' },
      { en: 'cradle', ko: '요람' }, { en: 'throne', ko: '옥좌' }, { en: 'gate', ko: '관문' },
      { en: 'spire', ko: '첨탑' }, { en: 'heart', ko: '심장' }, { en: 'crown', ko: '관(冠)' },
      { en: 'forge', ko: '단조로(鍛造爐)' }, { en: 'sanctum', ko: '성소(聖所)' }, { en: 'array', ko: '진(陣)' },
      { en: 'reactor', ko: '반응로' }, { en: 'pylon', ko: '지주(支柱)' }, { en: 'apparatus', ko: '기관체' },
      { en: 'obelisk', ko: '방첨탑(方尖塔)' }, { en: 'altar', ko: '제단(祭壇)' }, { en: 'loom', ko: '직조기' },
      { en: 'chariot', ko: '전차(戰車)' }, { en: 'halo', ko: '광환(光環)' },
    ],
  },
  material: {
    hard: [
      { en: 'ite', ko: '석(石)' }, { en: 'ium', ko: '늄' }, { en: 'ide', ko: '화물' },
      { en: 'on', ko: '온' }, { en: 'ene', ko: '엔' }, { en: 'oid', ko: '오이드' },
      { en: 'plast', ko: '플라스트' }, { en: 'gel', ko: '겔' }, { en: 'foam', ko: '폼' },
      { en: 'mesh', ko: '메시' }, { en: 'weave', ko: '직물' }, { en: 'lattice', ko: '격자' },
      { en: 'composite', ko: '복합재' }, { en: 'film', ko: '박막' }, { en: 'matrix', ko: '기지(基地)' },
      { en: 'fiber', ko: '섬유' }, { en: 'crystal', ko: '결정체' }, { en: 'powder', ko: '분말' },
      { en: 'slurry', ko: '현탁액' }, { en: 'coating', ko: '피막(被膜)' },
    ],
    opera: [
      { en: 'ite', ko: '석(石)' }, { en: 'ium', ko: '석정' }, { en: 'steel', ko: '강(鋼)' },
      { en: 'glass', ko: '유리' }, { en: 'silver', ko: '은(銀)' }, { en: 'gold', ko: '금(金)' },
      { en: 'heart', ko: '심결정(心結晶)' }, { en: 'tear', ko: '눈물석' }, { en: 'bone', ko: '골(骨)' },
      { en: 'blood', ko: '혈정(血晶)' }, { en: 'fire', ko: '화정(火晶)' }, { en: 'frost', ko: '빙정(氷晶)' },
      { en: 'dust', ko: '진(塵)' }, { en: 'weave', ko: '직물' }, { en: 'shroud', ko: '수의석' },
      { en: 'crown', ko: '관석(冠石)' }, { en: 'sigil', ko: '문양석(紋樣石)' }, { en: 'wing', ko: '익정(翼晶)' },
      { en: 'thorn', ko: '가시정' }, { en: 'veil', ko: '면사석(面紗石)' },
    ],
  },
  phenomenon: {
    hard: [
      { en: 'effect', ko: '효과' }, { en: 'event', ko: '현상' }, { en: 'wave', ko: '파동' },
      { en: 'pulse', ko: '펄스' }, { en: 'storm', ko: '폭풍' }, { en: 'window', ko: '창(窓)' },
      { en: 'anomaly', ko: '이상(異常)' }, { en: 'spike', ko: '급증' }, { en: 'shift', ko: '편이' },
      { en: 'field', ko: '장(場)' }, { en: 'front', ko: '전선' }, { en: 'burst', ko: '폭발' },
      { en: 'loop', ko: '루프' }, { en: 'plume', ko: '깃털기둥' }, { en: 'signature', ko: '신호' },
      { en: 'gradient', ko: '구배(勾配)' }, { en: 'resonance', ko: '공진' }, { en: 'flicker', ko: '점멸' },
      { en: 'halo', ko: '후광' }, { en: 'wake', ko: '후류(後流)' },
    ],
    opera: [
      { en: 'storm', ko: '폭풍' }, { en: 'tide', ko: '조수' }, { en: 'song', ko: '노래' },
      { en: 'requiem', ko: '진혼' }, { en: 'veil', ko: '장막' }, { en: 'shroud', ko: '장막' },
      { en: 'cataclysm', ko: '대재앙' }, { en: 'awakening', ko: '각성' }, { en: 'omen', ko: '전조' },
      { en: 'rift', ko: '균열' }, { en: 'halo', ko: '광륜' }, { en: 'lament', ko: '비가(悲歌)' },
      { en: 'reckoning', ko: '심판' }, { en: 'bloom', ko: '개화' }, { en: 'wake', ko: '항적(航跡)' },
      { en: 'dirge', ko: '만가(輓歌)' }, { en: 'eclipse', ko: '월식(月蝕)' }, { en: 'descent', ko: '강림(降臨)' },
      { en: 'procession', ko: '행렬' }, { en: 'mourning', ko: '애도(哀悼)' },
    ],
  },
  theory: {
    hard: [
      { en: 'principle', ko: '원리' }, { en: 'theorem', ko: '정리' }, { en: 'law', ko: '법칙' },
      { en: 'limit', ko: '한계' }, { en: 'constant', ko: '상수' }, { en: 'parameter', ko: '매개변수' },
      { en: 'function', ko: '함수' }, { en: 'index', ko: '지수' }, { en: 'ratio', ko: '비(比)' },
      { en: 'invariance', ko: '불변성' }, { en: 'gradient', ko: '기울기' }, { en: 'manifold', ko: '다양체' },
      { en: 'criterion', ko: '판정기준' }, { en: 'bound', ko: '경계' }, { en: 'metric', ko: '계량(計量)' },
      { en: 'inequality', ko: '부등식' }, { en: 'conjecture', ko: '추론' }, { en: 'identity', ko: '항등식' },
      { en: 'lemma', ko: '보조정리' }, { en: 'norm', ko: '노름' },
    ],
    opera: [
      { en: 'edict', ko: '칙령' }, { en: 'paradox', ko: '역설' }, { en: 'covenant', ko: '서약' },
      { en: 'prophecy', ko: '예언' }, { en: 'doctrine', ko: '교의' }, { en: 'law', ko: '율법' },
      { en: 'reckoning', ko: '셈법' }, { en: 'cipher', ko: '암호' }, { en: 'theorem', ko: '정리' },
      { en: 'cycle', ko: '윤회(輪廻)' }, { en: 'genesis', ko: '창세론' }, { en: 'horizon', ko: '지평' },
      { en: 'spectrum', ko: '스펙트럼' }, { en: 'continuum', ko: '연속체' }, { en: 'verdict', ko: '판결률' },
      { en: 'mandate', ko: '명령률' }, { en: 'litany', ko: '연도율(連禱律)' }, { en: 'creed', ko: '신경(信經)' },
      { en: 'rite', ko: '의례율' }, { en: 'canon', ko: '정전율(正典律)' },
    ],
  },
}

function poolsFor(cat: CatKey, tone: Tone): SlotPools {
  return { quality: QUALITY[tone], prefix: PREFIX[tone], root: ROOT[cat][tone], suffix: SUFFIX[cat][tone] }
}

// ---------- 용례(예문) ----------
// 용어(명사구)가 들어갈 자리를 비워두고, 들어가는 용어의 받침에 따라 조사를 실제로 골라 한 문장을 만든다.
// 분류마다 용어의 문법 역할(주어/목적어/부사어)에 맞는 명사 자리만 비운다 — 종결문을 명사 자리에 넣지 않는다.
// 각 함수는 (용어 한국어) → 완성 문장. {을/를} 등 괄호 이중표기는 절대 만들지 않는다.
type UsageFn = (term: string) => string
const USAGE: Record<CatKey, UsageFn[]> = {
  device: [
    (t) => `${t}${josaEulReul(t)} 가동하자 함교의 계기판이 일제히 깨어났다.`,
    (t) => `정비반은 밤새 ${t}${josaEulReul(t)} 분해하고 다시 조립했다.`,
    (t) => `${t}${josaIGa(t)} 과부하를 일으키기 직전이라 출력을 낮춰야 했다.`,
    (t) => `함장은 ${t}${josaEuro(t)} 도약 좌표를 고정하라고 명령했다.`,
  ],
  material: [
    (t) => `선체 외판은 ${t}${josaEuro(t)} 새로 도금되어 있었다.`,
    (t) => `${t}${josaIGa(t)} 진공에서도 변형되지 않는다는 사실이 밝혀졌다.`,
    (t) => `광부들은 소행성대에서 ${t}${josaEulReul(t)} 캐내 본국으로 실어 날랐다.`,
    (t) => `${t}${josaEunNeun(t)} 극한의 압력에서도 본래 색을 잃지 않았다.`,
  ],
  phenomenon: [
    (t) => `관측소는 항성 표면에서 ${t}${josaEulReul(t)} 처음으로 포착했다.`,
    (t) => `${t}${josaIGa(t)} 통신망 전체를 한순간에 마비시켰다.`,
    (t) => `${t}${josaEunNeun(t)} 매 13년마다 같은 성역에서 되풀이되었다.`,
    (t) => `승무원들은 ${t}${josaEuro(t)} 인한 환각에 시달렸다.`,
  ],
  theory: [
    (t) => `${t}${josaEunNeun(t)} 아직 어떤 실험으로도 반증되지 않았다.`,
    (t) => `젊은 학자는 ${t}${josaEulReul(t)} 증명해 학계를 뒤흔들었다.`,
    (t) => `항법 컴퓨터는 ${t}${josaEuro(t)} 도약 경로를 산출한다.`,
    (t) => `${t}${josaIGa(t)} 성립하지 않는 영역이 존재한다는 보고가 올라왔다.`,
  ],
}

// ---------- 모델·계열 식별자(designation) ----------
// 실제 SF·공학 명명처럼 "Mark VII / Type-Δ / Mk.42 / Σ-9 / 시리즈 1138" 같은 식별자를 절차적으로 생성.
// 포맷 × 그리스문자/로마숫자/숫자범위 조합으로 조합수를 정직하게 수백만~수억 규모로 끌어올린다.
const GREEK: Morph[] = [
  { en: 'Alpha', ko: '알파' }, { en: 'Beta', ko: '베타' }, { en: 'Gamma', ko: '감마' }, { en: 'Delta', ko: '델타' },
  { en: 'Epsilon', ko: '엡실론' }, { en: 'Zeta', ko: '제타' }, { en: 'Eta', ko: '에타' }, { en: 'Theta', ko: '세타' },
  { en: 'Iota', ko: '이오타' }, { en: 'Kappa', ko: '카파' }, { en: 'Lambda', ko: '람다' }, { en: 'Sigma', ko: '시그마' },
  { en: 'Omega', ko: '오메가' }, { en: 'Phi', ko: '파이' }, { en: 'Chi', ko: '카이' }, { en: 'Psi', ko: '프시' },
]
const GREEK_SYM = ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ', 'Η', 'Θ', 'Ι', 'Κ', 'Λ', 'Σ', 'Ω', 'Φ', 'Χ', 'Ψ']
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
// 식별자 포맷의 개수(절차 생성). 각 포맷은 (영문, 한국어) 한 쌍을 만든다.
// 포맷 수 × 내부 인자 범위 = 식별자 경우의 수. 아래 designationSpace() 로 정확히 센다.
const NUM_MAX = 4096 // 모델 번호 범위(1..NUM_MAX)
function makeDesignation(): { en: string; ko: string } {
  const fmt = Math.floor(Math.random() * 8)
  const n = 1 + Math.floor(Math.random() * NUM_MAX)
  const g = pick(GREEK)
  const gsym = pick(GREEK_SYM)
  const rom = pick(ROMAN)
  switch (fmt) {
    case 0: return { en: `Mark ${rom}`, ko: `Mark ${rom}` }
    case 1: return { en: `Mk.${n}`, ko: `Mk.${n}` }
    case 2: return { en: `Type-${g.en}`, ko: `${g.ko}형` }
    case 3: return { en: `${gsym}-${n}`, ko: `${gsym}-${n}` }
    case 4: return { en: `Series ${n}`, ko: `${n}형 계열` }
    case 5: return { en: `Rev.${rom}`, ko: `${rom}차 개정` }
    case 6: return { en: `Model ${g.en}${n % 100}`, ko: `${g.ko}${n % 100} 모델` }
    default: return { en: `Unit-${n}`, ko: `${n}호기` }
  }
}
// 식별자 경우의 수(포맷별 인자 범위 합) — 조합수 표시에 사용.
function designationSpace(): number {
  return (
    ROMAN.length +          // fmt0: Mark <roman>
    NUM_MAX +               // fmt1: Mk.<n>
    GREEK.length +          // fmt2: Type-<greek>
    GREEK_SYM.length * NUM_MAX + // fmt3: <sym>-<n>
    NUM_MAX +               // fmt4: Series <n>
    ROMAN.length +          // fmt5: Rev.<roman>
    GREEK.length * 100 +    // fmt6: Model <greek><n%100>
    NUM_MAX                 // fmt7: Unit-<n>
  )
}
const DESIG_SPACE = designationSpace()

// ---------- 조합 ----------
const LS = 'sry:tool:sf-technobabble:'
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const fmtNum = (n: number) => n.toLocaleString('ko-KR')

const rid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

// ---------- 한국어 조사 결정 헬퍼 ----------
// 단어 끝 글자의 받침 유무를 보고 실제 조사 한쪽만 출력한다(괄호 이중표기 금지).
// 한자 병기(예: 場·計量)는 한글 음으로 읽으므로 끝의 괄호 보충을 떼고 그 앞 한글/숫자로 판단한다.
function josaCore(s: string): string {
  let t = String(s).trim()
  t = t.replace(/\s*\([^()]*\)\s*$/, '').trim() // 끝의 (한자) 보충 제거
  return t
}
// 숫자 음독의 받침 유무(0영·1일·3삼·6육·7칠·8팔=받침 있음 / 2이·4사·5오·9구=없음)
const DIGIT_BATCHIM: Record<string, boolean> = { '0': true, '1': true, '3': true, '6': true, '7': true, '8': true }
function hasBatchim(ch: string): boolean {
  const code = ch.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0
  if (/[0-9]/.test(ch)) return !!DIGIT_BATCHIM[ch]
  return false // 라틴 문자 등 판별 불가 → 받침 없음으로 처리
}
function isRieul(ch: string): boolean {
  const code = ch.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 === 8 // 종성 ㄹ
  return false
}
function lastJosaChar(s: string): string { const c = josaCore(s); return c.charAt(c.length - 1) }
const josaEulReul = (s: string) => (hasBatchim(lastJosaChar(s)) ? '을' : '를')
const josaIGa = (s: string) => (hasBatchim(lastJosaChar(s)) ? '이' : '가')
const josaEunNeun = (s: string) => (hasBatchim(lastJosaChar(s)) ? '은' : '는')
const josaEuro = (s: string) => { const ch = lastJosaChar(s); return isRieul(ch) ? '로' : hasBatchim(ch) ? '으로' : '로' }

interface Term {
  id: string
  en: string       // 영문 표기(예: "Standard Quantum flux drive Mk.42")
  ko: string       // 한국어 표기(예: "표준형 양자 플럭스 드라이브 Mk.42")
  example: string  // 용례 한 문장(조사 자동 결정)
  cat: CatKey
  tone: Tone
  // 슬롯 원천(잠금/재조합 추적용)
  q: Morph; p: Morph; r: Morph; s: Morph
}

interface Saved { id: string; en: string; ko: string; cat: CatKey; tone: Tone }

// 영문 합성: 접미가 '-ite/-ium/-ide/-on/-ene/-oid' 류면 어근에 직접 붙이고, 아니면 띄어쓴다.
const GLUE = new Set(['ite', 'ium', 'ide', 'on', 'ene', 'oid', 'plast'])
function composeEn(q: Morph, p: Morph, r: Morph, s: Morph): string {
  const glued = GLUE.has(s.en.toLowerCase())
  // 어근 끝모음 정리(예: silicate+ium → silicat+ium 류는 과하지 않게 그대로 둠 → 가독 우선)
  const tail = glued ? `${r.en}${s.en}` : `${r.en} ${s.en}`
  return `${cap(q.en)} ${cap(p.en)} ${tail}`.replace(/\s+/g, ' ').trim()
}
function composeKo(q: Morph, p: Morph, r: Morph, s: Morph): string {
  return `${q.ko} ${p.ko} ${r.ko}${s.ko}`.replace(/\s+/g, ' ').trim()
}

function makeTerm(cat: CatKey, tone: Tone, withDesig: boolean, lock?: { q?: Morph; p?: Morph; r?: Morph; s?: Morph }): Term {
  const pools = poolsFor(cat, tone)
  const q = lock?.q ?? pick(pools.quality)
  const p = lock?.p ?? pick(pools.prefix)
  const r = lock?.r ?? pick(pools.root)
  const s = lock?.s ?? pick(pools.suffix)
  let en = composeEn(q, p, r, s)
  let ko = composeKo(q, p, r, s)
  // 용례는 식별자 없는 명사구 본체로 만든다(문장 가독). 분류별 명사 자리에만 삽입.
  const example = pick(USAGE[cat])(ko)
  if (withDesig) {
    const d = makeDesignation()
    en = `${en} ${d.en}`
    ko = `${ko} ${d.ko}`
  }
  return { id: rid(), en, ko, example, cat, tone, q, p, r, s }
}

function loadSaved(): Saved[] {
  try {
    const raw = localStorage.getItem(LS + 'saved')
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
      .filter((x) => x && typeof x.en === 'string' && typeof x.ko === 'string')
      .map((x) => ({ id: typeof x.id === 'string' ? x.id : rid(), en: x.en, ko: x.ko, cat: x.cat, tone: x.tone }))
  } catch { return [] }
}

const BATCH = 12

export default function SfTechnobabble({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 가 우리 장르가 아니어도 동작하지만, SF 외 장르로 열려도 무해. (참고용으로만 사용)
  const incomingGenre = payload && typeof (payload as Record<string, unknown>).genre === 'string'
    ? String((payload as Record<string, unknown>).genre) : ''

  const [tone, setTone] = useState<Tone>(() => {
    const v = localStorage.getItem(LS + 'tone')
    return v === 'opera' ? 'opera' : 'hard'
  })
  const [cat, setCat] = useState<CatKey>(() => {
    const v = localStorage.getItem(LS + 'cat') as CatKey | null
    return CATS.some((c) => c.key === v) ? (v as CatKey) : 'device'
  })
  const [withDesig, setWithDesig] = useState<boolean>(() => localStorage.getItem(LS + 'desig') !== '0')
  const [terms, setTerms] = useState<Term[]>([])
  // 슬롯 잠금: 잠긴 슬롯의 형태소를 보관(다음 생성 시 고정)
  const [lockQ, setLockQ] = useState<Morph | null>(null)
  const [lockP, setLockP] = useState<Morph | null>(null)
  const [lockR, setLockR] = useState<Morph | null>(null)
  const [lockS, setLockS] = useState<Morph | null>(null)
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved())
  const [copiedId, setCopiedId] = useState('')
  const [toast, setToast] = useState('')

  const alive = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 톤/카테고리 영속
  useEffect(() => { try { localStorage.setItem(LS + 'tone', tone) } catch { /* ignore */ } }, [tone])
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'desig', withDesig ? '1' : '0') } catch { /* ignore */ } }, [withDesig])
  // 즐겨찾기 영속
  useEffect(() => { try { localStorage.setItem(LS + 'saved', JSON.stringify(saved)) } catch { /* ignore */ } }, [saved])

  // 잠금은 현재 카테고리·톤의 풀에 속할 때만 유효 — 톤/카테고리 변경 시 무효화
  useEffect(() => {
    const pools = poolsFor(cat, tone)
    if (lockQ && !pools.quality.some((m) => m.en === lockQ.en && m.ko === lockQ.ko)) setLockQ(null)
    if (lockP && !pools.prefix.some((m) => m.en === lockP.en && m.ko === lockP.ko)) setLockP(null)
    if (lockR && !pools.root.some((m) => m.en === lockR.en && m.ko === lockR.ko)) setLockR(null)
    if (lockS && !pools.suffix.some((m) => m.en === lockS.en && m.ko === lockS.ko)) setLockS(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, tone])

  const generate = useCallback(() => {
    const lock = { q: lockQ ?? undefined, p: lockP ?? undefined, r: lockR ?? undefined, s: lockS ?? undefined }
    const out: Term[] = []
    const seen = new Set<string>()
    let guard = 0
    while (out.length < BATCH && guard < BATCH * 20) {
      guard++
      const t = makeTerm(cat, tone, withDesig, lock)
      if (seen.has(t.en)) continue
      seen.add(t.en)
      out.push(t)
    }
    setTerms(out)
    setCopiedId('')
  }, [cat, tone, withDesig, lockQ, lockP, lockR, lockS])

  // 최초 1회 자동 생성(빈 화면 방지)
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const flashToast = (msg: string) => {
    if (!alive.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => alive.current && setToast(''), 1900)
  }

  const copy = (text: string, id: string) => {
    if (!navigator.clipboard) { flashToast('이 환경에서는 복사를 지원하지 않습니다.'); return }
    navigator.clipboard.writeText(text).then(() => {
      if (!alive.current) return
      setCopiedId(id)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => alive.current && setCopiedId(''), 1300)
    }).catch(() => alive.current && flashToast('복사에 실패했습니다.'))
  }

  // 슬롯 잠금: 현재 배치에서 특정 용어의 형태소로 슬롯 고정/해제(토글)
  const toggleLockQ = (m: Morph) => setLockQ((cur) => (cur && cur.en === m.en && cur.ko === m.ko ? null : m))
  const toggleLockP = (m: Morph) => setLockP((cur) => (cur && cur.en === m.en && cur.ko === m.ko ? null : m))
  const toggleLockR = (m: Morph) => setLockR((cur) => (cur && cur.en === m.en && cur.ko === m.ko ? null : m))
  const toggleLockS = (m: Morph) => setLockS((cur) => (cur && cur.en === m.en && cur.ko === m.ko ? null : m))

  const isSaved = (t: Term) => saved.some((s) => s.en === t.en)
  const saveTerm = (t: Term) => {
    setSaved((prev) => (prev.some((s) => s.en === t.en) ? prev : [{ id: rid(), en: t.en, ko: t.ko, cat: t.cat, tone: t.tone }, ...prev]))
  }
  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))

  // 스니펫 라이브러리에 저장(다른 도구에서 재사용)
  const toSnippet = (t: Term) => {
    addToLibrary('snippets', {
      text: `${t.ko} (${t.en})`,
      source: 'SF 테크노버블 생성기',
      tags: ['SF', 'SF용어', CATS.find((c) => c.key === t.cat)?.label || '용어'],
    })
    flashToast(`스니펫에 저장: ${t.ko}`)
  }
  // 즐겨찾기 전체를 스니펫으로
  const allSavedToSnippets = () => {
    if (!saved.length) return
    saved.forEach((s) => addToLibrary('snippets', { text: `${s.ko} (${s.en})`, source: 'SF 테크노버블 생성기', tags: ['SF', 'SF용어'] }))
    flashToast(`스니펫 라이브러리에 ${saved.length}건 저장`)
  }

  const linked = hasProjectBridge()

  // 프로젝트 자료 〈SF 용어〉 폴더에 사전 메모로 추가 — 단일 또는 즐겨찾기 전체
  const buildBody = (items: { en: string; ko: string; cat: CatKey; tone: Tone }[]) => {
    const rows = items.map((it) => {
      const catLabel = CATS.find((c) => c.key === it.cat)?.label || ''
      const toneLabel = TONES.find((tn) => tn.key === it.tone)?.label || ''
      return `<li><b>${esc(it.ko)}</b> <span style="color:#888">(${esc(it.en)})</span> — ${esc(catLabel)} · ${esc(toneLabel)}</li>`
    }).join('\n')
    return `<p>SF 테크노버블 생성기로 만든 가상 과학용어입니다.</p>\n<ul>\n${rows}\n</ul>`
  }
  const termToProject = (t: Term) => {
    if (!linked) { flashToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: 'SF 용어',
      title: `🛰️ ${t.ko}`,
      bodyHtml: buildBody([t]),
      meta: { 출처: 'SF 테크노버블 생성기', 분류: CATS.find((c) => c.key === t.cat)?.label || '', 톤: TONES.find((tn) => tn.key === t.tone)?.label || '', 영문: t.en },
    })
    flashToast(id ? `프로젝트 〈SF 용어〉에 추가: ${t.ko}` : '프로젝트에 추가하지 못했습니다.')
  }
  const allSavedToProject = () => {
    if (!linked) { flashToast('프로젝트에 연결되어 있지 않습니다.'); return }
    if (!saved.length) return
    const id = addToProject({
      kind: 'text', root: 'research', folder: 'SF 용어',
      title: `🛰️ SF 용어 사전 ${saved.length}건`,
      bodyHtml: buildBody(saved),
      meta: { 출처: 'SF 테크노버블 생성기', 용어수: String(saved.length) },
    })
    flashToast(id ? `프로젝트 〈SF 용어〉에 ${saved.length}건 추가` : '프로젝트에 추가하지 못했습니다.')
  }

  // 조합수: 현재 카테고리·톤 풀 곱 × 식별자 공간(켜진 경우) + (고정 슬롯 반영)
  const pools = poolsFor(cat, tone)
  const dim = (n: number, locked: boolean) => (locked ? 1 : n)
  const desigFactor = withDesig ? DESIG_SPACE : 1
  const liveCombos = dim(pools.quality.length, !!lockQ) * dim(pools.prefix.length, !!lockP) * dim(pools.root.length, !!lockR) * dim(pools.suffix.length, !!lockS) * desigFactor
  // 전체(모든 카테고리·양 톤) 총 조합수 — 식별자 포함 시 "수십억" 규모
  const grandTotal = CATS.reduce((sum, c) => {
    return sum + TONES.reduce((s2, tn) => {
      const pl = poolsFor(c.key, tn.key)
      return s2 + pl.quality.length * pl.prefix.length * pl.root.length * pl.suffix.length * DESIG_SPACE
    }, 0)
  }, 0)

  const lockedCount = [lockQ, lockP, lockR, lockS].filter(Boolean).length

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }
  const card: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 6 }
  const slotBtn = (on: boolean): React.CSSProperties => ({
    fontSize: 11, padding: '2px 6px', borderRadius: 6, cursor: 'pointer',
    border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
    background: on ? 'var(--accent)' : 'transparent',
    color: on ? '#fff' : 'var(--muted)',
  })

  const curToneDesc = TONES.find((t) => t.key === tone)?.desc || ''
  const curCatDesc = CATS.find((c) => c.key === cat)?.desc || ''

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>수식 + 접두 + 어근 + 접미</b> 슬롯을 무작위 조합해 그럴듯한 가짜 과학용어를 한 번에 {BATCH}개씩 만들고, 받침을 가려 조사를 자동으로 맞춘 용례까지 보여줍니다. 마음에 드는 형태소는 칩의 <Emoji e="🔒"/>을 눌러 고정하면, 그 슬롯은 고정한 채 나머지만 다시 굴립니다.
        {incomingGenre && incomingGenre !== 'SF·과학소설' && <span> (연계 장르: {incomingGenre})</span>}
      </div>

      {/* 톤 선택 */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>톤</div>
        <div style={chipRow}>
          {TONES.map((t) => {
            const on = tone === t.key
            return (
              <button key={t.key} className="minibtn" onClick={() => setTone(t.key)} aria-pressed={on}
                style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)', opacity: on ? 1 : 0.65 }}>
                <Emoji e={t.icon}/> {t.label}
              </button>
            )
          })}
        </div>
        <div style={{ ...hint, marginTop: 4, fontSize: 11 }}>{curToneDesc}</div>
      </div>

      {/* 카테고리 선택 */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>분류</div>
        <div style={chipRow}>
          {CATS.map((c) => {
            const on = cat === c.key
            return (
              <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on}
                style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)', opacity: on ? 1 : 0.65 }}>
                <Emoji e={c.icon}/> {c.label}
              </button>
            )
          })}
        </div>
        <div style={{ ...hint, marginTop: 4, fontSize: 11 }}>{curCatDesc}</div>
      </div>

      {/* 모델·계열 식별자 토글 */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
        <input type="checkbox" checked={withDesig} onChange={(e) => setWithDesig(e.target.checked)} />
        <span>모델·계열 식별자 붙이기 <span style={{ color: 'var(--muted)' }}>(예: Mk.42 · Type-Δ · Σ-7 · {NUM_MAX}호기 — 조합수를 수십억 규모로 확장)</span></span>
      </label>

      {/* 조합수 표시 */}
      <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '6px 0' }}>
        <span>현재 분류·톤 조합 <b style={{ color: 'var(--accent)' }}>{fmtNum(liveCombos)}</b>가지 · 전체 <b style={{ color: 'var(--accent)' }}>{fmtNum(grandTotal)}</b>가지</span>
        <span>{lockedCount > 0 ? <><Emoji e="🔒"/> {lockedCount}개 슬롯 고정됨</> : '고정 없음 — 전부 새로 조합'}</span>
      </div>

      {/* 생성 결과(대량) */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 2 }}>
        <div style={grid}>
          {terms.map((t) => {
            const qOn = !!lockQ && lockQ.en === t.q.en && lockQ.ko === t.q.ko
            const pOn = !!lockP && lockP.en === t.p.en && lockP.ko === t.p.ko
            const rOn = !!lockR && lockR.en === t.r.en && lockR.ko === t.r.ko
            const sOn = !!lockS && lockS.en === t.s.en && lockS.ko === t.s.ko
            const savedAlready = isSaved(t)
            return (
              <div key={t.id} style={card}>
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, overflowWrap: 'anywhere' }}>{t.ko}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', overflowWrap: 'anywhere' }}>{t.en}</div>
                {/* 용례 — 조사 자동 결정 */}
                <div style={{ fontSize: 12, color: 'var(--text)', opacity: 0.85, lineHeight: 1.45, overflowWrap: 'anywhere' }}><Emoji e="✍️"/> {t.example}</div>
                {/* 슬롯 잠금 칩 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  <span style={slotBtn(qOn)} onClick={() => toggleLockQ(t.q)} title={qOn ? '수식어 고정 해제' : '이 수식어로 고정'} role="button">{qOn ? <Emoji e="🔒"/> : '＋'}수식 {t.q.ko}</span>
                  <span style={slotBtn(pOn)} onClick={() => toggleLockP(t.p)} title={pOn ? '접두 고정 해제' : '이 접두로 고정'} role="button">{pOn ? <Emoji e="🔒"/> : '＋'}접두 {t.p.ko}</span>
                  <span style={slotBtn(rOn)} onClick={() => toggleLockR(t.r)} title={rOn ? '어근 고정 해제' : '이 어근으로 고정'} role="button">{rOn ? <Emoji e="🔒"/> : '＋'}어근 {t.r.ko}</span>
                  <span style={slotBtn(sOn)} onClick={() => toggleLockS(t.s)} title={sOn ? '접미 고정 해제' : '이 접미로 고정'} role="button">{sOn ? <Emoji e="🔒"/> : '＋'}접미 {t.s.ko}</span>
                </div>
                {/* 액션 */}
                <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                  <button className="minibtn" style={{ flex: 1, color: savedAlready ? 'var(--ok)' : undefined }} onClick={() => saveTerm(t)} disabled={savedAlready} title={savedAlready ? '이미 즐겨찾기에 있음' : '즐겨찾기에 저장'}>
                    {savedAlready ? '★ 저장됨' : '☆ 저장'}
                  </button>
                  <button className="minibtn" onClick={() => copy(`${t.ko} (${t.en})`, t.id)} title="용어 복사">{copiedId === t.id ? '✓' : <Emoji e="📋"/>}</button>
                </div>
                <div className="linkbar" style={{ display: 'flex', gap: 6 }}>
                  <button className="linkbtn" style={{ flex: 1 }} onClick={() => toSnippet(t)} title="스니펫 라이브러리에 저장"><Emoji e="💾"/> 스니펫</button>
                  <button className="linkbtn" style={{ flex: 1 }} onClick={() => termToProject(t)} disabled={!linked} title={linked ? '프로젝트 자료 〈SF 용어〉에 추가' : '프로젝트가 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* 즐겨찾기 */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span><Emoji e="⭐"/> 즐겨찾기 {saved.length ? `(${saved.length})` : ''}</span>
            {!!saved.length && (
              <span style={{ display: 'flex', gap: 6 }}>
                <button className="linkbtn" onClick={allSavedToSnippets} title="즐겨찾기 전체를 스니펫 라이브러리에 저장"><Emoji e="💾"/> 전체 스니펫</button>
                <button className="linkbtn" onClick={allSavedToProject} disabled={!linked} title={linked ? '즐겨찾기 전체를 프로젝트 자료 〈SF 용어〉에 추가' : '프로젝트가 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
              </span>
            )}
          </div>
          {!saved.length ? (
            <div style={{ ...hint, padding: '8px 0' }}>아직 저장한 용어가 없습니다. 카드의 ☆를 눌러 마음에 드는 용어를 모아보세요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {saved.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 9px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, overflowWrap: 'anywhere' }}>{s.ko}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8, fontStyle: 'italic' }}>{s.en}</span>
                  </div>
                  <button className="linkbtn" onClick={() => { addToLibrary('snippets', { text: `${s.ko} (${s.en})`, source: 'SF 테크노버블 생성기', tags: ['SF', 'SF용어'] }); flashToast(`스니펫에 저장: ${s.ko}`) }} title="스니펫 라이브러리에 저장"><Emoji e="💾"/></button>
                  <button className="minibtn" onClick={() => copy(`${s.ko} (${s.en})`, s.id)} title="복사">{copiedId === s.id ? '✓' : <Emoji e="📋"/>}</button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제"><Emoji e="🗑️"/></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 액션 바 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 160 }} onClick={generate}><Emoji e="🛰️"/> {BATCH}개 새로 생성</button>
        <button className="minibtn" onClick={() => { setLockQ(null); setLockP(null); setLockR(null); setLockS(null) }} disabled={!lockedCount} title="모든 슬롯 고정 해제"><Emoji e="🔓"/> 고정 해제</button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}

      <div style={hint}>고정한 슬롯(🔒)은 그대로 두고 나머지만 새로 조합합니다. 생성된 용어는 출발점일 뿐 — 작품 세계관에 맞게 자유롭게 다듬으세요.</div>

      {/* 저작권: 모든 형태소·풀은 본 도구가 자체 작성한 창작 어휘로, 외부 저작물 미사용 */}
      <div className="license-note" style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.4 }}>
        <span className="license-badge">자체 창작</span> 모든 형태소 풀은 이 도구가 자체 작성한 오리지널 어휘이며, 외부 저작물을 사용하지 않습니다.
      </div>
    </div>
  )
}
