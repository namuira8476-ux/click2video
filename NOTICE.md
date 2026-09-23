# 서드파티 자산과 생성 자산의 출처

이 저장소의 코드와 자체 제작 자산은 [CC BY-NC 4.0](LICENSE) 입니다. 아래 자산은 출처가 다르므로 각 조건을 따릅니다.

## 서드파티 자산

### Big Buck Bunny, Sunflower version

- 파일: `public/samples/mock/clip.mp4`, `public/samples/mock/result.mp4`
- 용도: 데모(MOCK) 모드에서 생성 결과 대신 재생하는 테스트 영상 (`scripts/fetch-mock-video.ts` 가 내려받음)
- 저작자: Blender Foundation 2008, Janus Bager Kristensen 2013 (파일 메타데이터 기준. 음악 Sacha Goedegebure)
- 출처: http://bbb3d.renderfarming.net · 원작 https://peach.blender.org / www.bigbuckbunny.org
- 라이선스: [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/)
- 내려받은 곳: test-videos.co.uk 의 10초·360p 발췌본. 이 저장소에서 내용을 바꾸지 않았다.

## 이 프로젝트가 생성한 자산

실존 인물·실제 상호·상표를 쓰지 않도록 전부 새로 만들었습니다. 사람이 나오는 사진은 모두 AI 로 생성한 가상 인물입니다.

| 경로 | 만든 방법 | 스크립트 |
|---|---|---|
| `public/samples/<템플릿>/*.png` (입력 사진·썸네일) | fal.ai `fal-ai/gpt-image-2` | `scripts/gen-samples.ts` |
| `public/refs/doodle/*`, `public/refs/mood/*` (낙서 팔레트·무드 이미지) | `fal-ai/gpt-image-2` | `scripts/gen-samples.ts` |
| `public/samples/before-after/*.png` | `fal-ai/gpt-image-2` + `fal-ai/gpt-image-2/edit` | `scripts/gen-before-after.ts` |
| 한국어 문구가 든 포스터·간판·안내 이미지 | sharp 로 SVG 를 직접 합성 | `scripts/compose-posters.ts` |
| `public/samples/clips/*.mp4`, `public/refs/stock/*.mp4` | fal.ai `minimax/h3-max/text-to-video` | `scripts/gen-sample-clips.ts` |
| `public/refs/dance/*`, `public/refs/meme/*` | `minimax/h3-max/text-to-video` 로 "그 챌린지 느낌"을 합성 (실제 챌린지 영상 아님) | `scripts/gen-refs.ts` |
| `public/samples/voice/*.wav` | fal.ai MiniMax TTS (`fal-ai/minimax/speech-02-hd`, 기본 보이스) | `scripts/gen-sample-clips.ts` |
| `public/samples/mock/voice.wav` | 코드로 합성한 사인파 | `scripts/gen-samples.ts` |
| `public/samples/<템플릿>/preview.mp4` | 위 샘플을 입력으로 `minimax/h3-max` 가 생성한 결과 | `scripts/e2e-samples.ts` → `promote` |

AI 생성 자산의 이용은 fal.ai 와 각 모델 제공사(OpenAI, MiniMax)의 약관을 함께 따릅니다.

## 의존성

`package.json` 의 npm 패키지(Next.js, React, drizzle-orm, @fal-ai/client 등)는 각자의 라이선스를 따르며 이 저장소에 포함되어 있지 않습니다(`npm install` 로 설치).
