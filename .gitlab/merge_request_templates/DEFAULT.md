/assign me
/label ~"workflow::ready"
<!-- alternatively, if not yet ready:
/label ~"workflow::wip"
/draft
-->

## Summary

<!-- More details here if necessary -->

- Closes DESK-XXX <!-- If this MR does not close the given ticket, please use "Related to" instead of "Closes" -->
- Pair-programmed with @Name <!-- Potentially mark commits with `Co-authored-by:`. Delete if this was not the case. -->

## Merge Request Checklist

- [ ] 👌 Implemented according to issue scope
- [ ] ✅ All `TODO(DESK-XXX)` comments for *this issue* resolved and deleted
- [ ] 🐞 Any tech-debt/bugs tracked as issues, and optionally as `TODO(DESK-YYY)` comments:
  - DESK-YYY: Issue Title
- [ ] 📝 Commit messages [are meaningful](https://cbea.ms/git-commit/), *WIP* and *fixup* commits have been amended
- [ ] 📖 If new interfaces were added, all properties are marked as `readonly` if possible
- [ ] <details><summary>🚭 Initial smoke test passed</summary>
  - The electron app should start
  - UI changes: Test with responsive design (i.e. for both desktop and mobile screen sizes)
  - Protocol related: Test with the iOS app
</details>

## Review checklist

<!-- Add more review hints to this list, to be checked off by the reviewer -->
- [ ] Smoke test passed
- [ ] Implemented feature works as intended
