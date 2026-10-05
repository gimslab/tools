import { TOOLS } from '../_tools.js';

/**
 * Cloudflare Pages Functions Handler
 * Dynamic Route: /[tool]/[[path]]
 *
 * 1. /[tool] (trailing slash 없음) 요청 -> /[tool]/ 301 Permanent Redirect
 * 2. /[tool]/* 요청 -> targetOrigin/* 으로 Reverse Proxy Fetch
 * 3. 등록되지 않은 [tool] 요청 -> context.next() 호출 (정적 자산 폴스루)
 */
export async function onRequest(context) {
  const { request, params } = context;
  const toolKey = params.tool;

  // 1. 등록된 도구인지 검증
  const toolConfig = TOOLS[toolKey];
  if (!toolConfig) {
    // 등록되지 않은 경로는 public 정적 파일 또는 다음 라우트로 패스
    return context.next();
  }

  const url = new URL(request.url);

  // 2. Trailing Slash 체크
  // 정확히 /toolKey 로 들어온 경우 (끝에 슬래시가 없는 경우)
  // 상대 경로 에셋(예: ./assets/app.js)이 올바르게 /toolKey/assets/app.js 로 해석되도록 301 리다이렉트
  if (url.pathname === `/${toolKey}`) {
    const redirectUrl = new URL(url.toString());
    redirectUrl.pathname = `/${toolKey}/`;
    return Response.redirect(redirectUrl.toString(), 301);
  }

  // 3. 대상 경로(Subpath) 추출
  // 예: /tickten/ -> /
  // 예: /tickten/assets/index.js -> /assets/index.js
  const prefix = `/${toolKey}`;
  let subPath = url.pathname.slice(prefix.length);
  if (!subPath.startsWith('/')) {
    subPath = `/${subPath}`;
  }

  // 4. 타겟 오리진 URL 조합 (쿼리스트링 유지)
  const targetBase = toolConfig.targetOrigin.replace(/\/+$/, '');
  const targetUrl = new URL(`${targetBase}${subPath}${url.search}`);

  // 5. 프록시 요청 헤더 구성
  const proxyHeaders = new Headers(request.headers);
  proxyHeaders.set('host', targetUrl.host);
  proxyHeaders.set('x-forwarded-host', url.host);
  proxyHeaders.set('x-forwarded-proto', url.protocol.replace(':', ''));

  // 프록시 루프 및 헤더 충돌 방지
  proxyHeaders.delete('cf-ray');
  proxyHeaders.delete('cf-visitor');
  proxyHeaders.delete('cf-connecting-ip');

  const proxyInit = {
    method: request.method,
    headers: proxyHeaders,
    redirect: 'manual', // 리다이렉트 발생 시 Location 헤더 rewrite 처리를 위해 수동 모드 사용
  };

  // GET/HEAD 가 아닌 경우 바디 전달
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    proxyInit.body = request.body;
  }

  try {
    const targetResponse = await fetch(targetUrl.toString(), proxyInit);

    // 6. 응답 헤더 복제 및 가공
    const responseHeaders = new Headers(targetResponse.headers);

    // 리다이렉트 Location 헤더 rewrite (타겟 오리진으로 도메인이 새어나가는 것 방지)
    const location = responseHeaders.get('location');
    if (location && [301, 302, 303, 307, 308].includes(targetResponse.status)) {
      try {
        const locUrl = new URL(location, targetUrl.origin);
        // 타겟 오리진 내부 리다이렉트인 경우 게이트웨이 도메인과 도구 경로로 변환
        if (locUrl.origin === targetUrl.origin) {
          const rewrittenLoc = new URL(`${prefix}${locUrl.pathname}${locUrl.search}`, url.origin);
          responseHeaders.set('location', rewrittenLoc.toString());
        }
      } catch {
        // 상대 경로 Location인 경우
        if (location.startsWith('/')) {
          responseHeaders.set('location', `${prefix}${location}`);
        }
      }
    }

    // 보안 및 게이트웨이 식별 헤더 추가
    responseHeaders.set('x-gimslab-gateway', 'tools-gateway');
    responseHeaders.set('x-gimslab-tool', toolKey);

    return new Response(targetResponse.body, {
      status: targetResponse.status,
      statusText: targetResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify(
        {
          error: 'Gateway Proxy Error',
          tool: toolKey,
          target: targetUrl.toString(),
          message: error.message,
        },
        null,
        2
      ),
      {
        status: 502,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'x-gimslab-gateway': 'tools-gateway',
        },
      }
    );
  }
}
