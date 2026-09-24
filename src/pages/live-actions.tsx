// Live Action Stream — human-readable real-time chain with full filtering.
import { useAppState } from "../state/store";
import { PageHead, SimNote } from "../ui/kit";
import { EventStream } from "../ui/event-stream";

export function LiveActions({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  return (
    <div className="page">
      <PageHead
        title="Live Actions"
        sub="Every consequential action across Endpoint, Network and Gateway — user → agent → tool → action → resource → decision. Click any row for full evidence."
        right={<SimNote />}
      />
      <EventStream events={s.events} nav={nav} />
    </div>
  );
}
