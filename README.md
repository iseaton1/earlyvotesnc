# NCFREE Early Voting Widget

This project uses Playwright in GitHub Actions to load NCFREE's JavaScript-rendered early-voting tracker, extract four published statistics, validate them, and publish `data.json` through GitHub Pages.

## What it displays

- Total ballots cast
- Registered voter turnout
- In-person ballots
- Mail ballots
- NCFREE's data-through date and the time the feed was last checked

## Setup

1. Create a new **public** GitHub repository.
2. Upload the contents of this folder to the repository, preserving `.github/workflows/update.yml`.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
5. Open **Actions**, select **Update NCFREE early-voting data**, and click **Run workflow**.
6. Wait for the workflow to finish. It should create or update `data.json` in the repository.
7. Open `index.html` and replace:
   `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/data.json`
   with the actual Pages URL for your repository's `data.json`.
8. Commit the change to `index.html`.
9. Embed the widget using the iframe snippet below.

## Embed snippet

Replace `YOUR-USERNAME` and `YOUR-REPOSITORY` with your GitHub username and repository name:

```html
<iframe
  src="https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/"
  width="100%"
  height="310"
  style="border:0; max-width:680px;"
  loading="lazy"
  title="North Carolina early-voting statistics">
</iframe>
```

## Schedule

The workflow runs hourly at 10:00–16:00 UTC, which is 6 a.m.–noon Eastern while North Carolina is on daylight time (EDT). GitHub Actions uses UTC, so adjust the cron hours after the daylight-saving transition if continuing to use the workflow.

The workflow also supports manual runs from the Actions tab.

## Important limitations

- NCFREE states that its tracker is updated each morning. Hourly checks do not cause NCFREE to publish new data sooner.
- The scraper deliberately stops rather than publishing if it cannot find all four metrics or if total ballots do not equal in-person plus mail ballots.
- If NCFREE changes its page wording or layout, the scraper may need its extraction patterns updated.
- The widget is a republishing of NCFREE's published statistics. Keep the source attribution and verify that your intended use complies with NCFREE's terms.
- This package has not been run against NCFREE's live browser-rendered page in this environment. Run the workflow manually and inspect its first result before publishing the embed.
