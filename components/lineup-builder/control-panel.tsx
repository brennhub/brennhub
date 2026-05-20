"use client";

import { Button } from "@/components/ui/button";
import { useMessages } from "@/lib/i18n/provider";
import type { FormationId } from "@/lib/lineup-builder/types";
import { FormationSelect } from "./formation-select";

type Props = {
  formationId: FormationId;
  onFormationChange: (id: FormationId) => void;
  onDownload: () => void;
  onReset: () => void;
  downloading: boolean;
};

export function ControlPanel({
  formationId,
  onFormationChange,
  onDownload,
  onReset,
  downloading,
}: Props) {
  const t = useMessages().lineupBuilder;
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <FormationSelect value={formationId} onChange={onFormationChange} />
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="w-full"
        >
          {downloading ? t.downloadingButton : t.downloadButton}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          className="w-full"
        >
          {t.resetButton}
        </Button>
      </div>
    </div>
  );
}
