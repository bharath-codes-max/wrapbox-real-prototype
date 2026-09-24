// Live Action Stream — human-readable real-time chain with full filtering.
import { useAppState, metrics } from "../state/store";
import { PageHead, SimNote, Stat, SectionHead } from "../ui/kit";
import { EventStream } from "../ui/event-stream";
import { CheckCircle2, Shuffle, Hand, ShieldX } from "lucide-react";

export function LiveActions({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const m = metrics(s);
  return (
    <div className="page page-wide">
      <PageHead
        eyebrow="Activity"
        title="Live Actions"
        sub="Every consequential action across Endpoint, Network and Gateway — user → agent → tool → action → resource → decision. Click any row for full evidence."
        right={<SimNote />}
      />

      <div className="grid g4">
        <Stat icon={<CheckCircle2 size={17} />} label="Allowed" value={m.counts.ALLOW} tone="good" note="normal work flowed automatically" />
        <Stat icon={<Shuffle size={17} />} label="Constrained" value={m.counts.CONSTRAIN} tone="info" note={`${m.transfersTransformed} sensitive transfer(s) transformed`} />
        <Stat icon={<Hand size={17} />} label="Reviewed" value={m.counts.REVIEW} tone="warn" note="exceptions escalated to humans" />
        <Stat icon={<ShieldX size={17} />} label="Blocked" value={m.counts.BLOCK} tone="bad" note="stopped before execution" />
      </div>

      <div className="section">
        <SectionHead
          title="Action stream"
          sub={`${m.total} consequential action${m.total === 1 ? "" : "s"} recorded, newest first — filter by agent, user, plane, decision or risk`}
        />
        <EventStream events={s.events} nav={nav} />
      </div>
    </div>
  );
}
