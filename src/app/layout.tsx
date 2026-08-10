import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { RegisterServiceWorker } from "@/components/register-service-worker";
import { InstallPromptBanner } from "@/components/install-prompt-banner";
import { NotificationPromptDialog } from "@/components/notification-prompt-dialog";
import { LaunchAnimation } from "@/components/launch-animation";
import { BottomNav } from "@/components/bottom-nav";
import { ThemeProvider } from "@/components/theme-provider";
import {
  getAuthenticatedUser,
  getCurrentUserSettings,
} from "@/core/infrastructure/supabase/current-user";
import {
  accentOverrideCss,
  accentOverrideCssFromHex,
  isAccentPreset,
} from "@/features/settings/lib/accent-presets";
import type { UserSettings } from "@/core/domain/user-settings";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteConfig.shortName,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: siteConfig.themeColor,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await getAuthenticatedUser();

  // El layout raíz envuelve TODA la app, incluidas las páginas públicas de
  // login/registro: un fallo aquí (p. ej. Supabase caído) no debe tumbar la
  // app entera solo por no poder leer tema/acento — se degrada a los valores
  // por defecto en vez de propagar el error.
  let settings: UserSettings | null = null;
  if (userId) {
    try {
      settings = await getCurrentUserSettings();
    } catch {
      settings = null;
    }
  }

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      data-style={settings?.visualStyle ?? "classic"}
      className={cn("font-sans", geist.variable, geistMono.variable)}
      suppressHydrationWarning
    >
      <head>
        {settings && settings.accentColor && (
          <style
            dangerouslySetInnerHTML={{
              __html: isAccentPreset(settings.accentColor)
                ? accentOverrideCss(settings.accentColor)
                : accentOverrideCssFromHex(settings.accentColor),
            }}
          />
        )}
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider defaultTheme={settings?.theme ?? "system"}>
            {children}
            {userId && <BottomNav />}
            {userId && <NotificationPromptDialog />}
            <RegisterServiceWorker />
            <InstallPromptBanner />
            <LaunchAnimation />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
