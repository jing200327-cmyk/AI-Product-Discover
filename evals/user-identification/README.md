# User Identification Eval

This directory contains the Prompt evaluation suite for AI Product Discover's product understanding step:

`Step 1: 识别用户是谁`

It evaluates only target-user identification quality. It does not evaluate full product design, competitor research, PRD writing, prototype design, technical architecture, or business model quality.

## Files

- `cases.ts`: 15 eval cases covering clear, unclear, B2B, personal, education, job-search, AI Agent, over-broad, over-narrow, and multi-user ideas.
- `rubric.ts`: 10 weighted metrics totaling 100 points.
- `judgePrompt.ts`: strict JSON judge prompt.
- `run.ts`: eval runner that calls the current `inputParserNode`, runs automatic checks, calls the judge model, and writes reports.
- `report.ts`: Markdown and JSON report helpers.
- `types.ts`: shared eval types.

## Run

```bash
npm run eval:user-identification
```

Required environment:

```env
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL_DEFAULT=deepseek-v4-flash
DEEPSEEK_MODEL_EVAL=deepseek-chat
```

The runner intentionally requires `DEEPSEEK_API_KEY`. It does not silently accept Mock fallback, because a Prompt eval report generated from Mock responses is not useful.

## Output

Reports are written to:

```txt
eval-results/user-identification/latest.json
eval-results/user-identification/latest.md
eval-results/user-identification/runs/<timestamp>.json
eval-results/user-identification/runs/<timestamp>.md
```
