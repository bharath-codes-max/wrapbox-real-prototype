// Token Vault — reversible tokens created by CONSTRAIN. The outside AI only
// ever sees the token; Wrapbox swaps it back to the real value only for
// someone inside the company. Every restore attempt is logged. Raw values are
// never displayed — originals are masked on screen.
import React, { useMemo, useState } from "react";
import { useAppState, restoreToken } from "../state/store";
import { PageHead, Stat, Chip, SimNote, SectionHead } from "../ui/kit";
import { EventDetail } from "../ui/event-detail";
import { destById } from "../model/registries";
import type { RestoreRecord, SimulationEvent } from "../model/types";
import { Vault, ShieldCheck, ShieldX, Database, Building2, Globe, ArrowDown } from "lucide-react";

/** Show enough to recognise a value without revealing it. */
function mask(v: string): string {
  if (v.includes("@")) {
    const [name, domain] = v.split("@");
    return `${name[0]}•••${name.length > 1 ? name[name.length - 1] : ""}@${domain}`;
  }
  const digits = v.replace(/\D/g, "");
  if (digits.length >= 7) return v.replace(/\d(?=(?:\D*\d){2})/g, "•");
  return v.length > 4 ? `${v.slice(0, 2)}•••${v.slice(-2)}` : "••••";
}

const scopeLabel = (scope: string) =>
  scope === "veridian-internal" || scope.startsWith("restore:") ? "Veridian internal only" : scope;

export function TokenVaultPage({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const [openEvt, setOpenEvt] = useState<SimulationEvent | null>(null);
  const tokens = useMemo(() => [...s.tokens].reverse(), [s.tokens]);
  const [picked, setPicked] = useState<string>(() => tokens.find((t) => t.dataClass === "PII.EMAIL")?.id ?? tokens[0]?.id ?? "");
  const [last, setLast] = useState<Record<string, RestoreRecord | undefined>>({});

  // Where each token came from: the event and the original value it replaced.
  const originOf = (tokenId: string) => {
    for (const e of s.events) {
      const step = e.transformation?.find((t) => t.tokenId === tokenId);
      if (step) return { event: e, original: step.before };
    }
    return undefined;
  };

  const token = s.tokens.find((t) => t.id === picked);
  const origin = token ? originOf(token.id) : undefined;
  // The outside party is the AI that actually received this token.
  const outsider = origin?.event.destination ? destById(origin.event.destination)?.host ?? "the outside AI" : "the outside AI";
  const allowedCount = s.restorations.filter((r) => r.allowed).length;
  const deniedCount = s.restorations.length - allowedCount;
  // The AI's reply, with whatever stands in for the customer's value.
  const reply = (value: React.ReactNode) => <>Hi {value}, thanks for being a Veridian customer — your renewal quote is attached.</>;

  const ask = (who: "inside" | "outside") => {
    if (!token) return;
    const rec = who === "inside"
      ? restoreToken(token.id, "Priya Menon (inside Veridian)", true)
      : restoreToken(token.id, `${outsider} (outside Veridian)`, false);
    setLast((m) => ({ ...m, [who]: rec }));
  };

  return (
    <div className="page page-wide">
      <PageHead
        eyebrow="System"
        title="Token Vault"
        sub="When Wrapbox hides private data, it swaps each value for a token. The outside AI only ever sees the token; Wrapbox swaps it back only for people inside the company. Real values are never shown on this page."
        right={<SimNote>Vault storage simulated · restore rules and log real</SimNote>}
      />

      <div className="grid g4">
        <Stat icon={<Vault size={17} />} label="Tokens in vault" value={s.tokens.length} note="private values swapped out" />
        <Stat icon={<ShieldCheck size={17} />} label="Restores allowed" value={allowedCount} tone="good" note="inside Veridian" />
        <Stat icon={<ShieldX size={17} />} label="Restores denied" value={deniedCount} tone={deniedCount ? "bad" : undefined} note="asked from outside" />
        <Stat icon={<Database size={17} />} label="Data types" value={new Set(s.tokens.map((t) => t.dataClass)).size} note="kinds of private data" />
      </div>

      <div className="section">
        <SectionHead
          title="Try it — the round trip"
          sub="The AI writes its answer using the token. On the way back, who gets the real value?"
          right={
            tokens.length > 0 ? (
              <select className="select" style={{ width: "auto" }} value={picked} onChange={(e) => { setPicked(e.target.value); setLast({}); }}>
                {tokens.map((t) => <option key={t.id} value={t.id}>{t.id} · {t.dataClass}</option>)}
              </select>
            ) : undefined
          }
        />
        {!token || !origin ? (
          <div className="card empty">No tokens yet — run "Customer PII → approved AI" in the Simulation Lab.</div>
        ) : (
          <>
            <div className="grid g3">
              <div className="card">
                <div className="eyebrow">1 · Sent to the AI</div>
                <div className="payload" style={{ marginTop: 10 }}>… <span className="hl-tok">{token.id}</span> …</div>
                <div className="small faint" style={{ marginTop: 8 }}>The real value never left Veridian.</div>
              </div>
              <div className="card">
                <div className="eyebrow">2 · The AI's reply</div>
                <div className="payload" style={{ marginTop: 10 }}>{reply(<span className="hl-tok">{token.id}</span>)}</div>
                <div className="small faint" style={{ marginTop: 8 }}>The AI wrote its answer with the token — it never knew the real value.</div>
              </div>
              <div className="card">
                <div className="eyebrow">3 · Coming back through Wrapbox</div>
                <div className="small dim" style={{ marginTop: 10, lineHeight: 1.55 }}>
                  Wrapbox can swap <span className="mono">{token.id}</span> back for the real value — but only for someone inside the company.
                </div>
                <div className="small faint" style={{ marginTop: 8 }}>
                  From: <a onClick={() => setOpenEvt(origin.event)}>{origin.event.id}</a>
                </div>
              </div>
            </div>

            <div className="grid g2" style={{ marginTop: 16 }}>
              {([
                { who: "inside" as const, icon: <Building2 size={17} />, title: "Priya Menon asks", sub: "inside Veridian, reading the AI's reply" },
                { who: "outside" as const, icon: <Globe size={17} />, title: `${outsider} asks`, sub: "the AI that received the token tries to learn the real value" },
              ]).map((c) => {
                const r = last[c.who];
                return (
                  <div className="card" key={c.who} style={r ? { borderColor: r.allowed ? "var(--good)" : "var(--bad)" } : undefined}>
                    <div className="spread">
                      <div className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
                        <div className="stat-icon">{c.icon}</div>
                        <div><b className="small">{c.title}</b><div className="small faint">{c.sub}</div></div>
                      </div>
                      <button className="btn btn-sm" onClick={() => ask(c.who)}>Restore</button>
                    </div>
                    {r && (
                      <div style={{ marginTop: 14 }}>
                        <div className="row" style={{ gap: 8 }}>
                          {r.allowed ? <Chip tone="allow">ALLOWED</Chip> : <Chip tone="block">DENIED</Chip>}
                          <span className="small dim">{r.reason}</span>
                        </div>
                        <div className="payload" style={{ marginTop: 10 }}>
                          {r.allowed
                            ? reply(<span className="hl-red">{mask(origin.original)}</span>)
                            : reply(<span className="hl-tok">{token.id}</span>)}
                        </div>
                        <div className="small faint" style={{ marginTop: 6 }}>
                          {r.allowed
                            ? "Priya sees the real value in her app. It's masked here so this page never displays it."
                            : `${outsider} keeps seeing only the token. The attempt is written to the restore log below.`}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="small faint row" style={{ gap: 6, marginTop: 10 }}>
              <ArrowDown size={13} /> Every attempt — allowed or denied — is recorded in the restore log.
            </div>
          </>
        )}
      </div>

      <div className="section">
        <SectionHead title="Restore log" sub="Who asked to see a real value, and what Wrapbox said" />
        <div className="card card-pad-0">
          <table className="tbl">
            <thead><tr><th>When</th><th>Token</th><th>Who asked</th><th>Result</th><th>Why</th></tr></thead>
            <tbody>
              {[...s.restorations].reverse().map((r) => (
                <tr key={r.id}>
                  <td className="small dim">{new Date(r.at).toLocaleTimeString()}</td>
                  <td className="mono small"><span className="hl-tok">{r.tokenId}</span></td>
                  <td className="small">{r.requester}</td>
                  <td>{r.allowed ? <Chip tone="allow">ALLOWED</Chip> : <Chip tone="block">DENIED</Chip>}</td>
                  <td className="small dim">{r.reason}</td>
                </tr>
              ))}
              {s.restorations.length === 0 && <tr><td colSpan={5}><div className="empty">No restore attempts yet — try one above.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <SectionHead title="All tokens" sub="Every private value Wrapbox has swapped out, and where it came from" />
        <div className="card card-pad-0">
          <table className="tbl">
            <thead><tr><th>Token</th><th>Data type</th><th>Created</th><th>Who can restore</th><th>Expires</th><th>From</th></tr></thead>
            <tbody>
              {tokens.map((t) => {
                const o = originOf(t.id);
                return (
                  <tr key={t.id + t.eventId}>
                    <td className="mono small"><span className="hl-tok">{t.id}</span></td>
                    <td><Chip tone="violet">{t.dataClass}</Chip></td>
                    <td className="small dim">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="small">{scopeLabel(t.scope)}</td>
                    <td className="small dim">{new Date(t.expiresAt).toLocaleDateString()}</td>
                    <td className="mono small">{o ? <a onClick={() => setOpenEvt(o.event)}>{t.eventId}</a> : t.eventId}</td>
                  </tr>
                );
              })}
              {tokens.length === 0 && <tr><td colSpan={6}><div className="empty">No tokens yet — run "Customer PII → approved AI" in the Simulation Lab.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {openEvt && <EventDetail e={s.events.find((x) => x.id === openEvt.id) ?? openEvt} onClose={() => setOpenEvt(null)} onNavigate={(r) => { setOpenEvt(null); nav(r); }} />}
    </div>
  );
}
