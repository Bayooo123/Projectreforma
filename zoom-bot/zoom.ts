import type { Browser, Page } from 'playwright';
import { chromium } from 'playwright';

export interface ParsedZoomLink {
    meetingId: string;
    pwd?: string;
}

// Handles the common link shapes: https://zoom.us/j/123..., https://
// us02web.zoom.us/j/123...?pwd=..., https://company.zoom.us/j/123.... The
// meeting ID is the run of digits after /j/; everything else (subdomain,
// tracking params) is irrelevant to actually joining.
export function parseZoomLink(link: string): ParsedZoomLink {
    const url = new URL(link);
    const match = url.pathname.match(/\/j\/(\d+)/);
    if (!match) throw new Error(`Could not find a meeting ID in "${link}"`);
    return { meetingId: match[1], pwd: url.searchParams.get('pwd') ?? undefined };
}

export interface JoinedMeeting {
    browser: Browser;
    page: Page;
}

// Joins via Zoom's web client (app.zoom.us/wc/...) rather than the desktop
// app — no Zoom account or desktop install needed, and it's scriptable with
// a normal browser. This is inherently more fragile than an official SDK:
// Zoom can change this page's markup at any time, and a waiting room needs
// a human to admit the bot before it can actually be recording anything.
export async function joinMeeting(
    meetingId: string,
    pwd: string | undefined,
    displayName: string,
    headless: boolean
): Promise<JoinedMeeting> {
    const browser = await chromium.launch({
        headless,
        args: ['--use-fake-ui-for-media-stream', '--disable-blink-features=AutomationControlled'],
    });
    const context = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const page = await context.newPage();

    const joinUrl = `https://app.zoom.us/wc/${meetingId}/join${pwd ? `?pwd=${encodeURIComponent(pwd)}` : ''}`;
    await page.goto(joinUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });

    // Zoom's web client sometimes lands on an interstitial "Sign In / Join
    // from your Browser" page before the actual join form — click past it
    // if present, otherwise the name field below is already there.
    const browserLink = page.getByText(/join from your browser/i);
    if (await browserLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await browserLink.click();
    }

    const nameInput = page.locator('#inputname, input[type="text"]').first();
    await nameInput.waitFor({ state: 'visible', timeout: 30_000 });
    await nameInput.fill(displayName);

    const joinButton = page.getByRole('button', { name: /^join$/i }).first();
    await joinButton.click();

    // A waiting room means a human has to admit the bot — this can take a
    // while, so the wait here is generous rather than a normal UI timeout.
    // The presence of Zoom's in-meeting toolbar (the mute button always
    // renders once actually in the meeting) is what actually confirms entry.
    const muteButton = page.locator('[aria-label*="mute" i], button:has-text("Mute")').first();
    await muteButton.waitFor({ state: 'visible', timeout: 10 * 60_000 });

    // Best-effort — a bot with an open mic/camera is a liability even if
    // muting fails for some reason, so this never blocks joining.
    await muteButton.click().catch(() => {});
    const stopVideoButton = page.locator('[aria-label*="stop video" i]').first();
    await stopVideoButton.click({ timeout: 5000 }).catch(() => {});

    return { browser, page };
}

// Polls for the meeting having ended (the toolbar/mute button disappearing,
// or explicit "this meeting has been ended" text) rather than assuming any
// fixed length. Falls back to maxDurationMs so a detection miss can't hang
// the bot in a dead meeting forever.
export async function waitForMeetingEnd(page: Page, maxDurationMs: number): Promise<void> {
    const deadline = Date.now() + maxDurationMs;
    const endedText = page.getByText(/this meeting has been ended|meeting has ended|left the meeting/i);
    const muteButton = page.locator('[aria-label*="mute" i], button:has-text("Mute")').first();

    while (Date.now() < deadline) {
        if (page.isClosed()) return;
        if (await endedText.isVisible({ timeout: 1000 }).catch(() => false)) return;
        if (!(await muteButton.isVisible({ timeout: 1000 }).catch(() => false))) {
            // Toolbar gone — confirm it's not just a transient re-render by
            // checking again shortly before concluding the meeting is over.
            await page.waitForTimeout(5000);
            if (page.isClosed()) return;
            if (!(await muteButton.isVisible({ timeout: 1000 }).catch(() => false))) return;
        }
        await page.waitForTimeout(15_000);
    }
}
