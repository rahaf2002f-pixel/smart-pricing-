// Read-only browser checks for compact, bilingual public account forms.
import assert from "node:assert/strict";
const pages = await (await fetch("http://127.0.0.1:9225/json/list")).json();
const socket = new WebSocket(pages.find(p => p.type === "page").webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener("open", resolve, { once:true }));
let sequence = 0, checks = 0;
const pending = new Map(), exceptions = [];
socket.addEventListener("message", ({data}) => {
  const message = JSON.parse(data);
  if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails.text);
  const task = pending.get(message.id);
  if (task) {
    pending.delete(message.id);
    message.error ? task.reject(Error(message.error.message)) : task.resolve(message.result);
  }
});
const send = (method,params={}) => new Promise((resolve,reject) => {
  const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));
});
async function evaluate(expression) {
  const result=await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
  return result.result.value;
}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(expression) {
  for(let n=0;n<150;n++) { if(await evaluate(`Boolean(${expression})`))return;await pause(100); }
  throw Error(`Timed out: ${expression}`);
}
try {
  await send("Runtime.enable");await send("Page.enable");
  await send("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
  await send("Page.navigate",{url:`https://${process.env.REPLIT_DEV_DOMAIN}/#signin`});
  await waitFor(`document.querySelector(".spa-form")`);
  for(const language of ["ar","en"]) {
    await evaluate(`(() => {const el=document.querySelector(".sp-language-switcher select");Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set.call(el,${JSON.stringify(language)});el.dispatchEvent(new Event("change",{bubbles:true}));})()`);
    await waitFor(`document.documentElement.lang===${JSON.stringify(language)}`);
    for(const width of [320,390,768,820,1440]) {
      await send("Emulation.setDeviceMetricsOverride",{width,height:1000,deviceScaleFactor:1,mobile:width<600});
      for(const route of ["start","signin","signup"]) {
        await evaluate(`location.hash=${JSON.stringify(route)}`);
        await waitFor(`document.querySelector(".sp-main").dataset.activeSection===${JSON.stringify(route)} && document.querySelector(".spa-form")`);
        await pause(60);
        const metrics=await evaluate(`(() => {
          const form=document.querySelector(".spa-form"),button=form.querySelector('[type="submit"]');
          return {overflow:document.documentElement.scrollWidth>innerWidth+1,
            inputs:[...form.querySelectorAll("input")].map(el=>({height:el.getBoundingClientRect().height,font:parseFloat(getComputedStyle(el).fontSize)})),
            buttonHeight:button.getBoundingClientRect().height,background:getComputedStyle(button).backgroundColor,
            card:document.querySelector(".spa-card").getBoundingClientRect().width};
        })()`);
        assert(!metrics.overflow,`${language}/${route}/${width}: overflow`);
        assert(metrics.inputs.every(input=>input.height>=44&&input.height<=46&&input.font>=16),JSON.stringify(metrics));
        assert(metrics.buttonHeight>=44&&metrics.buttonHeight<=47,JSON.stringify(metrics));
        assert.equal(metrics.background,"rgb(43, 206, 166)");
        if(width===1440) assert(metrics.card<=(route==="signin"?640:route==="start"?790:890)+1);
        checks++;console.log(`PASS ${language} ${route} ${width}px: compact readable inputs and original mint primary action`);
      }
    }
  }
  await evaluate(`location.hash="signup"`);
  await waitFor(`document.querySelector(".spa-form")`);
  await evaluate(`document.querySelector('.spa-form [type="submit"]').click()`);
  await pause(120);
  assert(await evaluate(`document.querySelectorAll('input[aria-invalid="true"]').length>0 && document.documentElement.scrollWidth<=innerWidth+1`),"Validation must remain visible without overflow");
  assert.deepEqual(exceptions,[]);
  console.log(`Account layout: ${checks} viewport/locale checks passed; validation and browser errors checked.`);
} finally { socket.close(); }
