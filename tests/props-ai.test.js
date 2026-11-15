import { describe, expect, it } from "vitest";
import { TestDriver } from "testdriverai/vitest/hooks";

const APP_URL = process.env.APP_URL ?? "https://props-ai-ten.vercel.app";

describe("Props AI / Pitchly Tests", () => {
  it("should load the landing page and verify brand and navigation", async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.chrome({ url: APP_URL });

    const brand = await testdriver.find("Pitchly");
    expect(brand).toBeTruthy();

    const result = await testdriver.assert("the Pitchly landing page is visible with headline and navigation");
    expect(result).toBeTruthy();
  });

  it("should navigate to login page and display sign in form", async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.chrome({ url: `${APP_URL}/login` });

    const emailInput = await testdriver.find("Email address input");
    expect(emailInput).toBeTruthy();

    const passwordInput = await testdriver.find("Password input");
    expect(passwordInput).toBeTruthy();

    const result = await testdriver.assert("the Sign In form is displayed with email and password fields");
    expect(result).toBeTruthy();
  });

  it("should enter example credentials on the sign in page", async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.chrome({ url: `${APP_URL}/login` });

    const emailInput = await testdriver.find("Email address input");
    await emailInput.click();
    await testdriver.type("user@example.com");

    const passwordInput = await testdriver.find("Password input");
    await passwordInput.click();
    await testdriver.type("password123");

    const signInButton = await testdriver.find("Sign in button");
    await signInButton.click();

    const result = await testdriver.assert("the sign in form has been submitted with credentials");
    expect(result).toBeTruthy();
  });
});
