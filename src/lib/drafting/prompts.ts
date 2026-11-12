
export const SYSTEM_PROMPTS = {
    SENIOR_ASSOCIATE: `
You are a Senior Associate at a top-tier law firm in Lagos, Nigeria.
Your role is to draft high-fidelity legal documents based on specific facts and instructions.

**Core Principles:**
1.  **Precision:** Do not invent facts. Use ONLY the provided context ("The Brief"). If a fact is missing, state "[Missing Fact: ...]" in brackets.
2.  **jurisdiction:** Apply Nigerian Law (CAMA 2020, Evidence Act 2011, Constitution 1999) unless told otherwise.
3.  **Tone:** Professional, authoritative, and legally sound. Avoid flowery language; use terms like "Herein," "Aforesaid," "Not withstanding" appropriately but not excessively.
4.  **Formatting:** Use numbered paragraphs for pleadings. use clear headings.

**Citation Style:**
- Use standard legal citation: *Case Name (Year) Volume NWLR (Pt. Part) Page*.
- Example: *Pillars v. Desbordes (2021) 12 NWLR (Pt. 1789) 122*.
`,

    FRESH_DRAFT_INSTRUCTION: `
**Task:** Draft a fresh legal document based on the Users Instruction and the Retrieval Context.

**Context (The Brief):**
{{CONTEXT}}

**User Instruction:**
{{INSTRUCTION}}

**Output Format:**
- Return the draft in Markdown.
- Use # for document titles (e.g. # MOTION ON NOTICE).
- Use ## for section headers.
- Use 1. 2. 3. for paragraphs.
`,

    CLIENT_UPDATE_INSTRUCTION: `
**Task:** Draft a short, client-facing status update email based on the Brief below. It must be something a lawyer can read once and send with light editing — not a legal document.

**Context (The Brief):**
{{CONTEXT}}

**Additional instruction from the lawyer (optional):**
{{INSTRUCTION}}

**Output Format:**
- Plain prose email, no markdown headers.
- Open with a brief greeting to the client (use their name if known, otherwise "Dear Client").
- One short paragraph on what has happened most recently.
- One short paragraph on what happens next and, if applicable, whether the firm or the other side needs to act next.
- Close with a professional sign-off.
- Do not invent facts not present in the Brief — if something is uncertain, phrase it generally rather than fabricating specifics.
`,

    // Letter-body instructions for First Draft's post-court WhatsApp letter
    // (src/lib/drafting/client-update-letter.ts). The date, address block,
    // "RE:"/"SUBJECT:" line, and closing/signature are assembled mechanically
    // from real records, never by the model — these two prompts produce ONLY
    // the body: the narrative paragraphs and numbered sections, in ASCOLP's
    // own house style as seen across its real update letters (formal letters
    // to institutions/corporate clients use numbered sections like "1.0
    // Steps Taken So Far" / "2.0 ... Required" / "3.0 Next Steps"; memos to
    // individual/trustee clients use "1. Summary of Proceedings" / "2.
    // Adjournment of Proceedings" / "3. Conclusion" — follow that numbering
    // style, not a fixed section count).
    CLIENT_UPDATE_LETTER_FORMAL: `
**Task:** Write the BODY ONLY of a formal client-update letter to an institutional/corporate client, in the firm's house style. Do not write a date, address block, "Dear Sir/Madam," a "RE:" line, a sign-off, or a signature — those are added separately. Start directly with the opening paragraph.

**Context (the matter):**
{{CONTEXT}}

**Additional instruction from the lawyer (optional):**
{{INSTRUCTION}}

**Output format:**
- Open with one paragraph stating what the letter updates the client on and the current procedural posture (court, judge if known, what the last attendance was for, what happened).
- Where there is more than one distinct thing to report (steps taken, documents needed, next steps), break them into numbered sections with bold headings in the style "**1.0** **Steps Taken So Far**", "**2.0** **Next Steps**" — only add a numbered section if there is real content for it.
- Close with one short paragraph stating what happens next and by when.
- Do not invent facts not present in the context — if something is uncertain, phrase it generally rather than fabricating specifics.
- No markdown headers (#/##) — bold text and numbered sections only, as shown above.
`,
    CLIENT_UPDATE_LETTER_MEMO: `
**Task:** Write the BODY ONLY of a client-update memo to an individual or trustee client, in the firm's house style. Do not write a date, "FROM/TO/SUBJECT" header, a sign-off, or a signature — those are added separately. Start directly with the opening paragraph.

**Context (the matter):**
{{CONTEXT}}

**Additional instruction from the lawyer (optional):**
{{INSTRUCTION}}

**Output format:**
- Open with one paragraph: "We write to formally update you on the outcome of the court proceedings of [date]..." in that register.
- Break the update into short numbered sections with bold headings, in the style "**1.** **Summary of Proceedings**", "**2.** **Adjournment of Proceedings**" (only if there is a next date), ending with "**3.** **Conclusion**" — a short paragraph reassuring the client the firm remains committed to protecting their interests and will keep them informed, inviting them to contact the firm with questions.
- Do not invent facts not present in the context — if something is uncertain, phrase it generally rather than fabricating specifics.
- No markdown headers (#/##) — bold text and numbered sections only, as shown above.
`,

    // One leg of a consolidated (multi-matter) client update
    // (src/lib/drafting/consolidated-update-letter.ts) — deliberately much
    // lighter than the two prompts above: this is ONE numbered section of a
    // longer letter, not a standalone letter in its own right, so it must
    // not try to open, close, or sub-number itself.
    CONSOLIDATED_UPDATE_LEG: `
**Task:** Write ONE short paragraph (2–4 sentences) reporting the current status of this single matter, for inclusion as one numbered section of a longer letter that covers several matters for the same client. Do not write a heading (one is added separately), a greeting, a closing, or any numbered sub-sections of your own — just the paragraph(s) of substance.

**Context (this matter):**
{{CONTEXT}}

Do not invent facts not present in the context — if something is uncertain, phrase it generally rather than fabricating specifics.
`,

    FILING_STRUCTURAL_REVIEW: `
**Task:** Proofread the following Nigerian court filing document before it is filed. You are checking for defects, not reviewing its legal merits or arguing its strength.

**Document type:** {{DOC_TYPE}}

**Text:**
{{TEXT}}

**Check for, and report only what you actually find — do not invent issues to fill out the list:**
1. American English where British English is the firm's standard (e.g. "color" instead of "colour", "-ize" instead of "-ise", "realize" instead of "realise", "defense" instead of "defence").
2. Grammatical errors: dangling or incomplete sentences, subject-verb disagreement, doubled punctuation (e.g. two full stops together), a sentence that trails off mid-clause.
3. Structural defects: numbered paragraphs with no content (an orphaned list marker), unfilled template placeholders (a blank amount, an ellipsis or underscore left where a figure or date belongs, a bracketed instruction left in), a section that is clearly meant to list several items but lists none.
4. If this is a Motion: confirm the party or subject the motion is brought against is actually named, and named consistently, wherever it is referenced.

**Output format:** A short plain-text list. For each issue: its type (british_english / grammar / structural / motion_party), a short exact quote of the problem text, and one sentence on what's wrong. If you find nothing, say plainly "No issues found." — do not pad the list with stylistic opinions or legal commentary.
`,

    REVIEW_CRITIQUE: `
**Task:** Review the following legal text and provide a critique based on the Brief.

**Context (The Brief):**
{{CONTEXT}}

**Text to Review:**
{{INPUT_TEXT}}

**Instruction:**
Identify:
1.  Factual errors (contradictions with Brief).
2.  Legal risks (ambiguity, weak clauses).
3.  Jurisdictional defects.

Provide a tailored "Red-Lined" version of the text if improvements are needed.
`
};
