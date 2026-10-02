import React, { useEffect, useRef, useState } from "react";
import { Terminal, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AsciiArtEffectProps {
  mode?: "rotatingCube" | "cyberBanner" | "streamMatrix";
  textColor?: string;
  className?: string;
}

export function AsciiArtEffect({
  mode = "rotatingCube",
  textColor = "#ffffff",
  className,
}: AsciiArtEffectProps) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const [output, setOutput] = useState("");

  useEffect(() => {
    let animFrame: number;

    if (mode === "rotatingCube") {
      let A = 0;
      let B = 0;

      const renderCube = () => {
        A += 0.04;
        B += 0.03;

        const width = 44;
        const height = 24;
        const zBuffer = new Array(width * height).fill(0);
        const b = new Array(width * height).fill(" ");

        const calculateX = (i: number, j: number, k: number) =>
          j * Math.sin(A) * Math.sin(B) * Math.cos(0) -
          k * Math.cos(A) * Math.sin(B) * Math.cos(0) +
          j * Math.cos(A) * Math.sin(0) +
          k * Math.sin(A) * Math.sin(0) +
          i * Math.cos(B) * Math.cos(0);

        const calculateY = (i: number, j: number, k: number) =>
          j * Math.cos(A) * Math.cos(0) +
          k * Math.sin(A) * Math.cos(0) -
          j * Math.sin(A) * Math.sin(B) * Math.sin(0) +
          k * Math.cos(A) * Math.sin(B) * Math.sin(0) -
          i * Math.cos(B) * Math.sin(0);

        const calculateZ = (i: number, j: number, k: number) =>
          -j * Math.sin(A) * Math.cos(B) +
          k * Math.cos(A) * Math.cos(B) +
          i * Math.sin(B);

        const calculateForSurface = (
          cubeX: number,
          cubeY: number,
          cubeZ: number,
          ch: string
        ) => {
          const x = calculateX(cubeX, cubeY, cubeZ);
          const y = calculateY(cubeX, cubeY, cubeZ);
          const z = calculateZ(cubeX, cubeY, cubeZ) + 40;

          const ooz = 1 / z;
          const xp = Math.floor(width / 2 + 20 * ooz * x * 2);
          const yp = Math.floor(height / 2 + 20 * ooz * y);
          const idx = xp + yp * width;

          if (idx >= 0 && idx < width * height) {
            if (ooz > zBuffer[idx]) {
              zBuffer[idx] = ooz;
              b[idx] = ch;
            }
          }
        };

        const size = 12;
        for (let cubeX = -size; cubeX < size; cubeX += 1.8) {
          for (let cubeY = -size; cubeY < size; cubeY += 1.8) {
            calculateForSurface(cubeX, cubeY, -size, "@");
            calculateForSurface(size, cubeY, cubeX, "$");
            calculateForSurface(-size, cubeY, -cubeX, "~");
            calculateForSurface(-cubeX, cubeY, size, "#");
            calculateForSurface(cubeX, -size, -cubeY, ";");
            calculateForSurface(cubeX, size, cubeY, "+");
          }
        }

        let res = "";
        for (let i = 0; i < width * height; i++) {
          res += i % width === 0 && i !== 0 ? "\n" : b[i];
        }

        setOutput(res);
        animFrame = requestAnimationFrame(renderCube);
      };

      renderCube();
    } else if (mode === "cyberBanner") {
      const banner = [
        "███████╗███████╗███████╗██╗  ██╗",
        "██╔════╝██╔════╝██╔════╝╚██╗██╔╝",
        "█████╗  █████╗  █████╗   ╚███╔╝ ",
        "██╔══╝  ██╔══╝  ██╔══╝   ██╔██╗ ",
        "██║     ███████╗███████╗██╔╝ ██╗",
        "╚═╝     ╚══════╝╚══════╝╚═╝  ╚═╝",
        "=== LIVING WORLD MODEL INTELLIGENCE ===",
      ].join("\n");
      setOutput(banner);
    } else {
      // Matrix stream
      let step = 0;
      const chars = "0101FEEXSYSTEMSSHA256";
      const interval = setInterval(() => {
        step++;
        let res = "";
        for (let r = 0; r < 14; r++) {
          for (let c = 0; c < 38; c++) {
            res += chars[(r * 38 + c + step) % chars.length];
          }
          res += "\n";
        }
        setOutput(res);
      }, 90);
      return () => clearInterval(interval);
    }

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [mode]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "relative rounded-xl bg-black/90 border border-white/15 p-4 font-mono shadow-2xl overflow-hidden select-none",
        className
      )}
    >
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-white" />
          <span className="font-bold text-white tracking-wider">ASCII ENGINE</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/20 text-white">
            {mode}
          </span>
        </div>
        <button
          onClick={copyToClipboard}
          className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          aria-label="Copy ASCII output"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-gray-300" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      <pre
        ref={preRef}
        className="text-[10px] sm:text-xs leading-[1.1] font-mono whitespace-pre overflow-x-auto text-center py-2"
        style={{ color: textColor, textShadow: `0 0 8px ${textColor}66` }}
      >
        {output}
      </pre>
    </div>
  );
}

export default AsciiArtEffect;
