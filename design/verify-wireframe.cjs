const fs = require('node:fs');
const vm = require('node:vm');
let html = fs.readFileSync(__dirname + '/wireframe.html', 'utf8');
html = html.replace("19:['리마인드 D-7'],20:['자율제조 D-7']", "20:['자율제조 D-7'],21:['제조 LLM D-7'],22:['품질 AI D-7']")
 .replace('샘플 3건 · 필요 서류 10개 · 규칙 없음 1건', '샘플 3건 · 규칙 연결 검토 예시')
 .replace('3번째 건은 규칙 없음 예시예요. 결제 증빙만 생성하고 관리자 확인 대상으로 남겨요. 이 화면의 집계는 고정 예시예요.', '규칙이 없는 조합은 결제 증빙만 생성하고 확인 대상으로 남겨요. 위 표는 등록 이후 상태를 설명하는 가상 예시예요.');
fs.writeFileSync(__dirname + '/wireframe.html', html);
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const nodes = {};
const context = { document: { querySelector: s => nodes[s] ??= {innerHTML:'', textContent:'', value:'', hidden:false, showModal(){}, close(){} } }, window: {scrollTo(){}}, setTimeout, clearTimeout, console };
vm.createContext(context);
vm.runInContext(source, context);
vm.runInContext(`
for (const id of ['home','expenses','calendar','slack','upload','files','settings','budget','guide','login']) {go(id); if (!app.innerHTML.includes('<')) throw Error(id)}
for (const step of [0,1,2]) {uploadStep=step;go('upload')}
slackTab='send';go('slack');
for (const t of ['과제','사람','증빙 규칙','위험 기준','마감 일정','슬랙 연결']) {settingsTab=t;go('settings')}
detail(1);detail(4);
go('expenses');query='없는 거래처';updateTable();if(!document.querySelector('#results').innerHTML.includes('조건에 맞는')) throw Error('Empty state');
console.log('PASS: 10 screens, 3 upload stages, 2 Slack tabs, 6 settings tabs, detail panels, empty search');
`, context);
