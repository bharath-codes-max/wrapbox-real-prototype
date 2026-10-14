// The password check no longer lives in the browser. A check that runs in the
// visitor's own JavaScript is not protection: the bundle, the expected hash and
// the unlock flag are all readable. The real gate is `middleware.ts` at the repo
// root — it runs on Vercel before any file is sent, so an unauthenticated visitor
// is served only the login screen and never receives this app's code.
//
// This component stays so call sites (main.tsx and the deck entries) are
// unchanged; by the time it renders, the server has already authenticated the
// request, so it simply renders its children.
export function PasswordGate({ children }: { id: string; label: string; sub?: string; children: React.ReactNode }) {
  return <>{children}</>;
}
