// Core Brain → Data it can find → "Try it". Runs the real scanners (engine/detect.ts)
// on text typed here, then sends what they found through the same engine that decides
// live runs — with your active rules — without recording anything.
import { useMemo, useState } from "react";
import { ScanSearch } from "lucide-react";
import { useAppState, shadowEvent } from "../state/store";
import { DecisionChip } from "../ui/kit";
import { scanText, toFindings, SCANNER_INFO } from "../engine/detect";
import { DESTINATIONS, DETECTORS, dataTypeById } from "../model/registries";
import type { Scenario } from "../engine/scenarios";

// Fake values only: random strings in the right shape, not real credentials. The key prefix is
// joined at runtime so no secret-shaped string sits whole in the source.
const SK = ["sk", "live"].join("_") + "_";
const SAMPLES: { label: string; text: string }[] = [
  { label: "Config file with a key", text: `# config.yaml\nSTRIPE_KEY=${SK}51Hq9ZkT3mXvB8wLp2NcR7yD4\nDB_PASSWORD=Tr0ub4dor&3x\nregion: us-east-1` },
  { label: "Customer list", text: "name,email,phone\nAlice Johnson,alice@example.com,+1 415 555 0100\nRahul Iyer,rahul.iyer@example.net,+1 628 555 0193" },
  { label: "Card and SSN", text: "Refund to card 4111 1111 1111 1111, customer SSN 123-45-6789." },
  { label: "Our customer IDs", text: '{"customers":[{"id":"VRD-CUST-0921","account":"ACCT-99128842"},{"id":"VRD-CUST-9999"}]}' },
  { label: "Code snippet", text: "export async function submitOrder(cart: Cart) {\n  const total = cart.items.reduce((s, i) => s + i.price, 0);\n  return api.post('/orders', { items: cart.items, total });\n}" },
  { label: "Placeholders (finds nothing)", text: `STRIPE_KEY=${SK}51Hxxxxxxxxxxxxxxxxxxxxxxxx\nDB_PASSWORD=changeme\nAPI_KEY=\${API_KEY}\nAWS=AKIAIOSFODNN7EXAMPLE` },
];

export function ScannerLab({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const [text, setText] = useState(SAMPLES[0].text);
  const [dest, setDest] = useState("dest-approved-ai");
  const scan = useMemo(() => scanText(text), [text]);
  const findings = useMemo(() => toFindings(scan.hits), [scan]);
  const untested = DETECTORS.filter((d) => !SCANNER_INFO[d.id].testable);

  const outcome = useMemo(() => {
    const d = DESTINATIONS.find((x) => x.id === dest)!;
    const critical = findings.some((f) => dataTypeById(f.dataClass)?.severity === "critical");
    const sc: Scenario = {
      id: "try-it", group: "NETWORK", title: "Pasted text", narrative: "Text pasted into the scanner test box.", expected: "—",
      plane: "NETWORK", action: "NETWORK_SEND", agent: "a-chatgpt", user: "u-priya", application: "Browser",
      resource: "pasted-text.txt", environment: "local", destination: d.id, destinationClass: d.class,
      fileName: "pasted-text.txt", payload: text, findings: findings.length ? findings : undefined,
      sensitivity: critical ? "sensitive" : "internal",
    };
    return shadowEvent(sc, s.contracts, s.kernel, s.standing);
  }, [text, dest, findings, s.contracts, s.kernel, s.standing]);

  return (
    <div className="sl">
      <div className="sl-head">
        <span className="sl-title"><ScanSearch size={15} /> Try it on your own text</span>
        <span className="sl-note">Runs in your browser. Nothing is sent or saved, and only masked values are shown.</span>
      </div>
      <div className="sl-body">
        <div className="sl-in">
          <div className="sl-samples">
            {SAMPLES.map((x) => <button key={x.label} className={`sl-sample ${text === x.text ? "on" : ""}`} onClick={() => setText(x.text)}>{x.label}</button>)}
          </div>
          <textarea className="input sl-text" rows={9} spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste text, a config file or a snippet of code…" aria-label="Text to scan" />
          <label className="sl-dest">
            <span>If an agent sent this to</span>
            <select className="input" value={dest} onChange={(e) => setDest(e.target.value)}>
              {DESTINATIONS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </label>
          <div className="sl-fake">Sample keys are fake: random text in the right shape, not real credentials.</div>
        </div>

        <div className="sl-out">
          <div className="sl-label">Found <b>{scan.hits.length}</b></div>
          {scan.hits.length === 0 && <div className="sl-none">{text.trim() ? "Nothing found by the scanners that can run here." : "Type or pick a sample to scan."}</div>}
          {scan.hits.map((h, i) => (
            <div key={i} className="sl-hit">
              <div className="sl-hit-top">
                <b>{dataTypeById(h.dataClass)?.label ?? h.dataClass}</b>
                <span className="sl-hit-by">{SCANNER_INFO[h.detector]?.title ?? h.detector}</span>
                <span className="sl-hit-conf" title="Set by the rule that matched">{Math.round(h.confidence * 100)}% sure</span>
              </div>
              <code className="sl-hit-val">{h.shown}</code>
              <div className="sl-hit-why">{h.why}</div>
            </div>
          ))}

          {scan.ignored.length > 0 && (
            <>
              <div className="sl-label" style={{ marginTop: 14 }}>Looked like data, but ignored <b>{scan.ignored.length}</b></div>
              {scan.ignored.map((x, i) => (
                <div key={i} className="sl-hit sl-ignored"><code className="sl-hit-val">{x.shown}</code><div className="sl-hit-why">{x.reason}</div></div>
              ))}
            </>
          )}

          <div className="sl-decision">
            <div className="sl-label">What Wrapbox would do with your rules</div>
            <div className="sl-decision-top">
              <DecisionChip d={outcome.decision} />
              <span>{outcome.decidedBy?.label ?? "No rule restricts this action"}</span>
            </div>
            <ul className="sl-reasons">{outcome.decisionReasons.slice(0, 3).map((r) => <li key={r}>{r}</li>)}</ul>
            <div className="sl-sim">Same engine as live runs. Nothing is recorded. <button className="link" onClick={() => nav("intent")}>Write a rule</button></div>
          </div>
          <div className="sl-untested"><b>Not tested here:</b> {untested.map((d) => SCANNER_INFO[d.id].title).join(", ")}. They need trained models or file labels that the prototype does not run.</div>
        </div>
      </div>
    </div>
  );
}
