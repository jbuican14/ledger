import { test, expect } from '@playwright/test';

const INBUCKET = "http://127.0.0.1:55324";

test("new user signs up, confirms email, lands on onboarding", async ({ page, request }) => {
  const mailbox = `plain-${Date.now()}`;
  const email = `${mailbox}@example.com`;
  const password = "test-password-123";

  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true}).fill(password);
  await page.getByLabel("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();

  // wait for confirmation email to arrive in Inbucket
  let link = "";
  await expect.poll(async () => {
    const res = await request.get(`${INBUCKET}/api/v1/mailbox/${mailbox}`);
    const messages = await res.json();
    if (messages.length === 0) {
      return false;
    }
    const msg = await (await request.get(`${INBUCKET}/api/v1/mailbox/${mailbox}/${messages[0].id}`)).json();
    link = msg.body.html.match(/href="([^"]+)"/)[1].replaceAll("&amp;", "&");
    return true;
  }).toBe(true);

  // click link from email -> should go to onboarding
  await page.goto(link);
  await expect(page).toHaveURL(/\/onboarding/);
});