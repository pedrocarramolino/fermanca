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
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "práctica musical",
    "seguimiento de práctica",
    "temporizador de práctica",
    "instrumento musical",
    "rachas de práctica",
    "objetivos de práctica",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
  appleWebApp: {
    capable: true,
    // "default" pinta la barra de estado de iOS blanca siempre, sin
    // importar el tema de la app. "black" (sólida) se probó después, pero
    // seguía viéndose gris — el problema real no era la translucidez en sí,
    // sino que el fondo de la propia página aún no estaba en oscuro cuando
    // se pintaba ese primer fotograma (ver el className de <html> más abajo,
    // ahora resuelto en el servidor). Con eso arreglado, "black-translucent"
    // es la opción correcta: dejar ver el contenido real de la app en vez de
    // una barra de color fijo que nunca encaja en los dos temas a la vez.
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
      // Si el usuario tiene un tema explícito guardado (no "system"), se
      // pinta ya en el HTML del servidor en vez de esperar al script anti-
      // flash de <head> — ese script evita el flash en una pestaña normal,
      // pero en el arranque de la PWA instalada (justo cuando se ve
      // LaunchAnimation) parece llegar tarde: se veía un instante en tema
      // claro, y la barra de estado "black-translucent" mezclada con ese
      // fondo claro es lo que se veía como gris.
      className={cn(
        "font-sans",
        geist.variable,
        geistMono.variable,
        settings?.theme === "dark" && "dark",
      )}
      style={glassVars}
      suppressHydrationWarning
    >
      <head>
        {/* Evita el flash de tema incorrecto antes del primer pintado —
            reemplaza al script que antes inyectaba next-themes como elemento
            de React (ver theme-provider.tsx): ese vivía dentro del árbol que
            React hidrata en <body> y provocaba un error de hidratación en
            cada carga. Este es HTML estático del propio Server Component, no
            se hidrata como elemento — no puede chocar con nada del lado del
            cliente. El propio <html> de arriba ya cubre server-side el caso
            "dark" explícito; este script solo hace falta para el caso
            "system" con el sistema operativo en oscuro, que no se puede
            saber en el servidor. */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme")||${JSON.stringify(settings?.theme ?? "system")};var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"}catch(e){}})();`,
          }}
        />
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
