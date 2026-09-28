import { test, expect, Page } from "@playwright/test";
import { exerciseById } from '../../src/data/exercises';
import originalPictures from '../../assets/exercises-original/manifest.json';
const state = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("kwikroutine.v1")!));

test('every newly illustrated exercise loads its picture in the library', async ({ page }) => {
  await onboard(page);
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await page.getByRole('button', { name: 'Exercise library', exact: true }).click();
  const ids = [...originalPictures.assets.map(asset => asset.exerciseId), 'band-bridge'];
  for (const id of ids) {
    const exercise = exerciseById[id];
    await page.getByRole('textbox', { name: 'Search exercises', exact: true }).fill(exercise.name);
    await page.getByRole('button', { name: `View ${exercise.name}`, exact: true }).click();
    const picture = page.getByRole('img', { name: new RegExp(`^${exercise.name} — .*illustration$`) });
    await expect(picture).toBeVisible();
    await expect.poll(() => picture.evaluate(el => el instanceof HTMLImageElement
      ? el.complete && el.naturalWidth > 0 : !!el.querySelector('img')?.naturalWidth)).toBe(true);
    if (id === 'seated-band-row') await page.screenshot({ path: 'docs/screenshots/seated-band-row-picture.png' });
    await page.getByRole('button', { name: 'Back to the library', exact: true }).click();
  }
});
async function onboard(page: Page, sore: string[] = []) {
  await page.goto("/");
  await page.getByRole("button", { name: "Get started", exact: true }).click();
  // Experience, style, where, home equipment.
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  if (sore.length) {
    await page
      .getByRole("button", { name: "Pick from a list instead", exact: true })
      .click();
    for (const m of sore)
      await page.getByRole("button", { name: m, exact: true }).click();
  }
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Reveal first exercise", exact: true }),
  ).toBeVisible();
}
async function reveal(page: Page) {
  await page
    .getByRole("button", { name: "Reveal first exercise", exact: true })
    .click();
  await page
    .getByRole("button", { name: "I’m warmed up", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Start", exact: true }),
  ).toBeVisible();
}
test("onboarding, offline sets, rest, resume, and saved history", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await onboard(page);
  await page.screenshot({ path: "docs/screenshots/today.png" });
  await reveal(page);
  await page.screenshot({ path: "docs/screenshots/exercise-card.png" });
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Set done", exact: true }).click();
  await expect(page.getByText("Rest", { exact: true })).toBeVisible();
  await expect
    .poll(async () => (await state(page)).session.current.sets.length)
    .toBe(1);
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByText("Rest", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "I’m ready for my next set", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Finish exercise", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Finish & save workout", exact: true })
    .click();
  await expect(
    page.getByText("2 sets completed", { exact: false }),
  ).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/summary.png" });
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("tab", { name: "History", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /View workout from/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("a named gym and its equipment survive reload", async ({ page }) => {
  await onboard(page);
  await page.getByRole("tab", { name: "Profile", exact: true }).click();
  await page
    .getByRole("button", { name: "Add or edit places", exact: true })
    .click();
  await page.getByRole("button", { name: "Add a place", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Location name", exact: true })
    .fill("Downtown Fitness");
  await page.getByRole("button", { name: "Dumbbells", exact: true }).click();
  await page.getByRole("button", { name: "Weight bench", exact: true }).click();
  await page.getByRole("button", { name: "Save place", exact: true }).click();
  await expect.poll(async () => (await state(page)).locations.length).toBe(2);
  await page.reload();
  await page
    .getByRole("button", { name: "Edit Downtown Fitness", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Location name", exact: true }),
  ).toHaveValue("Downtown Fitness");
  await expect(
    page.getByRole("button", { name: "Dumbbells", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("soreness selection and exercise replacement adapt the next suggestion", async ({
  page,
}) => {
  await onboard(page, ["Triceps"]);
  await expect(page.getByText("Triceps (light)", { exact: true })).toBeVisible();
  await reveal(page);
  const before = (await state(page)).session.current.exerciseId;
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page.getByRole("radio", { name: "Not for me", exact: true }).click();
  await page.screenshot({ path: "docs/screenshots/skip.png" });
  await page
    .getByRole("button", { name: "Next exercise", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Start", exact: true }),
  ).toBeVisible();
  const after = await state(page);
  expect(after.disliked).toContain(before);
  expect(after.session.current.exerciseId).not.toBe(before);
  expect(after.session.sore).toContain("triceps");
});
test("trial expiry blocks new workouts but keeps the library accessible", async ({
  page,
}) => {
  await onboard(page);
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("kwikroutine.v1")!);
    d.trialStartedAt = Date.now() - 15 * 86400000;
    localStorage.setItem("kwikroutine.v1", JSON.stringify(d));
    localStorage.setItem(
      "kwikroutine.clock",
      JSON.stringify({ startedAt: d.trialStartedAt, lastSeenAt: Date.now() }),
    );
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Keep my routine going", exact: true })
    .click();
  await expect(
    page.getByText("Your free days have finished.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Subscribe yearly", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Restore purchases", exact: true })
    .click();
  await expect(
    page.getByText("Restore purchases will be available", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Back to today", exact: true })
    .first()
    .click();
  await page.getByRole("tab", { name: "Profile", exact: true }).click();
  await page
    .getByRole("button", { name: "Exercise library", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Search exercises", exact: true })
    .fill("wall push");
  await page
    .getByRole("button", { name: "View Wall push-up", exact: true })
    .click();
  await expect(
    page.getByText("Place your palms on a wall at shoulder height.", {
      exact: true,
    }),
  ).toBeVisible();
});
test("pain check-in prevents starting a workout", async ({ page }) => {
  await onboard(page);
  await page
    .getByRole("button", { name: "Update soreness", exact: true })
    .click();
  await page
    .getByRole("switch", { name: "Pain or a possible injury", exact: true })
    .click();
  await page.screenshot({ path: "docs/screenshots/soreness.png" });
  await page
    .getByRole("button", { name: "Feeling fresh", exact: true })
    .click();
  await expect(
    page.getByText("You reported pain today", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reveal first exercise", exact: true }),
  ).toHaveCount(0);
});

test('optional daily intent survives soreness edits and reaches the workout', async ({page}) => {
  await onboard(page);
  await expect(page.getByRole('button',{name:'Choose for me',exact:true})).not.toBeVisible();
  await page.getByRole('button',{name:"Change today's intent",exact:true}).click();
  await page.getByRole('button',{name:'Keep it familiar',exact:true}).click();
  await page.getByRole('button',{name:'Update soreness',exact:true}).click();
  await page.getByRole('button',{name:'Feeling fresh',exact:true}).click();
  await reveal(page);
  expect((await state(page)).session.intent).toBe('familiar');
  expect((await state(page)).session.style).toBe('familiar');
  await page.getByRole('button',{name:'Skip',exact:true}).click();
  await expect(page.getByRole('radio',{name:'No floor exercises',exact:true})).not.toBeVisible();
  await page.getByRole('button',{name:'More reasons',exact:true}).click();
  await page.getByRole('radio',{name:'No floor exercises',exact:true}).click();
  await page.getByRole('button',{name:'Next exercise',exact:true}).click();
  await expect.poll(async ()=>(await state(page)).feedback.at(-1)?.reason).toBe('floor');
  await page.reload();
  expect((await state(page)).feedback.at(-1).reason).toBe('floor');
});

test('machine pictures, searchable equipment, and exercise poses use bundled assets', async ({page}) => {
  await onboard(page);
  await page.getByRole('tab',{name:'Profile',exact:true}).click();
  await page.getByRole('button',{name:'Add or edit places',exact:true}).click();
  await page.getByRole('button',{name:'Add a place',exact:true}).click();
  await page.getByRole('button',{name:/More equipment/}).click();
  await page.getByRole('textbox',{name:'Find equipment',exact:true}).fill('Smith');
  await expect(page.getByRole('img',{name:'Smith machine equipment example',exact:true})).toBeVisible();
  await page.getByRole('textbox',{name:'Location name',exact:true}).fill('Machines');
  await page.getByRole('button',{name:'Smith machine',exact:true}).click();
  await page.getByRole('button',{name:'Save place',exact:true}).click();
  expect((await state(page)).locations.at(-1).equipment).toContain('smith-machine');
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await page.getByRole('button',{name:'Exercise library',exact:true}).click();
  await page.getByRole('textbox',{name:'Search exercises',exact:true}).fill('Machine Shoulder Press');
  await page.getByRole('button',{name:'View Machine Shoulder Press',exact:true}).click();
  const picture=page.getByRole('img',{name:'Machine Shoulder Press — start illustration',exact:true});
  await expect(picture).toBeVisible();
  // RN Web renders bundled images with a same-origin asset URL.
  await expect.poll(async()=>picture.evaluate(el=>el instanceof HTMLImageElement ? el.complete && el.naturalWidth>0 : !!el.querySelector('img')?.naturalWidth)).toBe(true);
  await page.getByRole('button',{name:'Finish position',exact:true}).click();
  await expect(page.getByRole('img',{name:'Machine Shoulder Press — finish illustration',exact:true})).toBeVisible();
  await page.screenshot({path:'docs/screenshots/machine-library.png'});
});

test('gym onboarding offers the full equipment selection with offline pictures', async ({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Get started',exact:true}).click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('checkbox',{name:'At home',exact:true}).click();
  await page.getByRole('checkbox',{name:'At a gym',exact:true}).click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByRole('button',{name:'Treadmill',exact:true})).not.toBeVisible();
  await page.getByRole('button',{name:/More equipment/}).click();
  await page.getByRole('textbox',{name:'Find equipment',exact:true}).fill('treadmill');
  const picture=page.getByRole('img',{name:'Treadmill equipment example',exact:true});
  await expect(picture).toBeVisible();
  await expect.poll(()=>picture.evaluate(el=>el instanceof HTMLImageElement ? el.complete&&el.naturalWidth>0 : !!el.querySelector('img')?.naturalWidth)).toBe(true);
  await page.getByRole('button',{name:'Treadmill',exact:true}).click();
  await page.getByRole('textbox',{name:'Find equipment',exact:true}).fill('rower');
  await page.getByRole('button',{name:'Rowing ergometer',exact:true}).click();
  await page.getByRole('textbox',{name:'Find equipment',exact:true}).fill('bike');
  await page.screenshot({path:'docs/screenshots/equipment-picker.png'});
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect.poll(async()=>(await state(page)).locations.find((p:{kind:string})=>p.kind==='gym')?.equipment).toContain('treadmill');
  await page.reload();
  expect((await state(page)).locations.find((p:{kind:string})=>p.kind==='gym').equipment).toContain('rower');
});

test('third and fourth places keep separate equipment and can start a workout', async ({ page }) => {
  await onboard(page);
  const additions = [
    { name: 'Downtown gym', kind: 'Gym', gear: 'Dumbbells' },
    { name: 'Hotel gym', kind: 'Gym', gear: 'Weight bench' },
    { name: 'Office', kind: 'Other', gear: null },
  ];
  for (const [index, place] of additions.entries()) {
    await page.getByRole('button', { name: 'Add a place', exact: true }).click();
    await page.getByRole('textbox', { name: 'Location name', exact: true }).fill(place.name);
    await page.getByRole('button', { name: place.kind, exact: true }).click();
    if (place.gear) await page.getByRole('button', { name: place.gear, exact: true }).click();
    await page.getByRole('button', { name: 'Save place', exact: true }).click();
    await expect(page.getByRole('radio', { name: place.name, exact: true })).toHaveAttribute('aria-checked', 'true');
    await expect.poll(async () => (await state(page)).locations.length).toBe(index + 2);
  }
  await page.reload();
  const saved = await state(page);
  expect(saved.locations.map((p: { name: string }) => p.name)).toEqual(['Home', 'Downtown gym', 'Hotel gym', 'Office']);
  expect(new Set(saved.locations.map((p: { id: string }) => p.id)).size).toBe(4);
  expect(saved.locations[1].equipment).toEqual(['dumbbells']);
  expect(saved.locations[2].equipment).toEqual(['bench']);
  expect(saved.locations[3]).toMatchObject({ kind: 'other', equipment: [] });
  await page.getByRole('button', { name: 'Add a place', exact: true }).click();
  await page.getByRole('textbox', { name: 'Location name', exact: true }).fill('Unsaved place');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Office', exact: true })).toHaveAttribute('aria-checked', 'true');
  expect((await state(page)).locations.length).toBe(4);
  await page.getByRole('radio', { name: 'Hotel gym', exact: true }).click();
  await page.screenshot({ path: 'docs/screenshots/multiple-places.png' });
  await reveal(page);
  expect((await state(page)).session.locationId).toBe(saved.locations[2].id);
  expect((await state(page)).session.locationName).toBe('Hotel gym');
});

test('home gym supports machines during onboarding and saved-place editing', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Get started', exact: true }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText('What do you have at home?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /More equipment/ }).click();
  const search = page.getByRole('textbox', { name: 'Find equipment', exact: true });
  await search.fill('leg press');
  await page.getByRole('button', { name: 'Leg press', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Just my body', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Just my body', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Leg press', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Leg press', exact: true }).click();
  await search.fill('smith');
  await page.getByRole('button', { name: 'Smith machine', exact: true }).click();
  await page.screenshot({ path: 'docs/screenshots/home-gym-equipment.png' });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect.poll(async () => (await state(page)).locations[0].equipment).toEqual(['leg-press', 'smith-machine']);
  await page.reload();
  expect((await state(page)).locations[0]).toMatchObject({ kind: 'home', equipment: ['leg-press', 'smith-machine'] });
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await page.getByRole('button', { name: 'Add or edit places', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Home', exact: true }).click();
  await page.getByRole('button', { name: /More equipment/ }).click();
  await search.fill('treadmill');
  await page.getByRole('button', { name: 'Treadmill', exact: true }).click();
  await page.getByRole('button', { name: 'Save place', exact: true }).click();
  await expect.poll(async () => (await state(page)).locations[0].equipment).toEqual(['leg-press', 'smith-machine', 'treadmill']);
  await page.reload();
  expect((await state(page)).locations[0].kind).toBe('home');
  expect((await state(page)).locations[0].equipment).toContain('treadmill');
});

test('workout style supports saved weekday plans and a temporary change today', async ({page})=>{
  await onboard(page);
  await page.getByRole('tab',{name:'Profile',exact:true}).click();
  await page.getByRole('button',{name:'Workout style',exact:true}).click();
  await page.getByRole('radio',{name:'Splits',exact:true}).click();
  await page.getByRole('button',{name:'Save workout style',exact:true}).click();
  expect((await state(page)).profile.routine).toBe('split');
  await page.getByRole('button',{name:'Workout style',exact:true}).click();
  await page.getByRole('radio',{name:'Custom week',exact:true}).click();
  await page.getByRole('button',{name:'Edit Monday',exact:true}).click();
  await page.getByRole('button',{name:'Pick muscles',exact:true}).click();
  await expect(page.getByRole('button',{name:'Save workout style',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Back',exact:true}).last().click();
  await page.getByRole('button',{name:'Biceps',exact:true}).click();
  await page.getByRole('button',{name:'Edit Wednesday',exact:true}).click();
  await page.getByRole('button',{name:'Legs & Core',exact:true}).click();
  const day=await page.evaluate(()=>new Date().toLocaleDateString('en-US',{weekday:'long'}));
  await page.getByRole('button',{name:`Edit ${day}`,exact:true}).click();
  await page.getByRole('button',{name:'Rest day',exact:true}).click();
  await page.screenshot({path:'docs/screenshots/custom-week.png',fullPage:true});
  await page.getByRole('button',{name:'Save workout style',exact:true}).click();
  await page.reload();
  expect((await state(page)).profile.routine).toBe('custom');
  await page.getByRole('tab',{name:'Today',exact:true}).click();
  await expect(page.getByText('Rest day',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Reveal first exercise',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Change today',exact:true}).click();
  await page.getByRole('button',{name:'Pick muscles',exact:true}).click();
  await page.getByRole('button',{name:'Back',exact:true}).last().click();
  await page.getByRole('button',{name:'Use today',exact:true}).click();
  await page.reload();
  await expect(page.getByText('My muscle groups',{exact:true})).toBeVisible();
  const saved=await state(page);expect(saved.workoutOverride.plan).toEqual({focus:'custom',muscles:['back']});
  await page.getByRole('button',{name:'Reveal first exercise',exact:true}).click();
  expect((await state(page)).session.targets).toEqual(['back']);
});

test('weight units convert legacy history, persist, and suggested loads remain editable across sets', async ({page})=>{
  await onboard(page);
  await page.evaluate(()=>{
    const d=JSON.parse(localStorage.getItem('kwikroutine.v1')!);
    const now=Date.now(),kg50=22.679619,kg525=23.813599;
    const old={id:'synthetic-history',startedAt:now-3*86400000-1200000,endedAt:now-3*86400000,locationId:d.selectedLocationId,locationName:'Home',minutes:30,focus:'full',targets:[],sore:[],excluded:[],unavailableEquipment:[],completed:[{exerciseId:'db-curl',plannedSets:2,sets:[{reps:12,weight:20,effort:'easy',at:now-3*86400000}]}],current:null,restUntil:null,warmupDone:true,engine:'rules'};
    d.history=[old];d.session={...old,id:'synthetic-active',startedAt:now,endedAt:undefined,completed:[],current:{exerciseId:'db-curl',plannedSets:2,sets:[],load:{previous:kg50,suggested:kg525,source:'laya'}}};
    localStorage.setItem('kwikroutine.v1',JSON.stringify(d));
  });
  await page.reload();
  await page.getByRole('tab',{name:'Profile',exact:true}).click();
  await page.getByRole('button',{name:'Weight units',exact:true}).click();
  await page.getByRole('button',{name:'Kilograms (kg)',exact:true}).click();
  await page.reload();
  expect((await state(page)).profile.weightUnit).toBe('kg');
  await page.getByRole('tab',{name:'History',exact:true}).click();
  await page.getByRole('button',{name:/View workout from/}).click();
  await expect(page.getByText(/20 kg/)).toBeVisible();
  await page.getByRole('button',{name:'Back to history',exact:true}).click();
  await page.getByRole('tab',{name:'Profile',exact:true}).click();
  await page.getByRole('button',{name:'Weight units',exact:true}).click();
  await page.getByRole('button',{name:'Pounds (lb)',exact:true}).click();
  await page.getByRole('tab',{name:'History',exact:true}).click();
  await page.getByRole('button',{name:/View workout from/}).click();
  await expect(page.getByText(/44.09 lb/)).toBeVisible();
  expect((await state(page)).history[0].completed[0].sets[0].weight).toBe(20);
  await page.getByRole('button',{name:'Back to history',exact:true}).click();
  await page.goto('/workout');
  await page.getByRole('button',{name:'Start',exact:true}).click();
  const weight=page.getByRole('textbox',{name:'Weight in pounds',exact:true});
  await expect(weight).toHaveValue('52.5');
  await expect(page.getByText(/Laya suggests 52.5 lb/)).toBeVisible();
  await page.getByRole('button',{name:'Use last weight',exact:true}).click();
  await expect(weight).toHaveValue('50');
  await weight.fill('45');
  await page.screenshot({path:'docs/screenshots/weight-progression.png',fullPage:true});
  await page.getByRole('radio',{name:'Too easy',exact:true}).click();
  await page.getByRole('button',{name:'Set done',exact:true}).click();
  await expect.poll(async()=>(await state(page)).session.current.sets[0].weight).toBeCloseTo(20.411657,5);
  await page.reload();
  await page.getByRole('button',{name:'I’m ready for my next set',exact:true}).click();
  await expect(weight).toHaveValue('45');
  await page.getByRole('button',{name:'Finish exercise',exact:true}).click();
  await expect.poll(async()=>(await state(page)).session.completed[0].sets[1].effort).toBe('right');
});
test('a “?” day in a custom week lets Laya choose on the day', async ({ page }) => {
  await onboard(page);
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await page.getByRole('button', { name: 'Workout style', exact: true }).click();
  await page.getByRole('radio', { name: 'Custom week', exact: true }).click();
  // Today's weekday opens for editing first.
  await page.getByRole('button', { name: '? Laya decides', exact: true }).click();
  await page.getByRole('button', { name: 'Save workout style', exact: true }).click();
  const weekday = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
  expect((await state(page)).profile.schedule[weekday]).toEqual({ focus: 'open' });
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await expect(page.getByText('Laya’s pick', { exact: true })).toBeVisible();
  await expect(page.getByText('Decided move by move', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/open-day.png' });
  await reveal(page);
  expect((await state(page)).session.focus).toBe('open');
});
test('soreness map steps through light, medium, very sore and back to none', async ({ page }) => {
  await onboard(page);
  await page.getByRole('button', { name: 'Update soreness', exact: true }).click();
  await page.getByRole('button', { name: 'Pick from a list instead', exact: true }).click();
  const quads = page.getByRole('button', { name: 'Quads', exact: true });
  await quads.click();
  await quads.click();
  await page.getByRole('button', { name: 'Chest', exact: true }).click();
  await page.screenshot({ path: 'docs/screenshots/soreness-levels.png' });
  await page.getByRole('button', { name: 'Save check-in', exact: true }).click();
  const checkIn = (await state(page)).checkIn;
  expect(checkIn.soreLevels).toEqual({ quads: 2, chest: 1 });
  await expect(page.getByText('Quads (medium), Chest (light)', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Update soreness', exact: true }).click();
  await page.getByRole('button', { name: 'Pick from a list instead', exact: true }).click();
  await page.getByRole('button', { name: 'Quads', exact: true }).click();
  await page.getByRole('button', { name: 'Quads', exact: true }).click();
  await page.getByRole('button', { name: 'Save check-in', exact: true }).click();
  expect((await state(page)).checkIn.soreLevels).toEqual({ chest: 1 });
});
