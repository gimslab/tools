# GimsLab Tools Gateway (`tools.gimslab.com`)

GimsLab에서 제공하는 다양한 개별 도구(웹 앱)를 `tools.gimslab.com/도구명` 형태의 하위 경로로 통합 제공하는 리버스 프록시 게이트웨이 허브입니다.

---

## 🛠️ 핵심 아키텍처

- **플랫폼**: Cloudflare Pages & Pages Functions
- **루트(`/`)**: GimsLab Tools Hub 랜딩 대시보드 (`public/index.html`)
- **라우팅 & 프록시**: `functions/[tool]/[[path]].js`
  1. **Trailing Slash 처리**: `/tickten` 요청 시 상대 경로 에셋 로드를 위해 `/tickten/`으로 `301 Moved Permanently` 리다이렉트
  2. **Subpath Rewrite & Fetch**: `/tickten/*` 요청 시 앞의 접두사를 제거하고 대상 오리진(`https://tickten.pages.dev/*`)으로 리버스 프록시 fetch 수행
  3. **헤더 관리**: `Host` 헤더 대상 맞춤 교체, 리다이렉트(`Location`) 헤더 rewrite, 게이트웨이 추적 헤더(`x-gimslab-gateway`) 부착

---

## 📂 프로젝트 구조

```text
tools/
├── functions/
│   ├── _tools.js             # 도구별 라우팅 레지스트리 (새 도구 추가 시 여기만 등록)
│   └── [tool]/
│       └── [[path]].js       # 동적 경로 리버스 프록시 & 301 리다이렉트 핸들러
├── public/
│   ├── index.html            # Hub 랜딩 대시보드
│   ├── favicon.svg           # GimsLab Tools 파비콘
│   └── robots.txt
├── scripts/
│   └── test-proxy.js         # 로컬 프록시 검증 자동화 스크립트
├── package.json
└── wrangler.toml             # Cloudflare Pages 설정
```

---

## 🚀 로컬 개발 및 테스트

```bash
# 의존성 설치
npm install

# 로컬 개발 서버 실행 (포트 8788)
npm run dev

# 프록시 및 라우팅 자동 검증 스크립트 실행
npm run test:proxy
```

---

## 🌐 Cloudflare Pages 배포 및 도메인 연결 가이드

### 1. 배포 옵션

#### 방법 A: GitHub 연동 자동 배포 (권장)
1. GitHub에 새 저장소(`gimslab/tools` 또는 `gimslab/tools-gateway`)를 생성하고 코드를 푸시합니다.
2. [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages** > **Create application** > **Pages** > **Connect to Git** 선택.
3. 저장소를 연결하고 아래 빌드 설정을 입력합니다:
   - **Framework preset**: `None`
   - **Build command**: (비워둠)
   - **Build output directory**: `public`
4. **Save and Deploy** 클릭. 배포가 완료되면 `https://tools-gateway.pages.dev`와 같은 Pages 주소가 발급됩니다.

#### 방법 B: Wrangler CLI 직접 배포
```bash
# Cloudflare 로그인
npx wrangler login

# 배포 실행
npm run deploy
```

---

### 2. Custom Domain 및 DNS (Hurricane Electric - `dns.he.net`) 설정

1. **Cloudflare Pages 대시보드**:
   - 생성된 Pages 프로젝트 > **Custom domains** 탭 > **Set up a custom domain** 클릭
   - 도메인 입력: `tools.gimslab.com`
   - 안내되는 CNAME 대상 확인 (예: `tools-gateway.pages.dev`)

2. **Hurricane Electric (`dns.he.net`) DNS 설정**:
   - `gimslab.com` 존(Zone) 관리 화면으로 이동
   - **New CNAME Record** 추가:
     - **Name**: `tools` (또는 `tools.gimslab.com`)
     - **Hostname (Points to)**: `tools-gateway.pages.dev` (Pages 프로젝트 주소)
     - **TTL**: `300` (또는 `3600`)
   - 저장 후 DNS 레코드가 전파되면 Cloudflare Pages에서 자동으로 SSL 인증서 발급 및 활성화 완료.

---

### 3. 신규 도구 추가 방법 (확장성)

새로운 도구(예: `/calc` -> `https://calc.pages.dev`)를 추가할 경우, `functions/_tools.js` 파일에 한 줄만 등록하면 즉시 게이트웨이에 반영됩니다.

```javascript
// functions/_tools.js
export const TOOLS = {
  tickten: {
    name: 'TickTen',
    targetOrigin: 'https://tickten.pages.dev',
    // ...
  },
  // 신규 도구 추가:
  calc: {
    name: 'Gims Calculator',
    targetOrigin: 'https://calc.pages.dev',
  }
};
```
동적 라우터 `functions/[tool]/[[path]].js`가 등록된 키를 자동으로 인식하여 `/calc` 301 리다이렉트 및 `/calc/*` 리버스 프록시를 처리합니다.
