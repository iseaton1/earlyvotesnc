import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";

const SOURCE_URL = "https://ncfree.org/early-voting-tracker/";
const OUTPUT_FILE = new URL("./data.json", import.meta.url);

function requiredMatch(text, regex, label) {
  const match = text.match(regex);
  if (!match) throw new Error(`Could not find ${label} on NCFREE page.`);
  return match[1].replaceAll(",", "");
}

function extractData(text) {
  const dataDateMatch = text.match(/Data through\s+([^·\n]+)/i);
  if (!dataDateMatch) {
    throw new Error("Could not identify NCFREE's data-through date.");
  }

  const total = Number(requiredMatch(
    text,
    /Ballots cast\s+([\d,]+)\s+[\d,]+\s+at this point in 2022/i,
    "total ballots"
  ));

  const turnout = Number(requiredMatch(
    text,
    /Turnout so far\s+([\d.]+)%\s*[\d.]+%\s+at this point in 2022/i,
    "turnout percentage"
  ));

  const inPerson = Number(requiredMatch(
    text,
    /Voted in person\s+([\d,]+)\s+[\d,]+\s+at this point in 2022/i,
    "in-person ballots"
  ));

  const mail = Number(requiredMatch(
    text,
    /Voted by mail\s+([\d,]+)\s+[\d,]+\s+at this point in 2022/i,
    "mail ballots"
  ));

  for (const [name, value] of Object.entries({ total, turnout, inPerson, mail })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid ${name} value.`);
    }
  }

  // Fail closed if the page layout or figures change unexpectedly.
  if (total !== inPerson + mail) {
    throw new Error(
      `Validation failed: total (${total}) does not equal in-person (${inPerson}) + mail (${mail}).`
    );
  }

  return {
    source: "NC FreeEnterprise Foundation (NCFREE)",
    source_url: SOURCE_URL,
    data_through: dataDateMatch[1].trim(),
    total,
    turnout,
    in_person: inPerson,
    mail,
    checked_at: new Date().toISOString()
  };
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(SOURCE_URL, {
    waitUntil: "domcontentloaded",
    timeout: 90000
  });

  // Wait for the dynamically rendered statistics, not just the initial HTML.
  await page.waitForFunction(
    () => document.body.innerText.includes("Ballots cast") &&
          document.body.innerText.includes("Voted in person") &&
          document.body.innerText.includes("Voted by mail"),
    undefined,
    { timeout: 90000 }
  );

  const pageText = await page.locator("body").innerText();
  const fresh = extractData(pageText);

  let previous = null;
  try {
    previous = JSON.parse(await readFile(OUTPUT_FILE, "utf8"));
  } catch {
    // First successful run: there is no existing feed yet.
  }

  const comparable = value => ({
    source: value.source,
    source_url: value.source_url,
    data_through: value.data_through,
    total: value.total,
    turnout: value.turnout,
    in_person: value.in_person,
    mail: value.mail
  });

  const changed = JSON.stringify(comparable(previous || {})) !==
                  JSON.stringify(comparable(fresh));

  if (changed || !previous) {
    await writeFile(OUTPUT_FILE, JSON.stringify(fresh, null, 2) + "\n");
    console.log("Published updated NCFREE figures:", fresh);
  } else {
    // Keep the published figures, but record that the latest check succeeded.
    previous.checked_at = fresh.checked_at;
    await writeFile(OUTPUT_FILE, JSON.stringify(previous, null, 2) + "\n");
    console.log("No figure changes. Updated check timestamp.");
  }
} finally {
  await browser.close();
}
