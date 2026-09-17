import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const endpoint='**/motions/vop-nav/episode.json';
const recording=await readFile('public/models/go2/motions/vop-nav/episode.json','utf8');
async function open(page){
 await page.route('https://*.supabase.co/**',route=>route.fulfill({contentType:'application/json',body:'[]'}));
 await page.goto('/');await page.locator('#playground').scrollIntoViewIfNeeded();
 await expect(page.locator('#model-status')).toHaveText('READY TO EXPLORE',{timeout:25000});
}
async function seek(page,time){
 await page.locator('#run-progress').evaluate((input,t)=>{input.value=String(t);input.dispatchEvent(new Event('input',{bubbles:true}));},time);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
test('VOP-Nav replays the full episode, changes camera, seeks all objects and ends without looping',async({page})=>{
 test.setTimeout(60000);const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/vop-nav/'))requests.push(r.url());});
 await page.setViewportSize({width:1440,height:1200});await open(page);expect(requests).toHaveLength(0);
 await page.getByRole('button',{name:'VOP-Nav',exact:true}).click();
 await expect(page.locator('#vop-readout')).toBeVisible();
 await expect(page.locator('[data-vop-view="follow"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#vop-trail')).not.toBeChecked();
 await page.locator('[data-vop-view="overview"]').click();
 await page.locator('#vop-trail').check();
 await expect.poll(()=>page.locator('#run-progress').inputValue().then(Number)).toBeGreaterThan(.1);
 await page.getByRole('button',{name:'Pause VOP-Nav',exact:true}).click();await seek(page,0);
 const start=await page.locator('#robot-viewport canvas').screenshot();
 await expect(page.locator('#vop-dynamic-count')).toHaveText('8');await expect(page.locator('#vop-static-count')).toHaveText('6');
 await seek(page,4.5);await expect(page.locator('#vop-distance')).toHaveText('6.65 m');
 await expect(page.locator('#vop-travelled')).toHaveText('5.19 m');
 const middle=await page.locator('#robot-viewport canvas').screenshot();expect(start.equals(middle)).toBe(false);
 const time=await page.locator('#run-progress').inputValue();await page.waitForTimeout(180);
 expect(await page.locator('#run-progress').inputValue()).toBe(time);
 await page.getByRole('button',{name:'Follow Go2',exact:true}).click();
 await expect(page.locator('[data-vop-view="follow"]')).toHaveAttribute('aria-pressed','true');
 const follow=await page.locator('#robot-viewport canvas').screenshot();expect(follow.equals(middle)).toBe(false);
 await page.locator('[data-vop-view="top"]').click();
 await page.locator('#vop-trail').uncheck();await page.locator('#reset-view').click();
 await page.locator('[data-vop-view="overview"]').click();
 await page.setViewportSize({width:390,height:1000});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.locator('[data-pose="vop"]')).toBeVisible();await expect(page.locator('#run-speed')).toBeVisible();
 await seek(page,9.4);await page.locator('#run-speed').selectOption('2');
 await page.getByRole('button',{name:'Resume VOP-Nav',exact:true}).click();
 await expect(page.locator('#model-status')).toHaveText('GOAL REACHED · RECORDED RESULT');
 await expect(page.locator('#vop-distance')).toHaveText('0.11 m');await expect(page.locator('#vop-travelled')).toHaveText('13.66 m');
 await expect(page.locator('#run-time')).toHaveText('9.54 / 9.54 s');
 await page.waitForTimeout(200);await expect(page.locator('#run-time')).toHaveText('9.54 / 9.54 s');
 await page.getByRole('button',{name:'Replay VOP-Nav',exact:true}).click();
 await expect.poll(()=>page.locator('#run-progress').inputValue().then(Number)).toBeLessThan(2);
 await page.locator('[data-pose="stand"]').click();await expect(page.locator('#vop-readout')).toBeHidden();
 await expect(page.locator('#run-controls')).toBeHidden();await expect(page.locator('.console-heading')).toContainText('Meet Go2');
 await page.locator('[data-pose="run"]').click();await expect(page.locator('#model-status')).toContainText('RUNNING');
 await page.locator('[data-pose="crouch"]').click();await expect(page.locator('#run-controls')).toBeHidden();
 await page.locator('[data-pose="vop"]').click();await expect(page.locator('#vop-readout')).toBeVisible();
 expect(requests).toHaveLength(1);expect(errors).toEqual([]);
});

test('velocity regions load on demand, match the seeked frame, and recover independently',async({page})=>{
 let attempts=0;const bytes=await readFile('public/models/go2/motions/vop-nav/perception.bin');
 await page.route('**/vop-nav/perception.bin',route=>{attempts++;return attempts===1?route.fulfill({status:503}):route.fulfill({contentType:'application/octet-stream',body:bytes});});
 await open(page);await page.locator('[data-pose="vop"]').click();await expect(page.locator('#vop-readout')).toBeVisible();
 await page.getByRole('button',{name:'Pause VOP-Nav',exact:true}).click();expect(attempts).toBe(0);
 await page.locator('#vop-perception summary').click();await expect(page.locator('#vop-map-status')).toContainText('could not load');
 await page.locator('#vop-map-retry').click();await expect(page.locator('#vop-map-status')).toContainText('Frame');
 await seek(page,4.5);await expect(page.locator('#vop-map-status')).toContainText('Frame 226 / 478');
 const first=await page.locator('#vop-map').screenshot();await seek(page,7);
 const second=await page.locator('#vop-map').screenshot();expect(first.equals(second)).toBe(false);
 await page.locator('#vop-perception summary').click();await page.locator('#vop-perception summary').click();expect(attempts).toBe(2);
});

test('failed and cancelled episode loads leave the existing poses usable',async({page})=>{
 let attempts=0,release;const pending=new Promise(resolve=>{release=resolve;});
 await page.route(endpoint,async route=>{attempts++;if(attempts===1)return route.fulfill({status:503});await pending;return route.fulfill({contentType:'application/json',body:recording});});
 await open(page);await page.locator('[data-pose="vop"]').click();await expect(page.locator('#model-status')).toContainText('CLICK VOP-NAV TO RETRY');
 await page.locator('[data-pose="vop"]').click();await expect(page.locator('[data-pose="vop"]')).toHaveText('Loading…');
 await page.locator('[data-pose="crouch"]').click();release();await expect(page.locator('[data-pose="vop"]')).toBeEnabled();
 await expect(page.locator('[data-pose="crouch"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#vop-readout')).toBeHidden();
 await page.locator('[data-pose="vop"]').click();await expect(page.locator('#vop-readout')).toBeVisible();expect(attempts).toBe(2);
});
