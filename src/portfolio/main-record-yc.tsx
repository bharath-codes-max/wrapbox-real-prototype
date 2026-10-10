// Entry for docs/record-yc.html — the dedicated recording frame for the YC
// product-demo video. Loads deck.css + record-yc.css, picks the yc-demo case,
// and renders RecordYc. Deliberately not password-gated: this page is only
// used by the local recorder (docs/_record-yc.mjs).
import { createRoot } from "react-dom/client";
import { caseById } from "../tour/v2/cases";
import { RecordYc } from "./record-yc";
import "./deck.css";
import "./record-yc.css";

const tc = caseById("yc-demo");
if (!tc) throw new Error("yc-demo case missing");
createRoot(document.getElementById("rec")!).render(<RecordYc tc={tc} />);
