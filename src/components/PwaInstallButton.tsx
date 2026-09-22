import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaInstallButtonProps {
  className?: string;
}

function isIosDevice() {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function PwaInstallButton({ className }: PwaInstallButtonProps) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [installed, setInstalled] = useState(() => isStandalone());
  const ios = isIosDevice();

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (ios) {
      setShowIosInstructions(true);
      return;
    }

    if (!installPrompt) return;

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
    }
    setInstallPrompt(null);
  };

  if (installed || (!ios && !installPrompt)) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-white/80 px-3 py-2 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur-md transition-all duration-200 hover:scale-[1.02] hover:border-primary/30 hover:bg-primary/5 hover:text-primary active:scale-[0.98] cursor-pointer",
          className,
        )}
        title="Instalar aplicativo"
      >
        <Plus className="h-3.5 w-3.5" />
        Instalar app
      </button>

      <Dialog open={showIosInstructions} onOpenChange={setShowIosInstructions}>
        <DialogContent className="max-w-sm rounded-3xl p-7">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-primary">Adicionar à tela de início</DialogTitle>
            <DialogDescription className="pt-2 leading-relaxed">
              Para usar como aplicativo no iPhone, toque no botão Compartilhar do Safari e escolha <strong>Adicionar à Tela de Início</strong>.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowIosInstructions(false)} className="mt-2 rounded-full">
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
