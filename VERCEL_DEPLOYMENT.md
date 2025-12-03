# Vercel 배포 가이드

## 준비사항

### 1. Vercel Blob Storage 설정

1. [Vercel Dashboard](https://vercel.com/dashboard)에 로그인
2. 프로젝트 선택 → **Storage** 탭으로 이동
3. **Create Database** → **Blob** 선택
4. Blob Store 생성 후 **BLOB_READ_WRITE_TOKEN** 복사

### 2. 환경 변수 설정

Vercel 프로젝트 설정에서:

1. **Settings** → **Environment Variables**로 이동
2. 다음 환경 변수 추가:
   - `BLOB_READ_WRITE_TOKEN`: Blob Storage 토큰

## 배포 방법

### GitHub를 통한 자동 배포

1. GitHub 저장소에 코드 푸시:
   ```bash
   git add .
   git commit -m "Add Vercel Blob Storage support"
   git push origin main
   ```

2. Vercel이 자동으로 빌드 및 배포 시작

### Vercel CLI를 통한 배포

```bash
# Vercel CLI 설치 (한 번만)
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

## 로컬 개발

로컬에서 테스트하려면:

1. `.env` 파일 생성:
   ```bash
   cp .env.example .env
   ```

2. `.env` 파일에 토큰 추가:
   ```
   BLOB_READ_WRITE_TOKEN=your_actual_token_here
   ```

3. 개발 서버 실행:
   ```bash
   cd client
   npm run dev
   ```

## 주요 변경사항

- ✅ Vercel Blob Storage를 통한 이미지 업로드
- ✅ Serverless 함수로 API 엔드포인트 구현
- ✅ 하드코딩된 localhost URL 제거
- ✅ CORS 및 파일 업로드 처리 개선

## 문제 해결

### 이미지 업로드가 실패하는 경우

1. `BLOB_READ_WRITE_TOKEN`이 올바르게 설정되었는지 확인
2. Vercel Dashboard에서 Blob Storage가 생성되었는지 확인
3. 파일 크기가 5MB 이하인지 확인 (현재 제한)

### 텍스트가 추가되지 않는 경우

1. 브라우저 콘솔에서 API 요청 에러 확인
2. Vercel 함수 로그 확인: `vercel logs`

### 배포 후 데이터가 사라지는 경우

현재 구현은 메모리 기반 스토리지를 사용합니다. Serverless 함수는 콜드 스타트마다 초기화되므로, 데이터가 유지되지 않습니다. 영구 데이터 저장이 필요한 경우 데이터베이스(MongoDB, PostgreSQL 등) 통합을 고려하세요.
