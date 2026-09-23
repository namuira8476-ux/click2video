# 구현 노트 (제안서 대비 결정 사항)

2026-09-03 · 기획 문서(제안서)를 기준으로 구현하며 스스로 결정한 것들.

> 제안서 원문은 이 저장소에 포함되어 있지 않습니다. 코드 주석의 `§N` 은 그 문서의 절 번호입니다.

## 환경에서 발견한 것
- **Next.js 16.3.4** 로 스캐폴드됨. `params` 는 Promise 이며 `PageProps` / `RouteContext` 전역 헬퍼를 사용한다 (`npx next typegen` 이 생성). Turbopack 기본.
- `better-sqlite3`, `sharp` 는 `serverExternalPackages` 로 외부화. 둘 다 Windows/Node 22 에서 프리빌드 바이너리로 설치 성공.
- 상위 폴더(사용자 홈)에 package-lock.json 이 있어 Turbopack 루트 경고가 떠서 `turbopack.root` 를 프로젝트로 고정.
- Tailwind v4 는 `@import "tailwindcss"` 뒤에 다른 `@import url()` 을 허용하지 않아 Pretendard 는 `layout.tsx` 의 `<link>` 로 로드.

## 제안서에 없어서 정한 것
- **마이그레이션**: `drizzle-kit generate` 로 SQL 을 만들고 앱 시작 시 `migrate()` 로 자동 적용 → `npm run dev` 만으로 DB 준비.
- **게스트 시드**: DB 초기화 시 `guest` 사용자를 3,000 크레딧으로 생성(없을 때만).
- **fal 정산**: fal 응답에는 usage 가 없어 "성공 시 견적 금액 = 확정 금액". 실패·취소는 전액 환불(멱등).
- **MOCK 업로드**: `mock://` 를 돌려주는 대신 러너가 로컬 공개 URL(`/api/files/...`, `/samples/...`)을 그대로 사용.
- **선택 슬롯 번호 재부여**: 슬롯 정의 순서대로 존재하는 자산에만 번호를 매기고, `reference_*_urls` 배열도 같은 순서로 만든다 (테스트로 고정).
- **동적 select(댄스·밈)**: 템플릿 JSON 에는 `__placeholder__` 만 있고, 런타임에 `public/refs/manifest.json` 의 `dance-*` / `meme-*` 항목으로 채운다. 파일이 없으면 카드에 "레퍼런스 영상 준비 중" 배지 + 생성 비활성.
- **카드 예상 크레딧**: 기본 옵션 + 일반 입력(1024² 이미지, 10초 영상, 5초 오디오) 기준으로 서버에서 계산해 `baseCredits` 로 내려준다.
- **프롬프트 보강**: `prompt_expansion_mode` 기본 `balanced`, 디테일 조정에서 `quality` 선택 가능. 결과의 `expanded_prompt` 를 작업에 저장해 결과 페이지에서 확인.
- **영상 길이 프로브**: ffmpeg 없이 mp4 `mvhd` 박스와 WAV 헤더를 직접 읽는다. 실패하면 클라이언트가 `<video>` 메타로 잰 값을 사용.
- **동의 체크박스**: "샘플로 해보기" 를 누르면 샘플 자산이므로 자동으로 체크된다.

## 2차 추가 (2026-09-03 밤): 챌린지 프리셋 · 한국어 텍스트 · 소상공인 광고
- **프리셋 클립은 합성**: 실제 챌린지 영상은 저작권 때문에 받지 않고 `minimax/h3-max/text-to-video` 로 "그 챌린지 느낌"을 만든 것이다. 안무 정확도는 보장하지 않는다. 정확한 안무는 "내 댄스 영상" 업로드 슬롯으로 넣는다.
- **업로드 또는 프리셋**: 슬롯 `skipIfSlot`(업로드가 있으면 프리셋 슬롯 건너뜀) + 템플릿 `oneOf`(둘 중 하나 필수) + `refAliases`(프롬프트에서 `{{ref.motion}}` 하나로 둘을 가리킴).
- **텍스트 → 이미지 슬롯(`source: "textImage"`)**: 옵션 텍스트를 sharp SVG 로 렌더링(맑은 고딕 등 시스템 폰트, Windows 에서 확인). 캐시 키는 sha1(style+text). MOCK 모드에서도 동작한다.
- **프리뷰 타일**: manifest 항목의 `publicUrl` 을 select 값 `previewUrl` 로 내려 UI 에서 hover 재생. 이미지 고정 자산(무드·낙서)도 같은 타일로 보인다.
- **카테고리 `smallbiz`** 4종 + `korean-typo` + `landing-motion` 개편(헤드라인 텍스트 이미지). 총 17개 템플릿.
- 개발 서버가 떠 있는 상태에서 스키마를 바꾸면 `instrumentation.ts` 로 로드된 러너 쪽 모듈은 갱신되지 않아 "template definitions invalid" 가 뜬다. **스키마·템플릿을 바꾸면 dev 서버를 재시작**한다.

## 3차 (2026-09-04): 샘플 자산 전수 점검 · 전 템플릿 실제 생성 검증
- **발견**: 첫 `npm run samples` 가 FAL_KEY 없이 돌아 26개 이미지(썸네일 12, 입력 샘플 8, 무드·낙서 고정 자산 6)가 SVG 그라데이션 플레이스홀더였고, 영상 입력 템플릿 5종은 Big Buck Bunny, 목소리 샘플은 3초 사인파였다. 소상공인 템플릿 5종은 dev 서버 재시작 전 스키마 캐시 때문에 한 번도 성공한 적이 없었다.
- **플레이스홀더 판별**: `gen-samples.ts --placeholders` 는 "정확히 DIMS 크기(1080×1920 / 1920×1080 / 1024×1024)이고 300KB 이하" 인 PNG 를 플레이스홀더로 본다. gpt-image-2 결과는 608×1088 / 1024×1024 에 1MB 안팎이라 겹치지 않는다.
- **샘플 클립·목소리**: `gen-sample-clips.ts` 가 H3-Max text-to-video 로 5초 클립 5개(말하는 사장님 / 노을 커플 / 그린스크린 / 한낮 거리 / 폰 횡단보도)를, `fal-ai/minimax/speech-02-hd`(language_boost Korean, Calm_Woman)로 한국어 인사 6.4초를 만든다. TTS 의 `audio_setting` 은 클라이언트 타입(문자열)과 서버 스키마(숫자)가 어긋나 422 가 나므로 생략한다(기본값이 mp3·32kHz·mono). wav 변환은 ffmpeg.
- **mock 프리셋 재출현 방지**: `fetch-mock-video.ts` 는 실제 `dance-*` / `meme-*` 항목이 manifest 에 있으면 mock 항목을 추가하지 않는다.
- **e2e 검증**: `e2e-samples.ts` 가 `/api/templates` → `/api/estimate` → `/api/jobs` → 폴링 순으로 UI 의 "샘플로 해보기" 와 동일한 요청을 보내고, 결과 mp4 에서 ffmpeg 로 프레임 3장을 뽑아 `storage/e2e/` 에 리포트를 남긴다. 러너 동시성은 `RUNNER_CONCURRENCY` 로 올린다.
- **프리뷰**: 별도 생성 대신 e2e 성공 결과를 `promote-previews.ts` 로 `public/samples/<id>/preview.mp4` 에 복사한다 (추가 비용 0).
- **UI**: 자산 없이 문구만으로 만드는 템플릿(키네틱 타이포)도 "샘플로 해보기" 버튼이 뜨고, 템플릿 상세의 BEFORE 패널에 샘플 영상·오디오도 표시된다.
- **"자동" 화면비 버그**: e2e 에서 세로(9:16) 샘플 클립을 넣은 AR 매직·배경 교체·보이스 클론이 모두 1344×768(가로)로 나왔다. fal 의 `adaptive` 는 입력 비율을 따르지 않는다. `probeMp4Dimensions`(tkhd 박스, 회전 매트릭스 반영)로 영상 크기를 읽고, `pickRatioFromAssets` 가 첫 영상(없으면 첫 사용자 이미지)에 가장 가까운 허용 비율을 고른다. UI 라벨은 "자동 (입력 영상·사진 비율에 맞춤)".
- **사람 얼굴은 스타일 변환이 안 된다 (모델 한계, 2026-09-05 검증)**: `style-transform` 에 사람 사진을 넣으면 프롬프트·확장 프롬프트가 "완전한 비사실주의, 매트 플라스티신"을 명시해도 인물은 실사로 남고 배경·소품만 클레이가 된다(판정 fail). 같은 프롬프트에 고양이 사진을 넣으면 털·눈까지 완전히 클레이로 변환된다. H3-Max 가 사람 정체성 보존을 스타일 지시보다 우선하는 것으로 보인다. → 샘플을 코기 사진으로 바꾸고, 슬롯 힌트·태그라인에 "반려동물·사물이 가장 잘 변한다"고 명시했다.
- **사용자 문구는 반드시 textImage 슬롯으로**: `black-studio-launch` 에서 헤드라인을 프롬프트 문자열로 넘겼더니 "Silence, Redefined." 가 "Silence, Redfined." 로 렌더되고 브랜드명의 A 가 그리스 문자 Λ 로 바뀌었다. 헤드라인·브랜드명을 `textImage` 슬롯으로 옮기니 철자가 정확해졌다. 이미지 3장은 무료 토큰(4,096) 안이라 추가 비용이 없다.
## 3차 추가 (2026-09-06): 소상공인 템플릿 6종 + 첫/끝 프레임 모드
- **`mode: "first-last"`**: `minimax/h3-max/image-to-video` 로 이미지 1~2장을 시작·끝 프레임으로 잇는다. 화면비는 첫 이미지를 따르고(aspect_ratio 없음) 레퍼런스 배열·textImage 슬롯을 못 쓴다. 엔드포인트가 달라 `H3Client.status/result/cancel` 에 모드를 넘긴다(`modeOf(templateId)`). 전후 비교(before-after)·재료→완성(macro-cut)이 쓴다.
- **텍스트 보존 게이트 — 통과**: 제안서 심사에서 "정보 밀집 전단의 본문·전화번호는 768P 에서 조용히 깨진다"고 예측했으나, 정면 평면 전단(1080×1528, 본문 40~72px)을 `poster-motion` 프롬프트("printed text as an image to reproduce faithfully")로 돌리니 **모든 줄·가격·전화번호(02-123-4567)가 시작·중간·끝 프레임 전부 정확**했다. 간판 합성 사진(`gate/store-sign.png`)을 `season-swap` 으로 눈 내리게 바꿔도 간판 "카페 봄날" 이 그대로 남았다. 즉 "글자를 이미지로 넣고 그대로 재현하라"는 지시는 textImage 슬롯뿐 아니라 사진 속 인쇄물에도 통한다. 반대로 빈 텍스트 슬롯·프롬프트 문자열은 여전히 깨진다(이전 검증).
- **연출 영상 표기 강제**: 계절 갈아입히기는 고정 자산 `notice-staged`(1024×512)를 `fixed` 슬롯으로 넣어 결과 하단에 "연출 영상 · 실제와 다를 수 있음" 을 항상 찍는다. fal 이미지 비율 한도(0.4~2.5) 때문에 4:1 배너는 거부됐고 2:1 로 줄였다.
- **전후 샘플은 gpt-image-2/edit 로**: 프롬프트 두 개로 따로 만들면 차종·날씨가 달라진다. 깨끗한 차를 먼저 만들고 그 이미지를 `fal-ai/gpt-image-2/edit` 로 "흙먼지만 입혀" before 를 만들어 같은 차·같은 자리가 됐다.
- **한글 인쇄물 샘플은 sharp 로 합성**(`scripts/compose-posters.ts`): gpt-image-2 는 한글을 자주 깨뜨리므로 SVG 텍스트를 직접 그린다. 스톡 클립 2개(`stock-walk`, `stock-table`)와 안내 이미지는 같은 스크립트가 `public/refs` 매니페스트에 등록한다.
- **6종 검증 결과(판정+반박)**: before-after pass·프리뷰, season-swap pass·프리뷰, poster-motion pass·프리뷰(첫 프레임을 "글자 숨김"으로 시작하게 고친 뒤), wear-swap 프리뷰(색을 말로도 고정 후 채도 정상), pop-out partial(포스터가 창문·구멍으로 변함), macro-cut partial(중간 2초가 캐러멜 액체). **부정 형용사("never glossy, syrupy")를 본문에 쓰면 오히려 그 모습이 나온다** — 두 번 연속 재현. 긍정 묘사로 바꾸고 금지어는 네거티브 절에만 둔다.
- **오디오 보존 지시 제거**: 7개 템플릿에 남아 있던 "keep the original audio/sound" 류 문장을 모두 새 사운드 묘사로 바꿨다(무시되는 지시가 라이브러리에 남아 있으면 복사하는 사람이 속는다).
- **재사용 스킬**: 여기서 검증된 엔드포인트·프롬프트·제약·검증 루프를 `~/.claude/skills/h3-video-templates/` 로 뽑아 다른 서비스에서도 쓸 수 있게 했다. 스킬 없이 설계하면 6/6 이 파라미터를 틀렸고(1080P, 문자열 duration, prompt_optimizer, video-to-video 발명), 스킬을 읽으면 6/6 전부 맞았다. 템플릿을 고치면 `npm run export-skill` 로 `references/templates.md` 를 다시 내보내 스킬을 동기화한다. 이 회차 배포: Version `b612c0af` (23종, 신규 프리뷰 4개 라이브 확인).
- **보안 강화(자동 리뷰 지적)**: `/api/files` 는 SVG 를 인라인 타입 목록에서 빼고 비허용 타입은 첨부로 내려주며 모든 응답에 `X-Content-Type-Options: nosniff` + `Content-Security-Policy: sandbox; default-src 'none'` 을 붙인다. `sample:` 슬롯 값은 `resolveSamplePath` 가 `/samples/` 접두사·역슬래시·널 문자·절대 경로·`..` 를 거부하고 realpath 로 `public/samples` 안인지 확인한다 (테스트 `tests/sample-path.test.ts`).

## 4차 (2026-09-23): BYOK — 방문자가 각자 자기 fal 키로

공개 배포를 위해 "운영자 키로 대신 만들어 주는" 구조를 걷어냈다.

- **전역 `fal` 싱글턴이 멀티테넌트에서 치명적이었다.** `fal.config({credentials})` 는 모듈 전역 상태라, 요청 A 가 설정한 키를 요청 B 가 그대로 쓴다(= 과금 주체가 뒤바뀐다). `createFalClient({credentials})` 로 요청마다 격리된 인스턴스를 만들고, `getH3Client(key)` 의 키를 **필수 인자**로 바꿔 키 없는 호출부가 컴파일 오류로 드러나게 했다.
- **서버 키 폴백은 기본 꺼짐.** `ALLOW_SERVER_KEY=1` 일 때만 열린다. 기본이 켜짐이면 환경변수 하나가 빠졌을 때 공개 배포가 조용히 운영자 계정으로 과금된다.
- **크론을 제거했다.** BYOK 에서는 서버에 키가 없어 큐 워커가 작업을 제출·조회할 수 없다. 그대로 두면 키 없는 작업을 1분 만에 전부 실패 처리한다. 대신 결과 화면이 `POST /api/jobs/:id/step` 을 불러 자기 작업만, 자기 키로 한 칸씩 민다. 탭을 닫으면 진행이 멈추고(fal 쪽 생성은 계속 돈다) 다시 열면 이어서 진행된다.
- **상태 전이를 compare-and-swap 으로.** 탭 두 개가 동시에 폴링하면 같은 작업이 두 번 제출돼 두 번 과금된다. `UPDATE … WHERE id=? AND status=?` 가 정확히 1행을 바꿨을 때만 진행한다(드라이버마다 changes 모양이 달라 `changedRows` 로 흡수).
- **사용자 격리가 없었다.** 모든 요청이 `GUEST_USER_ID` 하나여서, 공개 배포였다면 첫 화면이 남의 작업 목록이고 job id 하나로 남의 프롬프트·업로드 원본·결과 영상이 열렸다. `proxy.ts`(Next 16 에서 `middleware` 가 개명됨)가 HMAC 서명된 `c2v_uid` 쿠키를 발급하고, `getJob`·`listJobs`·`cancelJob`·업로드·`/api/files`·서버 렌더 페이지가 전부 소유자 범위로 조회한다. 브라우저가 보낸 id 를 그대로 믿으면 위조되므로 **서명이 하중을 받는 유일한 지점**이고, 테스트(`tests/byok.test.ts`)로 위조 시나리오를 고정했다.
- **유출 경로를 막았다.** `maskInput` 이 스프레드 denylist 라 `H3Request` 에 필드가 추가되면 그대로 D1 과 작업 상세 화면으로 샜다(자산 URL 은 fal 계정에 묶인 capability URL 이다) → 허용 목록으로 다시 썼다. `handleError` 는 오류 객체를 통째로 찍고 있었는데 `H3ServiceError.detail` 에 fal 응답 원문이 들어 있고 `observability` 가 켜져 있어 운영자 로그에 보존된다 → 이름·메시지만, 키 모양은 `redact()` 로 지운다.
- **빌드 산출물에 비밀값이 박혀 있었다(실제 사고).** `@opennextjs/cloudflare` 가 빌드 시점 `.env` 를 워커 번들에 스냅샷해서, 배포된 워커가 운영자 `FAL_KEY` 와 **Cloudflare API 토큰**을 들고 있었다. `.open-next/` 는 `.gitignore` 에도 없었다. 배포 자격증명을 `.env.deploy` 로 분리하고, `.env.production` 에서 `FAL_KEY` 를 비우고, `npm run cf:deploy` 가 올리기 전에 번들을 검사해 값이 남아 있으면 중단한다.
- **모달이 헤더 안에 갇혔다.** `backdrop-filter` 는 자손 `position: fixed` 의 컨테이닝 블록이 된다 → 키 대화상자를 `createPortal` 로 body 에 붙였다.

## 알려진 한계
- 로그인이 없다. 서버가 서명한 쿠키(`c2v_uid`)로만 방문자를 구분하므로 브라우저 데이터를 지우면 지난 작업이 보이지 않는다.
- mp3 길이는 서버에서 읽지 못한다(클라이언트 값 의존). WAV 는 헤더로 읽는다.
- HEIC/HEIF 는 sharp 빌드에 따라 서버 프로브가 실패할 수 있다(그 경우 400 "이미지를 읽을 수 없습니다").
- fal 스토리지 업로드 URL 은 24시간 캐시로 간주한다(정확한 만료 정책은 fal 문서에 명시되지 않음).
