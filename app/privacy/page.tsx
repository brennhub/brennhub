"use client";

import Link from "next/link";
import { useMessages } from "@/lib/i18n/provider";

export default function PrivacyPage() {
  const t = useMessages();
  const p = t.privacy;
  const c = p.collection;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pt-10 pb-20">
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        {t.toolCommon.back}
      </Link>

      <header className="mt-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {p.title}
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {p.lastUpdated}
        </p>
        <p className="mt-4 text-zinc-700 leading-relaxed dark:text-zinc-300">
          {p.intro}
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {c.heading}
        </h2>
        <p className="mt-2 text-sm text-zinc-700 leading-relaxed dark:text-zinc-300">
          {c.description}
        </p>

        <div className="mt-4 hidden sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2 pr-4 text-left font-medium text-zinc-700 dark:text-zinc-200">
                  {c.columns.item}
                </th>
                <th className="py-2 pr-4 text-left font-medium text-zinc-700 dark:text-zinc-200">
                  {c.columns.source}
                </th>
                <th className="py-2 pr-4 text-left font-medium text-zinc-700 dark:text-zinc-200">
                  {c.columns.purpose}
                </th>
                <th className="py-2 text-left font-medium text-zinc-700 dark:text-zinc-200">
                  {c.columns.retention}
                </th>
              </tr>
            </thead>
            <tbody>
              {c.rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                >
                  <td className="py-3 pr-4 align-top font-medium text-zinc-900 dark:text-zinc-100">
                    {row.item}
                  </td>
                  <td className="py-3 pr-4 align-top text-zinc-600 dark:text-zinc-400">
                    {row.source}
                  </td>
                  <td className="py-3 pr-4 align-top text-zinc-600 dark:text-zinc-400">
                    {row.purpose}
                  </td>
                  <td className="py-3 align-top text-zinc-600 dark:text-zinc-400">
                    {row.retention}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="mt-4 space-y-3 sm:hidden">
          {c.rows.map((row, i) => (
            <li
              key={i}
              className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                {row.item}
              </div>
              <dl className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                <div>
                  <dt className="inline font-medium">{c.columns.source}: </dt>
                  <dd className="inline">{row.source}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">{c.columns.purpose}: </dt>
                  <dd className="inline">{row.purpose}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">
                    {c.columns.retention}:{" "}
                  </dt>
                  <dd className="inline">{row.retention}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </section>

      <Section heading={p.purpose.heading} body={p.purpose.body} />
      <Section heading={p.retention.heading} body={p.retention.body} />
      <Section heading={p.thirdParty.heading} body={p.thirdParty.body} />
      <Section heading={p.rights.heading} body={p.rights.body} />

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {p.contact.heading}
        </h2>
        <p className="mt-2 text-zinc-700 leading-relaxed dark:text-zinc-300">
          {p.contact.body}
        </p>
        <p className="mt-2">
          <a
            href={`mailto:${p.contact.email}`}
            className="text-zinc-900 underline hover:no-underline dark:text-zinc-100"
          >
            {p.contact.email}
          </a>
        </p>
      </section>
    </main>
  );
}

function Section({ heading, body }: { heading: string; body: string }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {heading}
      </h2>
      <p className="mt-2 text-zinc-700 leading-relaxed dark:text-zinc-300">
        {body}
      </p>
    </section>
  );
}
