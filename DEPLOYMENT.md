# Vercel 배포 완료 가이드

## 변경 사항

### 1. Serverless API 생성
- `api/index.js`: Vercel Serverless Function으로 API 엔드포인트 제공
- `api/store.js`: 메모리 기반 데이터 저장소 (파일 시스템 대체)
- `api/package.json`: API 함수 의존성

### 2. 설정 파일
- `vercel.json`: 클라이언트 빌드 및 API 라우팅 설정
- `.vercelignore`: 불필요한 파일 제외

## 주의사항

⚠️ **데이터 영속성 제한**
- Vercel Serverless Functions는 메모리 기반이므로 **데이터가 영구 저장되지 않습니다**
- Function이 재시작되면 모든 데이터(설정, 콘텐츠 큐)가 초기화됩니다
- 이미지 업로드 기능은 제거되었습니다 (파일 시스템 쓰기 불가)

## 배포 방법

1. **Vercel에 푸시**
   ```bash
   git add .
   git commit -m "Add Vercel serverless API"
   git push
   ```

2. **Vercel 자동 배포**
   - Vercel이 자동으로 감지하고 배포합니다

## 작동하는 기능
✅ Text 추가
✅ 설정 변경
✅ 애니메이션 재생
✅ 콘텐츠 큐 관리

## 작동하지 않는 기능
❌ 이미지 업로드 (파일 시스템 필요)
❌ 데이터 영속성 (재시작 시 초기화)

## 개선 방안
영구 데이터 저장이 필요하다면:
- **Vercel KV** (Redis 기반)
- **Vercel Postgres**
- **MongoDB Atlas**
등의 외부 데이터베이스 사용을 권장합니다.
