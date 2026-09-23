import { NextResponse, type NextRequest } from "next/server";
import { UID_COOKIE, makeCookieValue, mintUid, verifyCookieValue } from "@/lib/identity";

/**
 * 방문자마다 서명된 소유자 id 쿠키를 발급한다.
 *
 * 페이지(서버 컴포넌트)는 쿠키를 읽을 수만 있고 설정할 수 없어서, 발급 지점이 한 곳이어야
 * 서버 렌더와 API 가 같은 id 를 본다. 정적 자산은 matcher 에서 뺀다.
 *
 * (Next 16 에서 `middleware` 파일 규약은 `proxy` 로 이름이 바뀌었다 — 동작은 같고 런타임은 nodejs 다.)
 */
export async function proxy(req: NextRequest) {
  if (await verifyCookieValue(req.cookies.get(UID_COOKIE)?.value)) return NextResponse.next();

  const value = await makeCookieValue(mintUid());
  // 이 요청 자체도 새 uid 로 처리되도록 downstream 요청 헤더에 먼저 심는다.
  const requestHeaders = new Headers(req.headers);
  const existing = requestHeaders.get("cookie");
  requestHeaders.set("cookie", existing ? `${existing}; ${UID_COOKIE}=${value}` : `${UID_COOKIE}=${value}`);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.cookies.set({
    name: UID_COOKIE,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|samples/|previews/|refs/).*)"],
};
