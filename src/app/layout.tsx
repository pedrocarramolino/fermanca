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
import { LiquidGlassFilter } from "@/components/liquid-glass-filter";
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
    // "default" pinta la barra de estado de iOS blanca siempre, sin
    // importar el tema de la app — con la app instalada en modo oscuro se
    // veía una franja blanca arriba del todo hasta que el resto del
    // contenido terminaba de pintar. "black-translucent" la hace
    // transparente y deja ver el propio fondo (ya correcto según el tema);
    // el padding-top de body en globals.css evita que el contenido quede
    // debajo del notch/Dynamic Island.
    statusBarStyle: "black-translucent",
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

  // Traduce el 0-100 guardado a las variables CSS que consumen los
  // `glass:`-utilities (ver globals.css): a más intensidad, más blur y más
  // translúcido; 100% reproduce el aspecto original fijo del efecto.
  const glassIntensity = settings?.glassIntensity ?? 100;
  const glassVars = {
    "--glass-blur": `${Math.round((glassIntensity / 100) * 40)}px`,
    "--glass-alpha-light": `${Math.round(100 - glassIntensity * 0.3)}%`,
    "--glass-alpha-dark": `${Math.round(100 - glassIntensity * 0.5)}%`,
  } as React.CSSProperties;

  return (
    <html
      lang={locale}
      data-style={settings?.visualStyle ?? "classic"}
      className={cn("font-sans", geist.variable, geistMono.variable)}
      style={glassVars}
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
        <LiquidGlassFilter />
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
