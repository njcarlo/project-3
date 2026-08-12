// Short participant-facing guideline on how to submit an entry. Shown on the
// left of the leaderboard and the submission page.
export function SubmissionGuide() {
  return (
    <div className="card rounded-xl p-4 text-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        How to submit
      </h2>

      <ol className="flex list-decimal flex-col gap-2 pl-4 text-muted marker:text-muted">
        <li>
          <span className="text-foreground">Register</span> — your name, a
          contact, and your Trainer ID QR.
        </li>
        <li>
          <span className="text-foreground">Get your fee confirmed</span> by the
          organizer.
        </li>
        <li>
          <span className="text-foreground">Submit your run</span> — pick your
          registered name and add a photo/video and/or a selfie (at least one).
        </li>
        <li>
          <span className="text-foreground">Climb the board.</span> An admin sets
          your score; your best score ranks you.
        </li>
      </ol>

      <div className="mt-3 rounded-lg bg-background p-3 text-xs text-muted">
        <p className="mb-1 font-medium text-foreground">Good to know</p>
        <ul className="flex list-disc flex-col gap-1 pl-4 marker:text-muted">
          <li>Only your highest score counts — you can submit again to beat it.</li>
          <li>
            Your selfie and Trainer ID QR are used for verification only and are
            never shown publicly.
          </li>
          <li>File limits: entry 16 MB, selfie 6 MB, QR 6 MB.</li>
        </ul>
      </div>
    </div>
  );
}
