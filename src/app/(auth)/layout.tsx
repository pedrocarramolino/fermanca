import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@/config/site";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-8">
      <span className="font-semibold tracking-tight">{siteConfig.name}</span>
      <Card className="w-full max-w-sm">
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}
