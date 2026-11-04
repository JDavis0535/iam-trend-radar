# Content review log

## 2026-11-04: review of the six trends flagged `needsVerification`

Method: web search plus direct fetches of publisher pages. "Confirmed" means read on the publisher's own page. Where a claim could not be confirmed, the entry was reworded to say only what the sources support, rather than keeping the claim.

All six flags are now cleared. Maturity, impact and momentum ratings remain editorial judgments across every trend (the About page says so) and were not independently validated.

| Trend | What was confirmed | What changed |
|---|---|---|
| decentralized-identity-wallets | W3C Verifiable Credentials Data Model v2.0 is a W3C Recommendation (15 May 2025); DID Core v1.0 is a W3C Recommendation (19 July 2022). | VC 2.0 publish date filled in. Entry states no EU wallet rollout dates (secondary sources disagree on the day). |
| non-human-identity | OWASP NHI Top 10 2025 (OWASP incubator project) lists risks matching the entry; SPIFFE is CNCF Graduated (23 Aug 2022). No source gives a human-to-machine ratio; the entry states none. | Key standard label notes "2025, incubator project". |
| ai-agent-identity | OWASP Top 10 for Agentic Applications published 9 Dec 2025 (includes ASI03 Identity & Privilege Abuse). IETF datatracker: OAuth 2.1 is an active Internet-Draft, revision 17 (31 Oct 2026), state "I-D Exists", no RFC. MCP 2026-07-28 authorization page: authorization servers MUST implement OAuth 2.1; MCP servers MUST implement RFC 9728. | Two sources added. Note: the MCP page itself still cites OAuth 2.1 draft revisions 13 and 14. An earlier search-based note said revision 15; the datatracker shows 17. |
| identity-regulation | NIST CSRC: SP 800-63-4 final, July 2025 (07/31/25), supersedes 800-63-3. European Commission: NIS2 transposition deadline 17 Oct 2024. ESMA: DORA applies from 17 Jan 2025. | NIST published date filled in. EUR-Lex returned an empty response to automated requests (HTTP 202), so the legal texts themselves were not read and no bypass was attempted. |
| iga-modernization | NIST SP 800-53 AC-2 item j requires reviewing accounts at a defined frequency; AC-2(13) covers disabling accounts of high-risk individuals. Microsoft Entra documentation describes recurring access reviews, "smart recommendations", inactive-user reviews, and the case where HR data is not in the identity system. | The unsupported claim that governance is "shifting from spreadsheet-style, periodic reviews" was removed. Summary and rationale now state only what NIST and the vendor page support; vendor page added as a labelled vendor source. AC-6(7) and AC-2(1) text were not read. |
| itdr | MITRE ATT&CK T1078 Valid Accounts (ATT&CK v20): adversaries may obtain and abuse credentials of existing accounts. No vendor-neutral ITDR definition exists on NIST or CISA pages; secondary sources say Gartner named ITDR a 2022 trend, but the Gartner source was not retrieved. | Wording now presents ITDR as an industry label rather than a defined standard, and "attackers commonly operate with valid accounts" became "can operate with valid accounts". Gartner is not cited. |

Open items for a human: read the EUR-Lex texts of NIS2 and DORA; confirm the FIDO and EUR-Lex source links in a normal browser; re-review ai-agent-identity regularly because OAuth 2.1 and MCP change quickly.
