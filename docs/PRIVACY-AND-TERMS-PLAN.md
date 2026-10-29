# Privacy policy and terms: plan

Written 2026-10-28, after the decision to turn **sign-in on at launch** so the number of accounts can be counted ([ACCOUNTS.md](ACCOUNTS.md#how-many-users-do-i-have)), with **email and password only**: “Continue with Google” stays off at launch (decided the same day). This is the plan for both documents and for the changes the site needs around them. It is an engineering summary of what the cited laws and services say, not legal advice: a California attorney should review the drafts before launch. Every source below was read on 2026-10-28 on the official site linked.

## What the site collects once sign-in is on

| What                                                  | Where it is kept                                                                                                                                                                         | Why                                                |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Email address                                         | Supabase Auth                                                                                                                                                                            | Signing in; confirmation and password-reset emails |
| Password                                              | Sent from the form to Supabase Auth; the app's own code never stores it                                                                                                                  | Signing in                                         |
| Account dates: created, email confirmed, last sign-in | Supabase Auth user record (`created_at`, `email_confirmed_at`, `last_sign_in_at`, [Supabase: users](https://supabase.com/docs/guides/auth/users))                                        | Counting accounts and recent sign-ins              |
| IP address and user agent of sign-in events           | Supabase Auth audit logs ([Supabase: audit logs](https://supabase.com/docs/guides/auth/audit-logs))                                                                                      | Supabase's security logging                        |
| Sign-in session                                       | The visitor's browser (`localStorage`), see [LAUNCH-READINESS.md](LAUNCH-READINESS.md#what-the-site-collects-and-stores)                                                                 | Staying signed in                                  |
| IP addresses of all visitors                          | Vercel, as host: its privacy notice lists “End User IP address” in the traffic data it collects from customers' sites ([Vercel privacy notice](https://vercel.com/legal/privacy-policy)) | Serving the site                                   |

Unchanged: learners' code, inputs and settings stay in the browser; no cookies, analytics, tracking or third-party scripts. Accounts still save no code or progress.

**If Google sign-in is turned on later**, update the policy first: Google becomes a recipient, and Supabase keeps what Google sends in `identity_data` ([Supabase: identities](https://supabase.com/docs/guides/auth/identities)): `email` with the email scope, and “might” send `name`, `picture`, `given_name`, `family_name` and `locale` with the profile scope ([Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)).

Both services describe themselves as processors acting for the site owner: Supabase uses customer data “primarily as a processor” ([Supabase privacy](https://supabase.com/privacy)), and Vercel says “We act as a data processor on behalf of our Customers” ([Vercel privacy notice](https://vercel.com/legal/privacy-policy)). Each points to a Data Processing Addendum.

## What the law requires

| Law                                                                                                                                                                                                                                      | What it means for this site                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CalOPPA, [B&P § 22575](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=22575) and [§ 22577](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=22577) | An email address is personally identifiable information (§ 22577(a)(3)). A commercial site must “conspicuously post” a policy that (1) lists the categories collected and the categories of third parties it may be shared with, (2) describes the process to review and request changes, if there is one, (3) says how material changes are announced, (4) states its effective date, (5) says how the site responds to “do not track” signals, and (6) says whether other parties may collect information across sites. A text link on the homepage that includes the word “privacy” counts as conspicuous (§ 22577(b)(3)(A)). |
| Data breach notice, [Civil Code § 1798.82](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.82), amended by SB 446, in effect 2026-01-01                                                  | “A username or email address, in combination with a password” is personal information. Affected California residents must be told “within 30 calendar days of discovery or notification” (delay allowed for law enforcement or to find the scope and restore the system). Over 500 residents in one breach: a sample notice to the Attorney General within 15 calendar days of notifying them.                                                                                                                                                                                                                                   |
| COPPA ([FTC FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions))                                                                                                                            | A general-audience site is covered only with actual knowledge that it collects from a child under 13 (A.12). It does not have to ask ages (A.12, H.1). If it learns a user is under 13, it must get parental consent or delete the child's information (H.6). If it chooses to screen ages, it must ask “in a neutral manner”; a box reading “I am over 12 years old” is not neutral (H.3). The FTC page notes the rule was amended on 2025-04-22: the attorney should confirm against the amended rule.                                                                                                                         |
| CAN-SPAM ([FTC guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business))                                                                                                                           | Confirmation and reset emails carry only transactional content, which is “exempt from most provisions” but still may not use false or misleading routing or header information. Any marketing email later brings the full list: no deceptive subject lines, identified as an ad, a postal address, a working opt-out honored promptly.                                                                                                                                                                                                                                                                                           |
| CCPA / CPRA                                                                                                                                                                                                                              | Not at launch (thresholds in [LAUNCH-READINESS.md](LAUNCH-READINESS.md#california-and-federal-law)); re-check yearly.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

## Privacy policy: outline

Each section names the requirement it meets. Plain language, sentence case, no promises the site can't keep.

1. **Who runs Drawgorithms** and how to reach them: operator name and a contact email for privacy requests. _Needs your details._
2. **What we collect**, the table above in plain words. (CalOPPA 1)
3. **Why**: signing in, sending account emails, counting accounts and sign-ins, and keeping accounts secure. No marketing emails; nothing is sold or shared for advertising.
4. **Who receives it**: Supabase (accounts), Vercel (hosting), the email delivery provider once custom SMTP is set up, and authorities only when the law requires it. (CalOPPA 1)
5. **What stays on your device**: code, inputs, settings and the sign-in session in `localStorage`, and how to clear them.
6. **Cookies, tracking and “do not track”**: the site sets no cookies and does not track visitors across sites, so a do-not-track signal changes nothing; no other party collects information across sites through it. (CalOPPA 5 and 6)
7. **Your choices**: reset your password in the app; change your email or delete your account by writing to the contact address (see the site changes below). (CalOPPA 2)
8. **How long it is kept**: until the account is deleted; Supabase's audit-log retention to be confirmed before drafting.
9. **Security and breaches**: passwords handled by Supabase, and notice within 30 days if a breach exposes account details. (Civil Code § 1798.82)
10. **Children**: not directed to children under 13; an account found to belong to a child under 13 is deleted. (COPPA)
11. **Changes to this policy**: a notice on the site and an email to account holders for material changes. (CalOPPA 3)
12. **Effective date**. (CalOPPA 4)

## Terms of use: outline

1. Who runs the site; agreeing by using it or creating an account.
2. Eligibility: a minimum age (13 lines up with COPPA; whether to require 18, or a parent's agreement for minors, is a question for the attorney).
3. Accounts: one person per account, a real email you control, keep your password private, tell us about misuse.
4. Acceptable use: no attacks on the site or Supabase, no automated sign-ups, no using someone else's email.
5. Your code is yours; it stays in your browser. The site's exercises, lessons, drawings and text belong to the operator; use them for your own learning.
6. Not affiliated with or endorsed by LeetCode, NeetCode or the Tech Interview Handbook (the same statement as the README).
7. Educational only: no promise of interview results, and drawings and explanations may contain mistakes (the interview guides already say they “can't promise how an interview will go”).
8. Provided “as is”; limitation of liability; ending accounts; changes to the terms; California law; contact.
9. Payments: left out until something is sold. Subscriptions bring the Automatic Renewal Law items in [LAUNCH-READINESS.md](LAUNCH-READINESS.md#california-and-federal-law).

## Changes the site needs

1. **Privacy and Terms pages**, served by the site itself, linked from the first screen with text links that include the words “Privacy” and “Terms”, next to a link to `third-party-notices.txt`.
2. **A notice in the sign-up dialog**, beside the button, linking both pages. How to word it, and whether a checkbox is needed, is for the attorney.
3. **Changing an email or deleting an account**: by request to the contact address at launch, done in the Supabase dashboard (“You may delete users directly or via the management console at Authentication > Users”, [Supabase: managing user data](https://supabase.com/docs/guides/auth/managing-user-data)). A “Delete my account” button later needs a server function, because deleting a user “Requires a `service_role` key” and “should only be called on a server” ([Supabase: deleteUser](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser)).
4. **Vercel settings**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` at build time (without them the app shows no sign-in), and leave `VITE_SUPABASE_GOOGLE` unset, so the app shows no “Continue with Google”.
5. **Supabase dashboard** (your account): the Google provider left disabled; the real Site URL and Redirect URLs; custom SMTP with an honest sender name and address; leaked-password protection; CAPTCHA; the Data Processing Addendum if one must be signed. Audit logs always go to Supabase's log storage; keeping a second copy in the `auth.audit_log_entries` table is optional (Authentication → Configuration → Audit Logs, [Supabase: audit logs](https://supabase.com/docs/guides/auth/audit-logs)), so leave it off unless it is needed.
6. **A short breach-response note**: who watches Supabase's notices, the 30-day clock, the Attorney General copy over 500 residents.
7. **Tests**: the first screen shows both links; the pages load under the current Content-Security-Policy.

## Needed from you

1. The operator name to show, and a contact email for privacy requests (a separate address for the site works).
2. The email provider for custom SMTP.
3. An attorney to review both drafts, the sign-up notice and the minimum age.

## Still to confirm before drafting

- How long Supabase keeps Auth audit logs, and how long Vercel keeps request data, on the plans you choose.
- Whether Supabase's and Vercel's Data Processing Addendums apply automatically or must be signed.
