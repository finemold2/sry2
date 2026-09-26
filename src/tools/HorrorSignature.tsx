// 호러 시그니처 공포 장면 대형 생성기(HorrorSignature) — 호러·공포 장르 도시에에 근거한 슬롯 조합 생성기.
//  괴물/위협 유형 · 출몰 장소 · 전조(첫 균열) · 감각적 공포 · 규칙/금기 · 위반의 처벌 · 파국 · 드레드(기다림) · 정서
//  슬롯별 🔒 잠금 + 부분 재생성, 전체 조합수 표시(1조 이상 지향). 결과를 한 단락 공포 장면으로 조립.
//  연계: addToProject(folder:'공포 장면') 문서 추가 · addToLibrary('snippets'|'places') 글감/장소 저장 · 관련 도구 열기.
//  자급식: react · './linkbus' 외 import 없음. 전부 로컬. localStorage 'sry:tool:horror-signature'.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = { id: 'horror-signature', name: '호러 공포 장면 생성기', icon: '🩸', group: '생성기', genre: '호러·공포', intro: '괴물·출몰지·전조·금기·파국을 슬롯 조합해 1조+ 가지 공포 장면을 단조', w: 620, h: 720 }

// ── 호러 도시에 기반 슬롯 풀(장르 특화·구체, 일반론 금지) ──

// 1) 괴물/위협 유형 — 하위장르 지도 전반(유령·오컬트·슬래셔·바디·크리처·포크·우주적·사이코)
const THREAT = [
  '한(恨)을 품고 같은 자리를 맴도는 물에 젖은 원혼', '비디오·메시지를 본 자에게 7일 뒤 찾아오는 저주의 매개체',
  '얼굴 없이 미소만 0.5초 늦게 짓는, 가족을 흉내 낸 무엇', '인간의 이해를 넘어선, 보면 정신이 무너지는 우주적 존재',
  '가면을 쓰고 말없이 추격하는 정체불명의 살인마', '피부 밑에서 자라 숙주를 갈아치우는 기생 생물',
  '집의 역사를 먹고 자란, 건물 그 자체가 된 적의(敵意)', '이름을 부르면 한 걸음씩 다가오는 어둠 속의 형체',
  '외부인을 제물로 삼는 마을의 오래된 풍습과 그 신', '거울 속에서 나와 다르게 움직이는 또 다른 나',
  '죽었다 묻혔으나 흙을 헤집고 돌아온 사랑하던 것', '아이의 모습으로 손을 내미는, 텅 빈 눈의 인형',
  '계약을 미끼로 영혼을 거두러 온 사이비 교단의 사제', '감염되면 인간이기를 멈추는, 눈이 흐려진 무리',
  '자정마다 다른 방의 문을 두드리는, 발 없는 그림자', '산 자의 기억을 갉아먹어 존재를 지우는 잊힘의 안개',
  '벽 너머에서 내 이름과 목소리를 똑같이 흉내 내는 것', '제 손으로 가족을 해친 뒤에야 깨어나는 빙의된 자',
  '오래된 일기·사진 속에서 한 칸씩 다가오는 죽은 자', '신체를 비틀어 예술로 삼는, 고통을 환희로 아는 존재',
  '잠들면 꿈 안에서 사냥하는, 깨어날 수 없게 만드는 포식자', '늪과 폐광 깊은 곳에서 기어나온 형체 없는 크리처',
  '교통사고로 죽은 가족을 한 명씩 데려가는 도로의 귀신', '주문을 외운 자의 그림자에 들러붙는 흑마술의 잔재',
  '병원 폐쇄 병동을 떠도는, 환자복 차림의 집단 원혼', '엘리베이터가 13층에 설 때마다 한 사람씩 사라지게 하는 무엇',
  '구미호·처녀귀신처럼 한을 갚을 때까지 떠도는 전통의 원혼', '재난 뒤 게이트에서 쏟아져 나온, 인간을 사냥하는 이형(異形)',
]

// 2) 출몰 장소 — 공간(가장 중요): 고립 폐쇄공간·흉가·저주받은 마을·일상의 침범
const PLACE = [
  '눈보라에 갇혀 외부와 끊긴 산장', '과거의 살인을 품은 외딴 저택의 잠긴 안방',
  '이사 온 새 집의 곰팡내 나는 지하실', '천장 낮은 다락방, 봉인된 트렁크 옆',
  '외부인을 적대하는, 너무 친절한 시골 마을', '폐쇄된 정신병원의 끝 복도',
  '정전된 고층 아파트의 비상계단', '마지막 손님이 떠난 새벽의 낡은 극장 무대 뒤',
  '안개에 잠긴 등대지기의 빈 오두막', '버려진 놀이공원의 멈춘 회전목마 앞',
  '심해 아래 압력에 삐걱이는 잠수정 선실', '신호가 끊긴 우주정거장 관측실',
  '오래된 우물이 있는 시골집 마당', '터널 중간, 갑자기 차가 멈춘 어둠 속',
  '아무도 내리지 않는 막차의 텅 빈 객실', '제사 지내던 폐가의 안방, 색 바랜 영정 아래',
  '수술 흔적이 남은 폐병원 지하 영안실', '눈 내리는 한밤, 가로등 하나뿐인 골목 끝',
  '강이 범람한 반지하방, 차오르는 검은 물 속', '산속 사당, 금줄이 끊긴 본전 안',
  '엘리베이터가 멈춘 13층의 캄캄한 복도', '폐교의 음악실, 저절로 눌리는 풍금 앞',
  '난파선 갑판 아래 물이 새는 화물칸', '낡은 모텔 308호, 거울이 너무 많은 방',
  '폭설로 고립된 외딴 섬의 빈 펜션', '재개발로 비워진 아파트 단지의 마지막 동',
  '비 새는 폐광 갱도, 헤드램프 불빛 끝', '아이 방, 저 혼자 흔들리는 흔들의자 곁',
]

// 3) 전조(첫 균열) — 설명 가능할 법한 작은 이상징후, 독자만 불안
const OMEN = [
  '키우던 개가 허공의 한 점을 보며 으르렁대기 시작한다', '벽시계가 모두 같은 시각에 멈춰 있다',
  '없던 문 하나가 복도 끝에 생겨 있다', '가족이 어제 한 말을 토씨 하나 안 틀리고 반복한다',
  '거울 속 내 그림자가 반 박자 늦게 따라 한다', '천장에서 발소리가, 위층은 빈집인데 들린다',
  '아이가 \'보이지 않는 친구\'와 대화하며 웃는다', '사진 속 인물의 시선이 매번 조금씩 이쪽을 향한다',
  '전등이 깜빡이다 꺼지고, 다시 켜지면 가구가 조금 옮겨져 있다', '라디오 잡음 사이로 내 이름이 또렷이 들린다',
  '문틈으로 새어 들던 빛이 누군가의 그림자에 가려진다', '냉장고 자석들이 밤마다 같은 문장으로 재배열된다',
  '휴대폰 사진첩에 찍은 적 없는 침실 사진이 늘어간다', '욕실 거울에 김이 서리고, 닦지 않은 글씨가 떠오른다',
  '아무도 없는 집에서 누군가 내 신발을 신고 나간 자국이 있다', '벽지 안쪽에서 긁는 소리가 밤마다 한 뼘씩 위로 올라온다',
  '집 안 어디서나 희미한 향(線香) 냄새가 가시지 않는다', '늘 잠가 두던 다락문이 아침마다 손가락 한 마디씩 열려 있다',
  '전화벨이 울려 받으면, 수화기 너머에서 내 숨소리가 들린다', '벽에 걸린 가족사진에서 한 사람의 얼굴만 흐려진다',
  '밤마다 같은 시각, 누군가 현관문을 정확히 세 번 두드린다', '아이의 그림 속 가족이 한 명 더 늘어나 있다',
  '발밑 마룻장이 누군가의 무게에 천천히 삐걱인다', '냉기가 방 한쪽에서만 가시지 않고 입김이 서린다',
  '잠든 사이 누군가 내 머리맡에 앉았던 온기가 이불에 남아 있다', '거울을 볼 때마다 등 뒤 문이 조금씩 열려 있다',
  '시계가 모두 거꾸로 돌기 시작한다', '집 안의 모든 식물이 하룻밤 새 같은 방향으로 시들어 눕는다',
]

// 4) 감각적 공포 — 청각·시각·체감·후각(보이지 않는 것의 공포)
const SENSE = [
  '귓가에 들러붙는, 젖은 숨소리', '발밑에서 끈질기게 긁는 손톱 소리',
  '멀리서 들려오는, 박자가 어긋난 아이의 동요', '목덜미가 한순간 곤두서는 찬 입김',
  '코를 찌르는 피비린내와 그 아래 깔린 썩은 흙냄새', '방 안 공기가 묵직하게 가라앉아 숨이 막히는 압박',
  '어둠 속에서 깜빡이지 않고 이쪽을 보는 두 점의 빛', '문틈으로 스며드는, 형체 없는 그림자의 가장자리',
  '혀끝에 도는 차가운 쇠 맛', '뒤통수에 닿는, 누군가 보고 있다는 확신',
  '천장에서 한 방울씩 떨어지는, 미지근하고 끈적한 액체', '벽 너머에서 내 목소리로 흥얼대는 노랫소리',
  '발소리가 멈춘 뒤에도 한 발짝 더 들리는 발소리', '심장이 쿵 내려앉는, 등 뒤에서 느껴진 무게',
  '향과 촛농 냄새에 섞인, 머리카락 타는 내', '거울 안쪽에서 들리는, 유리를 손톱으로 긁는 소리',
  '복도 끝에서 끌리는, 무언가를 질질 끄는 소리', '살갗에 닿는, 사람 것이 아닌 차고 축축한 손가락',
  '귓속을 파고드는 정적—그 정적을 깨는 한 번의 똑똑', '곰팡내 짙은 어둠에서 풍기는, 오래 묵은 시신의 냄새',
  '바람도 없는데 흔들리는 커튼과, 그 뒤의 윤곽', '숨을 죽이자 또렷해지는, 방 안의 또 다른 숨소리',
  '전선 타는 냄새와 함께 일제히 켜지는 텔레비전의 백색 잡음', '한기가 발끝부터 정수리로 천천히 기어오르는 감각',
  '귀를 막아도 머릿속에서 직접 울리는 속삭임', '눈을 감아도 눈꺼풀 안쪽에 남는, 그것의 잔상',
]

// 5) 규칙/금기 — 괴물·저주의 작동 규칙(밤·이름·문·거울 등). 위반=처벌
const RULE = [
  '해가 진 뒤에는 절대 거울을 봐서는 안 된다', '그것의 이름을 입 밖에 내면 한 걸음 더 가까워진다',
  '복도 끝 방의 문은 무슨 일이 있어도 열지 않는다', '밤 3시 33분, 누가 불러도 대답해서는 안 된다',
  '비디오를 본 사람은 7일 안에 그것을 다른 이에게 넘겨야 산다', '집 안에서는 절대 뒤를 돌아보지 않는다',
  '소금선과 금줄 밖으로 한 발도 나가서는 안 된다', '죽은 이의 이름을 세 번 부르면 그가 돌아온다',
  '문 두드리는 소리에는 세 번째까지 응답하지 않는다', '밤에 휘파람을 불거나 손톱을 깎아서는 안 된다',
  '거울과 거울이 마주 보게 두어서는 안 된다', '제삿날 자정에는 불을 끄고 숨소리조차 죽여야 한다',
  '집 밖에서 부르는 목소리에 함부로 문을 열지 않는다', '잠들기 전 반드시 모든 문에 소금을 뿌려 두어야 한다',
  '그것과 눈을 맞추면 다음은 네 차례가 된다', '밤 사이에는 누구의 사진도 찍어서는 안 된다',
  '13번째 종이 울리기 전에 집 안으로 들어와야 한다', '받은 인형은 절대 버리거나 태워서는 안 된다',
  '한밤중 들리는 노래를 따라 흥얼거려서는 안 된다', '계단을 셀 때 늘 한 칸이 더 많아도 끝까지 세지 않는다',
  '자기 전 \'잘 자\' 인사를 두 번 이상 들으면 답하지 않는다', '마을의 축제 기간에는 외부인이 창밖을 내다봐서는 안 된다',
  '거울 속의 내가 먼저 움직여도 절대 따라 해서는 안 된다', '해 뜨기 전에는 어떤 일이 있어도 방을 나서지 않는다',
  '그것이 흉내 내는 가족의 목소리를 믿어서는 안 된다', '읽다 만 일기의 마지막 장은 끝까지 펼치지 않는다',
  '창밖에서 나를 부르는 소리에는 절대 창문을 열어 내다보지 않는다', '집 안의 촛불이 다 꺼지기 전에 반드시 잠들어 있어야 한다',
]

// 6) 위반의 처벌 — 호기심·규칙 위반의 대가(금지된 지식의 처벌, 목격의 비대칭)
const PRICE = [
  '그날 밤, 그것이 침대 발치에 서 있게 된다', '거울 속의 자신이 자리를 바꿔 밖으로 나온다',
  '집 안의 모든 가족이 똑같은 표정으로 그를 본다', '다음 희생자가 그가 가장 사랑하는 이로 정해진다',
  '아무도 그의 말을 믿지 않아 홀로 갇히게 된다', '저주가 그에게 옮겨붙어 다음 차례가 된다',
  '그 방에서 잃어버린 시간이 영영 돌아오지 않는다', '문을 연 순간, 안과 밖이 뒤바뀌어 나갈 길이 사라진다',
  '그것이 그의 얼굴과 목소리를 가져가 대신 살아간다', '가족이 그를 알아보지 못하고, 사진 속에서도 지워진다',
  '잠들 때마다 같은 죽음을 반복해 겪게 된다', '그의 그림자가 제 의지로 움직이기 시작한다',
  '이름을 부른 대가로, 그것이 매일 한 걸음씩 다가온다', '돌아온 죽은 이가, 그를 데려가려 손을 내민다',
  '집의 문이 하나씩 사라져 결국 한 방에 갇힌다', '본 것을 말하려 할 때마다 목소리가 나오지 않는다',
  '그날 이후 거울이란 거울에 그것이 비치게 된다', '대신할 제물을 찾지 못하면 7일째 새벽에 끌려간다',
  '집 안의 시간이 멈춰 영원히 그 밤을 살게 된다', '버린 인형이 매번 더 가까운 자리로 돌아와 있다',
  '눈을 맞춘 자의 기억이 하루에 하나씩 지워진다', '그것이 가족의 모습으로 식탁에 자리 하나를 더 차지한다',
  '마을이 그를 \'다음 제물\'로 조용히 결정한다', '한 명이 사라질 때마다 가족사진 속 얼굴이 하나씩 지워진다',
  '깨어 있는 것과 꿈의 경계가 무너져 무엇이 진짜인지 알 수 없게 된다', '그의 이름이 다른 모든 사람의 기억에서 지워진다',
]

// 7) 파국(클라이맥스) — 최후의 대면·거짓 승리 후 재공격·열린 결말·반전
const CLIMAX = [
  '마지막 등불이 꺼지고, 어둠 속에서 무수한 발소리가 사방을 메운다', '퇴치했다 믿은 순간, 그것이 다시 천천히 일어선다',
  '구원자인 줄 알았던 자가 사실 그것을 불러낸 장본인이었음이 드러난다', '살아남은 자가 거울을 보자, 거울 속엔 그것이 웃고 있다',
  '문을 부수고 나오자 밖은 똑같은 복도—탈출구는 처음부터 없었다', '저주를 끊으려 태운 물건이, 재 속에서 다시 형체를 갖춘다',
  '마지막 생존자가 \'우리 집에 온 걸 환영해\'라는 메시지를 받는다', '모든 게 환각이었다 안도한 순간, 그 환각 속에서 한 명이 더 줄어 있다',
  '가족을 구해 끌어안았더니, 그 얼굴이 천천히 흘러내린다', '경찰이 도착했을 때, 그를 가리키며 \'저자가 다 죽였다\'고 증언한다',
  '해가 떴다고 외친 순간, 창밖의 하늘이 다시 검게 닫힌다', '마지막 컷, 카메라가 비추는 거울 한구석에서 무언가 손을 흔든다',
  '저주가 다음 사람에게 옮겨갔음을 알리는 전화벨이 새 희생자의 집에서 울린다', '그것을 봉인한 대가로, 봉인한 자가 그 자리를 대신 채운다',
  '살아 돌아온 줄 알았던 화자가, 실은 첫날 밤에 이미 죽어 있었다', '마지막 생존자가 입을 열자, 그것의 목소리가 흘러나온다',
  '불을 붙여 모두 태웠으나, 잿더미에서 알 하나가 꿈틀거린다', '구조 헬기에 오른 순간, 옆자리에 그것이 안전벨트를 매고 앉아 있다',
  '아이를 안고 탈출하지만, 품 안의 아이가 그것의 눈으로 올려다본다', '도망친 도시에서도 밤 3시 33분, 문이 정확히 세 번 두드려진다',
  '마지막 페이지가 \'다음은 이 글을 읽은 당신\'이라는 문장으로 끝난다', '동이 트며 모두 끝났다 믿지만, 그림자 하나가 따라 일어선다',
  '봉인을 마친 주인공의 손등에, 그것의 표식이 천천히 떠오른다', '\'끝났어\'라고 안심시킨 친구의 미소가, 0.5초 늦게 지어진다',
  '모든 거울을 깨뜨렸지만, 깨진 조각마다 그것이 하나씩 들어 있다', '구해낸 가족이 식탁에 둘러앉자, 의자 하나가 저절로 당겨진다',
]

// 8) 드레드(기다림) — 사건이 아닌 \'곧 무언가 일어난다\'는 예감. 정적·일상의 어긋남
const DREAD = [
  '아무 일도 일어나지 않는 정적이, 무슨 일보다 더 견디기 힘들다', '시계 초침 소리만 비정상적으로 또렷하게 커진다',
  '집 안의 모든 소리가 한순간 약속한 듯 멈춘다', '평범한 거실이, 무언가 단 하나가 어긋나 낯설게 보인다',
  '\'곧 온다\'는 예감이 살갗을 타고 천천히 번진다', '익숙한 복도가 한 걸음마다 조금씩 더 길어지는 듯하다',
  '숨을 쉬는 것조차 들킬까 봐 조심하게 된다', '평소와 똑같은데, 단지 \'있어야 할 누군가\'가 보이지 않는다',
  '벽 너머의 침묵이 귀를 기울이고 있는 것만 같다', '시간이 끈적하게 늘어져 1초가 영원처럼 느껴진다',
  '문 손잡이가 천천히, 아주 천천히 돌아가기 시작한다', '온 집안 공기가 폭풍 직전처럼 팽팽하게 당겨진다',
  '발소리가 멈춘 그 자리에서, 다음 한 걸음을 한참 기다리게 된다', '늘 켜져 있던 불빛 하나가 꺼져 있을 뿐인데 등골이 서늘하다',
  '아이가 갑자기 노래를 뚝 멈추고, 그 침묵이 너무 길다', '거울 앞을 지나는 게 두려워 일부러 고개를 돌리게 된다',
  '\'아직\'이라는 단어가, 머릿속에서 자꾸 메아리친다', '문을 열기 직전, 손잡이에 닿은 손이 차갑게 굳는다',
  '집 전체가 숨을 참고 무언가를 기다리는 것만 같다', '평온한 한낮인데도 그늘진 구석에서 눈을 뗄 수 없다',
  '\'돌아보면 안 된다\'는 생각만으로 목덜미가 굳는다', '아무도 없는 옆방에서 의자가 끌리는 소리가 단 한 번 났다',
  '숨소리를 죽이고 있는데도, 누군가 함께 숨을 참고 있는 기척이 든다', '다음 순간 무슨 일이 벌어질지 알면서도 발이 떨어지지 않는다',
  '벽 안쪽에서 무언가 천천히 깨어나는 듯한 기척이 느껴진다',
]

// 9) 정서 — 호러 정서 키워드(여운·존재론적 불안)
const EMOTION = [
  '서늘한 공포(terror)', '치밀어오르는 경악(horror)', '속이 뒤집히는 혐오(disgust)', '끝없이 차오르는 불안(dread)',
  '아무도 못 믿는 편집증(paranoia)', '손쓸 수 없는 무력감', '벗어날 수 없는 고립감', '바닥 모를 절망',
  '서서히 무너지는 광기', '집요하게 따라붙는 불길함(ominous)', '살갗을 스치는 오싹함(eerie)', '익숙함이 뒤틀린 섬뜩함(uncanny)',
  '체념과 뒤섞인 공포', '도망칠 곳 없는 폐소(閉所)의 압박감', '믿음이 깨지는 배신의 서늘함', '죽음을 직감한 자의 적막',
  '무엇이 진짜인지 모를 현실감의 붕괴', '곧 닥쳐올 끝을 아는 자의 체념', '존재가 지워질지 모른다는 소멸의 공포', '돌이킬 수 없음을 깨달은 뒤의 막막함',
]

interface Slot { key: string; label: string; icon: string; options: string[] }
const SLOTS: Slot[] = [
  { key: 'threat', label: '괴물/위협', icon: '👁', options: THREAT },
  { key: 'place', label: '출몰 장소', icon: '🏚', options: PLACE },
  { key: 'omen', label: '전조(첫 균열)', icon: '🕯', options: OMEN },
  { key: 'sense', label: '감각적 공포', icon: '🩸', options: SENSE },
  { key: 'rule', label: '규칙/금기', icon: '⛔', options: RULE },
  { key: 'price', label: '위반의 처벌', icon: '🔪', options: PRICE },
  { key: 'climax', label: '파국', icon: '💀', options: CLIMAX },
  { key: 'dread', label: '드레드(기다림)', icon: '🌫', options: DREAD },
  { key: 'emotion', label: '정서', icon: '😱', options: EMOTION },
]

// 전체 조합수(BigInt로 정확히) — 1조 이상 지향
const COMBOS = SLOTS.reduce((n, s) => n * BigInt(s.options.length), 1n)
const COMBO_STR = COMBOS.toLocaleString('en-US')
// 조(兆) 단위 한글 표기
function koBig(n: bigint): string {
  const jo = 1000000000000n, eok = 100000000n
  if (n >= jo) { const v = Number(n / eok) / 10000; return `약 ${v.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}조` }
  if (n >= eok) { const v = Number(n / 10000n) / 10000; return `약 ${v.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}억` }
  return n.toLocaleString('ko-KR')
}

function randIdx(n: number) { return Math.floor(Math.random() * n) }

// 받침 유무 판별 → 조사 자동 선택(괄호 이중표기 금지). 끝 글자가 한글이 아니면 받침 없는 형으로 처리.
function hasBatchim(word: string): boolean {
  const ch = (word || '').trim().slice(-1)
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false // 한글 음절이 아니면 받침 없음 취급
  return (code - 0xac00) % 28 !== 0
}
// 받침에 따라 알맞은 조사를 붙여 반환. type별로 (받침 있을 때, 없을 때)
function josa(word: string, type: '이/가' | '을/를' | '은/는' | '으로/로' | '이었다/였다'): string {
  const b = hasBatchim(word)
  switch (type) {
    case '이/가': return word + (b ? '이' : '가')
    case '을/를': return word + (b ? '을' : '를')
    case '은/는': return word + (b ? '은' : '는')
    case '으로/로': return word + (b ? '으로' : '로')
    case '이었다/였다': return word + (b ? '이었다' : '였다')
  }
}

const LS_KEY = 'sry:tool:horror-signature'
interface SavedScene { id: string; text: string; title: string; ts: number }

const REL_LABEL: Record<string, string> = {
  'setting-bible': '🏞 배경 설정집', 'scene-list': '📋 장면 목록', 'sensory-palette': '🌫 감각 팔레트',
  'plot-pyramid': '🔺 플롯 피라미드', 'character-sheet': '🪪 인물 시트', 'genre-conventions': '📐 장르 관습',
  'genre-devices': '🧩 장르 장치', 'scene-forge': '🎬 장면 생성기', 'mood-creature': '🐾 괴수 생성',
}
const RELATED = ['setting-bible', 'scene-list', 'sensory-palette', 'plot-pyramid']

export default function HorrorSignature({ payload }: { payload?: Record<string, unknown> }) {
  const incomingGenre = typeof payload?.genre === 'string' ? (payload.genre as string) : ''
  const [picks, setPicks] = useState<Record<string, number>>(() => Object.fromEntries(SLOTS.map((s) => [s.key, randIdx(s.options.length)])))
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState(false)
  const [flashMsg, setFlashMsg] = useState('')
  const [saved, setSaved] = useState<SavedScene[]>([])
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 저장 목록 로드
  useEffect(() => {
    try { const raw = localStorage.getItem(LS_KEY); if (raw) setSaved(JSON.parse(raw) as SavedScene[]) } catch { /* noop */ }
  }, [])
  // 언마운트 정리(타이머)
  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current)
    if (copyTimer.current) clearTimeout(copyTimer.current)
  }, [])

  const persist = useCallback((list: SavedScene[]) => {
    setSaved(list)
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)) } catch { /* 용량 초과 무시 */ }
  }, [])

  const rollAll = useCallback(() => setPicks((p) => Object.fromEntries(SLOTS.map((s) => [s.key, locked[s.key] ? p[s.key] : randIdx(s.options.length)]))), [locked])
  const rollOne = useCallback((k: string) => setPicks((p) => ({ ...p, [k]: randIdx(SLOTS.find((s) => s.key === k)!.options.length) })), [])
  const toggleLock = useCallback((k: string) => setLocked((l) => ({ ...l, [k]: !l[k] })), [])

  const val = useCallback((k: string) => SLOTS.find((s) => s.key === k)!.options[picks[k]], [picks])

  const sceneText = useMemo(() => {
    return (
      `[${val('place')}]\n` +
      `${val('omen')}. ${val('dread')}\n` +
      `${val('sense')}. 그것은 「${val('threat')}」${hasBatchim(val('threat')) ? '이었다' : '였다'}.\n` +
      `이곳에는 규칙이 있다: ${val('rule')}. 그러나 그 금기를 어기는 순간, ${val('price')}.\n` +
      `그리고 마지막—${val('climax')}.\n` +
      `남는 것은 ${val('emotion')}뿐.`
    )
  }, [val])

  const sceneTitle = useMemo(() => `${val('threat')} · ${val('place')}`.slice(0, 60), [val])

  const flash = useCallback((m: string) => {
    setFlashMsg(m)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlashMsg(''), 1600)
  }, [])

  const copy = useCallback(() => {
    navigator.clipboard?.writeText(sceneText).then(() => {
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 1400)
    }).catch(() => {})
  }, [sceneText])

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const toProject = useCallback(() => {
    const bodyHtml = '<p>' + sceneText.split('\n').map((l) => esc(l)).join('</p><p>') + '</p>'
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '공포 장면',
      title: sceneTitle, bodyHtml, synopsis: `${val('threat')} / ${val('place')} / ${val('emotion')}`,
      icon: '🩸',
      meta: { 위협: val('threat'), 장소: val('place'), 금기: val('rule'), 정서: val('emotion'), 장르: '호러·공포' },
    })
    flash(id ? '프로젝트 원고에 공포 장면 추가됨' : '프로젝트에 연결되어 있지 않습니다')
  }, [sceneText, sceneTitle, val, flash])

  const toSnippet = useCallback(() => {
    addToLibrary('snippets', { text: sceneText, source: '호러 공포 장면 생성기', tags: ['호러', '공포', '장면', val('emotion').split('(')[0].trim()] })
    flash('스니펫(글감)으로 저장됨')
  }, [sceneText, val, flash])

  const toPlace = useCallback(() => {
    const placeHistory = `${josa(val('threat'), '이/가')} 깃든 곳. ${val('omen')}`
    addToLibrary('places', {
      name: val('place'), kind: '호러 출몰지', mood: val('emotion'),
      sensory: val('sense'), rules: val('rule'),
      history: placeHistory,
      notes: sceneText, source: '호러 공포 장면 생성기',
      // 받는 허브(배경 설정집)에서 항목이 제자리(기본 칸)에 들어가도록 정규 키로 매핑(추가만).
      fields: {
        name: val('place'),
        kind: '호러 출몰지',
        atmosphere: val('emotion'),     // 분위기
        sensory: val('sense'),          // 오감/감각
        rules: val('rule'),             // 규칙/금기
        dangers: `${val('threat')} — ${val('price')}`, // 위협과 그 대가
        history: placeHistory,
        secrets: val('climax'),         // 끝내 드러나는 파국/비밀
        notes: sceneText,
      },
    })
    flash('배경 라이브러리에 출몰지 저장됨')
  }, [sceneText, val, flash])

  const toSceneList = useCallback(() => {
    openToolLinked('scene-list', { scene: { title: sceneTitle, summary: sceneText, place: val('place'), mood: val('emotion'), conflict: val('rule') }, genre: '호러·공포' })
    flash('장면 목록으로 보냄')
  }, [sceneText, sceneTitle, val, flash])

  const saveLocal = useCallback(() => {
    const rec: SavedScene = { id: 'hs_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36), text: sceneText, title: sceneTitle, ts: Date.now() }
    persist([rec, ...saved].slice(0, 100))
    flash('이 도구에 저장됨')
  }, [sceneText, sceneTitle, saved, persist, flash])

  const removeSaved = useCallback((id: string) => persist(saved.filter((s) => s.id !== id)), [saved, persist])
  const loadSaved = useCallback((rec: SavedScene) => {
    navigator.clipboard?.writeText(rec.text).catch(() => {})
    flash('저장 장면을 클립보드에 복사함')
  }, [flash])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', overflow: 'auto' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>
        조합 가능한 공포 장면 <b style={{ color: 'var(--accent)' }}>{koBig(COMBOS)}</b>가지
        <span style={{ opacity: 0.7 }}> ({COMBO_STR})</span>. 슬롯을 <Emoji e="🔒"/> 잠그고 나머지만 <Emoji e="🎲"/> 돌려 원하는 공포를 단조하세요.
        {incomingGenre && incomingGenre !== '호러·공포' && (
          <span style={{ display: 'block', marginTop: 3, color: 'var(--muted)' }}>※ 이 도구는 호러·공포 전용입니다(요청 장르: {incomingGenre}).</span>
        )}
      </div>

      {/* 생성 결과 — 한 단락 공포 장면 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
        {sceneText}
      </div>

      {/* 슬롯 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SLOTS.map((s) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', width: 96, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span aria-hidden><Emoji e={s.icon}/></span>{s.label}
            </span>
            <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45 }}>{s.options[picks[s.key]]}</span>
            <button className="minibtn" title={locked[s.key] ? '잠금 해제' : '이 슬롯 잠금'} onClick={() => toggleLock(s.key)} style={{ color: locked[s.key] ? 'var(--accent)' : 'var(--muted)' }}>{locked[s.key] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
            <button className="minibtn" title="이 슬롯만 다시" onClick={() => rollOne(s.key)} disabled={locked[s.key]}><Emoji e="🎲"/></button>
          </div>
        ))}
      </div>

      {/* 생성/복사/저장 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={rollAll}><Emoji e="🎲"/> 공포 장면 생성</button>
        <button className="minibtn" onClick={copy}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
        <button className="minibtn" onClick={saveLocal}><Emoji e="💾"/> 저장</button>
      </div>

      {/* 연계 */}
      <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '현재 공포 장면을 프로젝트 원고에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={toSnippet}><Emoji e="📥"/> 스니펫 저장</button>
        <button className="linkbtn" onClick={toPlace}><Emoji e="🏚"/> 출몰지 저장</button>
        <button className="linkbtn" onClick={toSceneList}><Emoji e="📋"/> 장면 목록으로</button>
        {RELATED.map((id) => (
          <button key={id} className="linkbtn" onClick={() => openToolLinked(id, { genre: '호러·공포' })}>{emojify(REL_LABEL[id] || id)}</button>
        ))}
      </div>

      {/* 저장 목록(CRUD) */}
      {saved.length > 0 && (
        <div style={{ marginTop: 2 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>저장된 공포 장면 {saved.length}개 (클릭 시 클립보드 복사)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {saved.map((rec) => (
              <div key={rec.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px' }}>
                <span onClick={() => loadSaved(rec)} title="클립보드에 복사" style={{ flex: 1, fontSize: 12, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Emoji e="🩸"/> {rec.title}</span>
                <button className="minibtn" title="삭제" onClick={() => removeSaved(rec.id)}><Emoji e="🗑"/></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {flashMsg && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>✓ {flashMsg}</div>}
    </div>
  )
}
