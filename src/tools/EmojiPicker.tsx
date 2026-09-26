// 이모지 픽커 — 카테고리별 이모지 수백 개를 로컬 배열로 제공하고, 영문 키워드 검색을 지원한다.
// 이모지를 클릭하면 클립보드에 복사되고 토스트로 알린다. 본문 어디에나 붙여넣어 쓰기 위한 도구다.
// 외부 네트워크/라이브러리 없이 로컬 데이터만으로 동작한다.
import { useState, useEffect, useRef, useMemo } from 'react'

export const meta = { id: 'emoji-picker', name: '이모지 픽커', icon: '😀', group: '유틸·참고', intro: '카테고리·검색으로 이모지를 골라 복사하세요', w: 460, h: 600 }

interface Emo { e: string; k: string } // e: 이모지, k: 영문 검색 키워드(공백 구분)
interface Cat { id: string; label: string; icon: string; items: Emo[] }

// 카테고리별 이모지 + 영문 키워드(검색용). 로컬 상수만 사용한다.
const CATS: Cat[] = [
  {
    id: 'smiley', label: '표정·사람', icon: '😀',
    items: [
      { e: '😀', k: 'grinning face happy smile' }, { e: '😃', k: 'smiley happy joy' },
      { e: '😄', k: 'smile happy laughing' }, { e: '😁', k: 'beaming grin happy' },
      { e: '😆', k: 'laughing satisfied haha' }, { e: '😅', k: 'sweat smile nervous' },
      { e: '🤣', k: 'rofl rolling laughing lol' }, { e: '😂', k: 'joy tears laughing lol' },
      { e: '🙂', k: 'slight smile' }, { e: '🙃', k: 'upside down silly' },
      { e: '😉', k: 'wink flirt' }, { e: '😊', k: 'blush happy shy' },
      { e: '😇', k: 'innocent angel halo' }, { e: '🥰', k: 'love hearts adore' },
      { e: '😍', k: 'heart eyes love' }, { e: '🤩', k: 'star struck excited wow' },
      { e: '😘', k: 'kiss blow love' }, { e: '😗', k: 'kissing' },
      { e: '😋', k: 'yum tasty tongue' }, { e: '😛', k: 'tongue playful' },
      { e: '😜', k: 'winking tongue crazy' }, { e: '🤪', k: 'zany goofy crazy' },
      { e: '🤨', k: 'raised eyebrow skeptic doubt' }, { e: '🧐', k: 'monocle inspect think' },
      { e: '🤓', k: 'nerd geek glasses' }, { e: '😎', k: 'cool sunglasses' },
      { e: '🥳', k: 'party celebrate hat' }, { e: '😏', k: 'smirk sly' },
      { e: '😒', k: 'unamused meh annoyed' }, { e: '😞', k: 'disappointed sad' },
      { e: '😔', k: 'pensive sad sorrow' }, { e: '😟', k: 'worried concerned' },
      { e: '😕', k: 'confused unsure' }, { e: '🙁', k: 'slight frown sad' },
      { e: '😣', k: 'persevere struggle' }, { e: '😖', k: 'confounded frustrated' },
      { e: '😫', k: 'tired weary exhausted' }, { e: '😩', k: 'weary tired' },
      { e: '🥺', k: 'pleading puppy eyes beg' }, { e: '😢', k: 'cry sad tear' },
      { e: '😭', k: 'sob loud cry bawl' }, { e: '😤', k: 'huff angry steam' },
      { e: '😠', k: 'angry mad' }, { e: '😡', k: 'rage furious mad' },
      { e: '🤬', k: 'cursing swearing angry' }, { e: '😳', k: 'flushed embarrassed shock' },
      { e: '🥵', k: 'hot heat sweat' }, { e: '🥶', k: 'cold freezing' },
      { e: '😱', k: 'scream fear shock' }, { e: '😨', k: 'fearful scared' },
      { e: '😰', k: 'anxious sweat nervous' }, { e: '😥', k: 'sad relieved disappointed' },
      { e: '😓', k: 'sweat downcast' }, { e: '🤗', k: 'hug hands warm' },
      { e: '🤔', k: 'thinking hmm consider' }, { e: '🤭', k: 'hand over mouth giggle' },
      { e: '🤫', k: 'shush quiet secret' }, { e: '🤥', k: 'lying liar pinocchio' },
      { e: '😶', k: 'no mouth silent blank' }, { e: '😐', k: 'neutral meh' },
      { e: '😑', k: 'expressionless blank' }, { e: '😬', k: 'grimace awkward' },
      { e: '🙄', k: 'eye roll annoyed' }, { e: '😯', k: 'hushed surprised' },
      { e: '😴', k: 'sleeping zzz tired' }, { e: '🤤', k: 'drool desire' },
      { e: '😪', k: 'sleepy tired' }, { e: '😵', k: 'dizzy knocked out' },
      { e: '🤐', k: 'zipper mouth quiet' }, { e: '🥴', k: 'woozy drunk dizzy' },
      { e: '🤢', k: 'nausea sick disgust' }, { e: '🤮', k: 'vomit sick puke' },
      { e: '🤧', k: 'sneeze sick tissue' }, { e: '😷', k: 'mask sick ill' },
      { e: '🤒', k: 'sick fever thermometer' }, { e: '🤕', k: 'hurt injured bandage' },
      { e: '🤑', k: 'money mouth rich' }, { e: '🤠', k: 'cowboy hat' },
      { e: '👻', k: 'ghost boo halloween' }, { e: '💀', k: 'skull death dead' },
      { e: '👽', k: 'alien ufo' }, { e: '🤖', k: 'robot bot ai' },
      { e: '💩', k: 'poop pile silly' }, { e: '🤡', k: 'clown joker' },
      { e: '👶', k: 'baby infant' }, { e: '🧒', k: 'child kid' },
      { e: '👦', k: 'boy' }, { e: '👧', k: 'girl' },
      { e: '🧑', k: 'person adult' }, { e: '👨', k: 'man' },
      { e: '👩', k: 'woman' }, { e: '🧓', k: 'older person elderly' },
      { e: '👴', k: 'old man grandpa' }, { e: '👵', k: 'old woman grandma' },
    ],
  },
  {
    id: 'gesture', label: '손·몸짓', icon: '👍',
    items: [
      { e: '👍', k: 'thumbs up like good yes' }, { e: '👎', k: 'thumbs down dislike no bad' },
      { e: '👌', k: 'ok perfect' }, { e: '🤌', k: 'pinched fingers italian' },
      { e: '🤏', k: 'pinch small tiny' }, { e: '✌️', k: 'victory peace' },
      { e: '🤞', k: 'crossed fingers luck hope' }, { e: '🤟', k: 'love you sign' },
      { e: '🤘', k: 'rock horns metal' }, { e: '🤙', k: 'call me shaka hang loose' },
      { e: '👈', k: 'point left' }, { e: '👉', k: 'point right' },
      { e: '👆', k: 'point up' }, { e: '👇', k: 'point down' },
      { e: '☝️', k: 'index up one' }, { e: '✋', k: 'raised hand stop high five' },
      { e: '🤚', k: 'raised back hand' }, { e: '🖐️', k: 'hand fingers splayed' },
      { e: '🖖', k: 'vulcan spock' }, { e: '👋', k: 'wave hello hi bye' },
      { e: '🤝', k: 'handshake deal agree' }, { e: '🙏', k: 'pray thanks please hope' },
      { e: '✍️', k: 'writing hand' }, { e: '👏', k: 'clap applause bravo' },
      { e: '🙌', k: 'raised hands celebrate hooray' }, { e: '👐', k: 'open hands' },
      { e: '🤲', k: 'palms together cupped' }, { e: '💪', k: 'muscle strong flex' },
      { e: '🦵', k: 'leg' }, { e: '🦶', k: 'foot' },
      { e: '👂', k: 'ear listen' }, { e: '👃', k: 'nose smell' },
      { e: '👀', k: 'eyes look watch' }, { e: '👁️', k: 'eye see' },
      { e: '👅', k: 'tongue taste' }, { e: '👄', k: 'mouth lips' },
      { e: '🧠', k: 'brain mind smart' }, { e: '🦷', k: 'tooth' },
      { e: '🦴', k: 'bone' }, { e: '✊', k: 'raised fist power' },
      { e: '👊', k: 'fist bump punch' }, { e: '🤛', k: 'left fist' },
      { e: '🤜', k: 'right fist' }, { e: '🦾', k: 'mechanical arm robot' },
    ],
  },
  {
    id: 'heart', label: '하트·기호', icon: '❤️',
    items: [
      { e: '❤️', k: 'red heart love' }, { e: '🧡', k: 'orange heart' },
      { e: '💛', k: 'yellow heart' }, { e: '💚', k: 'green heart' },
      { e: '💙', k: 'blue heart' }, { e: '💜', k: 'purple heart' },
      { e: '🖤', k: 'black heart' }, { e: '🤍', k: 'white heart' },
      { e: '🤎', k: 'brown heart' }, { e: '💔', k: 'broken heart heartbreak' },
      { e: '❣️', k: 'heart exclamation' }, { e: '💕', k: 'two hearts love' },
      { e: '💞', k: 'revolving hearts' }, { e: '💓', k: 'beating heart' },
      { e: '💗', k: 'growing heart' }, { e: '💖', k: 'sparkling heart' },
      { e: '💘', k: 'heart arrow cupid' }, { e: '💝', k: 'heart gift ribbon' },
      { e: '💟', k: 'heart decoration' }, { e: '💋', k: 'kiss lips' },
      { e: '💯', k: 'hundred perfect score' }, { e: '💢', k: 'anger symbol mad' },
      { e: '💥', k: 'collision boom explosion' }, { e: '💫', k: 'dizzy star sparkle' },
      { e: '💦', k: 'sweat droplets water' }, { e: '💨', k: 'dash wind fast' },
      { e: '🕳️', k: 'hole' }, { e: '💬', k: 'speech bubble talk chat' },
      { e: '💭', k: 'thought bubble think' }, { e: '💤', k: 'zzz sleep' },
      { e: '✨', k: 'sparkles shine magic' }, { e: '⭐', k: 'star' },
      { e: '🌟', k: 'glowing star' }, { e: '⚡', k: 'lightning bolt power zap' },
      { e: '🔥', k: 'fire lit hot flame' }, { e: '🎉', k: 'party popper celebrate tada' },
      { e: '🎊', k: 'confetti ball party' }, { e: '✅', k: 'check mark done yes' },
      { e: '❌', k: 'cross mark no wrong x' }, { e: '❓', k: 'question mark' },
      { e: '❗', k: 'exclamation mark' }, { e: '⚠️', k: 'warning caution' },
      { e: '🚫', k: 'prohibited no forbidden' }, { e: '💲', k: 'dollar money sign' },
    ],
  },
  {
    id: 'animal', label: '동물·자연', icon: '🐱',
    items: [
      { e: '🐶', k: 'dog puppy' }, { e: '🐱', k: 'cat kitten' },
      { e: '🐭', k: 'mouse' }, { e: '🐹', k: 'hamster' },
      { e: '🐰', k: 'rabbit bunny' }, { e: '🦊', k: 'fox' },
      { e: '🐻', k: 'bear' }, { e: '🐼', k: 'panda' },
      { e: '🐨', k: 'koala' }, { e: '🐯', k: 'tiger' },
      { e: '🦁', k: 'lion' }, { e: '🐮', k: 'cow' },
      { e: '🐷', k: 'pig' }, { e: '🐸', k: 'frog' },
      { e: '🐵', k: 'monkey' }, { e: '🐔', k: 'chicken' },
      { e: '🐧', k: 'penguin' }, { e: '🐦', k: 'bird' },
      { e: '🐤', k: 'chick baby bird' }, { e: '🦆', k: 'duck' },
      { e: '🦅', k: 'eagle' }, { e: '🦉', k: 'owl' },
      { e: '🦇', k: 'bat' }, { e: '🐺', k: 'wolf' },
      { e: '🐗', k: 'boar' }, { e: '🐴', k: 'horse' },
      { e: '🦄', k: 'unicorn' }, { e: '🐝', k: 'bee honeybee' },
      { e: '🐛', k: 'bug caterpillar' }, { e: '🦋', k: 'butterfly' },
      { e: '🐌', k: 'snail' }, { e: '🐞', k: 'ladybug' },
      { e: '🐜', k: 'ant' }, { e: '🕷️', k: 'spider' },
      { e: '🐢', k: 'turtle' }, { e: '🐍', k: 'snake' },
      { e: '🦎', k: 'lizard' }, { e: '🐙', k: 'octopus' },
      { e: '🦑', k: 'squid' }, { e: '🦐', k: 'shrimp' },
      { e: '🦀', k: 'crab' }, { e: '🐠', k: 'fish tropical' },
      { e: '🐬', k: 'dolphin' }, { e: '🐳', k: 'whale' },
      { e: '🦈', k: 'shark' }, { e: '🐊', k: 'crocodile' },
      { e: '🐘', k: 'elephant' }, { e: '🦒', k: 'giraffe' },
      { e: '🦓', k: 'zebra' }, { e: '🐑', k: 'sheep' },
      { e: '🌸', k: 'cherry blossom flower spring' }, { e: '🌹', k: 'rose flower' },
      { e: '🌻', k: 'sunflower' }, { e: '🌷', k: 'tulip flower' },
      { e: '🌲', k: 'evergreen tree pine' }, { e: '🌳', k: 'tree' },
      { e: '🌴', k: 'palm tree' }, { e: '🌵', k: 'cactus' },
      { e: '🍀', k: 'clover luck' }, { e: '🍁', k: 'maple leaf autumn' },
      { e: '🍂', k: 'fallen leaves autumn' }, { e: '🌍', k: 'earth globe world' },
      { e: '🌙', k: 'crescent moon night' }, { e: '☀️', k: 'sun sunny' },
      { e: '⛅', k: 'sun behind cloud' }, { e: '☁️', k: 'cloud' },
      { e: '🌧️', k: 'rain cloud' }, { e: '⛈️', k: 'thunderstorm' },
      { e: '❄️', k: 'snowflake snow cold' }, { e: '🌈', k: 'rainbow' },
      { e: '💧', k: 'droplet water drop' }, { e: '🌊', k: 'wave ocean sea' },
    ],
  },
  {
    id: 'food', label: '음식·음료', icon: '🍔',
    items: [
      { e: '🍎', k: 'apple red fruit' }, { e: '🍏', k: 'green apple' },
      { e: '🍊', k: 'orange tangerine' }, { e: '🍋', k: 'lemon' },
      { e: '🍌', k: 'banana' }, { e: '🍉', k: 'watermelon' },
      { e: '🍇', k: 'grapes' }, { e: '🍓', k: 'strawberry' },
      { e: '🫐', k: 'blueberries' }, { e: '🍒', k: 'cherries' },
      { e: '🍑', k: 'peach' }, { e: '🥭', k: 'mango' },
      { e: '🍍', k: 'pineapple' }, { e: '🥝', k: 'kiwi' },
      { e: '🍅', k: 'tomato' }, { e: '🥑', k: 'avocado' },
      { e: '🥦', k: 'broccoli' }, { e: '🥕', k: 'carrot' },
      { e: '🌽', k: 'corn' }, { e: '🌶️', k: 'hot pepper chili spicy' },
      { e: '🥔', k: 'potato' }, { e: '🍞', k: 'bread' },
      { e: '🥐', k: 'croissant' }, { e: '🥖', k: 'baguette bread' },
      { e: '🧀', k: 'cheese' }, { e: '🥚', k: 'egg' },
      { e: '🍳', k: 'fried egg cooking' }, { e: '🥞', k: 'pancakes' },
      { e: '🧇', k: 'waffle' }, { e: '🥓', k: 'bacon' },
      { e: '🍔', k: 'hamburger burger' }, { e: '🍟', k: 'fries chips' },
      { e: '🍕', k: 'pizza' }, { e: '🌭', k: 'hot dog' },
      { e: '🥪', k: 'sandwich' }, { e: '🌮', k: 'taco' },
      { e: '🌯', k: 'burrito' }, { e: '🥗', k: 'salad' },
      { e: '🍜', k: 'ramen noodles' }, { e: '🍝', k: 'spaghetti pasta' },
      { e: '🍣', k: 'sushi' }, { e: '🍱', k: 'bento box' },
      { e: '🍛', k: 'curry rice' }, { e: '🍚', k: 'rice bowl' },
      { e: '🍙', k: 'rice ball onigiri' }, { e: '🥟', k: 'dumpling' },
      { e: '🍤', k: 'fried shrimp tempura' }, { e: '🍦', k: 'ice cream soft serve' },
      { e: '🍧', k: 'shaved ice' }, { e: '🍨', k: 'ice cream' },
      { e: '🍩', k: 'donut' }, { e: '🍪', k: 'cookie' },
      { e: '🎂', k: 'birthday cake' }, { e: '🍰', k: 'cake slice shortcake' },
      { e: '🧁', k: 'cupcake' }, { e: '🍫', k: 'chocolate' },
      { e: '🍬', k: 'candy sweet' }, { e: '🍭', k: 'lollipop' },
      { e: '🍯', k: 'honey' }, { e: '☕', k: 'coffee hot tea' },
      { e: '🍵', k: 'tea green' }, { e: '🧋', k: 'bubble tea boba' },
      { e: '🥤', k: 'soda cup drink' }, { e: '🧃', k: 'juice box' },
      { e: '🍺', k: 'beer' }, { e: '🍻', k: 'beers cheers' },
      { e: '🍷', k: 'wine glass' }, { e: '🥂', k: 'champagne clink cheers' },
      { e: '🍾', k: 'champagne bottle celebrate' }, { e: '🍸', k: 'cocktail martini' },
    ],
  },
  {
    id: 'activity', label: '활동·여행', icon: '⚽',
    items: [
      { e: '⚽', k: 'soccer football ball' }, { e: '🏀', k: 'basketball' },
      { e: '🏈', k: 'american football' }, { e: '⚾', k: 'baseball' },
      { e: '🎾', k: 'tennis' }, { e: '🏐', k: 'volleyball' },
      { e: '🏉', k: 'rugby' }, { e: '🎱', k: 'pool 8 ball billiards' },
      { e: '🏓', k: 'ping pong table tennis' }, { e: '🏸', k: 'badminton' },
      { e: '🥅', k: 'goal net' }, { e: '⛳', k: 'golf flag' },
      { e: '🏹', k: 'bow arrow archery' }, { e: '🎣', k: 'fishing' },
      { e: '🥊', k: 'boxing glove' }, { e: '🥋', k: 'martial arts' },
      { e: '⛸️', k: 'ice skate' }, { e: '🎿', k: 'ski' },
      { e: '🛷', k: 'sled' }, { e: '🏂', k: 'snowboard' },
      { e: '🏄', k: 'surfing' }, { e: '🏊', k: 'swimming' },
      { e: '🚴', k: 'cycling bike' }, { e: '🏃', k: 'running run' },
      { e: '🚶', k: 'walking' }, { e: '🧗', k: 'climbing' },
      { e: '🤸', k: 'cartwheel gymnastics' }, { e: '⛺', k: 'tent camping' },
      { e: '🎪', k: 'circus tent' }, { e: '🎭', k: 'theater drama masks' },
      { e: '🎨', k: 'art palette paint' }, { e: '🎬', k: 'clapper movie film' },
      { e: '🎤', k: 'microphone sing' }, { e: '🎧', k: 'headphones music' },
      { e: '🎼', k: 'musical score' }, { e: '🎹', k: 'piano keyboard' },
      { e: '🥁', k: 'drum' }, { e: '🎸', k: 'guitar' },
      { e: '🎺', k: 'trumpet' }, { e: '🎻', k: 'violin' },
      { e: '🎮', k: 'video game controller' }, { e: '🕹️', k: 'joystick game' },
      { e: '🎲', k: 'dice game' }, { e: '🧩', k: 'puzzle piece' },
      { e: '♟️', k: 'chess pawn' }, { e: '🎯', k: 'dart target bullseye' },
      { e: '🚗', k: 'car automobile' }, { e: '🚕', k: 'taxi' },
      { e: '🚌', k: 'bus' }, { e: '🚓', k: 'police car' },
      { e: '🚑', k: 'ambulance' }, { e: '🚒', k: 'fire truck' },
      { e: '🚲', k: 'bicycle bike' }, { e: '🛵', k: 'scooter moped' },
      { e: '🏍️', k: 'motorcycle' }, { e: '✈️', k: 'airplane flight travel' },
      { e: '🚀', k: 'rocket launch space' }, { e: '🛸', k: 'ufo flying saucer' },
      { e: '🚁', k: 'helicopter' }, { e: '⛵', k: 'sailboat' },
      { e: '🚤', k: 'speedboat' }, { e: '🚢', k: 'ship cruise' },
      { e: '🚂', k: 'train locomotive' }, { e: '🚄', k: 'bullet train' },
      { e: '🗺️', k: 'map world travel' }, { e: '🧭', k: 'compass' },
      { e: '🏖️', k: 'beach umbrella' }, { e: '🏔️', k: 'mountain snow' },
      { e: '🗽', k: 'statue of liberty' }, { e: '🗼', k: 'tokyo tower' },
      { e: '🏰', k: 'castle' }, { e: '🎡', k: 'ferris wheel' },
      { e: '🎢', k: 'roller coaster' }, { e: '🎠', k: 'carousel' },
    ],
  },
  {
    id: 'object', label: '사물·기호', icon: '💡',
    items: [
      { e: '💡', k: 'light bulb idea' }, { e: '🔦', k: 'flashlight' },
      { e: '🔋', k: 'battery' }, { e: '🔌', k: 'plug electric' },
      { e: '💻', k: 'laptop computer' }, { e: '🖥️', k: 'desktop computer monitor' },
      { e: '⌨️', k: 'keyboard' }, { e: '🖱️', k: 'mouse computer' },
      { e: '🖨️', k: 'printer' }, { e: '📱', k: 'phone mobile smartphone' },
      { e: '☎️', k: 'telephone phone' }, { e: '📞', k: 'phone receiver call' },
      { e: '📷', k: 'camera photo' }, { e: '📸', k: 'camera flash' },
      { e: '📹', k: 'video camera' }, { e: '🎥', k: 'movie camera film' },
      { e: '📺', k: 'television tv' }, { e: '📻', k: 'radio' },
      { e: '⏰', k: 'alarm clock' }, { e: '⏱️', k: 'stopwatch timer' },
      { e: '⌚', k: 'watch time' }, { e: '📅', k: 'calendar date' },
      { e: '📆', k: 'calendar tear off' }, { e: '📌', k: 'pushpin pin' },
      { e: '📍', k: 'location pin round' }, { e: '📎', k: 'paperclip' },
      { e: '✂️', k: 'scissors cut' }, { e: '📏', k: 'ruler measure' },
      { e: '📐', k: 'triangular ruler' }, { e: '✏️', k: 'pencil write' },
      { e: '🖊️', k: 'pen' }, { e: '🖌️', k: 'paintbrush' },
      { e: '🖍️', k: 'crayon' }, { e: '📝', k: 'memo note write' },
      { e: '📖', k: 'open book read' }, { e: '📚', k: 'books stack' },
      { e: '📔', k: 'notebook' }, { e: '📒', k: 'ledger' },
      { e: '📰', k: 'newspaper news' }, { e: '🗞️', k: 'rolled newspaper' },
      { e: '📁', k: 'folder file' }, { e: '📂', k: 'open folder' },
      { e: '🗂️', k: 'card index dividers' }, { e: '📊', k: 'bar chart graph' },
      { e: '📈', k: 'chart up increasing' }, { e: '📉', k: 'chart down decreasing' },
      { e: '🔒', k: 'lock locked secure' }, { e: '🔓', k: 'unlock open' },
      { e: '🔑', k: 'key' }, { e: '🗝️', k: 'old key' },
      { e: '🔨', k: 'hammer tool' }, { e: '🪓', k: 'axe' },
      { e: '🔧', k: 'wrench tool fix' }, { e: '🔩', k: 'nut bolt screw' },
      { e: '⚙️', k: 'gear settings cog' }, { e: '🧰', k: 'toolbox' },
      { e: '🧲', k: 'magnet' }, { e: '💰', k: 'money bag cash' },
      { e: '💵', k: 'dollar banknote money' }, { e: '💳', k: 'credit card' },
      { e: '💎', k: 'gem diamond jewel' }, { e: '🎁', k: 'gift present box' },
      { e: '🎈', k: 'balloon party' }, { e: '🎀', k: 'ribbon bow' },
      { e: '🏆', k: 'trophy win award' }, { e: '🥇', k: 'gold medal first' },
      { e: '🥈', k: 'silver medal second' }, { e: '🥉', k: 'bronze medal third' },
      { e: '🔔', k: 'bell notification' }, { e: '🔕', k: 'bell muted silent' },
      { e: '📢', k: 'loudspeaker announce' }, { e: '📣', k: 'megaphone cheer' },
      { e: '💊', k: 'pill medicine' }, { e: '💉', k: 'syringe injection' },
      { e: '🩹', k: 'bandage adhesive' }, { e: '🌡️', k: 'thermometer temperature' },
    ],
  },
]

const flatAll: Emo[] = CATS.flatMap((c) => c.items)

export default function EmojiPicker() {
  const [activeCat, setActiveCat] = useState<string>(CATS[0].id)
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
  }, [])

  // 검색어가 있으면 전체에서 키워드 매칭(영문, 공백 구분 AND), 없으면 선택 카테고리.
  const shown = useMemo<Emo[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      const cat = CATS.find((c) => c.id === activeCat)
      return cat ? cat.items : []
    }
    const terms = q.split(/\s+/).filter(Boolean)
    return flatAll.filter((it) => terms.every((t) => it.k.includes(t)))
  }, [query, activeCat])

  const showToast = (msg: string) => {
    if (!mounted.current) return
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => {
      if (mounted.current) setToast(null)
    }, 1400)
  }

  const copyEmoji = (e: string) => {
    try {
      const done = () => showToast(`${e} 복사됨`)
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(e).then(done).catch(() => showToast('복사 실패 — 길게 눌러 직접 복사하세요'))
      } else {
        // 클립보드 API 미지원 graceful 처리
        showToast('이 환경은 자동 복사를 지원하지 않습니다')
      }
    } catch {
      showToast('복사 실패')
    }
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', boxSizing: 'border-box', position: 'relative' }

  return (
    <div style={wrap}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, flexShrink: 0 }}>
        카테고리를 고르거나 <b>영문 키워드</b>로 검색하세요. 이모지를 누르면 클립보드에 복사됩니다.
      </div>

      {/* 검색창 */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <input
          value={query}
          onChange={(ev) => setQuery(ev.target.value)}
          placeholder="검색: heart, fire, cat, food …"
          spellCheck={false}
          style={{
            flex: 1, minWidth: 0, padding: '8px 10px', fontSize: 13, color: 'var(--text)',
            background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, outline: 'none',
          }}
        />
        {query && (
          <button className="minibtn" onClick={() => setQuery('')} title="검색 지우기">✕</button>
        )}
      </div>

      {/* 카테고리 탭 (검색 중이 아닐 때) */}
      {!query.trim() && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
          {CATS.map((c) => {
            const on = c.id === activeCat
            return (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                title={c.label}
                style={{
                  cursor: 'pointer', fontSize: 12, padding: '5px 9px', borderRadius: 8,
                  border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'),
                  background: on ? 'var(--accent)' : 'var(--chrome-2)',
                  color: on ? '#fff' : 'var(--text)', fontWeight: on ? 700 : 400,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <span style={{ fontSize: 14 }}>{c.icon}</span>{c.label}
              </button>
            )
          })}
        </div>
      )}

      {/* 이모지 그리드 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
        {shown.length === 0 ? (
          <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
            검색 결과가 없습니다.<br />다른 영문 키워드로 시도해보세요. (예: smile, star, dog)
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: 4 }}>
            {shown.map((it, i) => (
              <button
                key={it.e + i}
                onClick={() => copyEmoji(it.e)}
                title={it.k}
                style={{
                  cursor: 'pointer', fontSize: 24, lineHeight: 1, height: 44,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8,
                  padding: 0,
                }}
              >
                {it.e}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>
        {query.trim() ? `검색 결과 ${shown.length}개` : `${shown.length}개 · 전체 ${flatAll.length}개`}
      </div>

      {/* 토스트 */}
      {toast && (
        <div
          style={{
            position: 'absolute', left: '50%', bottom: 36, transform: 'translateX(-50%)',
            background: 'var(--ok)', color: '#fff', padding: '8px 16px', borderRadius: 20,
            fontSize: 13, fontWeight: 600, boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 10,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
