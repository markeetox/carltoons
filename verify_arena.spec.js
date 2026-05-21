import { test, expect } from '@playwright/test';

test('Verify battle arena layout', async ({ page }) => {
  // Go to the app
  await page.goto('http://localhost:8000');

  // Login (bypass auth by mocking or just filling)
  // Since we don't have a real backend, we'll just manipulate the DOM to show the battle screen
  await page.evaluate(() => {
    // Hide login
    document.getElementById('screen-login').classList.remove('active');
    // Show battle
    document.getElementById('screen-battle').classList.add('active');
    // Set some mock data
    document.getElementById('opponent-name').textContent = "Mighty Hawk";
    document.getElementById('player-arena-name').textContent = "Pidgey";

    // Build rigs (mocking the rig structure)
    const buildRig = (id) => {
       const rig = document.getElementById(id);
       rig.innerHTML = `
         <div class="pigeon-rig idle">
            <div class="p-layer" style="background: grey; width: 100%; height: 100%; border: 2px solid black;">RIG</div>
         </div>
       `;
    };
    buildRig('player-rig');
    buildRig('opponent-rig');

    // Hide matchmaking
    document.getElementById('matchmaking').classList.add('hidden');
  });

  // Capture screenshot on mobile
  await page.setViewportSize({ width: 375, height: 667 });
  await page.screenshot({ path: 'battle_mobile.png' });

  // Capture screenshot on tablet
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({ path: 'battle_tablet.png' });

  // Verify alignment
  const arenaSide = page.locator('.arena-side').first();
  const status = arenaSide.locator('.arena-status');
  // Use id selector to avoid strict mode violation if nested rigs exist
  const rig = arenaSide.locator('#opponent-rig');

  // Status should be above Rig
  const statusBox = await status.boundingBox();
  const rigBox = await rig.boundingBox();
  expect(statusBox.y).toBeLessThan(rigBox.y);
});
