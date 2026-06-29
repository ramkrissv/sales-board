# /audit — Run a comprehensive codebase audit

Check the full codebase for issues:

1. **Build**: `npx next build` — must pass with zero errors
2. **Types**: Search for `as any` casts in domain layer — flag each one
3. **Constants**: Verify MATURITY_LABELS, MATURITY_COLORS, EXEC_LABELS all import from constants.ts
4. **Imports**: Check all workshop components are imported and used
5. **Guide**: Verify src/app/guide/page.tsx matches current features
6. **Exports**: Verify HTML export functions align with component props
7. **Security**: No API keys in client code, no `dangerouslySetInnerHTML`

Report as a structured table with pass/fail per check.
