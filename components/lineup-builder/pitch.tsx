import type { RefObject } from "react";
import type { Player } from "@/lib/lineup-builder/types";
import { PlayerMarker } from "./player-marker";

type Props = {
  players: Player[];
  pitchRef: RefObject<HTMLDivElement | null>;
  onMove: (id: number, top: number, left: number) => void;
  onEdit: (id: number) => void;
};

// 캡처 호환: 색상은 hex / rgba()만 (oklch 토큰·color-mix·CSS 변수 미사용 — html2canvas 1.4.1 한계).
const LINE = "rgba(255,255,255,0.72)";

export function Pitch({ players, pitchRef, onMove, onEdit }: Props) {
  return (
    <div
      ref={pitchRef}
      className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-[#059669] dark:bg-[#065f46]"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, rgba(255,255,255,0.06) 0 20%, rgba(0,0,0,0.06) 20% 40%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-[2.5%] rounded-sm border-2"
        style={{ borderColor: LINE }}
      />
      <div
        aria-hidden
        className="absolute left-[2.5%] right-[2.5%] top-1/2 h-0.5 -translate-y-1/2"
        style={{ backgroundColor: LINE }}
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 aspect-square w-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
        style={{ borderColor: LINE }}
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ backgroundColor: LINE }}
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-[2.5%] h-[15%] w-[58%] -translate-x-1/2 border-2"
        style={{ borderColor: LINE }}
      />
      <div
        aria-hidden
        className="absolute bottom-[2.5%] left-1/2 h-[15%] w-[58%] -translate-x-1/2 border-2"
        style={{ borderColor: LINE }}
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-[2.5%] h-[6%] w-[30%] -translate-x-1/2 border-2"
        style={{ borderColor: LINE }}
      />
      <div
        aria-hidden
        className="absolute bottom-[2.5%] left-1/2 h-[6%] w-[30%] -translate-x-1/2 border-2"
        style={{ borderColor: LINE }}
      />
      {players.map((p) => (
        <PlayerMarker
          key={p.id}
          player={p}
          pitchRef={pitchRef}
          onMove={onMove}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
