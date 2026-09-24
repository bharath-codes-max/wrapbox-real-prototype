// Token Vault — reversible tokenization records. Never shows raw values.
import { useAppState } from "../state/store";
import { PageHead, Stat, Chip, SimNote, SectionHead } from "../ui/kit";
import { Vault, KeyRound, Lock, ShieldCheck } from "lucide-react";

export function TokenVaultPage({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const total = s.tokens.length;
  const restorable = s.tokens.filter((t) => t.restorable).length;
  const sealed = total - restorable;
  const dataClasses = new Set(s.tokens.map((t) => t.dataClass)).size;

  return (
    <div className="page page-wide">
      <PageHead
        eyebrow="System"
        title="Token Vault"
        sub="Reversible tokens created by CONSTRAIN transformations. Original values are sealed in the vault; restoration requires authorized scope. Raw sensitive values are never displayed."
        right={<SimNote>Vault storage simulated · token lifecycle real</SimNote>}
      />

      <div className="grid g4">
        <Stat icon={<Vault size={17} />} label="Tokens in vault" value={total} note="reversible transformations" />
        <Stat icon={<KeyRound size={17} />} label="Authorized-only" value={restorable} tone="good" note="restorable within scope" />
        <Stat icon={<Lock size={17} />} label="Sealed" value={sealed} tone="info" note="no restoration permitted" />
        <Stat icon={<ShieldCheck size={17} />} label="Data classes" value={dataClasses} note="distinct sensitive types" />
      </div>

      <div className="section">
        <SectionHead title="Tokenized records" sub="Every token maps to a sealed original value and the event that created it" />
        <div className="card card-pad-0">
          <table className="tbl">
            <thead><tr><th>Token</th><th>Data class</th><th>Created</th><th>Scope</th><th>Expires</th><th>Restoration</th><th>Source event</th></tr></thead>
            <tbody>
              {[...s.tokens].reverse().map((t) => (
                <tr key={t.id + t.eventId}>
                  <td className="mono small"><span className="hl-tok">{t.id}</span></td>
                  <td><Chip tone="violet">{t.dataClass}</Chip></td>
                  <td className="small dim">{new Date(t.createdAt).toLocaleString()}</td>
                  <td className="mono small dim">{t.scope}</td>
                  <td className="small dim">{new Date(t.expiresAt).toLocaleDateString()}</td>
                  <td><Chip tone={t.restorable ? "allow" : "neutral"}>{t.restorable ? "authorized-only" : "sealed"}</Chip></td>
                  <td className="mono small"><a onClick={() => nav("evidence")}>{t.eventId}</a></td>
                </tr>
              ))}
              {s.tokens.length === 0 && <tr><td colSpan={7}><div className="empty">No tokens yet — run the PII → approved AI scenario in the Simulation Lab.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <SectionHead title="How restoration works" sub="Tokens travel outward; original values re-identify only inside authorized scope" />
        <div className="card">
          <div className="small dim" style={{ lineHeight: 1.6 }}>
            When an approved AI response containing <span className="mono">EMAIL_TOKEN_001</span> returns through Wrapbox to an
            authorized internal consumer, the token is re-identified in-line. External parties only ever hold tokens.
            Restoration outside scope is denied and evidenced.
          </div>
        </div>
      </div>
    </div>
  );
}
