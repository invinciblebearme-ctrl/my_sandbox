# 인계 문서: 다른 에이전트·세션에서 이어서 작업하기

브랜치 `ccr-dd12b4fe-66a6b0`에 지금까지 한 작업이 모두 커밋되어 있다. 새 세션은 이 브랜치를 체크아웃한 뒤 이 문서부터 읽으면 된다.

## 저장소에 있는 두 프로젝트
1. **좀비 게임 (Unity)**
   - 테마 몬스터 7세트, 플레이어 의상 8종, 아이템, 치유 마법사, 무협 고수.
   - 코드: `src/themes`, `src/player`, `src/magic`, `src/wuxia`, `unity/`
   - 결과물: `models/<테마>/`
2. **교육용 ARPG 「망각의 그림자」 (three.js)**
   - MVP 세트 완료. 수호기사, 숲 몬스터 3종 + 투사체, 장비·소모품 33종 + 아이콘, 숲 타일셋 35종, 이펙트 11종.
   - 코드: `src/edu/`
   - 결과물: `models/edu/public/` + `models/edu/manifest.json`
   - 설명: `models/edu/README.md`
   - 에셋 목록 원문은 사용자가 대화에 붙여 준 「에셋 제작 목록」 문서다. 저장소에는 없으니 필요하면 사용자에게 다시 받는다.

## 규칙 (사용자와 합의한 것)
- 브랜치 `ccr-dd12b4fe-66a6b0`에서만 작업하고 푸시한다. PR은 요청이 있을 때만 만든다.
- 커밋 메시지나 코드에 모델 이름을 넣지 않는다.
- 교육 ARPG의 톤과 규격:
  - 귀엽고 고어 없음. `eduKit`은 늘 horror 0이다.
  - 쓰러지면 빛 조각과 글자 파편으로 흩어진다(`fragments`/`burst`).
  - 1 m 단위, 정면 +Z.
  - 삼각형 예산: 캐릭터 2k, 몬스터 1.5k, 소품 500 이하.
- **스테이지(지역 타일셋·마을 건물)는 직접 만들지 않는다.** 사용자가 Polyfork(polyfork.dev) 키트를 쓰기로 했다.
  - 추천 목록은 아래 "Polyfork 추천"에 있다.
  - 이미 만든 숲 타일셋(`props/stage1_*`)은 대체될 수 있다.

## 진행 상황
에셋 목록 1~9절을 모두 만들었다. 스테이지 타일셋과 마을 건물은 Polyfork 키트로 대체하기로 했다. 결과물 설명은 `models/edu/README.md`에 있다.

| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | 별사냥꾼·현자, 무기·소모품·퀴즈 도구·바닥 드랍 | 완료 |
| 2 | 일반 몬스터 9종 (도서관·시계탑·심연) | 완료 |
| 3 | 보스 4종 + 보스 효과 | 완료 |
| 4 | NPC 5명 + 부엉이 루미 (표정 6종) | 완료 |
| 5 | 스킬 24종, 상태 이상, 포탈, 엘리트 오라, 전설 아이템 12종 | 완료 |
| 6 | 스테이지 타일셋·마을 건물 | Polyfork로 대체 (직접 만들지 않음) |
| 7 | UI·퀴즈 UI·초상화·카드·스킬 아이콘·타이틀·로딩 (PNG) | 완료 |
| 8 | 효과음 60개, BGM 11곡 (합성) | 완료. 직접 들어 보지는 못함 |

남은 일:
- 사용자 피드백 반영. 특히 사운드는 귀로 확인이 필요하다.
- Polyfork 키트를 고른 뒤 색과 규격 맞추기.
- 게임 코드에 넣어 테스트하기.

## 작업 방법
```bash
npm install
npx vite build && npx vite preview --port 4173 --strictPort &   # 뷰어 (테마 → [교육 ARPG] 속삭이는 숲)
cp tools/edu-manifest.cjs _m.cjs && node _m.cjs /tmp/m.json; rm _m.cjs   # 전체 빌드 + 삼각형 수 확인
cp tools/edu-shot.cjs _s.cjs && node _s.cjs <출력폴더>; rm _s.cjs         # 스크린샷
cp tools/edu-export.cjs _e.cjs && node _e.cjs models/edu; rm _e.cjs      # GLB·아이콘·manifest 내보내기
cp tools/verify.mjs _v.mjs && node _v.mjs models/edu/public/models/monsters; rm _v.mjs  # GLB 검증
node tools/ui/ui-gen.cjs models/edu      # UI PNG
node tools/ui/art-gen.cjs models/edu     # 초상화·카드·스킬 아이콘·타이틀·로딩 (preview 서버 필요)
python3 tools/audio/synth.py models/edu  # 효과음·BGM
```
- 확인용 시트: `tools/edu-sheet.cjs`(카테고리 격자), `tools/edu-poses.cjs`(한 모델의 여러 동작), `tools/ui/sheet.py`(PNG 시트).
- 스크립트는 저장소 루트로 복사해서 실행해야 `playwright`와 `three`를 찾는다.
- 새 카테고리나 항목을 `src/edu/index.js`에 넣으면 뷰어, manifest, 내보내기에 자동으로 들어간다.
  - 항목 정의: `defaults`, `schema`, `build`, `file`
  - 카테고리: characters, monsters, items, props, vfx
- 새 모델을 넣을 때마다 삼각형 수와 스크린샷을 확인한다.

## Polyfork 추천 (검색 결과 기준, 사이트 직접 확인 필요)
| 지역 | 키트 |
|---|---|
| 등불 마을 | Medieval Village Kit (약 60개) |
| 속삭이는 숲 | Nature & Forest Kit (약 59개) |
| 무너진 대도서관 | 전용 키트 없음. Bookshelf·Library Book Stack·Alcove Bookcase 개별 에셋, University Kit(제작 중) |
| 얼어붙은 시계탑 | Alpine and Snow Kit (59개) + Ice Chunk, Whimsical Gear Hub |
| 망각의 심연 | Dungeon & Crypt Kit(제작 중)의 색을 바꿔 사용. 뼈 같은 고어 에셋은 제외 |
| 없는 테마 | https://polyfork.dev/steer 에서 맞춤 키트를 요청할 수 있다 |

- 네트워크: 개인 환경 **my_sandbox**는 polyfork.ai와 polyfork.dev를 허용한다. 새 세션도 이 환경을 고르면 같은 접속 설정을 쓴다.
- 이 세션에서는 웹 페치 도구로 사이트를 열지 못했다. 새 세션에서는 `curl https://polyfork.dev/llms.txt`로 카탈로그와 API를 확인한다.
