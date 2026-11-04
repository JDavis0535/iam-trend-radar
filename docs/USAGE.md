# Using IAM Trend Radar

Open `index.html` directly or run `python -m http.server 8000` and browse to `http://localhost:8000/` (see the README). The top navigation has Dashboard, Playbook, Watchlist and About. Everything you set (watchlist, dashboard filters) is stored in your browser only.

## Dashboard

The landing page. A summary line shows how many trends and recommendations exist, how many need verification and when the data was last updated.

- **Search** matches words in the title, summary, why-it-matters text, category and key standards. Every word must match.
- **Category, Maturity, Impact, Momentum** dropdowns narrow the list. All filters combine with AND.
- **Watchlist only** shows just the trends you have watched.
- **Sort by** impact (default), maturity, recently updated or title.
- The line "N of M trends shown" updates as you type. **Clear filters** resets everything.
- Each card shows categories, maturity, impact, momentum, summary, last-updated date and a Watch button. Filters are remembered when you open a trend and come back.

## Trend detail

Open a card to see the summary, why it matters, risks and challenges, key standards, the recommendations linked to this trend, dated sources and related trends. A "Needs verification" notice explains what is unconfirmed; treat those items with caution. A "May be stale" hint appears when an item has not been updated for more than 180 days. Source links open in a new tab. Use the Watch button here to add or remove the trend from your watchlist.

## Playbook

Every recommendation with a priority score (impact rank x 2 minus effort rank; higher is better). Filter by horizon, effort, impact or trend, and sort by priority, horizon or title. The **Quick wins** checkbox shows only low-effort recommendations with high or transformative impact. Each recommendation links back to its trend or trends. The scales are explained on the About page. Playbook filters reset when you reload the page (only dashboard filters are saved).

## Watchlist

Shows your watched trends and the recommendations linked to them, ordered by priority. The **Export as Markdown** button opens a text box with the export. From there:

- **Copy** puts it on the clipboard (if the browser blocks that, the text is selected so you can copy it yourself).
- **Download .md** saves `iam-trend-radar-watchlist.md`.

The export lists each watched trend (maturity, impact, momentum, verification notes, summary, sources) and its recommendations (horizon, effort, impact, numbered steps). **Clear watchlist** asks for confirmation first. If browser storage is blocked, a notice says the list will not survive closing the tab.

## About

Methodology, the maturity, impact, momentum, effort and horizon scales, the priority score formula, the data policy and how to contribute data.

## Example workflow: from trend to roadmap

An IAM team wants a short roadmap input for the next planning cycle.

1. **Scan.** On the Dashboard, set Impact to "High" and sort by impact. Skim the cards, noting maturity and momentum.
2. **Narrow.** Search for a term you care about, such as "privileged", or pick a Category. Open one trend, for example Just-in-time privileged access.
3. **Read and judge.** Check why it matters, the risks and the sources. If it shows "Needs verification", read the notes and confirm those points against the cited sources before you rely on it.
4. **Watch.** Press Watch on each trend that matters to your team. Go back to the Dashboard and tick "Watchlist only" to confirm the shortlist.
5. **Prioritize.** Open the Playbook, filter by a trend you watched, and sort by priority. Tick Quick wins to find low-effort, high-impact items you can start now. Use the Horizon filter to separate "now" work from "next" and "later".
6. **Export.** Open the Watchlist, press Export as Markdown, then Copy or Download .md. Paste it into your roadmap document and edit it with your own owners, dates and decisions.
7. **Follow up.** Verify any flagged claims and the source links before presenting. The dataset is a curated summary, not advice tailored to your environment.
