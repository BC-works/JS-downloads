// Seed a topic and saved publisher responses with the previous desktop binary.
// The upgraded app must read those responses through its native profile route.
const assert = require('node:assert/strict');
const topicName = 'Native automatic source scan';
const memberCount = 18;

async function seedSourceScan(app, page) {
  const rows = Array.from({length: memberCount}, (_, i) => {
    const name = 'Review Person ' + String.fromCharCode(65 + i);
    return {
      personId: 'scan:' + i, name, date: '1988-04-15',
      url: 'https://www.astrotheme.com/astrology/' + name.replaceAll(' ', '_'),
      time: '05:' + String(i).padStart(2, '0')
    };
  });
  await page.evaluate(async ({topicName, rows}) => {
    const {createResearchStore, addResearchCohortProject} = await import('/research-storage.mjs');
    const store = await createResearchStore();
    const register = 'https://example.org/native-test-register';
    try {
      if ((await store.listProjects()).some(project => project.name === topicName)) {
        throw Error('Baseline already contained the source scan fixture');
      }
      const members = rows.map(({personId, name, date, url}, i) => ({
        personId, name, input: {
          name, date, time:'12:00:00', timeKnown:false, city:'Brooklyn', lat:40.6501, lon:-73.94958,
          tz:'America/New_York', source: {name:'Synthetic register', url:register, timeKnown:false,
            reliability:'X', birthProfileCandidates:[{url, rank:i}]}
        }
      }));
      await addResearchCohortProject(store, {title:topicName, members, cohort:{
        prompt:'Test remaining published birth profiles', criteria:{title:topicName, description:'Native upgrade fixture.'},
        sources:[{label:'Synthetic register', url:register}], complete:true, omitted:[],
        stats:{discovered:rows.length, charted:rows.length, knownTimes:0, unknownTimes:rows.length, missingPlaces:0}
      }});
    } finally { store.close(); }
  }, {topicName, rows});
  await app.evaluate(({app}, rows) => {
    const require = process.getBuiltinModule('module').createRequire(app.getAppPath() + '/package.json');
    const {DatabaseSync} = require('node:sqlite');
    const path = process.getBuiltinModule('path');
    const db = new DatabaseSync(path.join(app.getPath('userData'), 'lookup-cache.sqlite'));
    try {
      const insert = db.prepare('INSERT INTO lookup_cache (key,value,expires,stale_until) VALUES (?,?,?,?)');
      const tomorrow = Date.now() + 86400000;
      for (const {name, date, url, time} of rows) {
        const profile = {name, date, time, timeKnown:true, url, provider:'Astrotheme',
          place:'Brooklyn (NY)', country:'United States', lat:40.6501, lon:-73.94958, tz:'America/New_York',
          source:{reliability:'AA'}, fetchedAt:new Date().toISOString()};
        insert.run('profile:v2:' + url, JSON.stringify(profile), tomorrow, tomorrow);
      }
    } finally { db.close(); }
  }, rows);
}

async function scanState(page) {
  return page.evaluate(async title => {
    const {createResearchStore} = await import('/research-storage.mjs');
    const store = await createResearchStore();
    try {
      const entry = (await store.listProjects()).find(item => item.name === title);
      if (!entry) throw Error('Upgrade lost the previous topic');
      const project = await store.getProject(entry.id);
      const records = project.members.map(member => ({
        id:member.sourcePersonId, time:member.input.time, known:member.input.timeKnown,
        rating:member.input.source?.birthCorrection?.reliability, source:member.input.source?.birthCorrection?.url
      }));
      return {id:project.id, records};
    } finally { store.close(); }
  }, topicName);
}

async function openScan(page, id) {
  await page.locator('[data-workspace=research]').click();
  await page.locator('[data-r-library-topic="' + id + '"]').click();
  await page.locator('#continue-research').click();
  const report = page.locator('.research-cohort-report');
  if (!(await report.evaluate(el => el.open))) await report.locator('summary').click();
  await page.getByRole('button', {name:'Recheck birth details'}).click();
  return page.getByRole('dialog', {name:'Recheck birth details'});
}

async function checkSourceScan(page, {reopen=false}={}) {
  const before = await scanState(page);
  assert.equal(before.records.length, memberCount);
  assert.equal(before.records.filter(row => row.known).length, 0, 'Unapplied proposals changed the topic');
  const dialog = await openScan(page, before.id);
  const reads = [];
  function onResponse(response) {
    const url = new URL(response.url());
    if (url.protocol !== 'jyotish:' || url.pathname !== '/api/people/research-profile') return;
    reads.push(response.json().then(body => ({url:body.profile?.url, cached:body.profile?.cached})));
  }
  page.on('response', onResponse);
  async function checkedLinks() {
    page.off('response', onResponse);
    const found = await Promise.all(reads);
    assert.ok(found.every(item => item.cached === true), 'Native lookup should reuse the seeded publisher responses');
    return new Set(found.map(item => item.url)).size;
  }
  if (!reopen) {
    // A cache hit can finish before Playwright's polling click. Stop as soon
    // as we can see at least two independent results in the real progress UI.
    await dialog.evaluate(el => {
      const stopWhenReady = new MutationObserver(() => {
        const progress = el.querySelector('[aria-label="Birth profile links checked"]');
        if (!progress || Number(progress.value) < 2) return;
        const stop = Array.from(el.querySelectorAll('button')).find(b => b.textContent.trim()==='Stop and review');
        if (stop && !stop.disabled) {stopWhenReady.disconnect(); stop.click();}
      });
      stopWhenReady.observe(el, {subtree:true, attributes:true, childList:true, characterData:true});
    });
    await dialog.getByRole('button', {name:'Check sources'}).click();
    await dialog.getByRole('button', {name:'Resume profile check'}).waitFor({timeout:45000});
    const preview = dialog.getByRole('button', {name:/^Apply \d+ changes?$/});
    const expected = Number((await preview.innerText()).match(/\d+/)[0]);
    assert.ok(expected >= 2 && expected < memberCount, 'Stop should leave a partial review');
    await dialog.getByRole('button', {name:'Close and keep progress',exact:true}).click();
    await dialog.waitFor({state:'hidden'});
    assert.equal((await scanState(page)).records.filter(row => row.known).length, 0);
    const verifiedNativeCacheHits = await checkedLinks();
    assert.equal(verifiedNativeCacheHits, expected);
    await page.locator('[data-workspace=charts]').click();
    console.log(JSON.stringify({nativeAutoBirthScan:true, verifiedNativeCacheHits, reopen:false, priorVersionFixture:true,
      records:memberCount, proposedAtStop:expected, appliedBeforeClose:0}));
    return;
  }
  const saved = await dialog.getByRole('button', {name:'Resume saved check'}).waitFor().then(() => dialog.innerText());
  const persistedCount = Number(saved.match(/(\d+) profile links checked/)[1]);
  assert.ok(persistedCount>=2 && persistedCount<memberCount);
  await dialog.evaluate(el => {
    const minimizeWhileReading = new MutationObserver(() => {
      if (!el.querySelector('[aria-label="Birth profile links checked"]')) return;
      minimizeWhileReading.disconnect();
      el.querySelector('[data-minimize]').click();
    });
    minimizeWhileReading.observe(el, {subtree:true, childList:true});
  });
  await dialog.getByRole('button', {name:'Resume saved check'}).click();
  const indicator = page.locator('.birth-check-status');
  await indicator.waitFor({timeout:45000});
  assert.equal(await dialog.isVisible(), false);
  await page.locator('[data-workspace=charts]').click();
  await page.locator('.window-title .birth-check-status[data-state=complete]').waitFor({timeout:120000});
  assert.match(await indicator.innerText(), /18 changes to review/);
  await indicator.click();
  await dialog.waitFor();
  const apply = dialog.getByRole('button', {name:'Apply ' + memberCount + ' changes'});
  await apply.waitFor({timeout:120000});
  assert.equal((await scanState(page)).records.filter(row => row.known).length, 0);
  const verifiedNativeCacheHits = await checkedLinks();
  assert.equal(verifiedNativeCacheHits, memberCount-persistedCount, 'Resume repeated a completed link');
  await apply.click();
  await dialog.waitFor({state:'hidden'});
  await page.reload();
  await page.waitForSelector('[data-workspace=research]');
  const after = await scanState(page);
  for (const row of after.records) {
    const i = Number(row.id.replace('scan:', ''));
    assert.equal(row.known, true);
    assert.ok(['05:' + String(i).padStart(2,'0'), '05:' + String(i).padStart(2,'0') + ':00'].includes(row.time));
    assert.equal(row.rating, 'AA');
    assert.equal(row.source, 'https://www.astrotheme.com/astrology/Review_Person_' + String.fromCharCode(65+i));
  }
  await page.locator('[data-workspace=charts]').click();
  console.log(JSON.stringify({nativeAutoBirthScan:true, verifiedNativeCacheHits, persistedCount, reopen:true, restoredDraft:true, verifiedSourceClocks:after.records.length,
    firstAndLastLinks:true, appliedAfterReview:true, persistedAfterReload:true, completedWhileMinimizedAcrossWorkspaces:true}));
}

module.exports = {seedSourceScan, checkSourceScan};
