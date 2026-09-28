# Mokgong (목공)

브라우저에서 끝내는 파일 작업 도구 모음.

## 소개

Mokgong은 설치·가입 없이 브라우저 안에서 파일을 처리하는 유틸리티 모음입니다.
파일이 서버로 전송되지 않아 프라이버시가 보호됩니다.
현재 **Image / PDF / Video** 카테고리를 지원합니다.

## 지원 도구

### Image (7)
- Crop — 원하는 비율로 잘라내기
- Resize — 크기 조절 (px·%)
- Compress — 용량 줄이기 (시각적 손실 최소)
- Convert — PNG ↔ JPG ↔ WebP
- Background remove — 배경 자동 제거
- Watermark — 텍스트·이미지 워터마크
- Downsample — 해상도 축소

### PDF (6)
- Merge — 여러 PDF를 하나로
- Split — 페이지 단위로 분리
- Delete pages — 특정 페이지 제거
- Crop pages — 여백 잘라내기
- Rotate — 90 / 180° 회전
- Compress — 용량 줄이기 (BETA)

### Video (5) — BETA
- MP4 → GIF — 영상을 움짤로
- Trim — 구간 자르기
- Crop — 프레임 자르기
- Resize — 해상도 조절
- Mute — 오디오 제거

## 기술 스택

- **Framework**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **처리 라이브러리**:
  - `pdf-lib` — PDF 생성·편집
  - `pdfjs-dist` — PDF 렌더링
  - `browser-image-compression` — 이미지 압축
  - `@ffmpeg/ffmpeg` — 동영상 처리 (WASM)

## 개발

```bash
npm install
npm run dev
npm run build
```

## CI

GitHub Actions 워크플로우가 `main` 브랜치 및 PR에서 `lint`와 `build`를 자동 실행합니다.

## 배포

Vercel로 배포합니다.
`next.config.ts`에 COOP/COEP 헤더가 설정되어 있습니다 (FFmpeg WASM이 SharedArrayBuffer를 요구).

## 라이선스

MIT
