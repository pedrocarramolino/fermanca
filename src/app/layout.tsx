import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { RegisterServiceWorker } from "@/components/register-service-worker";
import { InstallPromptBanner } from "@/components/install-prompt-banner";
import { BottomNav } from "@/components/bottom-nav";
import { ThemeProvider } from "@/components/theme-provider";
import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseUserSettingsRepository } from "@/core/infrastructure/supabase/repositories/user-settings-repository";
import { accentOverrideCss, isAccentPreset } from "@/features/settings/lib/accent-presets";
import type { UserId } from "@/core/domain/ids";
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
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub as UserId | undefined;

  // El layout raíz envuelve TODA la app, incluidas las páginas públicas de
  // login/registro: un fallo aquí (p. ej. Supabase caído) no debe tumbar la
  // app entera solo por no poder leer tema/acento — se degrada a los valores
  // por defecto en vez de propagar el error.
  let settings: UserSettings | null = null;
  if (userId) {
    try {
      settings = await new SupabaseUserSettingsRepository(supabase).get(userId);
    } catch {
      settings = null;
    }
  }

  return (
    <html
      lang="es"
      className={cn("font-sans", geist.variable, geistMono.variable)}
      suppressHydrationWarning
    >
      <head>
        {settings && isAccentPreset(settings.accentColor) && (
          <style dangerouslySetInnerHTML={{ __html: accentOverrideCss(settings.accentColor) }} />
        )}
      </head>
      <body>
        <ThemeProvider defaultTheme={settings?.theme ?? "system"}>
          {children}
          {userId && <BottomNav />}
          <RegisterServiceWorker />
          <InstallPromptBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
