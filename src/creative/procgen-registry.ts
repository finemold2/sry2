// 절차적 합성 생성기 레지스트리 — 전 카테고리 모듈 자동 수집(scripts/_genregistry.cjs 로 생성). 총 102개 모듈.
// 모든 합성기는 expandComposer 로 보편 변주 슬롯 2개가 더해져 조합 공간이 ×144 확장된다.
import { type Composer, expandComposer } from './procgen.ts'
import { COMPOSERS_ABILITY } from './data/procgen-ability.ts'
import { COMPOSERS_AERIAL } from './data/procgen-aerial.ts'
import { COMPOSERS_AFTERLIFE } from './data/procgen-afterlife.ts'
import { COMPOSERS_AITECH } from './data/procgen-aitech.ts'
import { COMPOSERS_APOCALYPSE } from './data/procgen-apocalypse.ts'
import { COMPOSERS_ARCHITECTURE } from './data/procgen-architecture.ts'
import { COMPOSERS_ARTICLELEAD } from './data/procgen-articlelead.ts'
import { COMPOSERS_ATMOSPHERE } from './data/procgen-atmosphere.ts'
import { COMPOSERS_BIZPITCH } from './data/procgen-bizpitch.ts'
import { COMPOSERS_BLOGLIST } from './data/procgen-bloglist.ts'
import { COMPOSERS_BRAND } from './data/procgen-brand.ts'
import { COMPOSERS_CHAPTERENDING } from './data/procgen-chapterending.ts'
import { COMPOSERS_CHARACTER } from './data/procgen-character.ts'
import { COMPOSERS_COMBAT } from './data/procgen-combat.ts'
import { COMPOSERS_COMMSYSTEM } from './data/procgen-commsystem.ts'
import { COMPOSERS_COURTLIFE } from './data/procgen-courtlife.ts'
import { COMPOSERS_COURTROOM } from './data/procgen-courtroom.ts'
import { COMPOSERS_CREATURE } from './data/procgen-creature.ts'
import { COMPOSERS_CUISINE } from './data/procgen-cuisine.ts'
import { COMPOSERS_CYBERPUNK } from './data/procgen-cyberpunk.ts'
import { COMPOSERS_DEBATE } from './data/procgen-debate.ts'
import { COMPOSERS_DIALOGUE } from './data/procgen-dialogue.ts'
import { COMPOSERS_DIVINATION } from './data/procgen-divination.ts'
import { COMPOSERS_DREAMREALM } from './data/procgen-dreamrealm.ts'
import { COMPOSERS_DUNGEONFLOOR } from './data/procgen-dungeonfloor.ts'
import { COMPOSERS_EMOTION } from './data/procgen-emotion.ts'
import { COMPOSERS_ESPIONAGE } from './data/procgen-espionage.ts'
import { COMPOSERS_ESSAYANGLE } from './data/procgen-essayangle.ts'
import { COMPOSERS_FACTION } from './data/procgen-faction.ts'
import { COMPOSERS_FAMILYSAGA } from './data/procgen-familysaga.ts'
import { COMPOSERS_FASHION } from './data/procgen-fashion.ts'
import { COMPOSERS_FAUNA } from './data/procgen-fauna.ts'
import { COMPOSERS_FLORA } from './data/procgen-flora.ts'
import { COMPOSERS_FOIL } from './data/procgen-foil.ts'
import { COMPOSERS_GAMEQUEST } from './data/procgen-gamequest.ts'
import { COMPOSERS_GESTURE } from './data/procgen-gesture.ts'
import { COMPOSERS_HABIT } from './data/procgen-habit.ts'
import { COMPOSERS_HEIST } from './data/procgen-heist.ts'
import { COMPOSERS_HEROPOWER } from './data/procgen-heropower.ts'
import { COMPOSERS_HISTORY } from './data/procgen-history.ts'
import { COMPOSERS_INVENTION } from './data/procgen-invention.ts'
import { COMPOSERS_ITEM } from './data/procgen-item.ts'
import { COMPOSERS_LAW } from './data/procgen-law.ts'
import { COMPOSERS_LOOT } from './data/procgen-loot.ts'
import { COMPOSERS_LYRIC } from './data/procgen-lyric.ts'
import { COMPOSERS_MARKETING } from './data/procgen-marketing.ts'
import { COMPOSERS_MEDICINE } from './data/procgen-medicine.ts'
import { COMPOSERS_MEMOIR } from './data/procgen-memoir.ts'
import { COMPOSERS_MENTORBOND } from './data/procgen-mentorbond.ts'
import { COMPOSERS_MOTIF } from './data/procgen-motif.ts'
import { COMPOSERS_MUSIC } from './data/procgen-music.ts'
import { COMPOSERS_MYSTERYCASE } from './data/procgen-mysterycase.ts'
import { COMPOSERS_NAME } from './data/procgen-name.ts'
import { COMPOSERS_NAVAL } from './data/procgen-naval.ts'
import { COMPOSERS_NEWSLETTER } from './data/procgen-newsletter.ts'
import { COMPOSERS_NONFICTION } from './data/procgen-nonfiction.ts'
import { COMPOSERS_OCCUPATION } from './data/procgen-occupation.ts'
import { COMPOSERS_OPENINGHOOK } from './data/procgen-openinghook.ts'
import { COMPOSERS_PARALLELWORLD } from './data/procgen-parallelworld.ts'
import { COMPOSERS_PLOT } from './data/procgen-plot.ts'
import { COMPOSERS_POEMFORM } from './data/procgen-poemform.ts'
import { COMPOSERS_POEMIMAGE } from './data/procgen-poemimage.ts'
import { COMPOSERS_POLINTRIGUE } from './data/procgen-politicalintrigue.ts'
import { COMPOSERS_PRODUCT } from './data/procgen-product.ts'
import { COMPOSERS_PROMPT } from './data/procgen-prompt.ts'
import { COMPOSERS_QUEST } from './data/procgen-quest.ts'
import { COMPOSERS_REDEMPTION } from './data/procgen-redemption.ts'
import { COMPOSERS_REGRESSION } from './data/procgen-regression.ts'
import { COMPOSERS_RESOURCESYSTEM } from './data/procgen-resourcesystem.ts'
import { COMPOSERS_REVIEW } from './data/procgen-review.ts'
import { COMPOSERS_RIDDLE } from './data/procgen-riddle.ts'
import { COMPOSERS_RITUAL } from './data/procgen-ritual.ts'
import { COMPOSERS_RIVALRY } from './data/procgen-rivalry.ts'
import { COMPOSERS_ROMANCEDYN } from './data/procgen-romancedyn.ts'
import { COMPOSERS_SCENE } from './data/procgen-scene.ts'
import { COMPOSERS_SECRET } from './data/procgen-secret.ts'
import { COMPOSERS_SELFHELP } from './data/procgen-selfhelp.ts'
import { COMPOSERS_SENSORY } from './data/procgen-sensory.ts'
import { COMPOSERS_SOCIALPOST } from './data/procgen-socialpost.ts'
import { COMPOSERS_SPACESHIP } from './data/procgen-spaceship.ts'
import { COMPOSERS_SPEECH } from './data/procgen-speech.ts'
import { COMPOSERS_SPELL } from './data/procgen-spell.ts'
import { COMPOSERS_STATSYSTEM } from './data/procgen-statsystem.ts'
import { COMPOSERS_SUBPLOTWEAVE } from './data/procgen-subplotweave.ts'
import { COMPOSERS_SUBTEXT } from './data/procgen-subtext.ts'
import { COMPOSERS_SURVIVAL } from './data/procgen-survival.ts'
import { COMPOSERS_SYMBOL } from './data/procgen-symbol.ts'
import { COMPOSERS_SYSTEMWINDOW } from './data/procgen-systemwindow.ts'
import { COMPOSERS_THEME } from './data/procgen-theme.ts'
import { COMPOSERS_TIMETRAVEL } from './data/procgen-timetravel.ts'
import { COMPOSERS_TITLE } from './data/procgen-title.ts'
import { COMPOSERS_TRADEECONOMY } from './data/procgen-tradeeconomy.ts'
import { COMPOSERS_TRANSPORTWORLD } from './data/procgen-transportworld.ts'
import { COMPOSERS_TRAP } from './data/procgen-trap.ts'
import { COMPOSERS_TRPG } from './data/procgen-trpg.ts'
import { COMPOSERS_UNDERWORLD } from './data/procgen-underworld.ts'
import { COMPOSERS_VILLAINPLAN } from './data/procgen-villainplan.ts'
import { COMPOSERS_WARCAMPAIGN } from './data/procgen-warcampaign.ts'
import { COMPOSERS_WEATHER } from './data/procgen-weather.ts'
import { COMPOSERS_WEBTOON } from './data/procgen-webtoon.ts'
import { COMPOSERS_WORLD } from './data/procgen-world.ts'
import { COMPOSERS_WOUND } from './data/procgen-wound.ts'

const COMPOSERS_RAW: Composer[] = [
  ...COMPOSERS_ABILITY,
  ...COMPOSERS_AERIAL,
  ...COMPOSERS_AFTERLIFE,
  ...COMPOSERS_AITECH,
  ...COMPOSERS_APOCALYPSE,
  ...COMPOSERS_ARCHITECTURE,
  ...COMPOSERS_ARTICLELEAD,
  ...COMPOSERS_ATMOSPHERE,
  ...COMPOSERS_BIZPITCH,
  ...COMPOSERS_BLOGLIST,
  ...COMPOSERS_BRAND,
  ...COMPOSERS_CHAPTERENDING,
  ...COMPOSERS_CHARACTER,
  ...COMPOSERS_COMBAT,
  ...COMPOSERS_COMMSYSTEM,
  ...COMPOSERS_COURTLIFE,
  ...COMPOSERS_COURTROOM,
  ...COMPOSERS_CREATURE,
  ...COMPOSERS_CUISINE,
  ...COMPOSERS_CYBERPUNK,
  ...COMPOSERS_DEBATE,
  ...COMPOSERS_DIALOGUE,
  ...COMPOSERS_DIVINATION,
  ...COMPOSERS_DREAMREALM,
  ...COMPOSERS_DUNGEONFLOOR,
  ...COMPOSERS_EMOTION,
  ...COMPOSERS_ESPIONAGE,
  ...COMPOSERS_ESSAYANGLE,
  ...COMPOSERS_FACTION,
  ...COMPOSERS_FAMILYSAGA,
  ...COMPOSERS_FASHION,
  ...COMPOSERS_FAUNA,
  ...COMPOSERS_FLORA,
  ...COMPOSERS_FOIL,
  ...COMPOSERS_GAMEQUEST,
  ...COMPOSERS_GESTURE,
  ...COMPOSERS_HABIT,
  ...COMPOSERS_HEIST,
  ...COMPOSERS_HEROPOWER,
  ...COMPOSERS_HISTORY,
  ...COMPOSERS_INVENTION,
  ...COMPOSERS_ITEM,
  ...COMPOSERS_LAW,
  ...COMPOSERS_LOOT,
  ...COMPOSERS_LYRIC,
  ...COMPOSERS_MARKETING,
  ...COMPOSERS_MEDICINE,
  ...COMPOSERS_MEMOIR,
  ...COMPOSERS_MENTORBOND,
  ...COMPOSERS_MOTIF,
  ...COMPOSERS_MUSIC,
  ...COMPOSERS_MYSTERYCASE,
  ...COMPOSERS_NAME,
  ...COMPOSERS_NAVAL,
  ...COMPOSERS_NEWSLETTER,
  ...COMPOSERS_NONFICTION,
  ...COMPOSERS_OCCUPATION,
  ...COMPOSERS_OPENINGHOOK,
  ...COMPOSERS_PARALLELWORLD,
  ...COMPOSERS_PLOT,
  ...COMPOSERS_POEMFORM,
  ...COMPOSERS_POEMIMAGE,
  ...COMPOSERS_POLINTRIGUE,
  ...COMPOSERS_PRODUCT,
  ...COMPOSERS_PROMPT,
  ...COMPOSERS_QUEST,
  ...COMPOSERS_REDEMPTION,
  ...COMPOSERS_REGRESSION,
  ...COMPOSERS_RESOURCESYSTEM,
  ...COMPOSERS_REVIEW,
  ...COMPOSERS_RIDDLE,
  ...COMPOSERS_RITUAL,
  ...COMPOSERS_RIVALRY,
  ...COMPOSERS_ROMANCEDYN,
  ...COMPOSERS_SCENE,
  ...COMPOSERS_SECRET,
  ...COMPOSERS_SELFHELP,
  ...COMPOSERS_SENSORY,
  ...COMPOSERS_SOCIALPOST,
  ...COMPOSERS_SPACESHIP,
  ...COMPOSERS_SPEECH,
  ...COMPOSERS_SPELL,
  ...COMPOSERS_STATSYSTEM,
  ...COMPOSERS_SUBPLOTWEAVE,
  ...COMPOSERS_SUBTEXT,
  ...COMPOSERS_SURVIVAL,
  ...COMPOSERS_SYMBOL,
  ...COMPOSERS_SYSTEMWINDOW,
  ...COMPOSERS_THEME,
  ...COMPOSERS_TIMETRAVEL,
  ...COMPOSERS_TITLE,
  ...COMPOSERS_TRADEECONOMY,
  ...COMPOSERS_TRANSPORTWORLD,
  ...COMPOSERS_TRAP,
  ...COMPOSERS_TRPG,
  ...COMPOSERS_UNDERWORLD,
  ...COMPOSERS_VILLAINPLAN,
  ...COMPOSERS_WARCAMPAIGN,
  ...COMPOSERS_WEATHER,
  ...COMPOSERS_WEBTOON,
  ...COMPOSERS_WORLD,
  ...COMPOSERS_WOUND,
]

// 모든 합성기에 보편 변주 슬롯을 더해 조합 공간을 ×144 확장(요청: 무작위 생성기 조합수 ×100+).
export const COMPOSERS: Composer[] = COMPOSERS_RAW.map(expandComposer)
