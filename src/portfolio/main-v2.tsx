import { createRoot } from "react-dom/client";
import { Deck } from "./deck";
import { SLIDES_V2 } from "./slides/index-v2";

// Deck v2 — use cases played live in the real product.
createRoot(document.getElementById("deck")!).render(<Deck slides={SLIDES_V2} />);
