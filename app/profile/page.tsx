"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMessages } from "@/lib/i18n/provider";
import { useCurrentUser } from "@/components/auth/user-provider";

export default function ProfilePage() {
  const t = useMessages();
  const tp = t.profile;
  const router = useRouter();
  const user = useCurrentUser();

  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 pt-10 pb-20">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          {t.toolCommon.back}
        </Link>
        <p className="mt-8 text-zinc-700 dark:text-zinc-300">
          {tp.loginRequired}
        </p>
        <a
          href="/api/auth/google/start?return_to=%2Fprofile"
          className="mt-3 inline-block text-sm text-zinc-900 underline hover:no-underline dark:text-zinc-100"
        >
          {tp.loginCta}
        </a>
      </main>
    );
  }

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaveMsg(null);
    setSaveErr(null);
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName }),
      });
      if (!res.ok) {
        setSaveErr(tp.saveError);
      } else {
        setSaveMsg(tp.saved);
        router.refresh(); // 헤더 표시 이름 동기화
      }
    } catch {
      setSaveErr(tp.saveError);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    setDeleteErr(null);
    setDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        setDeleteErr(tp.deleteError);
        setDeleting(false);
        return;
      }
      // 세션 삭제 + cookie clear 완료 → 홈으로 full reload (로그아웃 상태)
      window.location.href = "/";
    } catch {
      setDeleteErr(tp.deleteError);
      setDeleting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-6 pt-10 pb-20">
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        {t.toolCommon.back}
      </Link>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {tp.title}
      </h1>

      {/* 계정 정보 */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {tp.accountInfo}
        </h2>
        <dl className="mt-4 space-y-4">
          <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">
              {tp.email}
            </dt>
            <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">
              {user.email}
            </dd>
          </div>
        </dl>

        <form onSubmit={onSave} className="mt-6">
          <Label htmlFor="display-name" className="text-sm">
            {tp.displayName}
          </Label>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={tp.displayNamePlaceholder}
              maxLength={50}
              disabled={saving}
              className="sm:max-w-xs"
            />
            <Button type="submit" disabled={saving}>
              {saving ? tp.saving : tp.save}
            </Button>
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            {tp.displayNameHint}
          </p>
          {saveMsg && (
            <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
              {saveMsg}
            </p>
          )}
          {saveErr && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {saveErr}
            </p>
          )}
        </form>
      </section>

      {/* 계정 삭제 (danger zone) */}
      <section className="mt-12 rounded-lg border border-red-200 p-5 dark:border-red-900/50">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">
          {tp.dangerZone}
        </h2>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-3 rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            {tp.deleteAccount}
          </button>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-red-700 dark:text-red-300">
              {tp.deleteWarning}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? tp.deleting : tp.deleteConfirm}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {tp.cancel}
              </button>
            </div>
            {deleteErr && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                {deleteErr}
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
