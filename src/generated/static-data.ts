// 자동 생성 파일 — 직접 고치지 말 것. `npx tsx scripts/bundle-static.ts` 가 만든다.
// 출처: templates/*.json, public/refs/manifest.json, public/{samples,refs}/**

export const BUNDLED_TEMPLATES: Record<string, unknown> = {
  "ar-magic.json": {
    "id": "ar-magic",
    "name": "AR 매직",
    "tagline": "촬영한 영상 위에 AR 이펙트를 그대로 합성합니다.",
    "category": "effects",
    "defaults": {
      "resolution": "768P",
      "duration": "clip",
      "ratio": "adaptive"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15
      ],
      "ratios": [
        "adaptive",
        "16:9",
        "9:16",
        "1:1",
        "4:3",
        "3:4",
        "21:9"
      ]
    },
    "slots": [
      {
        "key": "clip",
        "kind": "video",
        "label": "영상",
        "source": "user",
        "required": true,
        "hint": "2~15초 mp4/mov"
      }
    ],
    "options": [
      {
        "key": "style",
        "type": "select",
        "label": "AR 스타일",
        "values": [
          {
            "value": "hologram",
            "label": "홀로그램 UI",
            "prompt": "Overlay translucent holographic UI panels, abstract glyph bars and icons (no readable letters or numbers), and light-blue scan lines anchored to real surfaces, as if the phone is running a futuristic AR app."
          },
          {
            "value": "comedy",
            "label": "코미디 이펙트",
            "prompt": "Add exaggerated cartoon-physics visual effects that react to the real motion: impact stars, speed lines, oversized emoji-like reactions, and playful sound effects, in the style of a viral short-form comedy clip."
          },
          {
            "value": "nature",
            "label": "자연 파티클",
            "prompt": "Add glowing particles, drifting petals, and small luminous butterflies that follow the real motion and cast soft light on nearby surfaces."
          },
          {
            "value": "glitch",
            "label": "사이버 글리치",
            "prompt": "Add cyberpunk AR glitches: chromatic aberration bursts, datamosh smears, and neon wireframes tracing the edges of real objects, synced to a subtle electronic pulse."
          }
        ],
        "default": "hologram"
      },
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200
      }
    ],
    "prompt": "Use {{ref.clip}} as the sole video source. Preserve the real camera footage exactly: the environment, people, natural hand movement, camera motion, lighting, duration, and frame rate. Do not generate a new environment and do not replace any subject.\nApply AR compositing directly onto the original footage. {{opt.style.prompt}}\nThe underlying footage must stay pixel-identical: no outpainting, no new buildings, no re-staging of people, no change of framing. Every panel, reticle, and grid must be pinned to a physical surface (a facade, the road plane, a vehicle body); nothing hovers in empty air. All added elements must track the real camera motion perfectly and respect occlusion by real objects. Sound: natural ambience of the real scene plus subtle effect sounds synced to the AR elements.\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "No readable letters, words, or numbers inside any AR element. Do not add subtitles, watermarks, logos, or on-screen text unless explicitly requested above. Do not change the identity of any referenced person. No gore, nudity, or copyrighted characters.",
    "requiresConsent": false,
    "sampleInputs": {
      "clip": "/samples/clips/phone-crosswalk.mp4"
    },
    "badges": [
      "🎬1"
    ]
  },
  "background-swap.json": {
    "id": "background-swap",
    "name": "배경 교체 + 자동 조명",
    "tagline": "영상의 배경만 바꾸고 조명까지 새 공간에 맞춰 줍니다.",
    "category": "edit",
    "defaults": {
      "resolution": "768P",
      "duration": "clip",
      "ratio": "adaptive"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15
      ],
      "ratios": [
        "adaptive",
        "16:9",
        "9:16",
        "1:1",
        "4:3",
        "3:4",
        "21:9"
      ]
    },
    "slots": [
      {
        "key": "clip",
        "kind": "video",
        "label": "영상",
        "source": "user",
        "required": true,
        "hint": "그린스크린이 있으면 더 깔끔해집니다"
      }
    ],
    "options": [
      {
        "key": "background",
        "type": "select",
        "label": "새 배경",
        "values": [
          {
            "value": "office",
            "label": "밝은 오피스",
            "prompt": "a bright modern office with window blinds and glass partitions"
          },
          {
            "value": "beach",
            "label": "한낮의 해변",
            "prompt": "a sunny beach at midday with soft waves"
          },
          {
            "value": "neon-city",
            "label": "비 오는 네온 도시",
            "prompt": "a rainy neon-lit city street at night"
          },
          {
            "value": "forest",
            "label": "안개 낀 소나무 숲",
            "prompt": "a misty pine forest in the morning"
          },
          {
            "value": "fairytale",
            "label": "동화 속 초원",
            "prompt": "a dreamy fairy-tale meadow with floating lights"
          },
          {
            "value": "custom",
            "label": "직접 입력"
          }
        ],
        "default": "office"
      },
      {
        "key": "customText",
        "type": "text",
        "label": "배경 직접 입력",
        "maxLen": 80,
        "placeholder": "예: a cozy library with warm lamps",
        "required": true,
        "showWhen": {
          "key": "background",
          "equals": "custom"
        }
      },
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200
      }
    ],
    "prompt": "Use {{ref.clip}} as the sole video source. If a green screen is present, remove it cleanly. Replace the entire background with {{#opt.customText}}{{opt.customText}}{{/opt.customText}}{{^opt.customText}}{{opt.background.prompt}}{{/opt.customText}}.\nKeep the subject's appearance, movement, timing, and the camera's motion completely unchanged. Preserve the original framing and crop exactly; the subject's full head and shoulders must stay inside the frame. Every background element must respond correctly to the camera movement and parallax. Relight the subject so its lighting direction, color temperature, shadows, and edge light match the new environment. Sound: natural ambience that matches the new environment, with the subject's voice re-created to match their lip movement.\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "Do not add subtitles, watermarks, logos, or on-screen text unless explicitly requested above. Do not change the identity of any referenced person. No gore, nudity, or copyrighted characters.",
    "requiresConsent": false,
    "sampleInputs": {
      "clip": "/samples/clips/greenscreen-wave.mp4"
    },
    "badges": [
      "🎬1"
    ]
  },
  "before-after.json": {
    "id": "before-after",
    "name": "전후 비교 영상",
    "tagline": "전·후 사진 두 장이 끊김 없이 변해가는 영상이 됩니다. 세차·네일·인테리어·청소에 딱 맞습니다.",
    "category": "smallbiz",
    "mode": "first-last",
    "defaults": {
      "resolution": "768P",
      "duration": 6,
      "ratio": "adaptive"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        5,
        6,
        7,
        8,
        9,
        10
      ],
      "ratios": [
        "adaptive"
      ]
    },
    "slots": [
      {
        "key": "before",
        "kind": "image",
        "label": "전(Before) 사진",
        "source": "user",
        "required": true,
        "hint": "같은 자리·같은 각도에서 찍은 사진일수록 자연스럽습니다"
      },
      {
        "key": "after",
        "kind": "image",
        "label": "후(After) 사진",
        "source": "user",
        "required": true,
        "hint": "전 사진과 같은 구도. 결과 화면비는 이 사진들을 따릅니다"
      }
    ],
    "options": [
      {
        "key": "service",
        "type": "select",
        "label": "어떤 변화인가요",
        "values": [
          {
            "value": "carwash",
            "label": "세차·디테일링",
            "prompt": "a car being washed and detailed: dirt and dust lift away, water sheets off, the paint comes up glossy and clean"
          },
          {
            "value": "nail",
            "label": "네일·뷰티",
            "prompt": "a nail or beauty service: the treated area transforms from bare to finished, with polish, color and shine appearing smoothly"
          },
          {
            "value": "interior",
            "label": "인테리어·청소·정리",
            "prompt": "a space being renovated, cleaned or organized: clutter clears, surfaces brighten, and the finished look settles into place"
          },
          {
            "value": "laundry",
            "label": "세탁·수선",
            "prompt": "a garment or item being cleaned or repaired: stains fade, wrinkles smooth out, and the item returns to like-new condition"
          },
          {
            "value": "other",
            "label": "기타",
            "prompt": "a before-and-after transformation of the same subject"
          }
        ],
        "default": "carwash"
      },
      {
        "key": "caption",
        "type": "select",
        "label": "자막",
        "values": [
          {
            "value": "en",
            "label": "BEFORE → AFTER (영문)",
            "prompt": "Show the word \"BEFORE\" in small clean white capitals in the top-left corner from the first frame until the moment the change begins, then fade it out; fade in the word \"AFTER\" in the same style and position once the change is complete and hold it through the final frame. No other text anywhere."
          },
          {
            "value": "none",
            "label": "자막 없음",
            "prompt": "No on-screen text: no letterforms, words, or numbers anywhere."
          }
        ],
        "default": "en"
      },
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200,
        "placeholder": "예: 물방울이 튀는 느낌으로"
      }
    ],
    "prompt": "Image 1 is the exact opening frame and Image 2 is the exact closing frame; the video must begin on Image 1 and end on Image 2.\nShow {{opt.service.prompt}}, as one continuous shot with no cuts, dissolves, or black frames. Keep the camera position, framing, lens and background locked exactly as in the photos; only the subject changes, progressing naturally and evenly across the whole clip so the state at every moment sits between the two photos. Do not add people, hands, tools, or objects that are not in the photos. Any water, foam, dust or debris may appear only on the subject and the ground directly beneath it; the wall and background must stay completely unchanged — no spray arcs, mist, jets, hoses or light streaks on or in front of the background, and nothing may enter from off-screen. Photoreal, subtle natural motion, clean soft sound design with a gentle satisfying finish.\n{{opt.caption.prompt}}\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "Do not change the framing or camera between the two photos. Do not add watermarks, logos, or text other than the caption described above. Do not add people. No gore, nudity, or copyrighted characters.",
    "requiresConsent": false,
    "sampleInputs": {
      "before": "/samples/before-after/before.png",
      "after": "/samples/before-after/after.png"
    },
    "badges": [
      "📷2"
    ]
  },
  "black-studio-launch.json": {
    "id": "black-studio-launch",
    "name": "블랙 스튜디오 제품 런칭",
    "tagline": "제품 사진 한 장으로 프리미엄 런칭 필름을 완성합니다.",
    "category": "commerce",
    "defaults": {
      "resolution": "768P",
      "duration": 10,
      "ratio": "16:9"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15
      ],
      "ratios": [
        "16:9",
        "9:16",
        "1:1"
      ]
    },
    "slots": [
      {
        "key": "product",
        "kind": "image",
        "label": "제품 사진",
        "source": "user",
        "required": true,
        "hint": "배경이 단순한 제품 컷 권장"
      },
      {
        "key": "headImg",
        "kind": "image",
        "label": "헤드라인",
        "source": "textImage",
        "required": false,
        "optionKey": "headline",
        "textStyle": "dark"
      },
      {
        "key": "brandImg",
        "kind": "image",
        "label": "브랜드명",
        "source": "textImage",
        "required": false,
        "optionKey": "brand",
        "textStyle": "dark"
      }
    ],
    "options": [
      {
        "key": "headline",
        "type": "text",
        "label": "헤드라인",
        "maxLen": 40,
        "placeholder": "예: Silence, Redefined."
      },
      {
        "key": "brand",
        "type": "text",
        "label": "브랜드명(선택)",
        "maxLen": 20,
        "placeholder": "예: VELNO"
      },
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200
      }
    ],
    "prompt": "{{ref.product}} is the product reference. Preserve its exact shape, materials, colors, label, and proportions.\nCreate a {{duration}}-second premium new-product launch film: pure black background, crisp continuous rim light plus a soft top key so the product silhouette never merges into the black background, ultra-slow rotating close-ups, macro details of the surface, and an atmospheric electronic soundtrack. Generous negative space, one consistent visual system.\n{{#slots.headImg}}{{ref.headImg}} shows the exact headline. This content must be interpreted as an image, not processed as text; reproduce every character exactly as drawn, with no letter added, dropped, or altered. Show it in oversized minimalist lightweight sans-serif in the empty black space beside or below the product, never crossing the product silhouette, fading in and holding fully legible for at least two seconds before the ending.{{/slots.headImg}}\n{{^slots.headImg}}No on-screen text, no letterforms, no placeholder words anywhere.{{/slots.headImg}}\n{{#slots.brandImg}}End on the brand name from {{ref.brandImg}}, centered on black in small tracked-out capitals, again reproducing every character exactly as drawn without restyling any letterform.{{/slots.brandImg}}\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "Do not add subtitles, watermarks, logos, or any text other than the reference text images described above. Do not restyle, respell, or substitute any character. No gore, nudity, or copyrighted characters.",
    "requiresConsent": false,
    "sampleInputs": {
      "product": "/samples/black-studio-launch/product.png"
    },
    "badges": [
      "📷1",
      "✍️"
    ],
    "sampleOptions": {
      "headline": "Silence, Redefined.",
      "brand": "VELNO"
    }
  },
  "dance-transfer.json": {
    "id": "dance-transfer",
    "name": "댄스 챌린지 트랜스퍼",
    "tagline": "사진 한 장으로 유행하는 챌린지 춤을 내가 추게 만듭니다.",
    "category": "effects",
    "defaults": {
      "resolution": "768P",
      "duration": "clip",
      "ratio": "9:16"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15
      ],
      "ratios": [
        "9:16",
        "adaptive",
        "16:9",
        "1:1",
        "4:3",
        "3:4"
      ]
    },
    "slots": [
      {
        "key": "person",
        "kind": "image",
        "label": "인물 사진",
        "source": "user",
        "required": true,
        "hint": "얼굴과 전신이 잘 보이는 정면 사진"
      },
      {
        "key": "danceUpload",
        "kind": "video",
        "label": "내 댄스 영상 (선택)",
        "source": "user",
        "required": false,
        "hint": "직접 찍었거나 사용 허락을 받은 챌린지 영상 2~15초. 넣으면 아래 프리셋 대신 이 영상을 따라 춥니다."
      },
      {
        "key": "dance",
        "kind": "video",
        "label": "댄스 프리셋",
        "source": "option",
        "required": false,
        "optionKey": "dance",
        "skipIfSlot": "danceUpload"
      }
    ],
    "oneOf": [
      [
        "danceUpload",
        "dance"
      ]
    ],
    "refAliases": {
      "motion": [
        "danceUpload",
        "dance"
      ]
    },
    "options": [
      {
        "key": "dance",
        "type": "select",
        "label": "챌린지 선택 (프리뷰를 눌러 미리 보기)",
        "values": [
          {
            "value": "__placeholder__",
            "label": "준비 중"
          }
        ],
        "default": "__placeholder__",
        "dynamic": "dance"
      },
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200,
        "placeholder": "예: 배경을 옥상 야경으로"
      }
    ],
    "prompt": "{{ref.motion}} is the motion reference. {{ref.person}} is the character reference.\nCreate a short-form dance-challenge video. The dancer must look exactly like the person in {{ref.person}}: preserve the face, hairstyle, skin tone, body proportions, and outfit. Reproduce the full choreography, timing, and energy of {{ref.motion}} beat for beat, including footwork, hand gestures, and facial expression.\nCamera: locked-off medium-wide shot, dancer centered, full body always in frame, vertical framing for mobile. Soundtrack: an upbeat original track that matches the tempo, rhythm and energy of {{ref.motion}}.\nSetting: a clean, softly lit studio with a neutral backdrop and subtle floor reflections. Photoreal, natural motion blur, no slow motion.\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "Do not add subtitles, watermarks, logos, or on-screen text unless explicitly requested above. Do not change the identity of any referenced person. No gore, nudity, or copyrighted characters.",
    "requiresConsent": true,
    "sampleInputs": {
      "person": "/samples/dance-transfer/person.png"
    },
    "badges": [
      "📷1"
    ]
  },
  "event-notice.json": {
    "id": "event-notice",
    "name": "이벤트·할인 안내",
    "tagline": "가게 사진 위에 한국어 이벤트 문구가 움직이는 타이포 광고를 만듭니다.",
    "category": "smallbiz",
    "defaults": {
      "resolution": "768P",
      "duration": 8,
      "ratio": "9:16"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        5,
        6,
        7,
        8,
        9,
        10,
        12,
        15
      ],
      "ratios": [
        "9:16",
        "16:9",
        "1:1"
      ]
    },
    "slots": [
      {
        "key": "store",
        "kind": "image",
        "label": "가게·상품 사진",
        "source": "user",
        "required": true
      },
      {
        "key": "eventImg",
        "kind": "image",
        "label": "이벤트 문구",
        "source": "textImage",
        "required": true,
        "optionKey": "eventText",
        "textStyle": "dark"
      },
      {
        "key": "periodImg",
        "kind": "image",
        "label": "기간",
        "source": "textImage",
        "required": false,
        "optionKey": "period",
        "textStyle": "dark"
      }
    ],
    "options": [
      {
        "key": "eventText",
        "type": "text",
        "label": "이벤트 문구 (한국어 가능)",
        "maxLen": 40,
        "required": true,
        "placeholder": "예: 오픈 기념 전 메뉴 20% 할인"
      },
      {
        "key": "period",
        "type": "text",
        "label": "기간·조건 (선택)",
        "maxLen": 30,
        "placeholder": "예: 9월 한 달간"
      },
      {
        "key": "accent",
        "type": "select",
        "label": "포인트 컬러",
        "values": [
          {
            "value": "lime",
            "label": "라임",
            "prompt": "electric lime green"
          },
          {
            "value": "red",
            "label": "레드",
            "prompt": "deep red"
          },
          {
            "value": "gold",
            "label": "골드",
            "prompt": "warm gold"
          },
          {
            "value": "blue",
            "label": "블루",
            "prompt": "electric blue"
          }
        ],
        "default": "lime"
      },
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200
      }
    ],
    "prompt": "{{ref.store}} is the background footage reference: animate it as a slow cinemagraph (gentle push-in, subtle light shift), preserving its content exactly.\n{{ref.eventImg}} shows the exact announcement text. This content must be interpreted as an image, not processed as text; reproduce every character exactly as drawn.{{#slots.periodImg}} {{ref.periodImg}} shows the exact period line and must be reproduced the same way.{{/slots.periodImg}}\nCreate a {{duration}}-second kinetic-typography promotion for a local business. Over the darkened, slightly blurred background from {{ref.store}}, the announcement text from {{ref.eventImg}} slams in word by word on the beat in bold white sans-serif with {{opt.accent.prompt}} accents: letters scale up, snap into place, and settle. Hold the complete announcement, large and centered, for the final 3 seconds{{#slots.periodImg}} with the period line from {{ref.periodImg}} below it in a smaller size{{/slots.periodImg}}. Add a short punchy sound design and an upbeat rhythmic track. Vertical framing for mobile.\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "Do not add watermarks, logos, or any text other than the announcement and period described above. Do not misspell or alter the characters. No gore, nudity, or copyrighted characters.",
    "requiresConsent": false,
    "sampleInputs": {
      "store": "/samples/event-notice/store.png"
    },
    "badges": [
      "📷1",
      "✍️"
    ],
    "sampleOptions": {
      "eventText": "오픈 기념 전 상품 20% 할인",
      "period": "9월 한 달간"
    }
  },
  "fashion-campaign.json": {
    "id": "fashion-campaign",
    "name": "패션 캠페인 필름",
    "tagline": "모델과 제품 사진으로 하이엔드 패션 캠페인 영상을 만듭니다.",
    "category": "commerce",
    "defaults": {
      "resolution": "768P",
      "duration": 12,
      "ratio": "16:9"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15
      ],
      "ratios": [
        "16:9",
        "9:16"
      ]
    },
    "slots": [
      {
        "key": "talent",
        "kind": "image",
        "label": "모델/인물",
        "source": "user",
        "required": true,
        "hint": "전신 또는 상반신 사진"
      },
      {
        "key": "product",
        "kind": "image",
        "label": "제품(의류·가방 등)",
        "source": "user",
        "required": true
      },
      {
        "key": "logo",
        "kind": "image",
        "label": "로고",
        "source": "user",
        "required": false,
        "hint": "마지막 장면에 한 번 노출"
      },
      {
        "key": "mood",
        "kind": "image",
        "label": "무드 레퍼런스",
        "source": "option",
        "required": true,
        "optionKey": "mood"
      }
    ],
    "options": [
      {
        "key": "mood",
        "type": "select",
        "label": "무드",
        "values": [
          {
            "value": "desert",
            "label": "사막 하이웨이",
            "prompt": "a vintage car on a desert highway at late afternoon, restrained 35 mm film texture",
            "refId": "mood-desert"
          },
          {
            "value": "studio",
            "label": "화이트 스튜디오",
            "prompt": "a seamless minimal white studio with severe fashion attitude and fast, rhythmic cuts",
            "refId": "mood-studio"
          },
          {
            "value": "cyber",
            "label": "사이버 그런지",
            "prompt": "a nighttime cyber-grunge scene with VHS glitches, scanlines, light leaks, and orange firelight",
            "refId": "mood-cyber"
          }
        ],
        "default": "desert"
      },
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200
      }
    ],
    "prompt": "{{ref.mood}} sets the overall mood, location, and film texture. {{ref.talent}} is the talent: preserve their identity, face, and body. {{ref.product}} is the product and must be worn or carried naturally as part of the character's identity. Treat the talent's face, hair, outfit cut, and the product's exact colour and shape as canonical: they must stay identical in every shot, including the opening wide shot.{{#slots.logo}} {{ref.logo}} is the closing brand mark; show it once at the end, unaltered.{{/slots.logo}}\nCreate a premium fashion campaign film set in {{opt.mood.prompt}}. Tone: elevated, cool, and restrained, but lively and fashion-forward, not a narrative film or an e-commerce ad. Keep the story simple: the talent walks, pauses, turns toward camera, and leaves frame with the product. Mix wide, medium, and close-up shots with beat-synced cuts. Original soundtrack that fits the mood.\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "Do not add subtitles, watermarks, logos, or on-screen text unless explicitly requested above. Do not change the identity of any referenced person. No gore, nudity, or copyrighted characters.",
    "requiresConsent": true,
    "sampleInputs": {
      "talent": "/samples/fashion-campaign/talent.png",
      "product": "/samples/fashion-campaign/product.png",
      "logo": "/samples/fashion-campaign/logo.png"
    },
    "badges": [
      "📷4"
    ]
  },
  "hand-drawn-fx.json": {
    "id": "hand-drawn-fx",
    "name": "손그림 이펙트",
    "tagline": "영상 속 사람 주위에 빛나는 손그림 낙서를 프레임마다 입힙니다.",
    "category": "effects",
    "defaults": {
      "resolution": "768P",
      "duration": "clip",
      "ratio": "adaptive"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15
      ],
      "ratios": [
        "adaptive",
        "16:9",
        "9:16",
        "1:1",
        "4:3",
        "3:4",
        "21:9"
      ]
    },
    "slots": [
      {
        "key": "clip",
        "kind": "video",
        "label": "영상",
        "source": "user",
        "required": true,
        "hint": "2~15초 mp4/mov"
      },
      {
        "key": "doodle",
        "kind": "image",
        "label": "낙서 스타일",
        "source": "option",
        "required": true,
        "optionKey": "palette"
      }
    ],
    "options": [
      {
        "key": "palette",
        "type": "select",
        "label": "낙서 팔레트",
        "values": [
          {
            "value": "apricot",
            "label": "살구빛 낙서",
            "refId": "doodle-apricot"
          },
          {
            "value": "pink",
            "label": "핑크 브러시",
            "refId": "doodle-pink"
          },
          {
            "value": "chalk",
            "label": "화이트 초크",
            "refId": "doodle-chalk"
          }
        ],
        "default": "apricot"
      },
      {
        "key": "moment",
        "type": "text",
        "label": "강조할 순간",
        "maxLen": 60,
        "placeholder": "두 사람이 가까워질 때"
      },
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200
      }
    ],
    "prompt": "Use {{ref.clip}} as the sole video source and keep it completely unchanged: subjects, camera movement, and timing. Sound: natural ambience of the scene with soft sparkle tones when marks appear. {{ref.doodle}} is the style reference for the hand-drawn marks.\nAdd glowing hand-drawn marks in the style of {{ref.doodle}} around the people in {{ref.clip}}: flat, frame-by-frame doodles with crayon and chalk texture, uneven line weight, and a gentle halo. Start with tiny sparks; as the action builds{{#opt.moment}}, especially when {{opt.moment}}{{/opt.moment}}, the marks multiply into bright radiance. Never cover faces. No 3D CGI, no neon tubes, no uniform vector lines.\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "Do not add subtitles, watermarks, logos, or on-screen text unless explicitly requested above. Do not change the identity of any referenced person. No gore, nudity, or copyrighted characters.",
    "requiresConsent": false,
    "sampleInputs": {
      "clip": "/samples/clips/couple-dusk.mp4"
    },
    "badges": [
      "🎬1"
    ]
  },
  "korean-typo.json": {
    "id": "korean-typo",
    "name": "한국어 키네틱 타이포",
    "tagline": "문구만 입력하면 검정 배경 위에서 한글이 춤추는 타이포 영상이 됩니다.",
    "category": "effects",
    "defaults": {
      "resolution": "768P",
      "duration": 8,
      "ratio": "16:9"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        5,
        6,
        7,
        8,
        9,
        10,
        12,
        15
      ],
      "ratios": [
        "16:9",
        "9:16",
        "1:1"
      ]
    },
    "slots": [
      {
        "key": "textImg",
        "kind": "image",
        "label": "문구",
        "source": "textImage",
        "required": true,
        "optionKey": "text",
        "textStyle": "dark"
      }
    ],
    "options": [
      {
        "key": "text",
        "type": "text",
        "label": "문구 (한국어 가능, 줄바꿈은 공백으로)",
        "maxLen": 60,
        "required": true,
        "placeholder": "예: 한 글자씩 반짝이다"
      },
      {
        "key": "accent",
        "type": "select",
        "label": "포인트 컬러",
        "values": [
          {
            "value": "red",
            "label": "레드",
            "prompt": "deep red"
          },
          {
            "value": "lime",
            "label": "라임",
            "prompt": "electric lime green"
          },
          {
            "value": "white",
            "label": "화이트만",
            "prompt": "no color accents at all, pure white only"
          }
        ],
        "default": "red"
      },
      {
        "key": "mood",
        "type": "select",
        "label": "무드",
        "values": [
          {
            "value": "sharp",
            "label": "날카롭고 기계적인",
            "prompt": "dark, cool, sharp, rational, and mechanical, with a subtle sense of aggression"
          },
          {
            "value": "soft",
            "label": "부드럽고 우아한",
            "prompt": "calm, elegant, and fluid, with gentle easing and generous pauses"
          }
        ],
        "default": "sharp"
      },
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200
      }
    ],
    "prompt": "{{ref.textImg}} shows the exact Korean characters to use. This content must be interpreted as an image, not processed as text; reproduce every character exactly as drawn, in the same order, and never add, remove, or replace any character.\nCreate a {{duration}}-second experimental Korean kinetic-typography film set entirely against a pure black background. The only elements allowed on screen are the white Korean characters from {{ref.textImg}}, with occasional {{opt.accent.prompt}} typographic offsets or accents. Do not include people, scenery, photography, illustrations, icons, products, logos, 3D objects, English titles, fixed UI elements, numbering, timers, borders, grids, or any decorative graphics.\nThis is not a subtitle video. The characters are the sole visual subject: they rapidly appear, scale up, rotate, compress, collide, fragment, multiply, invert, and reassemble across the black canvas, like an experimental type-motion film by a graphic designer. Keep the mood {{opt.mood.prompt}}. The execution stays premium, restrained, cohesive, and visually controlled. For the final 1.5 seconds the complete phrase settles, fully legible and centered. Sound: precise mechanical clicks and whooshes synced to each movement, plus a minimal electronic pulse.\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "No watermarks, no logos, no characters other than those shown in the reference image. No gore, nudity, or copyrighted characters.",
    "requiresConsent": false,
    "sampleInputs": {},
    "badges": [
      "✍️"
    ],
    "sampleOptions": {
      "text": "한 글자씩 반짝이다"
    }
  },
  "landing-motion.json": {
    "id": "landing-motion",
    "name": "나이키 스타일 제품 랜딩페이지",
    "tagline": "제품 사진 한 장으로 거대한 헤드라인이 스치는 랜딩페이지 데모 영상을 만듭니다. 한국어 헤드라인 가능.",
    "category": "commerce",
    "defaults": {
      "resolution": "768P",
      "duration": 10,
      "ratio": "16:9"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15
      ],
      "ratios": [
        "16:9",
        "9:16",
        "1:1",
        "4:3",
        "21:9"
      ]
    },
    "slots": [
      {
        "key": "hero",
        "kind": "image",
        "label": "제품 사진",
        "source": "user",
        "required": true,
        "hint": "배경이 깨끗한 제품 컷이 가장 좋습니다 (예: 운동화)"
      },
      {
        "key": "headImg",
        "kind": "image",
        "label": "헤드라인",
        "source": "textImage",
        "required": false,
        "optionKey": "headline",
        "textStyle": "dark"
      }
    ],
    "options": [
      {
        "key": "headline",
        "type": "text",
        "label": "헤드라인 (선택, 한국어 가능)",
        "maxLen": 24,
        "placeholder": "예: 속도를 해방하라 / UNLEASH SPEED"
      },
      {
        "key": "brand",
        "type": "select",
        "label": "브랜드 스타일",
        "values": [
          {
            "value": "sport",
            "label": "스포츠·스피드 (나이키풍)",
            "prompt": "oversized bold italic sans-serif typography, speed-driven light streaks, dark carbon-fiber and performance-mesh textures on a consistently dark background, fast powerful scrolling and high-impact hover interactions with scale-ups and color inversion"
          },
          {
            "value": "luxury",
            "label": "럭셔리·세리프",
            "prompt": "elegant serif typography, ivory and charcoal palette, slow smooth scrolling, refined hover states with gentle underlines and fades"
          },
          {
            "value": "tech",
            "label": "테크·다크 글래스",
            "prompt": "dark glassmorphism panels, thin monospaced labels, a subtle grid, smooth scroll with parallax layers and glowing cursor hover states"
          }
        ],
        "default": "sport"
      },
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200
      }
    ],
    "prompt": "{{ref.hero}} is the product reference; preserve its exact shape, colors, materials, and details, including the exact shape of its side stripe or accent — never add a swoosh, tick, or any brand mark that is not in {{ref.hero}}.{{#slots.headImg}} {{ref.headImg}} shows the exact headline text. This content must be interpreted as an image, not processed as text; reproduce every character exactly as drawn.{{/slots.headImg}}\nCreate a dynamic product-landing-page UI/UX demo built around the product in {{ref.hero}}. Use {{opt.brand.prompt}}. Open on the hero section where the product floats large over the background;{{#slots.headImg}} the headline from {{ref.headImg}} sweeps in as gigantic typography, and although the product overlaps it, at least one full second shows every character of the headline unobstructed;{{/slots.headImg}}{{^slots.headImg}} the headline area is shown only as solid greeked placeholder bars;{{/slots.headImg}} then a smooth, fast, powerful scroll through two more sections (feature detail, colorway grid) with cursor-driven hover interactions, and a return to the hero.\nEvery other piece of interface copy — the navigation bar, logo area, buttons, captions, product-card labels and prices — is rendered as solid greeked placeholder bars and simple geometric icons: absolutely no letterforms, words, numbers, or invented logos anywhere outside the headline. Keep every section on the same background and visual system as the hero; never cut to a white page. Recolored product variants keep the exact silhouette and stripe shape of {{ref.hero}}. Subtle UI sound design and a driving electronic beat, mixed with headroom and no clipping.\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "Do not add real brand logos, swoosh shapes, or trademarked names. Do not render any readable text other than the headline described above — all other copy is greeked placeholder bars. No gore, nudity, or copyrighted characters.",
    "requiresConsent": false,
    "sampleInputs": {
      "hero": "/samples/landing-motion/hero.png"
    },
    "badges": [
      "📷1",
      "✍️"
    ],
    "sampleOptions": {
      "headline": "속도를 해방하라"
    }
  },
  "macro-cut.json": {
    "id": "macro-cut",
    "name": "재료에서 완성까지 한 컷",
    "tagline": "원두 접사가 크레마로, 반죽이 빵으로. 컷 없이 질감이 밀려 들어가는 6초 매크로 전환.",
    "category": "effects",
    "mode": "first-last",
    "defaults": {
      "resolution": "768P",
      "duration": 6,
      "ratio": "adaptive"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        5,
        6,
        7,
        8
      ],
      "ratios": [
        "adaptive"
      ]
    },
    "slots": [
      {
        "key": "from",
        "kind": "image",
        "label": "재료 접사",
        "source": "user",
        "required": true,
        "hint": "질감이 꽉 찬 클로즈업 (원두·반죽·원단·꽃잎)"
      },
      {
        "key": "to",
        "kind": "image",
        "label": "완성품 접사",
        "source": "user",
        "required": true,
        "hint": "재료와 결이 비슷한 질감일수록 매끄럽게 이어집니다"
      }
    ],
    "options": [
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200,
        "placeholder": "예: 김이 살짝 피어오르게"
      }
    ],
    "prompt": "Image 1 is the exact opening frame and Image 2 is the exact closing frame.\nOne continuous macro shot with no visible edit. Seconds 0–2: push in slowly on the surface of Image 1 until the grains, ridges and highlights of a single element fill the frame. Seconds 2–4: that surface softens and re-forms, its grain becoming the fine, even structure of Image 2 — a gradual, gentle handoff in which the material keeps the matte, velvety, finely textured surface quality of Image 2 throughout. Seconds 4–6: ease back out until Image 2 is fully revealed and holds still.\nExtremely shallow depth of field, fine particles drifting through soft backlight, photoreal, quiet and restrained. Sound: intimate close-mic texture sounds that blend from the first material into the second.\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "No cuts, dissolves, or black frames. No liquid pouring or rising over the subject. No text, watermarks, logos, hands, or people. No gore, nudity, or copyrighted characters.",
    "requiresConsent": false,
    "sampleInputs": {
      "from": "/samples/macro-cut/beans.png",
      "to": "/samples/macro-cut/crema.png"
    },
    "badges": [
      "📷2"
    ]
  },
  "meme-recreate.json": {
    "id": "meme-recreate",
    "name": "밈 재현기",
    "tagline": "유명 밈 영상의 주인공을 내 캐릭터로 바꿔 재현합니다.",
    "category": "effects",
    "defaults": {
      "resolution": "768P",
      "duration": "clip",
      "ratio": "adaptive"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15
      ],
      "ratios": [
        "adaptive",
        "16:9",
        "9:16",
        "1:1",
        "4:3",
        "3:4",
        "21:9"
      ]
    },
    "slots": [
      {
        "key": "character",
        "kind": "image",
        "label": "캐릭터 사진",
        "source": "user",
        "required": true,
        "hint": "사람·반려동물·캐릭터 모두 가능"
      },
      {
        "key": "memeUpload",
        "kind": "video",
        "label": "내 밈 영상 (선택)",
        "source": "user",
        "required": false,
        "hint": "직접 찍었거나 사용 허락을 받은 밈 영상 2~15초. 넣으면 아래 프리셋 대신 이 영상을 재현합니다."
      },
      {
        "key": "meme",
        "kind": "video",
        "label": "밈 프리셋",
        "source": "option",
        "required": false,
        "optionKey": "meme",
        "skipIfSlot": "memeUpload"
      }
    ],
    "oneOf": [
      [
        "memeUpload",
        "meme"
      ]
    ],
    "refAliases": {
      "motion": [
        "memeUpload",
        "meme"
      ]
    },
    "options": [
      {
        "key": "meme",
        "type": "select",
        "label": "밈 선택 (프리뷰를 눌러 미리 보기)",
        "values": [
          {
            "value": "__placeholder__",
            "label": "준비 중"
          }
        ],
        "default": "__placeholder__",
        "dynamic": "meme"
      },
      {
        "key": "count",
        "type": "select",
        "label": "캐릭터로 바꿀 인원 수",
        "values": [
          {
            "value": "1",
            "label": "1명"
          },
          {
            "value": "2",
            "label": "2명"
          },
          {
            "value": "3",
            "label": "3명"
          }
        ],
        "default": "1"
      },
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200
      }
    ],
    "prompt": "{{ref.motion}} is the motion reference, filmed from a locked-off camera. {{ref.character}} is the character reference.\nRecreate the exact action of {{ref.motion}}: replace {{opt.count}} of the people in the reference with photoreal copies of the character from {{ref.character}} (if the reference has fewer people than that, replace all of them); leave any remaining people exactly as they are. Preserve the original movement path, timing, camera framing, and comedic beats exactly. Keep the camera fixed. Integrate fur, skin, lighting, and shadows realistically into the original scene. Sound: natural room tone and comedic sound beats that match the action of {{ref.motion}}.\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "Do not add subtitles, watermarks, logos, or on-screen text unless explicitly requested above. Do not change the identity of any referenced person. No gore, nudity, or copyrighted characters.",
    "requiresConsent": true,
    "sampleInputs": {
      "character": "/samples/meme-recreate/character.png"
    },
    "badges": [
      "📷1"
    ]
  },
  "menu-spotlight.json": {
    "id": "menu-spotlight",
    "name": "메뉴 스포트라이트",
    "tagline": "음식·상품 사진 한 장으로 프리미엄 런칭 광고를 만듭니다. 메뉴명과 가격이 한국어로 표시됩니다.",
    "category": "smallbiz",
    "defaults": {
      "resolution": "768P",
      "duration": 8,
      "ratio": "9:16"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        5,
        6,
        7,
        8,
        9,
        10,
        12,
        15
      ],
      "ratios": [
        "9:16",
        "16:9",
        "1:1"
      ]
    },
    "slots": [
      {
        "key": "food",
        "kind": "image",
        "label": "메뉴·상품 사진",
        "source": "user",
        "required": true,
        "hint": "배경이 단순할수록 좋습니다"
      },
      {
        "key": "nameImg",
        "kind": "image",
        "label": "메뉴명",
        "source": "textImage",
        "required": true,
        "optionKey": "menuName",
        "textStyle": "dark"
      },
      {
        "key": "priceImg",
        "kind": "image",
        "label": "가격",
        "source": "textImage",
        "required": false,
        "optionKey": "price",
        "textStyle": "dark"
      }
    ],
    "options": [
      {
        "key": "menuName",
        "type": "text",
        "label": "메뉴명 (한국어 가능)",
        "maxLen": 20,
        "required": true,
        "placeholder": "예: 흑임자 크림 라떼"
      },
      {
        "key": "price",
        "type": "text",
        "label": "가격 (선택)",
        "maxLen": 15,
        "placeholder": "예: 6,500원"
      },
      {
        "key": "style",
        "type": "select",
        "label": "스타일",
        "values": [
          {
            "value": "black",
            "label": "블랙 스튜디오",
            "prompt": "a pure black background with studio-quality rim lighting and ultra-slow rotating macro close-ups"
          },
          {
            "value": "wood",
            "label": "우드 테이블",
            "prompt": "a warm wooden table by a window with soft natural light and slow dolly moves"
          },
          {
            "value": "bright",
            "label": "화이트 데이라이트",
            "prompt": "a bright white surface with airy daylight and crisp overhead and 45-degree angles"
          }
        ],
        "default": "black"
      },
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200
      }
    ],
    "prompt": "{{ref.food}} is the product reference. Preserve its exact shape, colors, texture, plating, and packaging.\n{{ref.nameImg}} shows the exact menu name to display{{#slots.priceImg}} and {{ref.priceImg}} shows the exact price{{/slots.priceImg}}. This content must be interpreted as an image, not processed as text; reproduce every character exactly as drawn.\nCreate a {{duration}}-second premium new-menu launch film set on {{opt.style.prompt}}. Oversized minimalist typography, generous negative space, one consistent visual system, atmospheric electronic soundtrack with a soft sizzle or pour sound if appropriate. Shot list: macro texture detail, a slow reveal of the whole item, a final hero shot. In the final 2.5 seconds show the menu name from {{ref.nameImg}} large and centered{{#slots.priceImg}} with the price from {{ref.priceImg}} beneath it in a smaller size, reproduced exactly as drawn{{/slots.priceImg}}. Text must be crisp and correctly spelled.\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "Do not add watermarks, logos, or any text other than the menu name and price described above. No cartoon styling, no cluttered backgrounds. No gore, nudity, or copyrighted characters.",
    "requiresConsent": false,
    "sampleInputs": {
      "food": "/samples/menu-spotlight/food.png"
    },
    "badges": [
      "📷1",
      "✍️"
    ],
    "sampleOptions": {
      "menuName": "허니 양념 순살치킨",
      "price": "18,900원"
    }
  },
  "owner-greeting.json": {
    "id": "owner-greeting",
    "name": "사장님 인사 영상",
    "tagline": "사장님 사진 한 장과 인사말만 넣으면 한국어로 직접 말하는 영상이 됩니다.",
    "category": "smallbiz",
    "defaults": {
      "resolution": "768P",
      "duration": 10,
      "ratio": "9:16"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15
      ],
      "ratios": [
        "9:16",
        "16:9",
        "1:1"
      ]
    },
    "slots": [
      {
        "key": "owner",
        "kind": "image",
        "label": "사장님 사진",
        "source": "user",
        "required": true,
        "hint": "얼굴이 정면으로 잘 보이는 사진"
      },
      {
        "key": "voice",
        "kind": "audio",
        "label": "목소리 샘플 (선택, 2~15초)",
        "source": "user",
        "required": false,
        "hint": "넣으면 이 목소리로 말합니다"
      },
      {
        "key": "nameImg",
        "kind": "image",
        "label": "가게 이름",
        "source": "textImage",
        "required": false,
        "optionKey": "storeName",
        "textStyle": "dark"
      }
    ],
    "options": [
      {
        "key": "line",
        "type": "text",
        "label": "인사말 (한국어로 그대로 말합니다)",
        "maxLen": 150,
        "required": true,
        "placeholder": "예: 안녕하세요, 카페 봄날 사장입니다. 매일 아침 직접 구운 빵으로 기다리고 있을게요!"
      },
      {
        "key": "storeName",
        "type": "text",
        "label": "가게 이름 자막 (선택)",
        "maxLen": 20,
        "placeholder": "예: 카페 봄날"
      },
      {
        "key": "setting",
        "type": "select",
        "label": "배경",
        "values": [
          {
            "value": "counter",
            "label": "카운터 앞",
            "prompt": "standing behind the counter of their own shop, warm interior light"
          },
          {
            "value": "entrance",
            "label": "가게 입구",
            "prompt": "standing at the entrance of their shop with the storefront behind, soft daylight"
          },
          {
            "value": "kitchen",
            "label": "주방·작업 공간",
            "prompt": "in their kitchen or workspace, sleeves rolled up, practical lighting"
          }
        ],
        "default": "counter"
      },
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200
      }
    ],
    "prompt": "{{ref.owner}} is the character reference: preserve this person's face, hair, skin tone, and body exactly.{{#slots.voice}} {{ref.voice}} is the voice reference: match its timbre, tone, pitch, and accent exactly.{{/slots.voice}}{{#slots.nameImg}} {{ref.nameImg}} shows the exact store name for a small caption; interpret it as an image, not text, and reproduce every character exactly.{{/slots.nameImg}}\nCreate a {{duration}}-second friendly greeting video of a small-business owner {{opt.setting.prompt}}. Medium close-up, eye contact with the camera, natural warm smile, small welcoming hand gesture. The owner speaks in Korean with natural pacing and accurate lip sync, saying exactly: \"{{opt.line}}\"\nKeep the performance sincere and unpolished, like a real shop owner, not an actor. Quiet ambient shop sound, no background music.{{#slots.nameImg}} During the final 2 seconds, show the store name from {{ref.nameImg}} as a small clean caption in the lower third.{{/slots.nameImg}}\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "Do not add subtitles, watermarks, logos, or on-screen text other than the caption described above. Do not change the identity of the referenced person. No gore, nudity, or copyrighted characters.",
    "requiresConsent": true,
    "sampleInputs": {
      "owner": "/samples/owner-greeting/owner.png",
      "voice": "/samples/voice/korean-greeting.wav"
    },
    "badges": [
      "📷1",
      "🎤"
    ],
    "sampleOptions": {
      "line": "안녕하세요, 카페 봄날입니다. 오늘도 갓 구운 빵과 따뜻한 커피로 기다릴게요.",
      "storeName": "카페 봄날"
    }
  },
  "pop-out.json": {
    "id": "pop-out",
    "name": "포스터 밖으로 튀어나오기",
    "tagline": "간판·로고 포스터 속에서 제품이나 반려동물이 튀어나왔다 돌아갑니다. 릴스용 8초.",
    "category": "smallbiz",
    "defaults": {
      "resolution": "768P",
      "duration": 8,
      "ratio": "9:16"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        6,
        7,
        8,
        9,
        10
      ],
      "ratios": [
        "9:16",
        "1:1",
        "16:9"
      ]
    },
    "slots": [
      {
        "key": "poster",
        "kind": "image",
        "label": "로고·간판 포스터",
        "source": "user",
        "required": true,
        "hint": "글자가 적고 여백이 넓은 것. 상호 한 줄 정도가 안전합니다"
      },
      {
        "key": "subject",
        "kind": "image",
        "label": "튀어나올 제품·반려동물 사진",
        "source": "user",
        "required": true,
        "hint": "배경이 단순한 정면 사진"
      }
    ],
    "options": [
      {
        "key": "space",
        "type": "select",
        "label": "포스터가 걸린 곳",
        "values": [
          {
            "value": "wall",
            "label": "가게 벽",
            "prompt": "the poster hangs on a warm, softly lit shop wall"
          },
          {
            "value": "white",
            "label": "흰 배경 (깔끔)",
            "prompt": "the poster floats on a clean seamless white studio background"
          },
          {
            "value": "street",
            "label": "거리 게시판",
            "prompt": "the poster is pinned on an outdoor notice board on a sunny street"
          }
        ],
        "default": "wall"
      },
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200
      }
    ],
    "prompt": "{{ref.poster}} is a flat printed poster and {{ref.subject}} is the character. Setting: {{opt.space.prompt}}.\nAt every moment the poster stays a flat printed sheet showing exactly the same logo and lettering as Image 1 — it must never turn into a window, doorway, hole, mirror, dark opening, or a view into another room, even while the character is outside it. In beat 1 the character sits in the empty area below the logo and never covers the logo or the lettering.\nThree beats, one continuous shot with a locked-off camera and no cuts:\n1. Open on the poster hanging flat, exactly as printed. The character from {{ref.subject}} appears inside the poster's frame, grips the frame's edge with the poster's flat graphic look, and leans its head and body out into the real space, becoming three-dimensional as it crosses the edge.\n2. It springs fully out of the poster, lands in front of it with a soft bounce and a small shadow on the surface below, looks at the camera for a beat, and does one playful action.\n3. It hops back into the poster and settles into place, turning flat again; the poster returns to exactly its original printed state and holds for the last second.\nThe poster's lettering must remain exactly as printed at every moment — never redrawn, restyled, or replaced; no new text anywhere. Preserve the character's identity, colors and proportions from {{ref.subject}}. Photoreal, light playful sound design with a soft pop when it exits and re-enters.\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "Do not alter, add, or remove any lettering on the poster. The poster must not become a window, hole, mirror or opening. Do not move the camera. Do not add other characters. No watermarks or logos. No gore, nudity, or copyrighted characters.",
    "requiresConsent": true,
    "sampleInputs": {
      "poster": "/samples/pop-out/poster.png",
      "subject": "/samples/style-transform/subject.png"
    },
    "badges": [
      "📷2"
    ]
  },
  "poster-motion.json": {
    "id": "poster-motion",
    "name": "전단지 살리기",
    "tagline": "이미 만든 포스터·메뉴판 사진 한 장이 움직이는 영상이 됩니다. 큰 글씨 3~5단어짜리에 맞습니다. 글자를 확인하고 쓰세요.",
    "category": "smallbiz",
    "defaults": {
      "resolution": "768P",
      "duration": 8,
      "ratio": "adaptive"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        5,
        6,
        7,
        8,
        9,
        10
      ],
      "ratios": [
        "adaptive",
        "9:16",
        "3:4",
        "1:1",
        "16:9"
      ]
    },
    "slots": [
      {
        "key": "poster",
        "kind": "image",
        "label": "포스터·메뉴판·전단 사진",
        "source": "user",
        "required": true,
        "hint": "정면에서 평평하게, 그림자 없이. 글씨가 크고 적을수록 정확합니다"
      }
    ],
    "options": [
      {
        "key": "mood",
        "type": "select",
        "label": "분위기",
        "values": [
          {
            "value": "lively",
            "label": "밝고 경쾌한",
            "prompt": "bright and playful: elements pop in with quick, bouncy, beat-synced motion and a light type-on sound each time text appears"
          },
          {
            "value": "calm",
            "label": "차분하고 고급스러운",
            "prompt": "calm and premium: elements fade and drift in slowly with gentle easing, soft ambient music and a subtle whoosh when text appears"
          }
        ],
        "default": "lively"
      },
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200
      }
    ],
    "prompt": "{{ref.poster}} is a printed poster. Animate it as a motion poster while preserving its exact layout, border, frame, colors, photo, and typography.\nThe poster's own lettering is the only text allowed, and every character must stay exactly as printed — same glyphs, same spelling, same size, same position — never redrawn, reflowed, restyled, or replaced. Treat the printed text as an image to reproduce faithfully, not as text to rewrite.\nThe first frame shows the poster with its border, background and photo present but every text block still hidden; no lettering is visible until it is revealed, and the complete poster must not appear before the last text block has come in. Bring the poster to life on a time budget across the whole {{duration}} seconds: the background and photo settle in first with a slow, subtle parallax during the first quarter; then each block of text appears one at a time, largest first, in its original position, spaced evenly through the middle half; the complete poster is fully assembled only in the last quarter and holds still and sharp for the final 2 seconds. {{opt.mood.prompt}}\nThe camera stays square-on to the poster with at most a very slow push-in; no tilting, rotating, or perspective changes. Nothing may be added around or over the poster.\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "Do not change, add, remove, or misspell any character on the poster. Do not add new text, watermarks, logos, or decorative graphics. Do not warp, tilt, or crop the poster. No gore, nudity, or copyrighted characters.",
    "requiresConsent": false,
    "sampleInputs": {
      "poster": "/samples/poster-motion/poster.png"
    },
    "badges": [
      "📷1"
    ]
  },
  "product-360.json": {
    "id": "product-360",
    "name": "제품 360° 리빌",
    "tagline": "원하는 공간에서 제품을 360도로 천천히 보여 줍니다.",
    "category": "commerce",
    "defaults": {
      "resolution": "768P",
      "duration": 10,
      "ratio": "16:9"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15
      ],
      "ratios": [
        "adaptive",
        "16:9",
        "9:16",
        "1:1",
        "4:3",
        "3:4",
        "21:9"
      ]
    },
    "slots": [
      {
        "key": "product",
        "kind": "image",
        "label": "제품 사진",
        "source": "user",
        "required": true
      },
      {
        "key": "detail",
        "kind": "image",
        "label": "디테일 컷(선택)",
        "source": "user",
        "required": false,
        "hint": "강조하고 싶은 부분의 클로즈업"
      }
    ],
    "options": [
      {
        "key": "scene",
        "type": "select",
        "label": "공간",
        "values": [
          {
            "value": "office",
            "label": "모던 오피스",
            "prompt": "a premium modern office with warm wood and glass"
          },
          {
            "value": "loft",
            "label": "콘크리트 로프트",
            "prompt": "a raw concrete loft with a single window light"
          },
          {
            "value": "outdoor",
            "label": "야외 골든아워",
            "prompt": "a quiet outdoor setting at golden hour"
          },
          {
            "value": "white",
            "label": "화이트 스튜디오",
            "prompt": "a seamless white cyclorama studio"
          }
        ],
        "default": "office"
      },
      {
        "key": "closing",
        "type": "text",
        "label": "마무리 카피",
        "maxLen": 40,
        "placeholder": "예: Built to last."
      },
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200
      }
    ],
    "prompt": "{{ref.product}} is the product reference.{{#slots.detail}} {{ref.detail}} shows feature details to highlight.{{/slots.detail}}\nPresent the product in {{opt.scene.prompt}}. Shot 1 is a continuous orbit that completes a full 360 degrees and returns to the starting angle, using truck left + pan right, never a simple spin, with the whole product in frame and correctly exposed the entire time.\nThen cut to short macro views of materials and finishes{{#slots.detail}} and an engineering-style close-up of the details in {{ref.detail}}{{/slots.detail}}: no macro shot lasts longer than 1.5 seconds and the product stays recognisable in every frame — never fill the screen with an out-of-focus texture. End on a wide hero shot in the same room, on the same surface and under the same lighting as the opening, with the product still fully lit and never blown out to white.\nAny label, print or engraving on the product is reproduced exactly as it appears in {{ref.product}}: never invent lettering, micro-text, or a brand mark, and never let a label float as a flat rectangle over a curved surface.\nKeep the direction minimal, cool-toned, professional, and slow-paced.\n{{#opt.closing}}End with the line, exactly: \"{{opt.closing}}\", set in clean negative space that no object crosses.{{/opt.closing}}\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "Do not add subtitles, watermarks, logos, invented lettering or micro-text on the product. Do not add wires, cords, or vertical lines aligned with the product. Do not blow highlights out to pure white. No gore, nudity, or copyrighted characters.",
    "requiresConsent": false,
    "sampleInputs": {
      "product": "/samples/product-360/product.png",
      "detail": "/samples/product-360/detail.png"
    },
    "badges": [
      "📷2"
    ],
    "sampleOptions": {
      "closing": "Built to last."
    }
  },
  "relight.json": {
    "id": "relight",
    "name": "낮→밤 릴라이팅",
    "tagline": "같은 영상, 다른 시간대. 조명만 바꿔 분위기를 새로 만듭니다.",
    "category": "edit",
    "defaults": {
      "resolution": "768P",
      "duration": "clip",
      "ratio": "adaptive"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15
      ],
      "ratios": [
        "adaptive",
        "16:9",
        "9:16",
        "1:1",
        "4:3",
        "3:4",
        "21:9"
      ]
    },
    "slots": [
      {
        "key": "clip",
        "kind": "video",
        "label": "영상",
        "source": "user",
        "required": true,
        "hint": "2~15초 mp4/mov"
      }
    ],
    "options": [
      {
        "key": "time",
        "type": "select",
        "label": "시간대·날씨",
        "values": [
          {
            "value": "night",
            "label": "밤(달빛)",
            "prompt": "night, with cool moonlight and warm practical lights turning on"
          },
          {
            "value": "golden",
            "label": "골든아워",
            "prompt": "golden hour, with long warm shadows and soft haze"
          },
          {
            "value": "dawn",
            "label": "새벽 블루아워",
            "prompt": "blue-hour dawn, with cold diffuse light and faint mist"
          },
          {
            "value": "rain",
            "label": "흐린 비 오는 날",
            "prompt": "an overcast rainy day, with wet reflective surfaces and diffuse light"
          },
          {
            "value": "neon",
            "label": "네온 야경",
            "prompt": "night lit by colorful neon signs, with magenta and cyan reflections"
          }
        ],
        "default": "night"
      },
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200
      }
    ],
    "prompt": "Use {{ref.clip}} as the sole video source. Change the lighting of the entire scene to {{opt.time.prompt}}. Keep everything else exactly as it is: the subjects, their movement and timing, the camera movement, and the composition. Sound: natural ambience that matches the new time of day. Shadows, reflections, and skin tones must follow the new light source consistently across the whole clip.\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "Do not add subtitles, watermarks, logos, or on-screen text unless explicitly requested above. Do not change the identity of any referenced person. No gore, nudity, or copyrighted characters.",
    "requiresConsent": false,
    "sampleInputs": {
      "clip": "/samples/clips/street-noon.mp4"
    },
    "badges": [
      "🎬1"
    ]
  },
  "season-swap.json": {
    "id": "season-swap",
    "name": "계절 갈아입히기",
    "tagline": "여름에 찍은 가게 앞이 벚꽃·단풍·눈 내리는 장면으로 바뀝니다. 시즌 홍보를 미리 만들어 두세요.",
    "category": "smallbiz",
    "defaults": {
      "resolution": "768P",
      "duration": 8,
      "ratio": "adaptive"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        5,
        6,
        7,
        8,
        9,
        10
      ],
      "ratios": [
        "adaptive",
        "9:16",
        "16:9",
        "1:1"
      ]
    },
    "slots": [
      {
        "key": "scene",
        "kind": "image",
        "label": "가게 외관 사진",
        "source": "user",
        "required": false,
        "hint": "간판이 작거나 없는 사진일수록 글자가 안전합니다"
      },
      {
        "key": "clip",
        "kind": "video",
        "label": "가게 외관 영상 (선택, 사진 대신)",
        "source": "user",
        "required": false,
        "hint": "2~15초. 넣으면 사진 대신 이 영상의 계절을 바꿉니다"
      },
      {
        "key": "notice",
        "kind": "image",
        "label": "연출 영상 안내",
        "source": "fixed",
        "required": true,
        "refId": "notice-staged"
      }
    ],
    "oneOf": [
      [
        "scene",
        "clip"
      ]
    ],
    "refAliases": {
      "source": [
        "clip",
        "scene"
      ]
    },
    "options": [
      {
        "key": "season",
        "type": "select",
        "label": "계절",
        "values": [
          {
            "value": "spring",
            "label": "봄 · 벚꽃",
            "prompt": "early spring: cherry blossom trees in full bloom around the scene, a few petals drifting slowly through the air, soft warm daylight"
          },
          {
            "value": "rain",
            "label": "장마 · 비",
            "prompt": "a rainy day: gentle steady rain, wet reflective pavement, soft overcast light, small ripples in puddles"
          },
          {
            "value": "autumn",
            "label": "가을 · 단풍",
            "prompt": "mid autumn: trees turned red and gold, a few leaves drifting down, low warm afternoon sun"
          },
          {
            "value": "winter",
            "label": "겨울 · 눈",
            "prompt": "a calm winter day: light snow falling gently, a thin even layer of fresh snow on ledges and the ground, cool soft daylight; light snow only, no blizzard"
          }
        ],
        "default": "winter"
      },
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200
      }
    ],
    "prompt": "{{ref.source}} is the storefront to keep. Change only the season and weather to {{opt.season.prompt}}.\nEverything built or printed stays exactly as it is: the building, doors, windows, awning, furniture, plants, and every sign. All lettering on signs, boards and windows must remain pixel-identical to {{ref.source}} — never redraw, restyle, blur, translate, or replace a single character. Keep the camera and framing fixed{{#slots.clip}} and keep the original motion and timing of the footage{{/slots.clip}}{{^slots.clip}}, with only a very slow, subtle push-in{{/slots.clip}}.\n{{ref.notice}} is a small notice strip; show it exactly as drawn as a small strip no wider than a quarter of the frame, in the bottom-right corner, for the entire video; it must not cover the storefront. No other text may appear.\nPhotoreal, natural ambient sound that matches the weather.\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "Do not alter, add, or remove any signage or lettering. Do not add people or vehicles that are not in the source. No blizzards, storms, or dramatic weather. No watermarks or logos. No gore, nudity, or copyrighted characters.",
    "requiresConsent": false,
    "sampleInputs": {
      "scene": "/samples/gate/store-sign.png"
    },
    "badges": [
      "📷1"
    ]
  },
  "store-promo.json": {
    "id": "store-promo",
    "name": "우리 가게 홍보 영상",
    "tagline": "가게 사진과 이름만 넣으면 15초 세로형 홍보 영상이 나옵니다. 한국어 그대로 표시됩니다.",
    "category": "smallbiz",
    "defaults": {
      "resolution": "768P",
      "duration": 15,
      "ratio": "9:16"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        8,
        10,
        12,
        15
      ],
      "ratios": [
        "9:16",
        "16:9",
        "1:1"
      ]
    },
    "slots": [
      {
        "key": "store",
        "kind": "image",
        "label": "가게 사진",
        "source": "user",
        "required": true,
        "hint": "외관이나 내부가 잘 보이는 사진"
      },
      {
        "key": "product",
        "kind": "image",
        "label": "대표 메뉴·상품 사진 (선택)",
        "source": "user",
        "required": false
      },
      {
        "key": "nameImg",
        "kind": "image",
        "label": "가게 이름",
        "source": "textImage",
        "required": true,
        "optionKey": "storeName",
        "textStyle": "dark"
      },
      {
        "key": "sloganImg",
        "kind": "image",
        "label": "한 줄 문구",
        "source": "textImage",
        "required": false,
        "optionKey": "slogan",
        "textStyle": "dark"
      }
    ],
    "options": [
      {
        "key": "biz",
        "type": "select",
        "label": "업종",
        "values": [
          {
            "value": "cafe",
            "label": "카페·디저트",
            "prompt": "cafe and dessert shop"
          },
          {
            "value": "restaurant",
            "label": "식당·주점",
            "prompt": "restaurant or pub"
          },
          {
            "value": "salon",
            "label": "미용실·네일",
            "prompt": "hair salon or nail studio"
          },
          {
            "value": "gym",
            "label": "헬스·필라테스",
            "prompt": "fitness gym or pilates studio"
          },
          {
            "value": "retail",
            "label": "소매·편집숍",
            "prompt": "retail boutique"
          },
          {
            "value": "service",
            "label": "기타 서비스",
            "prompt": "local service business"
          }
        ],
        "default": "cafe"
      },
      {
        "key": "storeName",
        "type": "text",
        "label": "가게 이름 (한국어 가능)",
        "maxLen": 20,
        "required": true,
        "placeholder": "예: 카페 봄날"
      },
      {
        "key": "slogan",
        "type": "text",
        "label": "한 줄 홍보 문구 (선택)",
        "maxLen": 40,
        "placeholder": "예: 매일 아침 직접 굽는 크루아상"
      },
      {
        "key": "contact",
        "type": "text",
        "label": "전화번호·위치 (선택)",
        "maxLen": 30,
        "placeholder": "예: 02-123-4567 · 성수동"
      },
      {
        "key": "mood",
        "type": "select",
        "label": "분위기",
        "values": [
          {
            "value": "warm",
            "label": "따뜻하고 아늑한",
            "prompt": "warm, cozy and inviting, with golden natural light and gentle handheld camera."
          },
          {
            "value": "modern",
            "label": "세련되고 미니멀",
            "prompt": "clean, modern and minimal, with steady smooth camera moves and generous negative space."
          },
          {
            "value": "fun",
            "label": "밝고 경쾌한",
            "prompt": "bright, playful and energetic, with quick beat-synced cuts and vivid color."
          }
        ],
        "default": "warm"
      },
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200
      }
    ],
    "prompt": "{{ref.store}} is the storefront / interior reference; preserve its real look, signage, colors, and layout exactly.{{#slots.product}} {{ref.product}} is the signature product; show it as the hero item with appetizing close-ups.{{/slots.product}}\n{{ref.nameImg}} shows the exact store name to display. This content must be interpreted as an image, not processed as text; reproduce every character exactly as drawn, in the same order, without adding or changing letters.{{#slots.sloganImg}} {{ref.sloganImg}} shows the exact slogan line and must be reproduced the same way.{{/slots.sloganImg}}\nCreate a {{duration}}-second short-form advertisement for a local {{opt.biz.prompt}}. Tone: {{opt.mood.prompt}}\nStructure: open on the entrance or exterior with a gentle push-in; then three quick interior and product close-ups with inviting lighting; then a brief moment of a happy customer; finish with a clean end card that holds for the final 2 seconds, showing the store name from {{ref.nameImg}} large and centered{{#slots.sloganImg}}, with the slogan from {{ref.sloganImg}} below it in a smaller size{{/slots.sloganImg}}{{#opt.contact}}, and a small footer line reading exactly \"{{opt.contact}}\"{{/opt.contact}}. On-screen text must be crisp, correctly spelled, in a clean bold sans-serif, and must not appear anywhere else. Original background music that fits the tone. Framed for mobile.\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "Do not add watermarks, logos, or any text other than the store name, slogan, and footer described above. Do not invent a different store name. No gore, nudity, or copyrighted characters.",
    "requiresConsent": false,
    "sampleInputs": {
      "store": "/samples/store-promo/store.png",
      "product": "/samples/store-promo/product.png"
    },
    "badges": [
      "📷2",
      "✍️"
    ],
    "sampleOptions": {
      "storeName": "카페 봄날",
      "slogan": "매일 아침 직접 굽는 크루아상",
      "contact": "성수동 · 02-123-4567"
    }
  },
  "style-transform.json": {
    "id": "style-transform",
    "name": "스타일 변신",
    "tagline": "반려동물·사물 사진을 클레이·애니·복셀·페이퍼로 다시 태어나게 합니다.",
    "category": "effects",
    "defaults": {
      "resolution": "768P",
      "duration": 6,
      "ratio": "1:1"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15
      ],
      "ratios": [
        "adaptive",
        "16:9",
        "9:16",
        "1:1",
        "4:3",
        "3:4",
        "21:9"
      ]
    },
    "slots": [
      {
        "key": "subject",
        "kind": "image",
        "label": "피사체 사진",
        "source": "user",
        "required": true,
        "hint": "반려동물·사물·캐릭터가 가장 잘 변합니다. 사람 얼굴은 모델이 실사로 유지하려는 성향이 있어 배경·소품 위주로만 바뀔 수 있습니다."
      }
    ],
    "options": [
      {
        "key": "style",
        "type": "select",
        "label": "스타일",
        "values": [
          {
            "value": "clay",
            "label": "클레이",
            "prompt": "Claymation. A handmade stop-motion clay animation shot on a miniature plasticine set: matte plasticine surfaces with visible thumbprints and sculpting tool marks, lumpy handmade edges, clay fur and hair modelled as sculpted clumps, warm practical lighting, stop-motion cadence."
          },
          {
            "value": "anime",
            "label": "2D 애니",
            "prompt": "2D cel animation. A hand-drawn animated film with flat colors, bold ink outlines, a high-contrast palette and abstract motion-graphic backgrounds, in constant graphic motion."
          },
          {
            "value": "voxel",
            "label": "복셀(마인크래프트풍)",
            "prompt": "Voxel animation. Everything is built from chunky 3D pixel-art cubes in the style of Minecraft, with blocky silhouettes, physically correct motion, real shadows and transmitted light."
          },
          {
            "value": "paper",
            "label": "페이퍼 콜라주",
            "prompt": "Cut-paper collage animation. Every element is a layered piece of textured paper with visible cut edges and drop shadows, moving with stop-motion jitter."
          }
        ],
        "default": "clay"
      },
      {
        "key": "action",
        "type": "select",
        "label": "동작",
        "values": [
          {
            "value": "idle",
            "label": "자연스럽게 서 있기",
            "prompt": "the subject moves naturally with subtle breathing and small gestures"
          },
          {
            "value": "wave",
            "label": "손 흔들기",
            "prompt": "the subject looks at the camera and waves"
          },
          {
            "value": "spin",
            "label": "360° 회전",
            "prompt": "the subject turns a full 360 degrees"
          },
          {
            "value": "walk",
            "label": "카메라로 걸어오기",
            "prompt": "the subject walks toward the camera and stops in a medium shot"
          }
        ],
        "default": "idle"
      },
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200
      }
    ],
    "prompt": "{{opt.style.prompt}}\nThis is not live action and not a photograph: every single thing on screen is made of the medium described above, including the main character.\nThe character is a handmade puppet version of the subject in {{ref.subject}}. Use {{ref.subject}} only for the design — silhouette, hairstyle shape, colors and color blocking — and rebuild it in the medium with simplified, slightly exaggerated proportions. Do not copy the photographic surface of {{ref.subject}}.\nAction: {{opt.action.prompt}}. Camera: very slow push-in that stops early — the whole body stays inside the frame in every frame, with margin on all four sides. Add a soft, playful soundtrack that matches the material.\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "Do not output photorealistic or live-action imagery. Do not replace the subject with a different person or character. Do not crop the head or the feet. Do not add subtitles, watermarks, logos, or on-screen text. No gore, nudity, or copyrighted characters.",
    "requiresConsent": true,
    "sampleInputs": {
      "subject": "/samples/style-transform/subject.png"
    },
    "badges": [
      "📷1"
    ]
  },
  "voice-clone-dub.json": {
    "id": "voice-clone-dub",
    "name": "보이스 클론 더빙",
    "tagline": "내 목소리로, 원하는 언어로, 영상 속 인물이 새 대사를 말합니다.",
    "category": "edit",
    "defaults": {
      "resolution": "768P",
      "duration": "clip",
      "ratio": "adaptive"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15
      ],
      "ratios": [
        "adaptive",
        "16:9",
        "9:16",
        "1:1",
        "4:3",
        "3:4",
        "21:9"
      ]
    },
    "slots": [
      {
        "key": "clip",
        "kind": "video",
        "label": "영상",
        "source": "user",
        "required": true,
        "hint": "말하는 인물의 얼굴이 보이는 영상"
      },
      {
        "key": "voice",
        "kind": "audio",
        "label": "목소리 샘플(2~15초)",
        "source": "user",
        "required": true,
        "hint": "잡음 없는 wav/mp3"
      }
    ],
    "options": [
      {
        "key": "line",
        "type": "text",
        "label": "대사",
        "maxLen": 200,
        "placeholder": "예: 안녕하세요, 클릭투비디오입니다. 오늘도 좋은 하루 보내세요.",
        "required": true
      },
      {
        "key": "language",
        "type": "select",
        "label": "언어",
        "values": [
          {
            "value": "ko",
            "label": "한국어",
            "prompt": "Korean"
          },
          {
            "value": "en",
            "label": "영어",
            "prompt": "English"
          },
          {
            "value": "ja",
            "label": "일본어",
            "prompt": "Japanese"
          },
          {
            "value": "zh",
            "label": "중국어",
            "prompt": "Mandarin Chinese"
          },
          {
            "value": "fr",
            "label": "프랑스어",
            "prompt": "French"
          },
          {
            "value": "de",
            "label": "독일어",
            "prompt": "German"
          },
          {
            "value": "es",
            "label": "스페인어",
            "prompt": "Spanish"
          },
          {
            "value": "it",
            "label": "이탈리아어(실험적)",
            "prompt": "Italian (experimental)"
          },
          {
            "value": "pt",
            "label": "포르투갈어(실험적)",
            "prompt": "Portuguese (experimental)"
          },
          {
            "value": "ru",
            "label": "러시아어(실험적)",
            "prompt": "Russian (experimental)"
          },
          {
            "value": "id",
            "label": "인도네시아어(실험적)",
            "prompt": "Indonesian (experimental)"
          }
        ],
        "default": "ko"
      },
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200
      }
    ],
    "prompt": "{{ref.clip}} is the video source; preserve its visuals, camera, timing, body motion and hand gestures frame-for-frame. {{ref.voice}} is the voice reference: match its timbre, tone, pitch, and accent exactly.\nThe on-screen character in {{ref.clip}} says the following line in {{opt.language.prompt}}, with natural pacing that fits the clip length: \"{{opt.line}}\"\nAdjust lip movement, jaw, breathing, and facial performance subtly so they match the new line. Keep the original body motion, hand gestures, and head movement frame-for-frame; keep the original room tone under the new voice with no digital silence between phrases. Do not add music.\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "Do not add subtitles, watermarks, logos, or on-screen text unless explicitly requested above. Do not change the identity of any referenced person. No gore, nudity, or copyrighted characters.",
    "requiresConsent": true,
    "sampleInputs": {
      "clip": "/samples/clips/talking-owner.mp4",
      "voice": "/samples/voice/korean-greeting.wav"
    },
    "badges": [
      "🎬1",
      "🎤"
    ],
    "sampleOptions": {
      "line": "안녕하세요, 클릭투비디오입니다. 오늘도 좋은 하루 보내세요."
    }
  },
  "wear-swap.json": {
    "id": "wear-swap",
    "name": "내 상품 갈아끼우기",
    "tagline": "모델 없이 착용컷을 만듭니다. 무지 옷·로고 없는 소품 사진 한 장이면 내장 영상 속 인물이 내 상품을 입고 듭니다.",
    "category": "smallbiz",
    "defaults": {
      "resolution": "768P",
      "duration": "clip",
      "ratio": "adaptive"
    },
    "allow": {
      "resolutions": [
        "480P",
        "768P"
      ],
      "durations": [
        5,
        6,
        7,
        8,
        9,
        10
      ],
      "ratios": [
        "adaptive",
        "9:16",
        "1:1",
        "16:9"
      ]
    },
    "slots": [
      {
        "key": "product",
        "kind": "image",
        "label": "내 상품 사진",
        "source": "user",
        "required": true,
        "hint": "무지 의류나 로고 없는 소품만. 글자·로고가 있는 상품은 깨집니다"
      },
      {
        "key": "clipUpload",
        "kind": "video",
        "label": "내 영상 (선택)",
        "source": "user",
        "required": false,
        "hint": "직접 찍은 영상 2~15초. 넣으면 아래 내장 장면 대신 이 영상의 옷·소품을 바꿉니다"
      },
      {
        "key": "clip",
        "kind": "video",
        "label": "내장 장면",
        "source": "option",
        "required": false,
        "optionKey": "scene",
        "skipIfSlot": "clipUpload"
      }
    ],
    "oneOf": [
      [
        "clipUpload",
        "clip"
      ]
    ],
    "refAliases": {
      "motion": [
        "clipUpload",
        "clip"
      ]
    },
    "options": [
      {
        "key": "scene",
        "type": "select",
        "label": "내장 장면 (프리뷰를 눌러 미리 보기)",
        "values": [
          {
            "value": "__placeholder__",
            "label": "준비 중"
          }
        ],
        "default": "__placeholder__",
        "dynamic": "stock"
      },
      {
        "key": "kind",
        "type": "select",
        "label": "상품 종류",
        "values": [
          {
            "value": "top",
            "label": "상의 (티셔츠·니트)",
            "prompt": "the plain top worn by the person"
          },
          {
            "value": "held",
            "label": "손에 든 소품 (컵·가방·소형 제품)",
            "prompt": "the plain object held or placed by the person"
          }
        ],
        "default": "top"
      },
      {
        "key": "color",
        "type": "text",
        "label": "상품 색상·소재 (한 줄, 영어 또는 한국어)",
        "maxLen": 80,
        "placeholder": "예: 머스터드 옐로우 면 티셔츠"
      },
      {
        "key": "extra",
        "type": "text",
        "label": "추가 요청 (선택)",
        "maxLen": 200
      }
    ],
    "prompt": "{{ref.motion}} is the source footage; keep it exactly as it is — the person's face, body, movement and timing, the camera, the lighting, and the background all stay unchanged.\nReplace only {{opt.kind.prompt}} with the product in {{ref.product}}. The product's exact color, material, shape, fit and details must match {{ref.product}}{{#opt.color}} — specifically {{opt.color}}, with smooth, even, uniform color across the whole item and no patches, mottling, show-through or ghost prints{{/opt.color}} and must follow the person's motion naturally, with correct folds, shading and contact shadows. Everything that is not the product stays pixel-faithful to the source.\nDo not add any text, print, logo, or label to the product or anywhere in the frame. Photoreal.\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
    "negative": "Do not change the person's identity, face, pose, or the camera. Do not add text, prints, logos, or labels. No gore, nudity, or copyrighted characters.",
    "requiresConsent": true,
    "sampleInputs": {
      "product": "/samples/wear-swap/product.png"
    },
    "badges": [
      "📷1"
    ],
    "sampleOptions": {
      "color": "saturated marigold mustard-yellow plain cotton t-shirt"
    }
  }
};

export const BUNDLED_REF_MANIFEST: unknown = {
  "items": [
    {
      "id": "doodle-apricot",
      "kind": "image",
      "file": "doodle/apricot.png",
      "label": "살구빛 낙서",
      "width": 1024,
      "height": 1024
    },
    {
      "id": "doodle-pink",
      "kind": "image",
      "file": "doodle/pink.png",
      "label": "핑크 브러시",
      "width": 1024,
      "height": 1024
    },
    {
      "id": "doodle-chalk",
      "kind": "image",
      "file": "doodle/chalk.png",
      "label": "화이트 초크",
      "width": 1024,
      "height": 1024
    },
    {
      "id": "mood-desert",
      "kind": "image",
      "file": "mood/desert.png",
      "label": "사막 하이웨이",
      "width": 1920,
      "height": 1080
    },
    {
      "id": "mood-studio",
      "kind": "image",
      "file": "mood/studio.png",
      "label": "화이트 스튜디오",
      "width": 1920,
      "height": 1080
    },
    {
      "id": "mood-cyber",
      "kind": "image",
      "file": "mood/cyber.png",
      "label": "사이버 그런지",
      "width": 1920,
      "height": 1080
    },
    {
      "id": "dance-digiri",
      "kind": "video",
      "file": "dance/dance-digiri.mp4",
      "label": "디기리 챌린지",
      "durationSec": 10,
      "width": 768,
      "height": 1366
    },
    {
      "id": "dance-choesan",
      "kind": "video",
      "file": "dance/dance-choesan.mp4",
      "label": "최산댄스",
      "durationSec": 10,
      "width": 768,
      "height": 1366
    },
    {
      "id": "dance-slickback",
      "kind": "video",
      "file": "dance/dance-slickback.mp4",
      "label": "슬릭백",
      "durationSec": 8,
      "width": 768,
      "height": 1366
    },
    {
      "id": "dance-kpop-point",
      "kind": "video",
      "file": "dance/dance-kpop-point.mp4",
      "label": "K-pop 포인트 안무",
      "durationSec": 10,
      "width": 768,
      "height": 1366
    },
    {
      "id": "dance-hiphop-freestyle",
      "kind": "video",
      "file": "dance/dance-hiphop-freestyle.mp4",
      "label": "힙합 프리스타일",
      "durationSec": 10,
      "width": 768,
      "height": 1366
    },
    {
      "id": "meme-capybara",
      "kind": "video",
      "file": "meme/meme-capybara.mp4",
      "label": "카피바라 피라미드",
      "durationSec": 8,
      "width": 1366,
      "height": 768
    },
    {
      "id": "meme-office-dance",
      "kind": "video",
      "file": "meme/meme-office-dance.mp4",
      "label": "사무실 댄스 브레이크",
      "durationSec": 8,
      "width": 1366,
      "height": 768
    },
    {
      "id": "stock-walk",
      "kind": "video",
      "file": "stock/stock-walk.mp4",
      "label": "거리 워킹 (무지 티셔츠)",
      "durationSec": 5,
      "width": 720,
      "height": 1280
    },
    {
      "id": "stock-table",
      "kind": "video",
      "file": "stock/stock-table.mp4",
      "label": "카페 테이블 (무지 머그컵)",
      "durationSec": 5,
      "width": 720,
      "height": 1280
    },
    {
      "id": "notice-staged",
      "kind": "image",
      "file": "notice/staged.png",
      "label": "연출 영상 안내",
      "width": 1024,
      "height": 512
    }
  ]
};

export const BUNDLED_PUBLIC_FILES: ReadonlySet<string> = new Set([
  "/refs/dance/dance-choesan.mp4",
  "/refs/dance/dance-digiri.mp4",
  "/refs/dance/dance-hiphop-freestyle.mp4",
  "/refs/dance/dance-kpop-point.mp4",
  "/refs/dance/dance-slickback.mp4",
  "/refs/doodle/apricot.png",
  "/refs/doodle/chalk.png",
  "/refs/doodle/pink.png",
  "/refs/manifest.json",
  "/refs/meme/meme-capybara.mp4",
  "/refs/meme/meme-office-dance.mp4",
  "/refs/mood/cyber.png",
  "/refs/mood/desert.png",
  "/refs/mood/studio.png",
  "/refs/notice/staged.png",
  "/refs/stock/stock-table.mp4",
  "/refs/stock/stock-walk.mp4",
  "/samples/ar-magic/preview.mp4",
  "/samples/ar-magic/thumb.png",
  "/samples/background-swap/preview.mp4",
  "/samples/background-swap/thumb.png",
  "/samples/before-after/after.png",
  "/samples/before-after/before.png",
  "/samples/before-after/preview.mp4",
  "/samples/before-after/thumb.png",
  "/samples/black-studio-launch/preview.mp4",
  "/samples/black-studio-launch/product.png",
  "/samples/black-studio-launch/thumb.png",
  "/samples/clips/couple-dusk.mp4",
  "/samples/clips/greenscreen-wave.mp4",
  "/samples/clips/phone-crosswalk.mp4",
  "/samples/clips/stock-table.mp4",
  "/samples/clips/stock-walk.mp4",
  "/samples/clips/street-noon.mp4",
  "/samples/clips/talking-owner.mp4",
  "/samples/dance-transfer/person.png",
  "/samples/dance-transfer/preview.mp4",
  "/samples/dance-transfer/thumb.png",
  "/samples/event-notice/preview.mp4",
  "/samples/event-notice/store.png",
  "/samples/event-notice/thumb.png",
  "/samples/fashion-campaign/logo.png",
  "/samples/fashion-campaign/preview.mp4",
  "/samples/fashion-campaign/product.png",
  "/samples/fashion-campaign/talent.png",
  "/samples/fashion-campaign/thumb.png",
  "/samples/gate/flyer-dense.png",
  "/samples/gate/store-sign.png",
  "/samples/hand-drawn-fx/preview.mp4",
  "/samples/hand-drawn-fx/thumb.png",
  "/samples/korean-typo/preview.mp4",
  "/samples/korean-typo/thumb.png",
  "/samples/landing-motion/hero.png",
  "/samples/landing-motion/preview.mp4",
  "/samples/landing-motion/thumb.png",
  "/samples/macro-cut/beans.png",
  "/samples/macro-cut/crema.png",
  "/samples/macro-cut/thumb.png",
  "/samples/meme-recreate/character.png",
  "/samples/meme-recreate/preview.mp4",
  "/samples/meme-recreate/thumb.png",
  "/samples/menu-spotlight/food.png",
  "/samples/menu-spotlight/preview.mp4",
  "/samples/menu-spotlight/thumb.png",
  "/samples/mock/clip.mp4",
  "/samples/mock/result.mp4",
  "/samples/mock/voice.wav",
  "/samples/owner-greeting/owner.png",
  "/samples/owner-greeting/preview.mp4",
  "/samples/owner-greeting/thumb.png",
  "/samples/pop-out/poster.png",
  "/samples/pop-out/thumb.png",
  "/samples/poster-motion/poster.png",
  "/samples/poster-motion/preview.mp4",
  "/samples/poster-motion/thumb.png",
  "/samples/product-360/detail.png",
  "/samples/product-360/preview.mp4",
  "/samples/product-360/product.png",
  "/samples/product-360/thumb.png",
  "/samples/relight/preview.mp4",
  "/samples/relight/thumb.png",
  "/samples/season-swap/preview.mp4",
  "/samples/season-swap/thumb.png",
  "/samples/store-promo/preview.mp4",
  "/samples/store-promo/product.png",
  "/samples/store-promo/store.png",
  "/samples/store-promo/thumb.png",
  "/samples/style-transform/preview.mp4",
  "/samples/style-transform/subject.png",
  "/samples/style-transform/thumb.png",
  "/samples/voice-clone-dub/preview.mp4",
  "/samples/voice-clone-dub/thumb.png",
  "/samples/voice/korean-greeting.wav",
  "/samples/wear-swap/preview.mp4",
  "/samples/wear-swap/product.png",
  "/samples/wear-swap/thumb.png"
]);

/** 공개 미디어의 크기·길이 (Workers 에서 런타임 프로브 대신 사용) */
export const BUNDLED_MEDIA_META: Record<string, { bytes: number; width?: number; height?: number; durationSec?: number }> = {
  "/refs/dance/dance-choesan.mp4": {
    "bytes": 384940,
    "durationSec": 10.144,
    "width": 412,
    "height": 720
  },
  "/refs/dance/dance-digiri.mp4": {
    "bytes": 431544,
    "durationSec": 10.144,
    "width": 412,
    "height": 720
  },
  "/refs/dance/dance-hiphop-freestyle.mp4": {
    "bytes": 398458,
    "durationSec": 10.144,
    "width": 412,
    "height": 720
  },
  "/refs/dance/dance-kpop-point.mp4": {
    "bytes": 389036,
    "durationSec": 10.144,
    "width": 412,
    "height": 720
  },
  "/refs/dance/dance-slickback.mp4": {
    "bytes": 209024,
    "durationSec": 8,
    "width": 412,
    "height": 720
  },
  "/refs/doodle/apricot.png": {
    "bytes": 876748,
    "width": 1024,
    "height": 1024
  },
  "/refs/doodle/chalk.png": {
    "bytes": 1029052,
    "width": 1024,
    "height": 1024
  },
  "/refs/doodle/pink.png": {
    "bytes": 746330,
    "width": 1024,
    "height": 1024
  },
  "/refs/manifest.json": {
    "bytes": 3197
  },
  "/refs/meme/meme-capybara.mp4": {
    "bytes": 322861,
    "durationSec": 8,
    "width": 720,
    "height": 412
  },
  "/refs/meme/meme-office-dance.mp4": {
    "bytes": 237855,
    "durationSec": 8,
    "width": 720,
    "height": 412
  },
  "/refs/mood/cyber.png": {
    "bytes": 1174906,
    "width": 1088,
    "height": 608
  },
  "/refs/mood/desert.png": {
    "bytes": 1182651,
    "width": 1088,
    "height": 608
  },
  "/refs/mood/studio.png": {
    "bytes": 641543,
    "width": 1088,
    "height": 608
  },
  "/refs/notice/staged.png": {
    "bytes": 25070,
    "width": 1024,
    "height": 512
  },
  "/refs/stock/stock-table.mp4": {
    "bytes": 3837415,
    "durationSec": 5.184,
    "width": 768,
    "height": 1344
  },
  "/refs/stock/stock-walk.mp4": {
    "bytes": 5168333,
    "durationSec": 5.184,
    "width": 768,
    "height": 1344
  },
  "/samples/ar-magic/preview.mp4": {
    "bytes": 333314,
    "durationSec": 5.184,
    "width": 412,
    "height": 720
  },
  "/samples/ar-magic/thumb.png": {
    "bytes": 1139968,
    "width": 608,
    "height": 1088
  },
  "/samples/background-swap/preview.mp4": {
    "bytes": 182799,
    "durationSec": 5.184,
    "width": 412,
    "height": 720
  },
  "/samples/background-swap/thumb.png": {
    "bytes": 887918,
    "width": 608,
    "height": 1088
  },
  "/samples/before-after/after.png": {
    "bytes": 2071986,
    "width": 1024,
    "height": 1024
  },
  "/samples/before-after/before.png": {
    "bytes": 2330620,
    "width": 1024,
    "height": 1024
  },
  "/samples/before-after/preview.mp4": {
    "bytes": 296737,
    "durationSec": 6.592,
    "width": 720,
    "height": 720
  },
  "/samples/before-after/thumb.png": {
    "bytes": 1240335,
    "width": 608,
    "height": 1088
  },
  "/samples/black-studio-launch/preview.mp4": {
    "bytes": 202935,
    "durationSec": 10.144,
    "width": 720,
    "height": 412
  },
  "/samples/black-studio-launch/product.png": {
    "bytes": 658012,
    "width": 1024,
    "height": 1024
  },
  "/samples/black-studio-launch/thumb.png": {
    "bytes": 250025,
    "width": 608,
    "height": 1088
  },
  "/samples/clips/couple-dusk.mp4": {
    "bytes": 226349,
    "durationSec": 5.184,
    "width": 720,
    "height": 412
  },
  "/samples/clips/greenscreen-wave.mp4": {
    "bytes": 193646,
    "durationSec": 5.184,
    "width": 412,
    "height": 720
  },
  "/samples/clips/phone-crosswalk.mp4": {
    "bytes": 396856,
    "durationSec": 5.184,
    "width": 412,
    "height": 720
  },
  "/samples/clips/stock-table.mp4": {
    "bytes": 3837415,
    "durationSec": 5.184,
    "width": 768,
    "height": 1344
  },
  "/samples/clips/stock-walk.mp4": {
    "bytes": 5168333,
    "durationSec": 5.184,
    "width": 768,
    "height": 1344
  },
  "/samples/clips/street-noon.mp4": {
    "bytes": 434211,
    "durationSec": 5.184,
    "width": 720,
    "height": 412
  },
  "/samples/clips/talking-owner.mp4": {
    "bytes": 176854,
    "durationSec": 5.184,
    "width": 412,
    "height": 720
  },
  "/samples/dance-transfer/person.png": {
    "bytes": 916592,
    "width": 608,
    "height": 1088
  },
  "/samples/dance-transfer/preview.mp4": {
    "bytes": 415809,
    "durationSec": 10.144,
    "width": 412,
    "height": 720
  },
  "/samples/dance-transfer/thumb.png": {
    "bytes": 821041,
    "width": 608,
    "height": 1088
  },
  "/samples/event-notice/preview.mp4": {
    "bytes": 311095,
    "durationSec": 8,
    "width": 412,
    "height": 720
  },
  "/samples/event-notice/store.png": {
    "bytes": 1074618,
    "width": 608,
    "height": 1088
  },
  "/samples/event-notice/thumb.png": {
    "bytes": 619309,
    "width": 608,
    "height": 1088
  },
  "/samples/fashion-campaign/logo.png": {
    "bytes": 727199,
    "width": 1024,
    "height": 1024
  },
  "/samples/fashion-campaign/preview.mp4": {
    "bytes": 538408,
    "durationSec": 12.256,
    "width": 720,
    "height": 412
  },
  "/samples/fashion-campaign/product.png": {
    "bytes": 1409891,
    "width": 1024,
    "height": 1024
  },
  "/samples/fashion-campaign/talent.png": {
    "bytes": 712628,
    "width": 608,
    "height": 1088
  },
  "/samples/fashion-campaign/thumb.png": {
    "bytes": 1115643,
    "width": 608,
    "height": 1088
  },
  "/samples/gate/flyer-dense.png": {
    "bytes": 1179490,
    "width": 1080,
    "height": 1528
  },
  "/samples/gate/store-sign.png": {
    "bytes": 1639760,
    "width": 608,
    "height": 1088
  },
  "/samples/hand-drawn-fx/preview.mp4": {
    "bytes": 248673,
    "durationSec": 5.184,
    "width": 720,
    "height": 412
  },
  "/samples/hand-drawn-fx/thumb.png": {
    "bytes": 836384,
    "width": 608,
    "height": 1088
  },
  "/samples/korean-typo/preview.mp4": {
    "bytes": 282880,
    "durationSec": 8,
    "width": 720,
    "height": 412
  },
  "/samples/korean-typo/thumb.png": {
    "bytes": 760893,
    "width": 608,
    "height": 1088
  },
  "/samples/landing-motion/hero.png": {
    "bytes": 1098455,
    "width": 1024,
    "height": 1024
  },
  "/samples/landing-motion/preview.mp4": {
    "bytes": 567567,
    "durationSec": 10.144,
    "width": 720,
    "height": 412
  },
  "/samples/landing-motion/thumb.png": {
    "bytes": 857477,
    "width": 608,
    "height": 1088
  },
  "/samples/macro-cut/beans.png": {
    "bytes": 1338028,
    "width": 1024,
    "height": 1024
  },
  "/samples/macro-cut/crema.png": {
    "bytes": 1598761,
    "width": 1024,
    "height": 1024
  },
  "/samples/macro-cut/thumb.png": {
    "bytes": 1349406,
    "width": 608,
    "height": 1088
  },
  "/samples/meme-recreate/character.png": {
    "bytes": 1187844,
    "width": 1024,
    "height": 1024
  },
  "/samples/meme-recreate/preview.mp4": {
    "bytes": 315282,
    "durationSec": 8,
    "width": 720,
    "height": 412
  },
  "/samples/meme-recreate/thumb.png": {
    "bytes": 1317415,
    "width": 608,
    "height": 1088
  },
  "/samples/menu-spotlight/food.png": {
    "bytes": 1217503,
    "width": 1024,
    "height": 1024
  },
  "/samples/menu-spotlight/preview.mp4": {
    "bytes": 392758,
    "durationSec": 8,
    "width": 412,
    "height": 720
  },
  "/samples/menu-spotlight/thumb.png": {
    "bytes": 798594,
    "width": 608,
    "height": 1088
  },
  "/samples/mock/clip.mp4": {
    "bytes": 991017,
    "durationSec": 10,
    "width": 640,
    "height": 360
  },
  "/samples/mock/result.mp4": {
    "bytes": 991017,
    "durationSec": 10,
    "width": 640,
    "height": 360
  },
  "/samples/mock/voice.wav": {
    "bytes": 132344,
    "durationSec": 3
  },
  "/samples/owner-greeting/owner.png": {
    "bytes": 1019889,
    "width": 608,
    "height": 1088
  },
  "/samples/owner-greeting/preview.mp4": {
    "bytes": 254012,
    "durationSec": 10.144,
    "width": 412,
    "height": 720
  },
  "/samples/owner-greeting/thumb.png": {
    "bytes": 1058844,
    "width": 608,
    "height": 1088
  },
  "/samples/pop-out/poster.png": {
    "bytes": 127462,
    "width": 1080,
    "height": 1350
  },
  "/samples/pop-out/thumb.png": {
    "bytes": 882048,
    "width": 608,
    "height": 1088
  },
  "/samples/poster-motion/poster.png": {
    "bytes": 1809443,
    "width": 1080,
    "height": 1350
  },
  "/samples/poster-motion/preview.mp4": {
    "bytes": 235459,
    "durationSec": 8,
    "width": 540,
    "height": 720
  },
  "/samples/poster-motion/thumb.png": {
    "bytes": 1051405,
    "width": 608,
    "height": 1088
  },
  "/samples/product-360/detail.png": {
    "bytes": 1392500,
    "width": 1024,
    "height": 1024
  },
  "/samples/product-360/preview.mp4": {
    "bytes": 376348,
    "durationSec": 10.144,
    "width": 720,
    "height": 412
  },
  "/samples/product-360/product.png": {
    "bytes": 1009341,
    "width": 1024,
    "height": 1024
  },
  "/samples/product-360/thumb.png": {
    "bytes": 876691,
    "width": 608,
    "height": 1088
  },
  "/samples/relight/preview.mp4": {
    "bytes": 262477,
    "durationSec": 5.184,
    "width": 720,
    "height": 412
  },
  "/samples/relight/thumb.png": {
    "bytes": 1321280,
    "width": 608,
    "height": 1088
  },
  "/samples/season-swap/preview.mp4": {
    "bytes": 385180,
    "durationSec": 8,
    "width": 412,
    "height": 720
  },
  "/samples/season-swap/thumb.png": {
    "bytes": 1298465,
    "width": 608,
    "height": 1088
  },
  "/samples/store-promo/preview.mp4": {
    "bytes": 599149,
    "durationSec": 15.104,
    "width": 412,
    "height": 720
  },
  "/samples/store-promo/product.png": {
    "bytes": 1588023,
    "width": 1024,
    "height": 1024
  },
  "/samples/store-promo/store.png": {
    "bytes": 1282646,
    "width": 608,
    "height": 1088
  },
  "/samples/store-promo/thumb.png": {
    "bytes": 973633,
    "width": 608,
    "height": 1088
  },
  "/samples/style-transform/preview.mp4": {
    "bytes": 235466,
    "durationSec": 6.592,
    "width": 720,
    "height": 720
  },
  "/samples/style-transform/subject.png": {
    "bytes": 1273726,
    "width": 1024,
    "height": 1024
  },
  "/samples/style-transform/thumb.png": {
    "bytes": 1017876,
    "width": 608,
    "height": 1088
  },
  "/samples/voice-clone-dub/preview.mp4": {
    "bytes": 161177,
    "durationSec": 5.184,
    "width": 412,
    "height": 720
  },
  "/samples/voice-clone-dub/thumb.png": {
    "bytes": 922960,
    "width": 608,
    "height": 1088
  },
  "/samples/voice/korean-greeting.wav": {
    "bytes": 307140,
    "durationSec": 6.397125
  },
  "/samples/wear-swap/preview.mp4": {
    "bytes": 280372,
    "durationSec": 5.184,
    "width": 412,
    "height": 720
  },
  "/samples/wear-swap/product.png": {
    "bytes": 1110346,
    "width": 1024,
    "height": 1024
  },
  "/samples/wear-swap/thumb.png": {
    "bytes": 997286,
    "width": 608,
    "height": 1088
  }
};
