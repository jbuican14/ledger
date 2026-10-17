import { test, expect } from '@playwright/test';

const INBUCKET = "http://127.0.0.1:55324";

test("owner can invite and revoke", async ({ page }) => {
  const mailbox = `owner-${Date.now()}`;
  const email = `${mailbox}@example.com`;
  const password = "test-password-123";
  
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true}).fill(password);
  await page.getByLabel("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();
  
  let link = "";
  await expect.poll(async () => {
    const res = await page.request.get(`${INBUCKET}/api/v1/mailbox/${mailbox}`);
    const messages = await res.json();
    if (messages.length === 0) {
      return false;
    }
    const msg = await (await page.request.get(`${INBUCKET}/api/v1/mailbox/${mailbox}/${messages[0].id}`)).json();
    link = msg.body.html.match(/href="([^"]+)"/)[1].replaceAll("&amp;", "&");
    return true;
  }).toBe(true);
  
  await page.goto(link);
  await expect(page).toHaveURL(/\/onboarding/);
  
  await page.getByRole("button", {name: "Complete Setup", exact: true}).click();
  await expect(page).toHaveURL(/\/dashboard/);
  
  const partnerEmail = `partner-${Date.now()}@example.com`
  await page.goto("/settings");
  await page.getByLabel("Email").fill(partnerEmail);
  await page.getByRole("button", {name: "Invite", exact: true}).click();
  await expect(page.getByText("Invite created")).toBeVisible();
  await expect(page.getByText(partnerEmail)).toBeVisible();

  await page.getByRole("button", {name: `Revoke invite for ${partnerEmail}`, exact: true}).click();
  await page.getByRole("button", {name: "Revoke", exact: true}).click();
  await expect(page.getByText("No pending invites")).toBeVisible();
});