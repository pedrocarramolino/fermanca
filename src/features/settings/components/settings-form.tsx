"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Check, Play, Smartphone } from "lucide-react";
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
import { ACCENT_PRESETS, type AccentPreset } from "@/features/settings/lib/accent-presets";
import {
  playNotificationSound,
  unlockAudio,
  vibrate,
} from "@/features/session-timer/application/sounds";
import type { SoundChoice, ThemePreference, UserSettings } from "@/core/domain/user-settings";

const SOUND_LABELS: Record<SoundChoice, string> = {
  classic: "Clásico",
  bell: "Campana",
  metronome: "Metrónomo",
  piano: "Piano",
  none: "Ninguno",
};

const VISUAL_ALERT_OPTIONS = [1500, 3000, 5000, 8000];

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Sistema" },
];

export function SettingsForm({ initialSettings }: { initialSettings: UserSettings }) {
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

  function handleAccentChange(preset: AccentPreset) {
    setAccentColor(preset);
    startTransition(async () => {
      await updateSettings({ accentColor: preset });
      router.refresh();
    });
  }

  async function testSound() {
    await unlockAudio();
    playNotificationSound(sound, volume);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {THEME_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={mounted && theme === option.value ? "default" : "outline"}
                size="sm"
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
          <CardTitle className="text-base">Color de acento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {(
              Object.entries(ACCENT_PRESETS) as [
                AccentPreset,
                (typeof ACCENT_PRESETS)[AccentPreset],
              ][]
            ).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                aria-label={preset.label}
                onClick={() => handleAccentChange(key)}
                className="ring-border ring-offset-background flex size-9 items-center justify-center rounded-full ring-1 ring-offset-2 transition-transform hover:scale-105"
                style={{ backgroundColor: preset.swatch }}
              >
                {accentColor === key && <Check className="size-4 text-white drop-shadow" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sonido del temporizador</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-2">
              <Label>Sonido</Label>
              <Select value={sound} onValueChange={handleSoundChange}>
                <SelectTrigger className="w-full">
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
              aria-label="Probar sonido"
            >
              <Play className="size-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Volumen: {volume}%</Label>
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
          <CardTitle className="text-base">Vibración</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="vibration-switch">Vibrar al cambiar de bloque</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => vibrate(true)}
                aria-label="Probar vibración"
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
          <CardTitle className="text-base">Aviso visual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Label>Duración en pantalla</Label>
            <Select value={String(visualAlertDurationMs)} onValueChange={handleVisualAlertChange}>
              <SelectTrigger className="w-full">
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
