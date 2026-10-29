/assign me
/label ~"workflow::ready"
<!-- alternatively, if not yet ready:
/label ~"workflow::wip"
/draft
-->

## Summary

<!-- More details here if necessary -->

- Closes # <!-- If this MR does not close the given ticket, please use "Related to" instead of "Closes" -->
- Pair-programmed with @Name <!-- Potentially mark commits with `Co-authored-by:`. Delete if this was not the case. -->

### Implementation
- [ ] 👌 Implemented according to issue scope
- [ ] 📝 Commit messages [are meaningful](https://cbea.ms/git-commit/), *WIP* and *fixup* commits have been amended
- [ ] 📖 If new interfaces were added, all properties are marked as `readonly` if possible

### Tech debt
- [ ] ✅ All `TODO(#)` comments for *this issue* resolved and deleted
- [ ] 🐞 Any tech-debt/bugs tracked as issues, and optionally as `TODO(#)` comments

### Tests
- [ ] 🧪 Added e2e or unit tests for added or changed lines of code
- [ ] <details><summary>🚭 Initial smoke tests passed (only check ones that were tested, skip the ones that don't make sense for this MR)</summary>
  - **Tested with flavor(s):**
    - [ ] consumer-live
    - [ ] consumer-sandbox
    - [ ] work-live
    - [ ] work-sandbox
    - [ ] work-onprem
    - [ ] custom-onprem (whitelabel)
  - **Tested against mobile peer(s):**
    - [ ] Android
    - [ ] iOS
  - **Tested flows:**
    - [ ] Starting and unlocking using an existing profile works
    - [ ] Linking a new device works
    - [ ] Relink device with an existing profile to restore
    - [ ] Send and receive a text message in a 1:1 conversation (counterpart: mobile peer)
    - [ ] Send and receive a text message in a group conversation (counterpart: mobile peer)
    - [ ] Send and receive an image (counterpart: mobile peer)
    - [ ] Send and receive a file (counterpart: mobile peer)
    - [ ] Send and receive a voice message (counterpart: mobile peer)
    - [ ] 1:1 audio/video call works (counterpart: mobile peer)
    - [ ] Group call works
    - [ ] UI changes tested:
    - [ ] ...add additional flows if necessary.</details>

## Review checklist

<!-- Add more review hints to this list, to be checked off by the reviewer -->
- [ ] Smoke test passed
- [ ] Implemented feature works as intended
