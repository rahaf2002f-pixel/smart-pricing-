// Exercise the real Vercel entry point without publishing or using a Vercel token.
import "dotenv/config";
import assert from "node:assert/strict";
import http from "node:http";
import { readFile, access, readdir } from "node:fs/promises";
import { randomUUID, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import User from "../server/src/models/User.js";
import AuthSession from "../server/src/models/AuthSession.js";
import Notification from "../server/src/models/Notification.js";
import PricingProduct from "../server/src/models/PricingProduct.js";
import PricingCalculation from "../server/src/models/PricingCalculation.js";
import PricingSettings from "../server/src/models/PricingSettings.js";

const config=JSON.parse(await readFile("vercel.json","utf8"));
assert.equal(config.buildCommand,"npm run build");
assert.equal(config.outputDirectory,"client/dist");
await access(`${config.outputDirectory}/index.html`);
const html=await readFile(`${config.outputDirectory}/index.html`,"utf8");
for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) {
  await access(`${config.outputDirectory}${match[1]}`);
}
for (const filename of await readdir(`${config.outputDirectory}/assets`)) {
  if (!filename.endsWith(".js")) continue;
  const bundle=await readFile(`${config.outputDirectory}/assets/${filename}`,"utf8");
  assert(!/sk-or-v1-[a-f0-9]{32,}|mongodb(?:\+srv)?:\/\/[^/\s]+:[^@\s]+@/i.test(bundle),"No credential-shaped values in frontend");
}
console.log("PASS Vercel config, actual client/dist output and referenced assets");

const {default:handler}=await import("../api/handler.js");
const server=http.createServer((req,res)=>{
  Promise.resolve(handler(req,res)).catch(()=>{
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const base=`http://127.0.0.1:${server.address().port}`;
let passed=1;
function check(value,label){assert(value,label);passed++;console.log(`PASS ${label}`);}
function client(){
  let cookie="";
  return async(path,{method="GET",body}={})=>{
    const response=await fetch(base+path,{method,headers:{
      "X-Smart-Pricing":"1","Accept-Language":"en",
      "X-Forwarded-Host":"pricing.example.test","X-Forwarded-Proto":"https",
      Origin:"https://pricing.example.test",
      ...(cookie?{Cookie:cookie}:{}),...(body?{"Content-Type":"application/json"}:{}),
    },...(body?{body:JSON.stringify(body)}:{})});
    const cookies=response.headers.getSetCookie();
    if(cookies.length)cookie=cookies.at(-1).split(";")[0];
    return {status:response.status,body:await response.json(),cookies:cookies.join(";")};
  };
}
const a=client(),b=client();
const prefix=`sp-vercel-test-${randomUUID()}`;
const emails=[`${prefix}-a@example.invalid`,`${prefix}-b@example.invalid`];
const password=randomBytes(24).toString("base64url");
const registration=email=>({fullName:"Vercel verification",email,password,confirmPassword:password});
const session=randomUUID();
const pricing={purchaseCost:5,packagingCost:1,deliveryCost:2,paymentFee:.5,paymentFeeType:"fixed",targetMarginPercent:50,comparisonSellingPrice:20};
const product={name:"Vercel test product",sku:"",category:"Test",...pricing,marketingCost:0,operationalCost:0,customCosts:[],batchQuantity:2,sellingPrice:20};
try{
  const health=await Promise.all(Array.from({length:4},()=>a("/api/health")));
  check(health.every(r=>r.status===200&&r.body.database==="connected"),"Concurrent cold-start requests connect to Atlas and initialize indexes");
  const created=await a("/api/auth/register",{method:"POST",body:registration(emails[0])});
  check(created.status===201&&created.body.user.profileCompleted,"Existing account registration works through the serverless handler");
  check(/HttpOnly/i.test(created.cookies)&&/Secure/i.test(created.cookies)&&/SameSite=Lax/i.test(created.cookies),"Session cookies retain secure production attributes");
  const userId=created.body.user.id;
  const saved=await a(`/api/pricing/products/${session}`,{method:"POST",body:product});
  check(saved.status===201,"Authenticated product saving persists in Atlas");
  const list=await a(`/api/pricing/products/${session}`);
  check(list.body.products.length===1&&list.body.products[0].totalCost===8.5,"Saved product and KWD calculations are correct");
  const settings=await a(`/api/pricing/settings/${session}`,{method:"PUT",body:{defaultDeliveryFee:2,defaultPaymentFee:.5,defaultPaymentFeeType:"fixed"}});
  check(settings.status===200,"Settings API remains available");
  const calculation=await a(`/api/pricing/calculations/${session}`,{method:"PUT",body:pricing});
  check(calculation.status===200,"Calculator persistence remains available");
  const pref=await a("/api/auth/preferences",{method:"PATCH",body:{language:"en"}});
  check(pref.status===200,"Language preferences remain available");
  const demo=await a("/api/notifications/demo",{method:"POST",body:{}});
  const notifications=await a("/api/notifications");
  check(demo.status===200&&notifications.status===200,"Notifications remain available");
  const advice=await a(`/api/pricing/advice/${session}`,{method:"POST",body:{product,discountPercent:0}});
  check(advice.status===200&&typeof advice.body.advice==="string"&&advice.body.advice.length>20,"Real authenticated OpenRouter request succeeds through the handler");
  const second=await b("/api/auth/register",{method:"POST",body:registration(emails[1])});
  check(second.status===201,"Second independent account is created");
  const isolated=await b(`/api/pricing/products/${session}`);
  check(isolated.status===200&&isolated.body.products.length===0,"Accounts cannot read each other's products");
  const unknown=await a("/api/not-a-real-endpoint");
  check(unknown.status===404&&typeof unknown.body.message==="string","Unknown API paths return JSON 404, not frontend HTML");
  await a("/api/auth/logout",{method:"POST"});
  check((await a(`/api/pricing/products/${session}`)).status===401,"Logout protects private API access");
  const login=await a("/api/auth/login",{method:"POST",body:{email:emails[0],password}});
  check(login.status===200&&login.body.user.id===userId&&login.body.user.preferredLanguage==="en","Re-login restores the same account and language");
  check((await a(`/api/pricing/products/${session}`)).body.products.length===1&&await User.countDocuments({email:emails[0]})===1,"Re-login restores saved data without duplicate accounts");
  console.log(`Vercel entry point: ${passed} checks passed.`);
} finally{
  if(mongoose.connection.readyState===1){
    const users=await User.find({email:{$in:emails}}).select("_id").lean();
    const ids=users.map(user=>user._id);
    for(const model of [AuthSession,Notification,PricingProduct,PricingCalculation,PricingSettings]){
      await model.deleteMany({userId:{$in:ids}});
    }
    await User.deleteMany({_id:{$in:ids}});
  }
  await new Promise(resolve=>server.close(resolve));
  await mongoose.disconnect();
}
