import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

const stage=document.querySelector('#stage');
const status=document.querySelector('#state');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduced.matches, disposed=false, visible=true;
let mode='auto', modeStarted=0, lastInput=performance.now(), time=0, previous=performance.now();
let pointer={x:0,y:0}, pointerActive=false;
let renderer;
try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});} catch(error){document.querySelector('#error').style.display='block';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
stage.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','커서에 반응하는 아이보리색 3D 컴퓨터 모니');renderer.domElement.setAttribute('role','img');
const scene=new THREE.Scene();scene.background=new THREE.Color('#e5e5ed');
const camera=new THREE.OrthographicCamera(-4,4,3,-3,.1,60);camera.position.set(4.3,3.4,7);camera.lookAt(.3,1.05,0);
scene.add(new THREE.HemisphereLight(0xffffff,0xaba5ba,3));
const key=new THREE.DirectionalLight(0xfff5e5,4.4);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=6;key.shadow.camera.bottom=-6;key.shadow.normalBias=.035;key.shadow.bias=-.0001;key.shadow.radius=4;scene.add(key);
const fill=new THREE.DirectionalLight(0xffffff,1.2);fill.position.set(5,3,-4);scene.add(fill);
const ivory=new THREE.MeshStandardMaterial({color:0xe0d9c5,roughness:.32,metalness:.04});
const trim=new THREE.MeshStandardMaterial({color:0xaaa797,roughness:.55});
const dark=new THREE.MeshStandardMaterial({color:0x242735,roughness:.24,metalness:.15});
const green=new THREE.MeshBasicMaterial({color:0x6cff16,toneMapped:false});
const red=new THREE.MeshStandardMaterial({color:0xd64535,roughness:.4});
function rounded(w,h,d,r,material,x,y,z,parent){const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,4,r),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function face(w,h,d,r,material,x,y,z,parent){const s=new THREE.Shape();const l=-w/2,b=-h/2;s.moveTo(l+r,b);s.lineTo(l+w-r,b);s.quadraticCurveTo(l+w,b,l+w,b+r);s.lineTo(l+w,b+h-r);s.quadraticCurveTo(l+w,b+h,l+w-r,b+h);s.lineTo(l+r,b+h);s.quadraticCurveTo(l,b+h,l,b+h-r);s.lineTo(l,b+r);s.quadraticCurveTo(l,b,l+r,b);const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:.015,bevelSize:.015,bevelSegments:3,steps:1,curveSegments:16});const m=new THREE.Mesh(g,material);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xb5b4d1,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const computer=new THREE.Group();computer.position.x=-.4;scene.add(computer);
rounded(2.55,.5,1.85,.12,ivory,0,.32,0,computer);
rounded(2.32,.07,1.63,.03,trim,0,.59,0,computer);
rounded(1.25,.13,.9,.07,ivory,0,.68,-.08,computer);
// A ball joint anchors all rotation at the bottom of the monitor, not its center.
const joint=new THREE.Mesh(new THREE.SphereGeometry(.25,24,16),trim);joint.scale.set(1,.7,1);joint.position.set(0,.77,-.08);computer.add(joint);
const head=new THREE.Group();head.position.set(0,.79,-.08);computer.add(head);
rounded(2.13,1.78,1.25,.23,ivory,0,.9,0,head);
face(1.83,1.4,.05,.2,trim,0,.91,.63,head);
face(1.67,1.25,.04,.22,dark,0,.92,.705,head);
// Subtle glass reflection stays attached to the monitor.
const sheen=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.055,depthWrite:false});
rounded(1.32,.11,.006,.045,sheen,-.04,1.39,.77,head).rotation.z=.045;
const eyes=new THREE.Group();eyes.position.set(0,.96,.787);head.add(eyes);
const eyeParts=[];const smileParts=[];
for(const x of [-.34,.34]){
  const eye=new THREE.Mesh(new THREE.CapsuleGeometry(.065,.27,8,16),green);eye.position.set(x,0,0);eye.scale.z=.3;eyes.add(eye);eyeParts.push(eye);
  const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(x-.11,-.015,.01),new THREE.Vector3(x,.16,.01),new THREE.Vector3(x+.11,-.015,.01));
  const smile=new THREE.Mesh(new THREE.TubeGeometry(curve,20,.027,8,false),green);smile.visible=false;eyes.add(smile);smileParts.push(smile);
}
// Front floppy drive, eject button, indicator, and side vents.
rounded(.62,.18,.027,.025,trim,.61,.32,.936,computer);
rounded(.49,.025,.035,.006,dark,.61,.35,.954,computer);
rounded(.12,.035,.04,.01,red,.79,.287,.955,computer);
rounded(.035,.035,.02,.01,green,-.94,.29,.94,computer);
for(let i=0;i<5;i++)rounded(.024,.18,.055,.01,trim,-1.277,.34,.35-i*.16,computer);
for(let i=0;i<5;i++)rounded(.018,.31,.045,.012,trim,1.068,.9,-.33+i*.12,head);
// Mouse and cable remain grounded while the head moves.
const mouse=new THREE.Group();mouse.position.set(1.15,.13,1.32);mouse.rotation.y=-.24;scene.add(mouse);
const mouseBody=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),ivory);mouseBody.scale.set(.27,.18,.4);mouse.add(mouseBody);mouseBody.castShadow=true;
rounded(.012,.012,.21,.005,trim,0,.167,-.1,mouse);
const cablePath=new THREE.CatmullRomCurve3([new THREE.Vector3(.85,.12,-.2),new THREE.Vector3(1.8,.04,-.1),new THREE.Vector3(2,.04,.5),new THREE.Vector3(.85,.04,.8),new THREE.Vector3(1.23,.08,1.02)]);
const cable=new THREE.Mesh(new THREE.TubeGeometry(cablePath,60,.018,8,false),ivory);scene.add(cable);cable.castShadow=true;
// A small plant echoes the reference without moving the camera or scenery.
const plant=new THREE.Group();plant.position.set(1.6,0,-.55);scene.add(plant);
const pot=new THREE.Mesh(new THREE.SphereGeometry(.32,32,20),new THREE.MeshStandardMaterial({color:0xf2f0e7,roughness:.35}));pot.position.y=.26;pot.scale.y=.87;pot.castShadow=true;plant.add(pot);
const soil=new THREE.Mesh(new THREE.CylinderGeometry(.23,.23,.03,32),new THREE.MeshStandardMaterial({color:0x393e28,roughness:1}));soil.position.y=.49;plant.add(soil);
const leafMat=new THREE.MeshStandardMaterial({color:0x449724,roughness:.4});
for(let i=0;i<7;i++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),leafMat);const a=i*Math.PI*2/7;leaf.scale.set(.1,.31,.045);leaf.position.set(Math.cos(a)*.15,.65+((i%2)*.04),Math.sin(a)*.15);leaf.rotation.set(Math.sin(a)*.7,0,-Math.cos(a)*.7);leaf.castShadow=true;plant.add(leaf);}
let targetQ=new THREE.Quaternion();const targetEuler=new THREE.Euler(0,0,0,'YXZ');
const ease=(a,b,k,dt)=>THREE.MathUtils.lerp(a,b,1-Math.exp(-k*dt));
let blinkCountdown=2.5,blinkAge=1,eyeX=0,eyeY=0,currentLabel='';
function label(text){if(text!==currentLabel){status.textContent=text;currentLabel=text;}}
function setMode(next){mode=next;modeStarted=time;lastInput=performance.now();document.querySelectorAll('[data-action]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.action===next)));}
function onPointer(event){const r=stage.getBoundingClientRect();pointer.x=THREE.MathUtils.clamp((event.clientX-r.left-r.width/2)/(r.width*.65),-1,1);pointer.y=THREE.MathUtils.clamp((event.clientY-r.top-r.height/2)/(r.height*.65),-1,1);pointerActive=true;lastInput=performance.now();}
function onLeave(){pointerActive=false;pointer.x=pointer.y=0;}
window.addEventListener('pointermove',onPointer,{passive:true});window.addEventListener('pointerdown',onPointer,{passive:true});document.documentElement.addEventListener('pointerleave',onLeave);
function resize(){const {width,height}=stage.getBoundingClientRect();renderer.setSize(width,height);const aspect=width/height;const span=aspect<1?3.7:2.8;camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.updateProjectionMatrix();}
const observer=new ResizeObserver(resize);observer.observe(stage);resize();
const intersection=new IntersectionObserver(entries=>visible=entries[0].isIntersecting);intersection.observe(stage);
function pauseUI(){document.querySelector('#pause').textContent=paused?'움직임 켜기':'움직임 멈추기';document.querySelector('#pause').setAttribute('aria-pressed',String(paused));}
document.querySelector('#pause').addEventListener('click',()=>{paused=!paused;pauseUI();if(!paused)lastInput=performance.now();});pauseUI();
function onReduced(){paused=reduced.matches;pauseUI();}reduced.addEventListener('change',onReduced);
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.action)));
let frame=0;
function animate(now){if(disposed)return;frame=requestAnimationFrame(animate);const dt=Math.min((now-previous)/1000,.05);previous=now;if(document.hidden||!visible)return;
 if(!paused){time+=dt;const elapsed=time-modeStarted;if(['greet','happy'].includes(mode)&&elapsed>3.2)setMode('auto');if(mode==='think'&&elapsed>7)setMode('auto');
 const idle=mode==='idle'||(mode==='auto'&&now-lastInput>8000);const phase=time*Math.PI*2/6;
 let yaw=.23,pitch=-.02,roll=0,bob=.012*Math.sin(phase);let gx=0,gy=0;
 if(idle){const p=(time-modeStarted)%16;const look=Math.sin(p/16*Math.PI*2);yaw+=.19*look;pitch+=.045*Math.sin(p/8*Math.PI*2);roll=.025*Math.sin(phase);gx=.03*look;gy=.012*Math.sin(phase);if(p>10&&p<14){const blend=Math.sin((p-10)/4*Math.PI);yaw+=.17*blend;pitch+=.13*blend;gy-=.035*blend;}label('대기 중 · 혼자 놀기');}
 else if(mode==='auto'){yaw+=pointerActive?pointer.x*.44:0;pitch+=pointerActive?pointer.y*.23:0;roll=pointerActive?-pointer.x*.025:0;gx=pointer.x*.06;gy=-pointer.y*.04;label('커서를 따라보는 중');}
 else if(mode==='think'){pitch=-.11;roll=.11;gx=.045*Math.sin(time*1.5);gy=.04;label('생각 중 · 잠시만요');}
 else if(mode==='greet'){yaw+=.12*Math.sin(elapsed*3);pitch+=.09*Math.sin(elapsed*5);roll=.04*Math.sin(elapsed*3);label('반가워요!');}
 else if(mode==='happy'){pitch+=.12*Math.sin(elapsed*5)*Math.exp(-elapsed*.55);bob+=.025*Math.sin(elapsed*5);label('완료했어요');}
 targetEuler.set(THREE.MathUtils.clamp(pitch,-.25,.25),THREE.MathUtils.clamp(yaw,-.3,.7),roll);targetQ.setFromEuler(targetEuler);head.quaternion.slerp(targetQ,1-Math.exp(-4.6*dt));head.position.y=ease(head.position.y,.79+bob,5,dt);
 eyeX=ease(eyeX,gx,9,dt);eyeY=ease(eyeY,gy,9,dt);eyes.position.x=eyeX;eyes.position.y=.96+eyeY;
 blinkCountdown-=dt;blinkAge+=dt;if(blinkCountdown<=0){blinkAge=0;blinkCountdown=3.2+Math.random()*2.8;}
 const blink=blinkAge<.16?1-.93*Math.sin(Math.PI*blinkAge/.16):1;eyeParts.forEach(e=>{e.scale.y=blink;e.visible=mode!=='happy';});smileParts.forEach(e=>e.visible=mode==='happy');
 }else label('움직임 멈춤');
 renderer.render(scene,camera);
}
frame=requestAnimationFrame(animate);
const chat=document.querySelector('#chat');let replying=false,replyTimer;
function addMessage(text,user=false){const wrap=document.createElement('div');const small=document.createElement('small');small.textContent=user?'나':'모니';const bubble=document.createElement('div');bubble.className='bubble'+(user?' user':'');bubble.textContent=text;wrap.append(small,bubble);chat.append(wrap);chat.scrollTop=chat.scrollHeight;}
function sendMessage(text){if(!text.trim()||replying)return;replying=true;addMessage(text,true);document.querySelector('#message').value='';setMode('think');document.querySelector('button[type=submit]').disabled=true;replyTimer=setTimeout(()=>{let reply=text.includes('마감')?'예시 과제의 사내 마감은 10월 27일이에요. 마감일을 넘는 제출 약속이 있다면 먼저 확인해 주세요.':text.includes('오늘')?'예시로 약속일이 지난 증빙 2건이 있어요. 받은 슬랙 답변부터 반영한 뒤 재통보 대상을 확인하면 좋아요.':'지금은 캐릭터 동작을 보여주는 시연이에요. 실제 연결 후에는 증빙 현황을 바탕으로 답하고, 저장과 발송 전에는 꼭 확인을 받을게요.';addMessage(reply);setMode('happy');replying=false;document.querySelector('button[type=submit]').disabled=false;},1500);}
document.querySelector('#form').addEventListener('submit',e=>{e.preventDefault();sendMessage(document.querySelector('#message').value);});
document.querySelectorAll('[data-message]').forEach(b=>b.addEventListener('click',()=>sendMessage(b.dataset.message)));
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();document.querySelector('#error').style.display='block';});
window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(frame);clearTimeout(replyTimer);observer.disconnect();intersection.disconnect();window.removeEventListener('pointermove',onPointer);window.removeEventListener('pointerdown',onPointer);document.documentElement.removeEventListener('pointerleave',onLeave);reduced.removeEventListener('change',onReduced);scene.traverse(o=>{o.geometry?.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});renderer.dispose();});
// Read-only snapshot for preview verification; no data, AI, or network side effects.
window.moniSnapshot=()=>({mode,paused,time,head:head.rotation.toArray().slice(0,3),eyes:[eyeX,eyeY],objects:scene.children.length});
