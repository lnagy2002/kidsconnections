// Required dependencies:
// npm install puppeteer fs path

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const fetch = require('node-fetch');
const OpenAI = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


const TAX_RATE = 0.012;
const INSURANCE_ANNUAL = 1200;
const MAX_PRICE = 500000;
const DEFAULT_MORTGAGE = {
  down_payment_pct: 0.20,
  interest_rate: 0.060,  // 6.5%
  term_years: 30
};

const cities = {
  "concord": "?view=list&criteria=H4sIAAAAAAAACnVQwU7DMAz9F19pURraQnuDwSQkJBAtB45e4m0RaVKSFFoQ_47COhhI3Ozn9-zn9w6e0IntgyfXkCYRlDXXEmqWzJPYABLPSlnk6ZpKSvPyLE-rimcpnp5kBWeSZ0UJe0VLY4AaFtYI6-QvuJ16ghq-sca6cOskuR0YHBqPXx5m5mqYIIFOmTunxCztcNx3ecEYYweMpXUdhkDyN_UQzgv2BAmsSHqogccSwzbWcVHvbE8uTPP9RpmNpiV2Sk_35JUkIyhp7avZ2sFTsrBG2k4ZNXRJ61SvaYzPbe3rrdFTTE5rSEArH5TZNAHDEC-di6BeaOe7eV7HuHZuDxplbuzP4LvWNjTqjWZ_PvIT2KDDDTU9Cto_0inzSOguBqV_tvxBhCMMdIkhruKMlynLUp61LKsLXnN-XJWsPK2OGKu_Utbow9VIYtgl-b-imCUfn7mc1EpgAgAAcWsM8v9JTD_GVzMGmlogFkA4hd6Q2UFsZiNiw8_OWLU",
  "pleasant-hill": "?view=list&criteria=H4sIAAAAAAAACnVQwW7bMAz9lYHX2YPiOFmj29qt2IABLWb3sCMj0QlRWfIkeo037N8HJU6bDtiN7_GRfHy_IRFGs39IFBtyZISD_2JBq2LuZABUqY1ddZvyatOpsl7Y9-XWKFUqe2XJLLtq3Vk4T7R0ENBw7wgTennzmZ171WyngUDDDcv0zDchyl20FEEDFCARfcKjm1m9HbO4Z38f2WQiIzycUb1SSqkLxW2IPYqQfS29pOuVeoQCtmQTaKhyibLPdV40xDBQlGm-37DfObrFnt30jRJb8oaKNjz5fRgTFTfB29Cz57Ev2siDo0N-bh-e7rybQAMeU3CchP2uEZQxX_pghH_SyXfzo8vBndxeAPZfw0vjuXZBGv5Fs7-U9QXsMOKOmgENnR_p2X8njNcju5ct_zAmEgp9RMmrKlWtS7Uoq0WrFnq11Mv1u_WyrqvNW6X0MWWHST4dyIynJP8_Uc8jf_4Cq7UOrGoCAABVmlZFReUfq8YdKF_7yHPCmoIGJDNLPXGNqbUGj60yCw",
  "walnut-creek": "?view=list&criteria=H4sIAAAAAAAACnVQ0W7bMAz8lYGvswvZsetYb1u2AgUKtKg9FH1kZC4RJkuuRLdxi_77oMRpkwF74x2P5PHeIBB6tf0VyDdkSLF29roDKZK5EwFkRb5e1qJOS6IqLYquSpd1kaVVVS6qS1GUZaXgONHSjkHCAxo78peVJ_pz1mungUDCSvP0wTfO863vyIMESIA92oB7M7N6PUZxr-2d1yoSEeHuiIpSCCFOFFfO98hM3bn0lC5KEY2tqQsgIY8l8jbWGSQweDeQ52m-32i7MXSFvTbTPQXdkVWUtO7Fbt0YKFk527leWz32Sev1YGgXn9u6l1trJpCAxkACRgfWdtMw8hgvfVOsn-ngu3n6HXM7uD0B2t64z8ZHbRw3-pVmfyHqE9igxw01AyqK6-dEHgn991Gbzy3_MMoTMv1AjqtykV-mIkvzrBWZXNSyrC7yrMqKuvwqhNzHbDDwzx2p8RDl_0eW88j7X2EO6ApqAgAAnFxCCfqBm8cQ_GDSVYzIcZQ5w8TyQ0hkx4ZSdsePrNQ",
  "brentwood": "?view=list&criteria=H4sIAAAAAAAACnVQS2_bMAz-L7zWLhTHThzf1m4FCgzoMHuHHWmJTYjJkivRS7xh_31Q67TpgN34Pfj6fkMkDPrwLVJoyZIW9u7eQKOyRUkAcLfrN9t1kW-1qfKyqOq8743Jqe5rXa435hEJzh0dnQQauAnk5Oi9eSd080jQwC3L_Mq3PshDMBSgAchAArqIz5cs7n5K5oHdl8A6EQnh6YzKSimlLhx3PgwoQua99ZIuK_UDMujJRGigSCXKIdVp0Bj8SEHmZX_Lbm_pDge281eKbMhpyjp_dAc_RcpuvTN-YMfTkHWBR0un9NzBHx-cnVN-1kIGlqOw27eCMqVNH7Twz5TbwK59ekyhvVx7Adh99m_Ca229tPyLlvti8mewx4B7akfUdH5kYPedMNxMbN-m_MPoQCj0ESWNKlSxydUqL1adWjVV2ajd9VpV1WZbXynVPMdsMcqnE-npJcr_ttTrpeXPX219GIlnAgAAlpUo_ylHYCpdJ6JKyEFhBMALV1XAgifH3ws5b4Go99A",
  "livermore": "?view=list&criteria=H4sIAAAAAAAACnVQS0_cMBD-L3NtUnmzycL6xlOqhAQi6aHHWXvYHeHYqT2BTav-98qQhQWJ23yPeX1_IRFGs_uZKLbkyAgH_8OCVsWsZAC2sWt72pyUq9MHLGtUVble18uyak42VhlVLysDh46O9gIabviJYh8ifRC6aSDQcMEyvfFtiHIbLUXQAAVIRJ_w5ZLZvRmzuWd_F9lkIiPcH1DdKKXUkeM6xB5FyH60HtN1ox6hgA3ZBBqqXKLscp0HDTEMFGWa97fst46usWc33VNiS95Q0YVnvwtjouIieBt69jz2RRd5cLTPz-3C8613E2hA56AAx0nYb1tBGfOmMyP8lOPp2be_H3Jor9ceAfY34V14q12Qlv_QfF_K_gK2GHFL7YCGDo_07H8RxvOR3fuUT4yJhEKXKHlUpapVqRZltejUQje1bhbfl6tKrermm1L6JWaHSa72ZMbXKL9uWc8t__4DdVz18GcCAACqQ_c9qTmcoF8ZvSz4TTQI696acZp-yXMRzLa5X4YJdQ"
};


async function rentEstimateBatchOpenAI(city, listings) {
  // Keep payload SMALL to save tokens
  const items = listings.map((l, idx) => ({
    id: String(idx),
    city,
    state: "CA",
    // remove zip hardcode; not always 94595
    price: l.price,
    hoa: l.hoa || 0,
    beds: Number(String(l.beds).replace(/[^\d.]/g, "")) || null,
    baths: Number(String(l.baths).replace(/[^\d.]/g, "")) || null,
    sqft: Number(String(l.sqft).replace(/[^\d]/g, "")) || null,
    // optional: propertyType inference; keep simple
    propertyType: "residential"
  }));

  const response = await client.responses.create({
    model: "gpt-5",
    reasoning: { effort: "low" },

    input: [
      {
        role: "system",
        content:
          "Estimate monthly market rent for each property using only the provided facts. " +
          "No web/MLS/Zillow access. Return conservative rents. Output JSON only."
      },
      {
        role: "user",
        content: JSON.stringify({ city, items })
      }
    ],

    text: {
      format: {
        type: "json_schema",
        name: "rent_batch",
        strict: true,
        schema: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  rent: { type: "number" },
                  low: { type: "number" },
                  high: { type: "number" },
                  confidence: { type: "string", enum: ["low", "medium", "high"] }
                },
                required: ["id", "rent", "low", "high", "confidence"],
                additionalProperties: false
              }
            }
          },
          required: ["results"],
          additionalProperties: false
        }
      }
    }
  });

  const parsed = JSON.parse(response.output_text);
  // Map id -> rent object
  const byId = new Map(parsed.results.map(r => [r.id, r]));
  return byId;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateMonthlyPI({
  purchasePrice,
  hoa
}) {
  const downPaymentPct = DEFAULT_MORTGAGE.down_payment_pct;
  const annualInterestRate = DEFAULT_MORTGAGE.interest_rate;
  const termYears = DEFAULT_MORTGAGE.term_years;
  const loanAmount = purchasePrice * (1 - downPaymentPct);
  const monthlyRate = annualInterestRate / 12;
  const totalPayments = termYears * 12;

  const numerator =
    loanAmount *
    monthlyRate *
    Math.pow(1 + monthlyRate, totalPayments);

  const denominator =
    Math.pow(1 + monthlyRate, totalPayments) - 1;

  const monthlyPI = Math.round(numerator / denominator);
  const monthlyTaxes = Math.round((purchasePrice * TAX_RATE) / 12);
  const monthlyInsurance = Math.round(INSURANCE_ANNUAL / 12);

    const total =
      monthlyPI +
      monthlyTaxes +
      monthlyInsurance +
      hoa;

    return {
      principalAndInterest: monthlyPI,
      propertyTax: monthlyTaxes,
      insurance: monthlyInsurance,
      hoa,
      totalMonthlyExpenses: total
    };

}


async function extractRentEstimateFromMLS(url) {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/119 Safari/537.36");
  await page.setViewport({ width: 1200, height: 800 });


  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Click the Rent Estimator tab
  await page.waitForSelector('div[cmdata="rentEstimator"]', { timeout: 30000 });

  await page.click('div[cmdata="rentEstimator"]');

  // Wait for the median rent content to appear
  await page.waitForFunction(
    () => document.body.innerText.includes("MEDIAN RENT FOR"),
    { timeout: 1200000 }
  );


  const rent = await page.$eval("#cmMedianRent", el => {
    const match = el.textContent.match(/\$([\d,]+)/);
    return match ? parseInt(match[1].replace(/,/g, "")) : null;
  });

  await browser.close();
  return rent;
}

async function getHOAFromMLSDetails(page, mlsURL) {
  try {
    await page.goto(mlsURL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector("div.details-container", { timeout: 5000 });

    const hoa = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll(".card-block"));
      for (const block of blocks) {
        const title = block.querySelector("p.card-title")?.textContent.trim();
        if (title === "HOA Fee") {
          const valueText = block.querySelector("p.card-text")?.textContent.trim() || "";
          const value = parseInt(valueText.replace(/[^\d]/g, ""));
          return isNaN(value) ? 0 : value;
        }
      }
    });

    return hoa || 0;
  } catch (err) {
    console.warn(`⚠️ Could not extract HOA from: ${mlsURL}`, err.message);
    return 0;
  }
}


async function scrapeMLSForCity(city, criteria) {
  const baseUrl = `https://www.mlslistings.com/Search/Result/${city}`;
  const listings = [];
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/119 Safari/537.36");
  await page.setViewport({ width: 1200, height: 800 });

  let currentPage = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const fullUrl = `${baseUrl}/${currentPage}?${criteria}`;
    console.log(`🔄 Visiting ${city} ${currentPage}`);
    try {
      await page.goto(fullUrl, {waitUntil: "domcontentloaded", timeout: 30000 });

      // Try dismissing cookie modals (if any)
      try {
        await page.click("button[title*='Accept'], button[aria-label*='Accept']");
        await sleep(1000);
      } catch {}

      await page.waitForSelector(".listing-card", { timeout: 10000 });
    } catch (error) {
      console.warn(`❌ Could not load page ${currentPage} of ${city}:`, error.message);
      break;
    }

    const pageListings = await page.$$eval(".listing-card", (cards) =>
      cards.map((card) => {
        const address = card.querySelector(".listing-address")?.textContent.trim() || "N/A";
        const priceText = card.querySelector(".listing-price")?.textContent || "";
        const daysOnMarket = card.querySelector(".listing-dom-block")?.textContent || "";
        const price = parseInt(priceText.replace(/[^\d]/g, "") || "0");
        const beds = card.querySelector(".listing-bed strong")?.textContent || "";
        const baths = card.querySelector(".listing-baths strong")?.textContent || "";
        const sqft = card.querySelector(".listing-sqft strong")?.textContent || "";
        const href = card.querySelector("a")?.getAttribute("href") || "";
        const mlsURL = href.startsWith("http") ? href : "https://www.mlslistings.com" + href;
        return { address, price, mlsURL, daysOnMarket, beds, baths, sqft };
      })
    );

    for (const listing of pageListings) {
      listing.hoa = await getHOAFromMLSDetails(page, listing.mlsURL);
    }

    // Stop if no more listings on the page
    if (!pageListings.length) {
      hasNextPage = false;
    } else {
      // console.log (pageListings.length)
      // const filtered = pageListings.filter((l) => l.price <= MAX_PRICE && l.baths >= 2 && l.address);
      // console.log (`Totral listings ${pageListings.length}... filtered  ${filtered.length}`)
      listings.push(...pageListings);
      currentPage++;
    }
  }

  await browser.close();
  console.log(`✅ Total listings scraped for ${city}: ${listings.length}`);
  return listings;
}

async function processAllCities() {
  const all = [];

  for (const city of Object.keys(cities)) {
    console.log(`\n🔍 Scraping MLS for ${city}...`);
    const criteria = cities[city];
    const resultsAll = await scrapeMLSForCity(city, criteria);
    const results = resultsAll.filter(l => Number(l.hoa || 0) <= 700);
    console.log(`✅ Filter HOA <= 700: ${results.length} of ${resultsAll.length}`);

    // ✅ One OpenAI call per city (batch)
    let rentById = null;
    try {
      rentById = await rentEstimateBatchOpenAI(city, results);
    } catch (e) {
      console.warn(`⚠️ OpenAI batch rent failed for ${city}: ${e.message}`);
      rentById = new Map(); // fallback: no rents
    }

    for (let idx = 0; idx < results.length; idx++) {
      const listing = results[idx];

      const rentObj = rentById.get(String(idx));
      const rent = rentObj?.rent ?? null;

      const monthlyAll = calculateMonthlyPI({
        purchasePrice: listing.price,
        hoa: listing.hoa
      });
      const monthlyExpenses = monthlyAll.totalMonthlyExpenses;

      const cashFlow = rent == null ? null : monthlyCashFlow(rent, monthlyExpenses);

      // Use your no-mortgage yield (on price) only when rent exists
      const yieldPct = rent == null
        ? ""
        : calculateYieldPct({ listPrice: listing.price, hoa: listing.hoa, rent });

      console.log(
        `🏠 ${listing.address} — PRICE: ${listing.price} HOA: $${listing.hoa} ` +
        `RENT: ${rent ?? "N/A"} MonthlyExp: ${monthlyExpenses} DOM: ${listing.daysOnMarket}`
      );

      if (cashFlow != null) {
        const color = cashFlow > -300 ? "\x1b[32m%s\x1b[0m" : "\x1b[31m%s\x1b[0m";
        console.log(color, `   Monthly Cash Flow ${cashFlow} (conf: ${rentObj.confidence}, range: ${rentObj.low}-${rentObj.high})`);
      }

      all.push({
        city,
        ...listing,
        rent: rent ?? "",
        rent_low: rentObj?.low ?? "",
        rent_high: rentObj?.high ?? "",
        rent_confidence: rentObj?.confidence ?? "",
        yield: yieldPct
      });

      await sleep(300); // faster now since OpenAI is batched
    }
  }

  // ... your CSV writing stays the same (add new cols if you want)
}

function monthlyCashFlow( rent, monthlyExpenses ) {
  return rent - monthlyExpenses;
}

function annualCashFlow( rent, monthlyExpenses ) {
  return monthlyCashFlow (rent, monthlyExpenses) * 12;
}

function yieldOnPricePct( rent, monthlyExpenses, purchasePrice ) {
  const annualNet = (rent - monthlyExpenses) * 12;
  return Number(((annualNet / purchasePrice) * 100).toFixed(2));
}

function calculateYieldPct({ listPrice, hoa, rent }) {
  const annualRent = 12 * rent;
  const annualExpenses = (12 * hoa) + (listPrice * TAX_RATE) + INSURANCE_ANNUAL;
  const net = annualRent - annualExpenses;
  return Number(((net / listPrice) * 100).toFixed(2));
}


processAllCities();
