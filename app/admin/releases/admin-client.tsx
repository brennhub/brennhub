"use client";

/**
 * 새 소식 admin CRUD client. server에서 받은 initialItems로 시작.
 * mutation 후 router.refresh() — server가 D1을 다시 읽어 fresh items 전달.
 */

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useMessages } from "@/lib/i18n/provider";
import type { Release, ReleaseKind } from "@/lib/releases";
import type { AdminRelease } from "@/lib/releases-server";

const KIND_VALUES: readonly ReleaseKind[] = ["new", "improved", "fixed"];

type FormState = {
  id: string;
  date: string;
  tool: string;
  kind: ReleaseKind | "";
  titleKo: string;
  titleEn: string;
  bodyKo: string;
  bodyEn: string;
};

function emptyForm(): FormState {
  return {
    id: "",
    date: "",
    tool: "",
    kind: "",
    titleKo: "",
    titleEn: "",
    bodyKo: "",
    bodyEn: "",
  };
}

function itemToForm(item: AdminRelease): FormState {
  return {
    id: item.id,
    date: item.date,
    tool: item.tool,
    kind: item.kind ?? "",
    titleKo: item.title.ko,
    titleEn: item.title.en,
    bodyKo: item.body.ko,
    bodyEn: item.body.en,
  };
}

function formToRelease(f: FormState): Release {
  return {
    id: f.id.trim(),
    date: f.date,
    tool: f.tool.trim(),
    title: { ko: f.titleKo, en: f.titleEn },
    body: { ko: f.bodyKo, en: f.bodyEn },
    kind: f.kind === "" ? undefined : f.kind,
  };
}

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function AdminReleasesClient({
  initialItems,
  dbError,
}: {
  initialItems: AdminRelease[];
  dbError: string | null;
}) {
  const t = useMessages().admin.releases;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<{
    mode: "add" | "edit";
    original: AdminRelease | null;
    form: FormState;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const items = useMemo(
    () =>
      [...initialItems].sort((a, b) => b.date.localeCompare(a.date)),
    [initialItems],
  );

  const onAdd = () => {
    setActionError(null);
    setFormError(null);
    setEditing({ mode: "add", original: null, form: emptyForm() });
  };

  const onEdit = (item: AdminRelease) => {
    setActionError(null);
    setFormError(null);
    setEditing({ mode: "edit", original: item, form: itemToForm(item) });
  };

  const onCancel = () => {
    setEditing(null);
    setFormError(null);
  };

  const validate = (f: FormState): string | null => {
    if (
      !f.id.trim() ||
      !f.date.trim() ||
      !f.tool.trim() ||
      !f.titleKo.trim() ||
      !f.titleEn.trim() ||
      !f.bodyKo.trim() ||
      !f.bodyEn.trim()
    )
      return t.requiredFields;
    if (!isValidDate(f.date)) return t.invalidDate;
    return null;
  };

  const onSave = () => {
    if (!editing) return;
    const err = validate(editing.form);
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    const release = formToRelease(editing.form);
    const isEdit = editing.mode === "edit";
    const url = isEdit
      ? `/api/admin/releases/${encodeURIComponent(release.id)}`
      : "/api/admin/releases";
    const method = isEdit ? "PUT" : "POST";

    start(async () => {
      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(release),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setFormError(j?.error ?? t.errorSave);
          return;
        }
        setEditing(null);
        router.refresh();
      } catch {
        setFormError(t.errorSave);
      }
    });
  };

  const onDelete = (item: AdminRelease) => {
    setActionError(null);
    const msg =
      item.source === "file" ? t.confirmDeleteFile : t.confirmDelete;
    if (!window.confirm(msg)) return;
    start(async () => {
      try {
        const res = await fetch(
          `/api/admin/releases/${encodeURIComponent(item.id)}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          setActionError(t.errorDelete);
          return;
        }
        router.refresh();
      } catch {
        setActionError(t.errorDelete);
      }
    });
  };

  const onRestore = (item: AdminRelease) => {
    // 파일 entry tombstone 복원 = upsert(파일 원본) → deleted=0.
    setActionError(null);
    const restored: Release = {
      id: item.id,
      date: item.date,
      tool: item.tool,
      title: item.title,
      body: item.body,
      kind: item.kind,
    };
    start(async () => {
      try {
        const res = await fetch(
          `/api/admin/releases/${encodeURIComponent(item.id)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(restored),
          },
        );
        if (!res.ok) {
          setActionError(t.errorSave);
          return;
        }
        router.refresh();
      } catch {
        setActionError(t.errorSave);
      }
    });
  };

  return (
    <div>
      <header className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t.title}
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {items.length} {t.countLabel}
          </span>
          <button
            type="button"
            onClick={onAdd}
            disabled={pending || !!editing}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {t.addNew}
          </button>
        </div>
      </header>

      {dbError && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {dbError}
        </div>
      )}
      {actionError && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {actionError}
        </div>
      )}

      {editing && (
        <ReleaseForm
          state={editing}
          formError={formError}
          pending={pending}
          onChange={(form) =>
            setEditing({ ...editing, form })
          }
          onSave={onSave}
          onCancel={onCancel}
        />
      )}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-800">
          <p className="text-zinc-500 dark:text-zinc-400">{t.empty}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">{t.colDate}</th>
                <th className="px-3 py-2 text-left font-medium">{t.colTool}</th>
                <th className="px-3 py-2 text-left font-medium">{t.colKind}</th>
                <th className="px-3 py-2 text-left font-medium">{t.colTitle}</th>
                <th className="px-3 py-2 text-left font-medium">
                  {t.colSource}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {t.colActions}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={
                    "border-t border-zinc-200 align-top dark:border-zinc-800 " +
                    (item.deleted ? "opacity-50" : "")
                  }
                >
                  <td className="tnum whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {item.date}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-800 dark:text-zinc-200">
                    {item.tool}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {item.kind ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-900 dark:text-zinc-100">
                    <div className="font-medium">{item.title.ko}</div>
                    <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {item.title.en}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs font-medium " +
                        (item.source === "file"
                          ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300")
                      }
                    >
                      {item.source === "file" ? t.sourceFile : t.sourceD1}
                    </span>
                    {item.deleted && (
                      <span
                        className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300"
                        title={t.deletedHint}
                      >
                        {t.tombstoneBadge}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {item.deleted ? (
                      <button
                        type="button"
                        onClick={() => onRestore(item)}
                        disabled={pending}
                        className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-200 disabled:opacity-50 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
                      >
                        {t.restore}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          disabled={pending || !!editing}
                          className="mr-1 rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        >
                          {t.edit}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(item)}
                          disabled={pending}
                          className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
                        >
                          {t.delete}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReleaseForm({
  state,
  formError,
  pending,
  onChange,
  onSave,
  onCancel,
}: {
  state: { mode: "add" | "edit"; original: AdminRelease | null; form: FormState };
  formError: string | null;
  pending: boolean;
  onChange: (form: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const t = useMessages().admin.releases;
  const { form, mode } = state;
  const idLocked = mode === "edit";

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    onChange({ ...form, [k]: v });

  return (
    <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-base font-medium text-zinc-900 dark:text-zinc-50">
        {mode === "add" ? t.formTitleAdd : t.formTitleEdit}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={t.idLabel}
          hint={t.idHint}
          full
        >
          <input
            type="text"
            value={form.id}
            onChange={(e) => set("id", e.target.value)}
            disabled={idLocked}
            placeholder={t.idPlaceholder}
            className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:disabled:bg-zinc-900 dark:disabled:text-zinc-500"
          />
        </Field>
        <Field label={t.dateLabel}>
          <input
            type="text"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            placeholder="2026-05-29"
            className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </Field>
        <Field label={t.toolLabel} hint={t.toolHint}>
          <input
            type="text"
            value={form.tool}
            onChange={(e) => set("tool", e.target.value)}
            placeholder={t.toolPlaceholder}
            className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </Field>
        <Field label={t.kindLabel}>
          <select
            value={form.kind}
            onChange={(e) =>
              set(
                "kind",
                (e.target.value as ReleaseKind | "") ?? "",
              )
            }
            className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="">{t.kindNone}</option>
            {KIND_VALUES.map((k) => (
              <option key={k} value={k}>
                {k === "new"
                  ? t.kindNew
                  : k === "improved"
                    ? t.kindImproved
                    : t.kindFixed}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.titleKoLabel}>
          <input
            type="text"
            value={form.titleKo}
            onChange={(e) => set("titleKo", e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </Field>
        <Field label={t.titleEnLabel}>
          <input
            type="text"
            value={form.titleEn}
            onChange={(e) => set("titleEn", e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </Field>
        <Field label={t.bodyKoLabel} full>
          <textarea
            rows={3}
            value={form.bodyKo}
            onChange={(e) => set("bodyKo", e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </Field>
        <Field label={t.bodyEnLabel} full>
          <textarea
            rows={3}
            value={form.bodyEn}
            onChange={(e) => set("bodyEn", e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </Field>
      </div>

      {formError && (
        <p className="mt-3 text-sm text-red-700 dark:text-red-300">
          {formError}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {t.cancel}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? t.saving : t.save}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  full,
  children,
}: {
  label: string;
  hint?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={"flex flex-col gap-1 " + (full ? "sm:col-span-2" : "")}
    >
      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</span>
      )}
    </label>
  );
}
