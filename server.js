import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");
const DATA = path.join(__dirname, "bookings.json");

app.use(express.json({limit:"100kb"}));
app.use(express.static(ROOT));

async function notifyVk(booking){
  const token = process.env.VK_TOKEN;
  const peerId = process.env.VK_ADMIN_PEER_ID;
  if(!token || !peerId) return {sent:false,reason:"VK_TOKEN/VK_ADMIN_PEER_ID не настроены"};
  const params = new URLSearchParams({
    access_token: token,
    v: process.env.VK_API_VERSION || "5.199",
    random_id: String(Date.now()),
    peer_id: String(peerId),
    message: `Новая заявка с сайта «Груминг салон»\n\n${booking.message}`
  });
  const r = await fetch("https://api.vk.com/method/messages.send",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:params});
  const data = await r.json();
  if(data.error) throw new Error(JSON.stringify(data.error));
  return {sent:true};
}

app.post("/api/booking", async (req,res)=>{
  const booking = {...req.body, createdAt:new Date().toISOString()};
  let all=[];
  if(fs.existsSync(DATA)){ try{all=JSON.parse(fs.readFileSync(DATA,"utf8"));}catch{} }
  all.push(booking);
  fs.writeFileSync(DATA, JSON.stringify(all,null,2), "utf8");
  let vk={sent:false};
  try{vk=await notifyVk(booking);}catch(err){console.error("VK API:",err.message);}
  res.json({ok:true, vk});
});

app.get("/api/health",(_req,res)=>res.json({ok:true, salon:"Груминг салон", booking:"preorder"}));
app.listen(PORT,()=>console.log(`Grooming site: http://localhost:${PORT}`));
