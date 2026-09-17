# Payment R5 - Dependency Security and Staging Closure

## Local Security Remediation

- Upgrade Next.js and its ESLint config together to 15.5.24, NextAuth to 4.24.15, Nodemailer to 9.1.1 and its types to 8.0.2.
- Keep all TipTap packages and their required peers on 3.31.3. Upgrade next-intl within v4, and use sharp 0.35.4 for Next's optional image processing dependency.
- Yarn Classic `resolutions` pins PostCSS to 8.5.23 because Next 15.5.24 still declares the vulnerable 8.4.31 exactly. It also pins Preact to 10.26.10 to fix the NextAuth dependency. The PostCSS range mismatch warning is intentional; re-evaluate the override when Next moves its own dependency forward.
- `npm run security:audit:read-only` reports zero advisories across 413 production dependencies at the time of this review. This is a snapshot, not a guarantee against future advisories. Do not run `npm audit fix` on this Yarn project.
- `yarn install --frozen-lockfile --offline --ignore-scripts --non-interactive` verifies the lockfile resolves. Run normal `yarn install --frozen-lockfile` in CI so Prisma generation runs.
- The unchanged `react-day-picker` and `recharts` peer warnings, plus the optional TipTap floating-menu peer warning, need feature testing or follow-up if the affected controls are used; do not silence them by upgrading unrelated packages during this security release.

## Local Verification

- Targeted policy/HTTP suites: 117/117 passed. Targeted authentication database and browser checks: 10/10 and 7/7 passed.
- Final full regression: 73/73 PostgreSQL/service groups and 32/32 browser groups passed. The optimized Next.js production build produced `.next/BUILD_ID`; `npx tsc --noEmit` and `git diff --check` passed.
- Browser integration harnesses use Turbopack in development after a Windows Next.js Webpack hot-refresh manifest race was observed with the upgraded version; the separate production build still uses the standard Next.js build pipeline.
- The read-only production dependency audit was repeated after regression: zero advisories among 413 dependencies. No staging deployment or external operator gate was verified locally.

## Staging Gate (Owner Required)

All registration and payment flags stay exactly `false`, and `PAYMENT_LAUNCH_PLAN_IDS=[]`. No live production settings, migrations, release flags or deployment are changed by R5.

1. In a protected Vercel Preview deployment pointing only to the Neon staging branch, set staging-only secrets and run `npm run ops:preflight` against a production-shaped closed environment. Save the report without exposing values. Follow the R4 external operator gates in [payment-r4.md](payment-r4.md).
2. Verify anonymous, student and admin boundaries, closed registration/order/review/code writes, existing-order history, session invalidation and password-reset email against disposable staging identities. No real payment or customer data.
3. Check R2 private PDF access (unauthorized and expired signed URLs) and public media, including image optimization with a disposable image. Check SMTP delivery, bounce monitoring and DNS sender records.
4. Run a Neon restore rehearsal on a separate branch, inspect migration status without rewriting applied migrations, and confirm alert routing/redaction for database, Vercel, R2 and SMTP.
5. Repeat the production-only advisory scan and targeted/browser/build checks on the candidate artifact. If any gate fails, keep every switch closed and do not deploy to Production.

Passing local tests does not complete these external checks or authorize Limited Production Launch. Report their evidence and obtain a separate explicit launch decision.
