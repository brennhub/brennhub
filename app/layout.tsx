import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n/provider";
import { LocaleToggle } from "@/components/locale-toggle";
import { ColorSchemeProvider } from "@/components/color-scheme-provider";
import { CurrencyProvider } from "@/components/currency-provider";
import { FeedbackButton } from "@/components/feedback-button";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginButton } from "@/components/auth/login-button";
import { AuthErrorToast } from "@/components/auth/auth-error-toast";
import { SiteFooter } from "@/components/site-footer";
import { DEFAULT_LOCALE } from "@/lib/i18n/types";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
                <header className="flex justify-end items-center gap-3 px-4 pt-4 sm:px-6">
                  <ThemeToggle />
                  <LocaleToggle />
                  <Suspense fallback={null}>
                    <LoginButton />
                  </Suspense>
                </header>
                <Suspense fallback={null}>
                  <AuthErrorToast />
                </Suspense>
                {children}
                <FeedbackButton />
                <SiteFooter />
              </CurrencyProvider>
            </ColorSchemeProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
