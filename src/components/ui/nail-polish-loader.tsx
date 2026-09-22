import { cn } from "@/lib/utils";

interface NailPolishLoaderProps {
  className?: string;
  size?: number;
  color?: string;
}

/**
 * Loader em formato de frasco de esmalte que enche de baixo para cima.
 * Substitui o spinner padrão em telas de carregamento.
 */
export function NailPolishLoader({
  className,
  size = 48,
  color = "#b0486e",
}: NailPolishLoaderProps) {
  return (
    <div
      className={cn("inline-flex items-center justify-center", className)}
      style={{ width: size, height: size * 1.5 }}
      role="status"
      aria-label="Carregando"
    >
      <svg
        viewBox="0 0 40 60"
        width={size}
        height={size * 1.5}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Tampa */}
        <rect x="13" y="2" width="14" height="14" rx="2" fill={color} />
        {/* Gargalo */}
        <rect x="16" y="16" width="8" height="6" fill={color} opacity="0.7" />
        {/* Frasco (contorno) */}
        <rect
          x="6"
          y="22"
          width="28"
          height="34"
          rx="4"
          stroke={color}
          strokeWidth="2"
          fill="white"
        />
        {/* Máscara para conter o líquido dentro do frasco */}
        <defs>
          <clipPath id="bottle-clip">
            <rect x="7" y="23" width="26" height="32" rx="3" />
          </clipPath>
        </defs>
        {/* Líquido enchendo */}
        <g clipPath="url(#bottle-clip)">
          <rect
            x="7"
            y="23"
            width="26"
            height="32"
            fill={color}
            style={{
              transformOrigin: "center bottom",
              animation: "polish-fill 1.8s ease-in-out infinite",
            }}
          />
        </g>
      </svg>
      <style>{`
        @keyframes polish-fill {
          0% { transform: translateY(32px); }
          50% { transform: translateY(4px); }
          100% { transform: translateY(32px); }
        }
      `}</style>
    </div>
  );
}