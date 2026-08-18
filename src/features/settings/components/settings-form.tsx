"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import {
  Check,
  Contrast,
  Globe,
  Palette,
  Pipette,
  Play,
  Smartphone,
  Sparkles,
  Timer,
  Vibrate,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMounted } from "@/hooks/use-mounted";
import { updateSettings } from "@/features/settings/application/actions";
import { ACCENT_PRESETS, isAccentPreset } from "@/features/settings/lib/accent-presets";
import {
  playNotificationSound,
  unlockAudio,
  vibrate,
} from "@/features/session-timer/application/sounds";
import type {
  Locale,
  SoundChoice,
  ThemePreference,
  UserSettings,
  VisualStyle,
} from "@/core/domain/user-settings";

const VISUAL_ALERT_OPTIONS = [1500, 3000, 5000, 8000];
const THEME_VALUES: ThemePreference[] = ["light", "dark", "system"];
const LOCALE_VALUES: Locale[] = ["es", "en", "de"];
const VISUAL_STYLE_VALUES: VisualStyle[] = ["classic", "glass", "minimal", "futuristic"];

export function SettingsForm({ initialSettings }: { initialSettings: UserSettings }) {
  const t = useTranslations("Settings");
  const router = useRouter();
  const mounted = useMounted();
  const { theme, setTheme } = useTheme();
  const [, startTransition] = useTransition();

  const [sound, setSound] = useState(initialSettings.sound);
  const [volume, setVolume] = useState(initialSettings.volume);
  const [vibrationEnabled, setVibrationEnabled] = useState(initialSettings.vibrationEnabled);
  const [visualAlertDurationMs, setVisualAlertDurationMs] = useState(
    initialSettings.visualAlertDurationMs,
  );
  const [accentColor, setAccentColor] = useState(initialSettings.accentColor);
  const [locale, setLocale] = useState(initialSettings.locale);
  const [visualStyle, setVisualStyle] = useState(initialSettings.visualStyle);
  const [glassIntensity, setGlassIntensity] = useState(initialSettings.glassIntensity);

  const SOUND_LABELS: Record<SoundChoice, string> = {
    classic: t("sound.options.classic"),
    bell: t("sound.options.bell"),
    metronome: t("sound.options.metronome"),
    piano: t("sound.options.piano"),
    alarm: t("sound.options.alarm"),
    none: t("sound.options.none"),
  };

  const THEME_OPTIONS: { value: ThemePreference; label: string }[] = THEME_VALUES.map(
    (value) => ({ value, label: t(`theme.${value}`) }),
  );

  const LOCALE_OPTIONS: { value: Locale; label: string }[] = LOCALE_VALUES.map((value) => ({
    value,
    label: t(`language.${value}`),
  }));

  const VISUAL_STYLE_OPTIONS: { value: VisualStyle; label: string }[] = VISUAL_STYLE_VALUES.map(
    (value) => ({ value, label: t(`visualStyle.${value}`) }),
  );

  function handleThemeChange(value: ThemePreference) {
    setTheme(value);
    startTransition(() => {
      void updateSettings({ theme: value });
    });
  }

  function handleSoundChange(value: string | null) {
    if (!value) return;
    const next = value as SoundChoice;
    setSound(next);
    startTransition(() => {
      void updateSettings({ sound: next });
    });
  }

  function handleVolumeCommit(value: number) {
    startTransition(() => {
      void updateSettings({ volume: value });
    });
  }

  function handleVibrationChange(checked: boolean) {
    setVibrationEnabled(checked);
    startTransition(() => {
      void updateSettings({ vibrationEnabled: checked });
    });
  }

  function handleVisualAlertChange(value: string | null) {
    if (!value) return;
    const next = Number(value);
    setVisualAlertDurationMs(next);
    startTransition(() => {
      void updateSettings({ visualAlertDurationMs: next });
    });
  }

  function handleAccentChange(value: string) {
    setAccentColor(value);
    startTransition(async () => {
      await updateSettings({ accentColor: value });
      router.refresh();
    });
  }

  function handleVisualStyleChange(value: VisualStyle) {
    setVisualStyle(value);
    startTransition(async () => {
      // Igual que accentColor: se lee en el layout raíz vía un atributo en
      // <html>, en el servidor — sin refresh no se vería el cambio hasta la
      // siguiente navegación.
      await updateSettings({ visualStyle: value });
      router.refresh();
    });
  }

  function handleGlassIntensityCommit(value: number) {
    startTransition(async () => {
      // Igual que visualStyle: las variables --glass-* se inyectan en el
      // servidor (layout raíz), así que hace falta refresh para verlas.
      await updateSettings({ glassIntensity: value });
      router.refresh();
    });
  }

  function handleLocaleChange(value: Locale) {
    setLocale(value);
    startTransition(async () => {
      // El locale se lee en el layout raíz vía next-intl, en el servidor —
      // sin refresh, los textos no cambiarían hasta la siguiente navegación.
      await updateSettings({ locale: value });
      router.refresh();
    });
  }

  async function testSound() {
    await unlockAudio();
    playNotificationSound(sound, volume, visualAlertDurationMs);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Globe className="size-4" aria-hidden />
            {t("language.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {LOCALE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={locale === option.value ? "default" : "outline"}
                size="sm"
                aria-pressed={locale === option.value}
                onClick={() => handleLocaleChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Contrast className="size-4" aria-hidden />
            {t("theme.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {THEME_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={mounted && theme === option.value ? "default" : "outline"}
                size="sm"
                aria-pressed={mounted && theme === option.value}
                onClick={() => handleThemeChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Sparkles className="size-4" aria-hidden />
            {t("visualStyle.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {VISUAL_STYLE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={visualStyle === option.value ? "default" : "outline"}
                size="sm"
                aria-pressed={visualStyle === option.value}
                onClick={() => handleVisualStyleChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          {visualStyle === "glass" && (
            <div className="flex flex-col gap-2">
              <Label>{t("visualStyle.intensity", { value: glassIntensity })}</Label>
              <Slider
                value={[glassIntensity]}
                min={0}
                max={100}
                step={5}
                onValueChange={(value) =>
                  setGlassIntensity(Array.isArray(value) ? value[0]! : value)
                }
                onValueCommitted={(value) =>
                  handleGlassIntensityCommit(Array.isArray(value) ? value[0]! : value)
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Palette className="size-4" aria-hidden />
            {t("accent.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {Object.entries(ACCENT_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                aria-label={preset.label}
                aria-pressed={accentColor === key}
                onClick={() => handleAccentChange(key)}
                className="ring-border ring-offset-background focus-visible:ring-ring/50 relative flex size-9 items-center justify-center rounded-full ring-1 ring-offset-2 transition-transform before:absolute before:-inset-1 before:content-[''] hover:scale-105 focus-visible:ring-3 focus-visible:outline-none"
                style={{ backgroundColor: preset.swatch }}
              >
                {accentColor === key && <Check className="size-4 text-white drop-shadow" />}
              </button>
            ))}
            <div className="relative size-9 shrink-0">
              <input
                type="color"
                value={!accentColor || isAccentPreset(accentColor) ? "#888888" : accentColor}
                onChange={(event) => handleAccentChange(event.target.value)}
                aria-label={t("accent.customColor")}
                className="absolute inset-0 size-9 cursor-pointer opacity-0"
              />
              <div
                aria-hidden
                data-selected={(!!accentColor && !isAccentPreset(accentColor)) || undefined}
                className="ring-border ring-offset-background pointer-events-none flex size-9 items-center justify-center rounded-full ring-1 ring-offset-2 data-[selected]:ring-foreground data-[selected]:ring-2"
                style={{
                  background:
                    accentColor && !isAccentPreset(accentColor)
                      ? accentColor
                      : "conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                }}
              >
                {(!accentColor || isAccentPreset(accentColor)) && (
                  <Pipette className="size-4 text-white drop-shadow" />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Volume2 className="size-4" aria-hidden />
            {t("sound.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="sound-select">{t("sound.label")}</Label>
              <Select value={sound} onValueChange={handleSoundChange}>
                <SelectTrigger id="sound-select" className="w-full">
                  <SelectValue>{SOUND_LABELS[sound]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(SOUND_LABELS) as [SoundChoice, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={testSound}
              aria-label={t("sound.test")}
            >
              <Play className="size-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("sound.volume", { volume })}</Label>
            <Slider
              value={[volume]}
              min={0}
              max={100}
              step={5}
              onValueChange={(value) => setVolume(Array.isArray(value) ? value[0]! : value)}
              onValueCommitted={(value) =>
                handleVolumeCommit(Array.isArray(value) ? value[0]! : value)
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Vibrate className="size-4" aria-hidden />
            {t("vibration.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="vibration-switch">{t("vibration.label")}</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => vibrate(true)}
                aria-label={t("vibration.test")}
              >
                <Smartphone className="size-4" />
              </Button>
              <Switch
                id="vibration-switch"
                checked={vibrationEnabled}
                onCheckedChange={handleVibrationChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Timer className="size-4" aria-hidden />
            {t("alert.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Label htmlFor="alert-select">{t("alert.label")}</Label>
            <Select value={String(visualAlertDurationMs)} onValueChange={handleVisualAlertChange}>
              <SelectTrigger id="alert-select" className="w-full">
                <SelectValue>{`${visualAlertDurationMs / 1000} s`}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {VISUAL_ALERT_OPTIONS.map((ms) => (
                  <SelectItem key={ms} value={String(ms)}>
                    {ms / 1000} s
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
