# Click2Video (클릭2비디오)

사진이나 영상 하나만 올리면 프리미엄 광고 영상이 만들어지는 **원클릭 영상 템플릿 서비스**입니다.
생성 엔진은 [fal.ai](https://fal.ai) 의 **MiniMax H3-Max** 이고, 템플릿 23종(이펙트 · 광고·커머스 · 편집 · 소상공인 광고)이 들어 있습니다.

- 프롬프트는 서버의 템플릿 JSON 에만 있고, 사용자는 사진·옵션만 고릅니다.
- 한국어 문구(가게 이름·메뉴명·가격)를 **이미지로 렌더링해 레퍼런스로 넣어** 철자가 깨지지 않게 합니다.
- 공개 배포 시 **방문자가 각자 자기 fal.ai 키를 넣어** 쓰는 구조(BYOK)라, 운영자에게 생성 비용이 청구되지 않습니다.
- Next.js 16 + Cloudflare Workers(D1) 로 배포할 수 있고, 로컬에서는 SQLite 로 돕니다.

> 라이선스: [CC BY-NC 4.0](LICENSE) — 개인·학습·연구 목적으로 자유롭게 쓰고 수정할 수 있으며, **상업적 이용은 허용되지 않습니다.**

---

## 빠른 시작 (키 없이, 1분)

```bash
git clone https://github.com/namuira8476-ux/click2video.git
cd click2video
npm install
cp .env.example .env
npm run dev          # http://localhost:3000
```

`FAL_KEY` 를 비워 두면 **데모(MOCK) 모드**로 동작합니다. 업로드 → 생성 → 결과 재생까지 전 흐름이 실제 API 호출 없이 돌아가며, 헤더에 `데모` 배지가 붙습니다.
샘플 이미지·영상은 저장소에 들어 있어 추가로 내려받을 것이 없습니다.

요구 사항: **Node.js 22 이상** (`.nvmrc` 참고). 로컬 DB 는 `better-sqlite3`(네이티브 모듈)를 씁니다 — 설치가 실패하면 Windows 는 Visual Studio Build Tools, macOS 는 Xcode Command Line Tools 가 필요합니다.

## 실제 영상 생성 (로컬)

1. [fal.ai 대시보드](https://fal.ai/dashboard/keys)에서 API 키를 발급받습니다.
2. `.env` 의 `FAL_KEY=` 에 넣습니다. (`ALLOW_SERVER_KEY=1` 이 기본값이라 서버가 이 키로 생성합니다.)
3. `npm run check-key` 로 키를 확인하고(무료), `npm run dev` 를 다시 띄웁니다.

요금은 fal 정가 기준 **768P $0.08/초, 480P $0.05/초** 입니다. 레퍼런스 영상 입력은 토큰 과금이 커서 768P 10초 영상 하나가 약 $1.4 입니다. 화면의 "만들기" 버튼에 예상 금액이 먼저 표시됩니다.

## 공개 배포 모드: 각자 자기 fal 키로 쓰기 (BYOK)

| | 로컬 개발 | 공개 배포 |
|---|---|---|
| 설정 | `.env`: `ALLOW_SERVER_KEY=1` + `FAL_KEY` | `BYOK_MODE=1`, 서버 키 없음 |
| 키 출처 | 서버 `.env` | 방문자 브라우저 → 매 요청 헤더 `X-Fal-Key` |
| 작업 진행 | 인터벌 러너 | 결과 화면이 `POST /api/jobs/:id/step` 으로 한 칸씩 |
| 요금 | 운영자 fal 계정 | 방문자 각자의 fal 계정 (USD 견적만 표시) |

- 키는 서버 DB 에 저장하지 않습니다. 브라우저의 sessionStorage(기본) 또는 localStorage("이 기기에 기억")에만 둡니다.
- 방문자 구분은 서버가 발급·서명한 HttpOnly 쿠키(`c2v_uid`)로 합니다. 다른 사람의 작업·업로드·결과는 보이지 않습니다.
- 서버 키 폴백은 `ALLOW_SERVER_KEY=1` 일 때만 열립니다. 기본이 꺼짐이라 설정을 빠뜨려도 운영자 계정으로 과금되지 않습니다.

### 결과 영상은 방문자 기기에 저장

영상이 완성되면 브라우저가 곧바로 받아 **이 기기의 브라우저 저장소(IndexedDB)** 에 넣고, "내 작업" 목록과 상세 화면은 그 사본을 재생합니다(카드의 💾 표시). 다운로드 버튼도 기기 사본에서 바로 저장합니다.

- 원격 주소(R2 가 없으면 fal 이 호스팅)는 영구 보관이 아니지만, 기기 사본은 원격이 사라져도 남습니다.
- 서버를 거치지 않습니다 — fal 미디어 주소는 CORS 를 허용하고, 로컬 모드의 결과 파일은 같은 오리진입니다.
- 브라우저의 사이트 데이터를 지우거나 다른 기기·브라우저로 들어오면 사본이 없습니다. 오래 보관하려면 다운로드하세요.
- 작업 기록(템플릿·옵션·상태)은 진행 관리를 위해 계속 서버 DB 에 남습니다. 원격 영상도 fal(또는 R2)에 그대로 있습니다.

로컬에서 배포와 같은 조건으로 확인하려면 `.env.local` 에 아래를 넣고 dev 서버를 재시작합니다(확인 후 지우세요).

```
BYOK_MODE=1
ALLOW_SERVER_KEY=
FAL_KEY=
SESSION_SECRET=아무-임의-문자열
```

## 내 Cloudflare 에 배포

무료 플랜으로 충분합니다(Workers + D1). R2 는 선택입니다.

```bash
# 1) 배포 자격증명 — .env 가 아니라 .env.deploy 에 둡니다 (아래 "비밀값 주의" 참고)
cp .env.deploy.example .env.deploy          # CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID 입력

# 2) 내 배포 설정 — 템플릿을 복사해 자리표시자를 채웁니다 (wrangler.local.jsonc 는 gitignore 됨)
cp wrangler.jsonc wrangler.local.jsonc
npx wrangler d1 create click2video           # 출력된 database_id → wrangler.local.jsonc 의 <YOUR_D1_DATABASE_ID>
#   PUBLIC_BASE_URL → https://click2video.<내 서브도메인>.workers.dev

# 3) DB 스키마, 쿠키 서명 비밀값
npm run cf:migrate
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))" | npm run cf:secret -- SESSION_SECRET

# 4) 빌드 + 배포
npm run cf:deploy -- --build
```

`npm run cf:deploy` 는 `wrangler.local.jsonc` 가 있으면 그것을, 없으면 `wrangler.jsonc` 를 씁니다. 자리표시자(`<YOUR_…>`)가 남아 있으면 배포하지 않습니다.

### 비밀값 주의

`@opennextjs/cloudflare` 는 빌드 시점의 `.env` 값을 워커 번들(`.open-next/cloudflare/next-env.mjs`)에 **그대로 스냅샷**합니다.
그래서 이 저장소는

- Cloudflare 자격증명을 Next 가 읽지 않는 `.env.deploy` 에 두고,
- 저장소에 포함된 `.env.production` 이 빌드 시 `FAL_KEY` 를 비우며(`BYOK_MODE=1`),
- `npm run cf:deploy` 가 올리기 직전에 번들을 검사해 키가 남아 있으면 **배포를 중단**합니다.

`.env.production` 에는 값을 넣지 마세요. 참고로 이 파일 때문에 로컬에서 `npm run build && npm start` 를 하면 BYOK 모드로 뜨며 `SESSION_SECRET` 이 필요합니다 — 로컬 개발은 `npm run dev` 를 쓰세요.

### R2 (선택: 결과 영상 영구 보관)

R2 없이도 동작합니다. 이 경우 업로드는 곧바로 fal 스토리지로 가고, 결과 영상은 fal 이 호스팅하는 URL 을 그대로 씁니다(영구 보관 아님).
R2 는 대시보드에서 약관 동의로만 켤 수 있습니다. 켠 뒤 `npm run cf:enable-r2` 를 실행하면 버킷을 만들고 `MEDIA` 바인딩을 추가합니다.

| | 로컬 | Cloudflare |
|---|---|---|
| DB | better-sqlite3 (`data/`) | D1 |
| 업로드 | `storage/uploads/` | R2 가 있으면 R2, 없으면 fal 스토리지 |
| 결과 영상 | `storage/results/` | R2 가 있으면 R2, 없으면 fal URL |
| 결과 영상 (내 작업) | **방문자 브라우저(IndexedDB)에 사본 저장** | **방문자 브라우저(IndexedDB)에 사본 저장** |
| 샘플·레퍼런스 | `public/` 파일 | Workers 정적 자산 — fal 이 `PUBLIC_BASE_URL` 로 가져감 |
| 문구 이미지 | 서버에서 sharp 로 렌더 | 브라우저 캔버스로 렌더 후 업로드 |
| 템플릿 정의 | `templates/*.json` 직접 읽기 | 빌드 시 `src/generated/static-data.ts` 로 인라인 |

---

## 템플릿

템플릿은 `templates/<id>.json` 한 파일입니다. 슬롯(사용자 입력) · 옵션 · 프롬프트(mustache) · 기본값 · 샘플 입력으로 이루어져 있고 `src/lib/templates/schema.ts`(zod)로 검증합니다.
프롬프트는 서버에만 있고 클라이언트로 내려가지 않습니다.

### 소상공인 광고 (`smallbiz`)

| 템플릿 | 입력 | 결과 |
|---|---|---|
| 우리 가게 홍보 영상 | 가게 사진(+대표 메뉴), 가게 이름, 한 줄 문구 | 15초 세로 광고, 엔드카드에 이름·문구 |
| 메뉴 스포트라이트 | 음식·상품 사진, 메뉴명, 가격 | 8초 프리미엄 런칭 필름 |
| 이벤트·할인 안내 | 가게 사진, 이벤트 문구, 기간 | 8초 키네틱 타이포 광고 |
| 사장님 인사 영상 | 사장님 사진, 인사말(+목소리 샘플) | 한국어로 직접 말하는 인사 영상 |
| 전후 비교 영상 | 전·후 사진 2장 | 끊김 없이 변해가는 6초 영상 (**첫/끝 프레임 모드**) |
| 계절 갈아입히기 | 가게 외관 사진 또는 영상 | 벚꽃·비·단풍·눈으로 계절만 바뀐 영상 |
| 전단지 살리기 | 포스터·메뉴판 사진 | 원본 레이아웃 그대로 살아나는 모션 포스터 |
| 포스터 밖으로 튀어나오기 | 로고 포스터 + 제품·반려동물 사진 | 포스터에서 튀어나왔다 돌아가는 릴스 |
| 내 상품 갈아끼우기 | 무지 상품 사진 (+내장 스톡 장면) | 영상 속 인물이 내 상품을 입고 드는 착용컷 |

그 밖에 이펙트(AR 매직, 스타일 변환, 손그림 이펙트, 댄스 챌린지, 밈 재현, 한국어 키네틱 타이포, 재료→완성 매크로컷), 광고·커머스(블랙 스튜디오 런칭, 제품 360, 패션 캠페인, 랜딩페이지 모션), 편집(배경 교체, 재조명, 목소리 더빙)이 있습니다.

### 생성 모드

- `reference`(기본): 이미지·영상·오디오를 레퍼런스로 넣습니다 (`minimax/h3-max/reference-to-video`).
- `first-last`: 이미지 1~2장을 시작·끝 프레임으로 잇습니다 (`minimax/h3-max/image-to-video`). 화면비는 첫 이미지를 따르고 문구 이미지를 넣을 수 없습니다.

### 한국어 문구를 정확히 넣기

템플릿 슬롯 `source: "textImage"` 가 텍스트 옵션을 1024×1024 PNG 로 렌더링해 레퍼런스 이미지로 넣고, 프롬프트는 "이 이미지의 글자를 그대로 재현하라"고 지시합니다. 프롬프트 문자열로 넘기면 철자가 깨집니다(`Redefined` → `Redfined`).

### 댄스 챌린지 · 밈 프리셋

프리셋 영상은 저작권 문제로 실제 챌린지 영상을 쓰지 않고, **H3-Max text-to-video 로 "그 챌린지 느낌"을 합성**한 것입니다(`npm run refs -- --yes`). 실제 안무를 쓰려면 템플릿의 "내 댄스 영상" 슬롯에 직접 찍은(또는 허락받은) 영상을 올리세요.
프리셋을 추가하려면 `public/refs/<dance|meme>/` 에 H.264 mp4(15초·50MB 이하)를 두고 `public/refs/manifest.json` 에 항목을 추가합니다. `id` 가 `dance-` / `meme-` 로 시작하면 옵션에 자동으로 뜹니다.

### 모델 특성 (실제 생성으로 확인한 것)

1. `aspect_ratio: "adaptive"` 는 세로 입력을 가로로 만듭니다 → 입력 비율을 읽어 명시합니다.
2. 원본 오디오를 유지하지 않고 새로 합성합니다 → "원본 소리 유지"를 약속하지 않습니다.
3. 텍스트 슬롯이 비면 가짜 글자를 만듭니다 → 빈 분기에 "no letterforms" 를 넣습니다.
4. 사람 얼굴은 스타일 변환이 되지 않습니다(반려동물·사물은 됨).
5. 본문에 부정 형용사("never glossy")를 쓰면 오히려 그 모습이 나옵니다 → 원하는 모습을 긍정문으로 씁니다.

자세한 개발 기록은 [IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md) 에 있습니다.

---

## 샘플 자산 다시 만들기 (선택, FAL_KEY 필요)

저장소에 이미 들어 있으므로 보통은 필요 없습니다. 영상 변환·프레임 추출에 **ffmpeg / ffprobe** 가 PATH 에 있어야 하고, Linux 에서 e2e·previews 를 돌리면 서버가 문구 이미지를 렌더하므로 한글 폰트(`fonts-noto-cjk` 등)가 필요합니다.

| 명령 | 설명 |
|---|---|
| `npm run samples [-- --placeholders \| --force]` | 샘플·썸네일 이미지 생성 (`fal-ai/gpt-image-2`, 전체 약 $1). 키가 없으면 SVG 플레이스홀더 |
| `npm run clips -- --yes` | 영상 입력 샘플 클립 + 한국어 목소리 샘플 (≈ $2) |
| `npm run refs -- --yes` | 댄스·밈 프리셋 클립 (≈ $5) |
| `npm run e2e [-- --only=<id,…>]` | dev 서버로 전 템플릿을 샘플 입력으로 실제 생성해 `storage/e2e/` 에 리포트·프레임 저장 |
| `npm run promote -- <report.json>` | e2e 성공 결과를 카드 프리뷰로 승격 |
| `npm run compress-previews` | 카드 프리뷰를 웹용으로 압축 (720px·CRF 30) |

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` / `lint` / `test` | tsc · eslint · vitest |
| `npm run check-key` | `FAL_KEY` 유효성 확인 (무료 업로드) |
| `npm run db:generate` | 스키마 변경 후 마이그레이션 생성 (`drizzle/`). 로컬은 앱 시작 시 자동 적용 |
| `npm run cf:migrate` | D1 에 마이그레이션 적용 |
| `npm run cf:secret -- <NAME>` | 워커 시크릿 등록 (값은 stdin 으로만) |
| `npm run cf:deploy [-- --build]` | Cloudflare 배포 (번들 비밀값 검사 포함) |
| `npm run cf:enable-r2` | R2 버킷 생성 + 바인딩 추가 |
| `npm run export-skill [-- --out=<path>]` | (선택) 템플릿을 Claude Code 스킬 참고 문서로 내보내기. 기본 출력은 홈의 `~/.claude/skills/h3-video-templates/` |

## 환경변수

전체 목록과 설명은 [`.env.example`](.env.example) 에 있습니다.

| 변수 | 설명 |
|---|---|
| `FAL_KEY` | fal.ai API 키. 비워 두고 `ALLOW_SERVER_KEY=1` 이면 데모(MOCK) 모드 |
| `ALLOW_SERVER_KEY` | `1` 이면 서버 `FAL_KEY` 로 대신 생성 (로컬 개발용) |
| `BYOK_MODE` | `1` 이면 방문자가 자기 키를 넣어 쓰는 공개 배포 모드 |
| `SESSION_SECRET` | 방문자 쿠키 서명용. `BYOK_MODE=1` 이면 필수 |
| `MOCK_FAL` / `MOCK_FAIL_RATE` | MOCK 강제 / MOCK 실패 확률(환불 경로 검증) |
| `CREDIT_MARKUP`, `PRICE_OUTPUT_480P/768P` | 견적 계산 |
| `UNLIMITED_CREDITS` | 크레딧 차감 생략 (로컬 전용, BYOK 에서는 자동) |
| `RUNNER_CONCURRENCY` | 동시에 fal 에 올려 두는 작업 수 (기본 2) |
| `PUBLIC_BASE_URL` | 배포 주소 (R2 없이 fal 이 정적 자산을 가져갈 때 필요) |

## 구조

```
templates/*.json          템플릿 정의 (프롬프트는 여기만 존재)
public/samples/           샘플 입력·썸네일·프리뷰·MOCK 영상
public/refs/              댄스·밈·무드·스톡 등 고정 레퍼런스 + manifest.json
src/lib/h3/               fal 클라이언트(요청마다 격리) · MOCK · 요청 빌더 · 한도
src/lib/templates/        템플릿 스키마 · 로더 · 프롬프트 렌더러 · 입력 검증
src/lib/jobs/             작업 서비스 · 러너(stepJob) · 자산 해석
src/lib/identity.ts       방문자 쿠키 발급·서명 검증
src/lib/request-context.ts 요청의 fal 키·소유자 읽기
src/lib/client/local-videos.ts 결과 영상 기기 저장(IndexedDB)
src/proxy.ts              방문자 쿠키 발급 (Next 16 의 middleware)
src/app/api/              templates · uploads · estimate · jobs · files · me · key/verify
cf/worker.ts              Cloudflare 워커 진입점
scripts/                  샘플 생성 · e2e 검증 · 배포
drizzle/                  DB 마이그레이션
tests/                    vitest
```

## 라이선스와 출처

- 이 저장소의 코드와 자체 제작 자산: [CC BY-NC 4.0](LICENSE)
- 포함된 서드파티 자산과 생성 자산의 출처: [NOTICE.md](NOTICE.md)
- 생성 결과물의 이용 조건은 fal.ai 와 MiniMax 의 약관을 따릅니다.
