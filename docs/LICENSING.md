# 이미지/미디어 저작권 정책

원칙: 나중에 법적 문제가 없도록 **퍼블릭도메인(PD)·CC0·오픈소스·명시적 무료 라이선스** 자원만 사용하고, 화면에 **출처/라이선스를 표기**한다. 실존 인물 사진·타인 IP 이미지는 사용하지 않는다.

## 이미지
| 소스 | 정책 |
|---|---|
| The Met (collectionapi.metmuseum.org) | `isPublicDomain===true` 인 작품만(= CC0). 배지 "CC0 · The Met Open Access" |
| Art Institute of Chicago (api.artic.edu) | `is_public_domain===true` 만. 배지 "CC0 · Art Institute of Chicago" |
| Openverse (api.openverse.org) | 쿼리 `&license=cc0,pdm`(PD/CC0). 제작자+라이선스 표기 |
| Lorem Picsum (picsum.photos) | Unsplash 라이선스(무료). 표기 |
| Cleveland Museum(openaccess) / Wikimedia Commons / images-api.nasa.gov | CC0/PD(추가 후보) |

## 인물/캐릭터 이미지
- **실존 인물 사진 금지**(randomuser.me 의 picture 등). IP 캐릭터 이미지 금지(Rick&Morty image 등).
- 대신 **DiceBear** 오픈소스 아바타: `https://api.dicebear.com/9.x/<style>/svg?seed=<seed>` (사람형 style: adventurer/big-smile). 표기 "DiceBear 오픈소스 아바타".
- 인물의 **이름·속성 텍스트**는 영감 모델로 사용 가능(사실/이름은 저작권 대상 아님).

## 음악/오디오
- **CC0/PD/CC-BY 만** 재생. 후보: Openverse audio(api.openverse.org/v1/audio, `license=cc0,pdm` 또는 by+표기), Internet Archive(PD/넷레이블 CC). 각 트랙 제작자+라이선스 표기, 가사 등 저작권 텍스트는 표시 금지.

## IP 기반 데이터 API(PokeAPI 등)
- 스프라이트 등 IP 이미지는 "비공식 API · 개인 창작 영감용(재배포·상업 사용 금지)" 표기. 라이브러리 저장 시 이미지가 아닌 **이름/스탯 텍스트만** 저장.

## 키 없는(무키)+CORS 공개 API 목록(검증된 것)
quotable.io, api.datamuse.com, api.dictionaryapi.dev, openlibrary.org, api.crossref.org, ko/en.wikipedia REST, api.openverse.org, api.artic.edu, collectionapi.metmuseum.org, picsum.photos, open-meteo, api.frankfurter.app, poetrydb.org, api.mymemory.translated.net, uselessfacts.jsph.pl, opentdb.com, pokeapi.co, swapi.tech, api.open5e.com, randomuser.me(데이터만), genderize/agify/nationalize.io, itunes.apple.com/search, api.dicebear.com.
추가 검토 후보(키 없음 추정 — 사용 전 CORS 확인): gutendex.com, api.conceptnet.io, openaccess-api.clevelandart.org, images-api.nasa.gov, bible-api.com, hn.algolia.com, dev.to API, musicbrainz.org, api.tvmaze.com, archive.org(advancedsearch/metadata).

## 이모지 아트 — Twemoji (2026-06-21)
- OS 기본 이모지를 일관된 상용 품질로 표시하기 위해 **Twemoji** SVG 를 로컬 번들(`public/emoji/`)해 사용.
- 라이선스: 그래픽 **CC-BY 4.0** (© Twitter, Inc. and other contributors). 상업적 사용 가능, 출처 표기 필요.
- 코드(파서)는 자체 구현(`src/ui/emoji.ts`): 화면에 렌더된 이모지만 `<img class="emoji" src="/emoji/<codepoint>.svg">` 로 치환. **편집기(contenteditable)·입력칸은 제외**해 원고/입력 데이터를 보존(정보 손실 0). 미보유 이모지는 원문 글자로 폴백.
- 오프라인: 에셋은 PWA 런타임 캐시(CacheFirst, `emoji-svg`)로 첫 사용 후 오프라인 동작. 프리캐시에서는 제외(설치 경량).
- 빌드 시 사용 이모지만 추출·복사: `node scripts/_copy_emoji.cjs` (소스 변경 후 재실행). 패키지 `@twemoji/svg`(에셋 출처).
