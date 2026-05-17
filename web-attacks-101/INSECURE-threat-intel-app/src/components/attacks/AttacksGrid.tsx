import { useState } from "react";
import type { AttackScenario } from "../../lib/attacks";
import AttackNotesDialog from "./AttackNotesDialog";

type Props = {
  attacks: AttackScenario[];
};

export default function AttacksGrid({ attacks }: Props) {
  const [active, setActive] = useState<AttackScenario | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {attacks.map((attack) => (
          <article
            key={attack.slug}
            className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-amber-400/90">
              {attack.tactic}
            </p>
            <h2 className="mt-2 text-base font-medium text-zinc-100">{attack.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">
              {attack.summary}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href={attack.labPath}
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm font-medium text-amber-100 transition-colors hover:bg-amber-500/20"
              >
                Open lab
              </a>
              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  href={`/attacks/${attack.slug}`}
                  className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-center text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.08]"
                >
                  View guide
                </a>
                <button
                  type="button"
                  className="flex-1 rounded-lg border border-sky-500/25 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-200 transition-colors hover:bg-sky-500/20"
                  onClick={() => setActive(attack)}
                >
                  Open notes
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {active && (
        <AttackNotesDialog
          slug={active.slug}
          title={active.title}
          open={Boolean(active)}
          onClose={() => setActive(null)}
        />
      )}
    </>
  );
}
