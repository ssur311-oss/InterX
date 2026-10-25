const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1080}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4318');await page.waitForFunction(()=>window.moniSnapshot);
await page.waitForTimeout(700);await page.screenshot({path:__dirname+'/preview.png'});
await page.mouse.move(300,400);await page.waitForTimeout(650);const left=await page.evaluate(()=>moniSnapshot());
await page.mouse.move(1100,200);await page.waitForTimeout(650);const right=await page.evaluate(()=>moniSnapshot());
if(Math.abs(left.head[1]-right.head[1])<.1)throw Error('Pointer did not rotate head');
await page.getByRole('button',{name:'움직임 멈추기',exact:true}).click();const stopped=await page.evaluate(()=>moniSnapshot());await page.waitForTimeout(400);const after=await page.evaluate(()=>moniSnapshot());if(stopped.time!==after.time)throw Error('Pause failed');
await page.getByRole('button',{name:'움직임 켜기',exact:true}).click();await page.getByRole('button',{name:'혼자 놀기',exact:true}).click();await page.waitForTimeout(500);if((await page.evaluate(()=>moniSnapshot())).mode!=='idle')throw Error('Idle mode');
await page.getByRole('button',{name:'오늘 할 일',exact:true}).click();await page.waitForTimeout(1900);if(!(await page.locator('#chat').textContent()).includes('증빙 2건'))throw Error('Chat response');
await page.screenshot({path:__dirname+'/preview-chat.png'});
await page.getByRole('button',{name:'자동 반응',exact:true}).click();await page.waitForTimeout(8300);if(!(await page.locator('#state').textContent()).includes('혼자'))throw Error('Auto idle');await page.mouse.move(400,400);await page.waitForTimeout(100);if(!(await page.locator('#state').textContent()).includes('커서'))throw Error('Idle exit');
await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);if(!(await page.evaluate(()=>moniSnapshot())).paused)throw Error('Reduced motion');
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.screenshot({path:__dirname+'/preview-mobile.png',fullPage:true});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow');
// Decode the attached video locally and extract a contact sheet, without copying it to a public service.
await page.goto('http://127.0.0.1:4318');
const sheet=await page.evaluate(async()=>{const v=document.createElement('video');v.src='/reference.mp4';v.muted=true;await new Promise((resolve,reject)=>{v.onloadedmetadata=resolve;v.onerror=reject});const c=document.createElement('canvas');c.width=960;c.height=540;const ctx=c.getContext('2d');for(let i=0;i<6;i++){v.currentTime=(v.duration-.1)*i/5;await new Promise(r=>v.onseeked=r);ctx.drawImage(v,(i%3)*320,Math.floor(i/3)*270,320,240);ctx.fillStyle='white';ctx.fillRect((i%3)*320,Math.floor(i/3)*270+240,320,30);ctx.fillStyle='black';ctx.fillText(v.currentTime.toFixed(2)+'s',(i%3)*320+8,Math.floor(i/3)*270+260);}return {duration:v.duration,url:c.toDataURL('image/png')};});
fs.writeFileSync(__dirname+'/reference-frames.png',Buffer.from(sheet.url.split(',')[1],'base64'));
console.log(JSON.stringify({passed:['WebGL render','pointer tracking','pause','idle','chat state','automatic idle and resume','reduced motion','mobile no overflow'],errors,referenceDuration:sheet.duration}));await browser.close();if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
