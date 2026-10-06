// Optional local browser check. Requires Chrome and the Vite server on port 5173.
import { chromium } from "playwright-core";
import { existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const executablePath =
  process.env.CHROME_PATH ||
  [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].find(existsSync);
if (!executablePath)
  throw new Error("Set CHROME_PATH to a Chrome or Edge executable.");
const output = join(tmpdir(), "kellen-assessment-2-screenshots");
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["mobile", 390, 844],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    await page.goto(
      pathToFileURL(join(import.meta.dirname, "../login-screen/index.html"))
        .href,
    );
    await page.screenshot({
      path: join(output, `login-${name}.png`),
      fullPage: true,
    });
    if (name === "desktop") {
      await page.getByRole("button", { name: /sign in/i }).click();
      if (!(await page.getByText("Enter at least 3 characters.").isVisible()))
        throw new Error("Login validation failed.");
      await page.getByLabel("Username or email").fill("alex.morgan");
      await page.getByLabel("Password", { exact: true }).fill("password123");
      await page.getByLabel("Remember me").check();
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.getByText(/Looks good, alex.morgan/).waitFor();
      await page.reload();
      if (
        (await page.getByLabel("Username or email").inputValue()) !==
        "alex.morgan"
      )
        throw new Error("Remember me failed.");
      console.log("login validation and remember me: success");
    }
    console.log(
      `login ${name}: scroll width ${await page.evaluate(() => document.documentElement.scrollWidth)}, viewport ${width}`,
    );
    await page.close();

    const app = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    await app.goto("http://127.0.0.1:5173/");
    await app.locator(".post-card").first().waitFor({ timeout: 20000 });
    await app.screenshot({
      path: join(output, `postboard-${name}.png`),
      fullPage: true,
    });
    console.log(
      `postboard ${name}: ${await app.locator(".post-card").count()} visible cards, scroll width ${await app.evaluate(() => document.documentElement.scrollWidth)}, viewport ${width}`,
    );
    if (name === "desktop") {
      await app.getByRole("button", { name: /new post/i }).click();
      await app
        .getByPlaceholder("Give your post a thoughtful title")
        .fill("Browser smoke test");
      await app
        .getByPlaceholder("Start writing your story...")
        .fill("A complete story from the browser smoke test.");
      await app.getByRole("button", { name: /publish post/i }).click();
      await app
        .getByText("Post created and saved locally.")
        .waitFor({ timeout: 20000 });
      console.log("postboard create: success");
      await app.locator(".post-card").first().getByTitle("Edit post").click();
      await app
        .getByPlaceholder("Give your post a thoughtful title")
        .fill("Browser smoke test revised");
      await app.getByRole("button", { name: /save changes/i }).click();
      await app.getByText("Post updated.").waitFor();
      await app.locator(".post-card").first().getByTitle("Delete post").click();
      await app
        .getByRole("dialog", { name: "Confirm deletion" })
        .getByRole("button", { name: "Delete post" })
        .click();
      await app.getByText("Post deleted.").waitFor();
      console.log("postboard edit and delete: success");
      await app.getByRole("button", { name: "Next page" }).click();
      await app.getByText("Page 2 of").waitFor();
      await app
        .getByRole("textbox", { name: "Search posts" })
        .fill("qui est esse");
      if ((await app.locator(".post-card").count()) !== 1)
        throw new Error("Search filter failed.");
      console.log("postboard pagination and search: success");
    }
    await app.close();
  }
  console.log(`Screenshots: ${output}`);
} finally {
  await browser.close();
}
