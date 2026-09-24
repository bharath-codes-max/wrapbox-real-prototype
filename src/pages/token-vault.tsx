// Token Vault — reversible tokenization records. Never shows raw values.
import { useAppState } from "../state/store";
import { PageHead, Chip, SimNote } from "../ui/kit";

export function TokenVaultPage({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  return (
    <div className="page">
      <PageHead
        title="Token Vault"
        sub="Reversible tokens created by CONSTRAIN transformations. Original values are sealed in the vault; restoration requires authorized scope. Raw sensitive values are never displayed."
        right={<SimNote>Vault storage simulated · token lifecycle real</SimNote>}
      />
      <div className="card" style={{ padding: 0 }}>
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
      <div className="card" style={{ marginTop: 12 }}>
        <b className="small">How restoration works</b>
        <div className="small dim" style={{ marginTop: 4 }}>
          When an approved AI response containing <span className="mono">EMAIL_TOKEN_001</span> returns through Wrapbox to an
          authorized internal consumer, the token is re-identified in-line. External parties only ever hold tokens.
          Restoration outside scope is denied and evidenced.
        </div>
      </div>
    </div>
  );
}
