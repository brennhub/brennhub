import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n/provider";
import { LocaleToggle } from "@/components/locale-toggle";
import { ColorSchemeProvider } from "@/components/color-scheme-provider";
import { CurrencyProvider } from "@/components/currency-provider";
import { FeedbackButton } from "@/components/feedback-button";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginButtonClient } from "@/components/auth/login-button-client";
import { AuthErrorToast } from "@/components/auth/auth-error-toast";
import { UserProvider } from "@/components/auth/user-provider";
import { SiteFooter } from "@/components/site-footer";
import { ToolFavoriteButton } from "@/components/hub/tool-favorite-button";
import { ToolLikeButton } from "@/components/hub/tool-like-button";
import { VisitTracker } from "@/components/hub/visit-tracker";
import { DEFAULT_LOCALE } from "@/lib/i18n/types";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { getUserFromHeaders } from "@/lib/auth/session";

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('brennhub-theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — indie tools by brenn`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
    languages: { ko: SITE_URL, en: SITE_URL },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} — indie tools by brenn`,
    description: SITE_DESCRIPTION,
    locale: "ko_KR",
    alternateLocale: ["en_US"],
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} — indie tools by brenn`,
    description: SITE_DESCRIPTION,
  },
};

interface AuthEnv {
  AUTH_DB?: D1Database;
}

// headers() 호출하므로 prerender 불가. force-dynamic으로 Next에 명시적 신호.
// (이전 2-1: try/catch 메시지 필터로 우회 → OpenNext 런타임에서 "Page changed from
// static to dynamic" throw. 신호 차단이 원인이었음. 빌드 경고는 숨기지 말고 원인 해결.)
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 세션 1회 조회 → UserProvider Context + LoginButton에 공유.
  // AUTH_DB 미바인딩/DB 오류 → user=null (로그아웃 상태로 graceful).
  let user = null;
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as unknown as AuthEnv).AUTH_DB;
    if (db) {
      const h = await headers();
      user = await getUserFromHeaders(db, h as unknown as Headers);
    }
  } catch (err) {
    console.error("[layout] session lookup failed:", err);
  }

  return (
    <html
      lang="en"
      data-locale={DEFAULT_LOCALE}
      data-color-scheme="kr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">
        <ThemeProvider>
          <LocaleProvider>
            <ColorSchemeProvider>
              <CurrencyProvider>
                <UserProvider user={user}>
                  <header className="flex justify-end items-center gap-3 px-4 pt-4 sm:px-6">
                    <ThemeToggle />
                    <LocaleToggle />
                    <LoginButtonClient />
                  </header>
                  <Suspense fallback={null}>
                    <AuthErrorToast />
                  </Suspense>
                  {children}
                  <VisitTracker />
                  <ToolLikeButton />
                  <ToolFavoriteButton />
                  <FeedbackButton />
                  <SiteFooter />
                </UserProvider>
              </CurrencyProvider>
            </ColorSchemeProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
