import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { AlertTriangle, Minus, Pause, Play, RotateCcw, TrendingDown, TrendingUp, Wifi, WifiOff } from "lucide-react";

const API_KEY = import.meta.env.VITE_TWELVE_DATA_API_KEY;
const SYMBOL = "XAU/USD";
const INTERVAL = "1min";
const OUTPUT_SIZE = 150;
const POLL_MS = 30000;

const COLORS = { gold: "#C9A24B", buy: "#3ECF8E", sell: "#E5484D", bg: "#0A0C10", panel: "#12151C", border: "#232833", dim: "#7C8494", text: "#E4E7EC" };

function sma(a, p) { const o = Array(a.length).fill(null); let s = 0; for (let i = 0; i < a.length; i++) { s += a[i]; if (i >= p) s -= a[i-p]; if (i >= p-1) o[i] = s/p; } return o; }
function ema(a, p) { const o = Array(a.length).fill(null), k = 2/(p+1); let prev = null; for (let i=0;i<a.length;i++) { if(i===p-1){prev=a.slice(0,p).reduce((x,y)=>x+y,0)/p;o[i]=prev;} else if(i>=p){prev=a[i]*k+prev*(1-k);o[i]=prev;} } return o; }
function rsi(a,p=14){const o=Array(a.length).fill(null);if(a.length<=p)return o;let g=0,l=0;for(let i=1;i<=p;i++){const d=a[i]-a[i-1];if(d>=0)g+=d;else l-=d;}let ag=g/p,al=l/p;o[p]=100-100/(1+(al===0?100:ag/al));for(let i=p+1;i<a.length;i++){const d=a[i]-a[i-1],ga=d>0?d:0,lo=d<0?-d:0;ag=(ag*(p-1)+ga)/p;al=(al*(p-1)+lo)/p;o[i]=100-100/(1+(al===0?100:ag/al));}return o;}
function macd(a){const f=ema(a,12),s=ema(a,26),m=a.map((_,i)=>f[i]!=null&&s[i]!=null?f[i]-s[i]:null),valid=m.filter(v=>v!=null),sr=ema(valid,9),sig=Array(a.length).fill(null),off=m.findIndex(v=>v!=null);for(let i=0;i<sr.length;i++)if(sr[i]!=null)sig[off+i]=sr[i];return {m,sig,h:m.map((v,i)=>v!=null&&sig[i]!=null?v-sig[i]:null)};}
function bollinger(a,p=20,m=2){const mid=sma(a,p),u=Array(a.length).fill(null),l=Array(a.length).fill(null);for(let i=p-1;i<a.length;i++){const x=a.slice(i-p+1,i+1),sd=Math.sqrt(x.reduce((s,v)=>s+(v-mid[i])**2,0)/p);u[i]=mid[i]+m*sd;l[i]=mid[i]-m*sd;}return {mid,u,l};}
function stochastic(h,l,c,p=14,sp=3,dp=3){const raw=Array(c.length).fill(null);for(let i=p-1;i<c.length;i++){const hh=Math.max(...h.slice(i-p+1,i+1)),ll=Math.min(...l.slice(i-p+1,i+1));raw[i]=hh===ll?50:(c[i]-ll)/(hh-ll)*100;}const kv=raw.filter(v=>v!=null),ks=sma(kv,sp),kf=Array(c.length).fill(null),off=raw.findIndex(v=>v!=null);for(let i=0;i<ks.length;i++)if(ks[i]!=null)kf[off+i]=ks[i];const ds=sma(ks.filter(v=>v!=null),dp),df=Array(c.length).fill(null),off2=kf.findIndex(v=>v!=null);for(let i=0;i<ds.length;i++)if(ds[i]!=null)df[off2+i]=ds[i];return {k:kf,d:df};}
function atr(h,l,c,p=14){const tr=c.map((v,i)=>i===0?h[i]-l[i]:Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1])));return ema(tr,p);}

async function fetchXauSeries(){
  if(!API_KEY) throw new Error("Twelve Data API key is missing. Add VITE_TWELVE_DATA_API_KEY in Vercel.");
  const params=new URLSearchParams({symbol:SYMBOL,interval:INTERVAL,outputsize:String(OUTPUT_SIZE),order:"ASC",apikey:API_KEY});
  const res=await fetch(`https://api.twelvedata.com/time_series?${params}`);
  const data=await res.json();
  if(!res.ok||data.status==="error"||data.code>=400) throw new Error(data.message||"Twelve Data request failed");
  if(!Array.isArray(data.values)) throw new Error("No XAU/USD data returned from Twelve Data");
  return data.values.map((v,i)=>({i,time:v.datetime,open:Number(v.open),high:Number(v.high),low:Number(v.low),close:Number(v.close)})).filter(v=>[v.open,v.high,v.low,v.close].every(Number.isFinite));
}

function computeSignals(c){
  const cl=c.map(x=>x.close),h=c.map(x=>x.high),l=c.map(x=>x.low),s20=sma(cl,20),s50=sma(cl,50),e12=ema(cl,12),e26=ema(cl,26),r=rsi(cl),mc=macd(cl),bb=bollinger(cl),st=stochastic(h,l,cl),a=atr(h,l,cl),i=cl.length-1,v=[];
  const add=(name,val,detail)=>v.push({name,val,detail});
  if(s20[i]!=null&&s50[i]!=null)add("SMA 20/50",s20[i]>s50[i]?1:-1,s20[i]>s50[i]?"Bullish (20 > 50)":"Bearish (20 < 50)");
  if(e12[i]!=null&&e26[i]!=null)add("EMA 12/26",e12[i]>e26[i]?1:-1,e12[i]>e26[i]?"Bullish":"Bearish");
  if(r[i]!=null){let x=0,d="Neutral";if(r[i]<30){x=1;d="Oversold";}else if(r[i]>70){x=-1;d="Overbought";}else if(r[i]>50){x=.5;d="Bullish momentum";}else{x=-.5;d="Bearish momentum";}add("RSI (14)",x,`${d} (${r[i].toFixed(1)})`);}
  if(mc.h[i]!=null){const x=mc.m[i]>mc.sig[i]?1:-1;add("MACD",x,x>0?"MACD above signal":"MACD below signal");}
  if(bb.u[i]!=null){const p=cl[i];let x=0,d="Inside bands";if(p>=bb.u[i]){x=-1;d="At/above upper band";}else if(p<=bb.l[i]){x=1;d="At/below lower band";}else{x=-((p-bb.mid[i])/(bb.u[i]-bb.mid[i]))*.5;d=p>bb.mid[i]?"Upper half":"Lower half";}add("Bollinger Bands",x,d);}
  if(st.k[i]!=null){let x=0,d="Neutral";if(st.k[i]<20){x=1;d="Oversold";}else if(st.k[i]>80){x=-1;d="Overbought";}else if(st.d[i]!=null){x=st.k[i]>st.d[i]?.4:-.4;d=x>0?"%K above %D":"%K below %D";}add("Stochastic (14,3,3)",x,`${d} (${st.k[i].toFixed(1)})`);}
  const composite=Math.round((v.reduce((s,x)=>s+x.val,0)/(v.length||1))*100);let signal="HOLD";if(composite>=40)signal="STRONG BUY";else if(composite>=15)signal="BUY";else if(composite<=-40)signal="STRONG SELL";else if(composite<=-15)signal="SELL";
  return {votes:v,composite,signal,ind:{s20:s20[i],s50:s50[i],rsi:r[i],macd:mc.h[i],atr:a[i],bbU:bb.u[i],bbL:bb.l[i],k:st.k[i],d:st.d[i]},series:{s20,s50,bb}};
}

function Badge({signal}){const buy=signal.includes("BUY"),sell=signal.includes("SELL"),color=buy?COLORS.buy:sell?COLORS.sell:COLORS.dim,Icon=buy?TrendingUp:sell?TrendingDown:Minus;return <div className="badge" style={{color,borderColor:`${color}55`,background:`${color}14`}}><Icon size={19}/>{signal}</div>}
function Gauge({score}){const x=Math.max(-100,Math.min(100,score)),color=x>15?COLORS.buy:x<-15?COLORS.sell:COLORS.dim,deg=(x/100)*90;return <div className="gauge"><svg viewBox="0 0 180 100"><path d="M10 95 A80 80 0 0 1 170 95" fill="none" stroke={COLORS.border} strokeWidth="10" strokeLinecap="round"/><path d="M10 95 A80 80 0 0 1 170 95" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${Math.abs(deg)/180*251.2} 251.2`} strokeDashoffset="-125.6"/><line x1="90" y1="95" x2={90+68*Math.cos(Math.PI*(180-(deg+90))/180)} y2={95-68*Math.sin(Math.PI*(180-(deg+90))/180)} stroke={COLORS.gold} strokeWidth="2.5"/><circle cx="90" cy="95" r="5" fill={COLORS.gold}/></svg><strong style={{color}}>{x>0?"+":""}{x}</strong><small>CONFLUENCE SCORE</small></div>}
function Indicator({v}){const color=v.val>.1?COLORS.buy:v.val<-.1?COLORS.sell:COLORS.dim;return <div className="indicator"><div><b>{v.name}</b><small>{v.detail}</small></div><span style={{color,background:`${color}18`}}>{v.val>.1?"BULL":v.val<-.1?"BEAR":"FLAT"}</span></div>}

export default function App(){
  const [candles,setCandles]=useState([]),[status,setStatus]=useState("loading"),[error,setError]=useState(""),[lastFetch,setLastFetch]=useState(null),[running,setRunning]=useState(true),[log,setLog]=useState([]);const lastSignal=useRef("HOLD");
  const load=useCallback(async()=>{try{const s=await fetchXauSeries();setCandles(s);setStatus("ok");setError("");setLastFetch(Date.now());}catch(e){setStatus("error");setError(e.message||"Failed to reach Twelve Data");}},[]);
  useEffect(()=>{load();},[load]);useEffect(()=>{if(!running)return;const id=setInterval(load,POLL_MS);return()=>clearInterval(id);},[running,load]);
  const result=useMemo(()=>candles.length>55?computeSignals(candles):null,[candles]);
  useEffect(()=>{if(!result)return;if(result.signal!==lastSignal.current&&result.signal!=="HOLD")setLog(p=>[{t:Date.now(),signal:result.signal,price:candles.at(-1).close,score:result.composite},...p].slice(0,12));lastSignal.current=result.signal;},[result,candles]);
  const chart=useMemo(()=>result?candles.map((c,i)=>({time:c.time,close:c.close,sma20:result.series.s20[i],sma50:result.series.s50[i],upper:result.series.bb.u[i],lower:result.series.bb.l[i]})):[],[candles,result]);
  const price=candles.at(-1)?.close,prev=candles.at(-2)?.close??price,change=price-prev,pct=prev?(change/prev)*100:0;
  return <main><header><div className="brand"><div className="au">Au</div><div><h1>XAUUSD Signal Terminal</h1><small>{status==="ok"?<Wifi size={12} color={COLORS.buy}/>:<WifiOff size={12} color={COLORS.sell}/>} Twelve Data · {INTERVAL} {lastFetch?`· updated ${new Date(lastFetch).toLocaleTimeString()}`:""}</small></div></div><div className="actions"><button onClick={()=>setRunning(x=>!x)}>{running?<Pause size={14}/>:<Play size={14}/>} {running?"Pause polling":"Resume polling"}</button><button onClick={load}><RotateCcw size={14}/> Refresh now</button></div></header>
  {status==="error"&&<div className="error"><AlertTriangle size={18}/><div><b>Twelve Data request failed</b><p>{error}</p></div></div>}{status==="loading"&&<p className="loading">Loading live XAU/USD data…</p>}
  {result&&<><section className="price"><strong>{price.toFixed(2)}</strong><span style={{color:change>=0?COLORS.buy:COLORS.sell}}>{change>=0?"+":""}{change.toFixed(2)} ({pct>=0?"+":""}{pct.toFixed(2)}%)</span><Badge signal={result.signal}/></section>
  <section className="panel chart"><b>PRICE · SMA 20/50 · BOLLINGER BANDS</b><ResponsiveContainer width="100%" height={280}><ComposedChart data={chart} margin={{top:5,right:15,left:-10,bottom:0}}><CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" vertical={false}/><XAxis dataKey="time" hide/><YAxis domain={["auto","auto"]} tick={{fill:COLORS.dim,fontSize:10}}/><Tooltip contentStyle={{background:"#181C24",border:`1px solid ${COLORS.border}`}} formatter={(v,n)=>[typeof v==="number"?v.toFixed(2):v,n]}/><Area dataKey="upper" stroke="none" fill={COLORS.gold} fillOpacity={.04}/><Line dataKey="upper" stroke={COLORS.gold} strokeOpacity={.4} dot={false}/><Line dataKey="lower" stroke={COLORS.gold} strokeOpacity={.4} dot={false}/><Line dataKey="sma50" stroke={COLORS.dim} dot={false}/><Line dataKey="sma20" stroke="#5B8DEF" dot={false}/><Line dataKey="close" stroke={COLORS.gold} strokeWidth={2} dot={false}/></ComposedChart></ResponsiveContainer></section>
  <div className="grid"><section className="panel"><b>SIGNAL STRENGTH</b><Gauge score={result.composite}/>{result.votes.map(v=><Indicator key={v.name} v={v}/>)}</section><section className="panel"><b>KEY LEVELS</b>{[["RSI (14)",result.ind.rsi?.toFixed(2)],["MACD Histogram",result.ind.macd?.toFixed(3)],["ATR (14)",result.ind.atr?.toFixed(2)],["Stoch %K / %D",`${result.ind.k?.toFixed(1)} / ${result.ind.d?.toFixed(1)}`],["BB Upper",result.ind.bbU?.toFixed(2)],["BB Lower",result.ind.bbL?.toFixed(2)],["SMA 20 / 50",`${result.ind.s20?.toFixed(2)} / ${result.ind.s50?.toFixed(2)}`]].map(([k,v])=><div className="level" key={k}><span>{k}</span><strong>{v??"—"}</strong></div>)}<b className="logtitle">SIGNAL LOG</b>{log.length===0?<p className="muted">No signal changes yet — watching the market.</p>:log.map(x=><div className="log" key={x.t}><span style={{color:x.signal.includes("BUY")?COLORS.buy:COLORS.sell}}>{x.signal}</span><small>{x.price.toFixed(2)} · {new Date(x.t).toLocaleTimeString()}</small></div>)}</section></div></>}
  <footer>Live prices come from the Twelve Data API. This terminal does not place real trades. Signals are a study tool based on SMA/EMA, RSI, MACD, Bollinger Bands and Stochastic.</footer></main>;
}
