import type { Player } from "@/lib/lineup-builder/types";

export function PlayerMarker({ player }: { player: Player }) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ top: `${player.top}%`, left: `${player.left}%` }}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-900 shadow-md ring-1 ring-black/10 sm:h-12 sm:w-12">
        <span className="text-base font-bold tabular-nums sm:text-lg">
          {player.number}
        </span>
      </div>
      <span className="absolute left-1/2 top-full mt-1 max-w-[5.5rem] -translate-x-1/2 truncate rounded bg-black/55 px-1.5 py-0.5 text-center text-[10px] font-medium text-white sm:text-xs">
        {player.name}
      </span>
    </div>
  );
}
