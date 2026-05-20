import type { Formation } from "@/lib/lineup-builder/types";
import { PlayerMarker } from "./player-marker";

export function Pitch({ formation }: { formation: Formation }) {
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-emerald-600 shadow-inner dark:bg-emerald-800">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, rgba(255,255,255,0.05) 0 20%, rgba(0,0,0,0.05) 20% 40%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-[2.5%] rounded-sm border-2 border-white/70"
      />
      <div
        aria-hidden
        className="absolute left-[2.5%] right-[2.5%] top-1/2 h-0.5 -translate-y-1/2 bg-white/70"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 aspect-square w-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-[2.5%] h-[15%] w-[58%] -translate-x-1/2 border-2 border-white/70"
      />
      <div
        aria-hidden
        className="absolute bottom-[2.5%] left-1/2 h-[15%] w-[58%] -translate-x-1/2 border-2 border-white/70"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-[2.5%] h-[6%] w-[30%] -translate-x-1/2 border-2 border-white/70"
      />
      <div
        aria-hidden
        className="absolute bottom-[2.5%] left-1/2 h-[6%] w-[30%] -translate-x-1/2 border-2 border-white/70"
      />
      {formation.players.map((p) => (
        <PlayerMarker key={p.id} player={p} />
      ))}
    </div>
  );
}
