"use client";

import {useEffect,useRef,useState,type FormEvent,type ReactNode} from "react";
import Image from "next/image";
import styles from "./ShcWidget.module.css";
import {useSiteReady} from "@/lib/site-ready";
const backend=(process.env.NEXT_PUBLIC_SHC_ENDPOINT||"https://shc.gihyunkim.com").replace(/\/$/,"");
const notice="2026-10-23-v4";
const historyKey="shc-widget-chat-v1",sessionsKey="shc-widget-conversations-v2",browserKey="shc-widget-browser-v1";
type Source={id:string;title:string;url:string;text?:string;[key:string]:unknown};
type Message={role:"user"|"assistant";content:string;sources?:Source[];mode?:string;error?:boolean;excerpts?:{title:string;text:string;sourceIndex:number}[]};
type Conversation={id:string;messages:Message[];draft:string};
type Allowance={remaining:number;limit:number};
function safeMessages(value:unknown):Message[]{
 if(!Array.isArray(value))return [];
 return value.slice(-100).filter((m):m is Message=>!!m&&['user','assistant'].includes(m.role)&&typeof m.content==='string'&&m.content.length<50000).map(m=>({role:m.role,content:m.content,error:m.error===true,mode:typeof m.mode==='string'?m.mode:undefined,sources:Array.isArray(m.sources)?m.sources.filter(s=>s&&typeof s.id==='string'&&typeof s.title==='string'&&typeof s.url==='string').map(s=>({...s,url:/^https:\/\//i.test(s.url)?s.url:''})):[],excerpts:Array.isArray(m.excerpts)?m.excerpts.filter(e=>e&&typeof e.title==='string'&&typeof e.text==='string'&&Number.isInteger(e.sourceIndex)):[]}));
}
const suggestions=["What does EMT do?","Who are the floor tutors?","What are the visitor rules?","How do I apply for readmission?"];
function Icon({name}:{name:"chat"|"close"|"expand"|"collapse"|"send"|"clear"|"plus"}){
 const paths={plus:<path d="M12 5v14M5 12h14"/>,chat:<path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2Z"/>,close:<path d="m6 6 12 12M18 6 6 18"/>,expand:<><path d="M14 3h7v7M10 21H3v-7M21 3l-8 8M3 21l8-8"/></>,collapse:<><path d="M21 3l-7 7M14 3v7h7M3 21l7-7M3 14h7v7"/></>,send:<><path d="m4 4 17 8-17 8 4-8-4-8ZM8 12h13"/></>,clear:<><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/></>};
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function messageText(text:string):ReactNode[]{return text.split(/(\*\*[^*]+\*\*)/g).map((s,i)=>s.startsWith("**")?<strong key={i}>{s.slice(2,-2)}</strong>:s);}
export function ShcWidget(){
 const siteReady=useSiteReady();
 const [open,setOpen]=useState(false),[expanded,setExpanded]=useState(false),[token,setToken]=useState(""),[messages,setMessages]=useState<Message[]>([]),[question,setQuestion]=useState(""),[busy,setBusy]=useState(false),[accepting,setAccepting]=useState(false),[error,setError]=useState(""),[allowance,setAllowance]=useState<Allowance|null>(null),[ready,setReady]=useState(false),[storageFailure,setStorageFailure]=useState(false);
 const [activeId,setActiveId]=useState("");
 const [savedChats,setSavedChats]=useState<Conversation[]>([]),[menu,setMenu]=useState(false),[deleting,setDeleting]=useState<string|null>(null);
 const browser=useRef(""),launcher=useRef<HTMLButtonElement>(null),heading=useRef<HTMLHeadingElement>(null),end=useRef<HTMLDivElement>(null),input=useRef<HTMLTextAreaElement>(null),request=useRef<AbortController|null>(null),root=useRef<HTMLDivElement>(null),panel=useRef<HTMLElement>(null),expandButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate browser-only storage after SSR.
  const freshId=crypto.randomUUID();setActiveId(freshId);
  try{
   const id=localStorage.getItem(browserKey);
   browser.current=id&&/^[a-f0-9-]{36}$/i.test(id)?id:crypto.randomUUID();
   localStorage.setItem(browserKey,browser.current);
   const archive=JSON.parse(localStorage.getItem(sessionsKey)||"null");
   if(archive&&Array.isArray(archive.chats)){
    const chats:Conversation[]=archive.chats.filter((c:Conversation)=>c&&typeof c.id==="string"&&Array.isArray(c.messages)).map((c:Conversation)=>({id:c.id,messages:safeMessages(c.messages),draft:typeof c.draft==="string"?c.draft.slice(0,1500):""}));
    setSavedChats(chats);
    const active=chats.find(c=>c.id===archive.active)||chats[0];
    if(active){setActiveId(active.id);setMessages(active.messages);setQuestion(active.draft);}
   }else{
    const saved=JSON.parse(localStorage.getItem(historyKey)||"null");
    if(saved&&Array.isArray(saved.messages)){
     const migrated={id:typeof saved.id==="string"?saved.id:freshId,messages:safeMessages(saved.messages),draft:""};
     setActiveId(migrated.id);setMessages(migrated.messages);setSavedChats([migrated]);
    }
   }
  }catch{browser.current ||=crypto.randomUUID();setStorageFailure(true);}
  setReady(true);return()=>{request.current?.abort();};
 },[]);
 useEffect(()=>{
  if(!ready||!token)return;
  try{
   const current={id:activeId,messages:messages.slice(-100),draft:question};
   localStorage.setItem(sessionsKey,JSON.stringify({active:current.id,chats:[current,...savedChats.filter(c=>c.id!==current.id)]}));
   localStorage.removeItem(historyKey);
  }catch{
   // eslint-disable-next-line react-hooks/set-state-in-effect -- Report external browser storage failures.
   setStorageFailure(true);
  }
 },[messages,question,savedChats,ready,token,activeId]);
 useEffect(()=>{if(open)heading.current?.focus();},[open]);
 useEffect(()=>{
  if(!open)return;
  const onKey=(e:KeyboardEvent)=>{
   if(e.key==="Escape"){
    e.preventDefault();e.stopPropagation();
    if(menu){setMenu(false);}else if(expanded){setExpanded(false);expandButton.current?.focus();}
    else{setOpen(false);launcher.current?.focus();}
   }
   if(e.key==="Tab"&&expanded){
    const controls=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],textarea,summary,[tabindex="0"]')||[]).filter(el=>el.getClientRects().length>0&&getComputedStyle(el).visibility!=="hidden");
    const first=controls[0],last=controls.at(-1);
    if(e.shiftKey&&(document.activeElement===first||!controls.includes(document.activeElement as HTMLElement))){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&(document.activeElement===last||!controls.includes(document.activeElement as HTMLElement))){e.preventDefault();first?.focus();}
   }
  };
  window.addEventListener("keydown",onKey);
  return()=>window.removeEventListener("keydown",onKey);
 },[open,expanded,menu]);
 useEffect(()=>{
  if(!open||!expanded||!root.current)return;
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  // Keep the expanded chat modal without changing the portfolio's normal navigation.
  const siblings=new Map<HTMLElement,boolean>();
  let branch:HTMLElement=root.current;
  while(branch.parentElement){
   for(const sibling of Array.from(branch.parentElement.children))if(sibling!==branch&&sibling instanceof HTMLElement){siblings.set(sibling,sibling.inert);sibling.inert=true;}
   if(branch.parentElement===document.body)break;
   branch=branch.parentElement;
  }
  return()=>{document.body.style.overflow=previousOverflow;for(const [element,inert] of siblings)element.inert=inert;};
 },[open,expanded]);
 useEffect(()=>{if(open&&token)end.current?.scrollIntoView({block:"end",behavior:"instant"});},[messages,busy,open,token]);
 useEffect(()=>{if(!open||!token||busy)return;let active=true;const controller=new AbortController();const update=async()=>{try{const r=await fetch(backend+"/api/widget/allowance",{headers:{Authorization:"Bearer "+token},signal:controller.signal});if(r.status===401){if(active){setToken("");setError("Your session expired. Please accept the privacy notice again.");}return;}if(!r.ok)throw Error();const data=await r.json() as Allowance;if(active)setAllowance(data);}catch{if(active&&!controller.signal.aborted)setAllowance(null);}};void update();const onFocus=()=>{if(document.visibilityState==="visible")void update();};window.addEventListener("focus",onFocus);const timer=window.setInterval(onFocus,60000);return()=>{active=false;controller.abort();window.removeEventListener("focus",onFocus);window.clearInterval(timer);};},[token,open,busy]);
 async function accept(){setAccepting(true);setError("");try{const r=await fetch(backend+"/api/widget/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accepted:true,version:notice,browserId:browser.current})});const data=await r.json();if(!r.ok)throw Error(data.error||"Could not save your choice.");browser.current=data.browserId;try{localStorage.setItem(browserKey,data.browserId);}catch{setStorageFailure(true);}setToken(data.token);window.setTimeout(()=>input.current?.focus(),0);}catch(e){setError(e instanceof Error?e.message:"Could not connect. Please try again.");}finally{setAccepting(false);}}
 async function ask(value:string){const q=value.trim();if(!q||busy||!token||!ready)return;const history=messages.filter(m=>!m.error).slice(-10).map(m=>({role:m.role,content:m.content.slice(0,1600)}));while(new TextEncoder().encode(JSON.stringify(history)).length>11000)history.shift();setMessages(m=>[...m,{role:"user",content:q}]);setQuestion("");setBusy(true);setError("");const controller=new AbortController();request.current=controller;
 try{const r=await fetch(backend+"/api/widget/chat",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({message:q,history,conversationId:activeId}),signal:controller.signal});const data=await r.json();if(r.status===401){setToken("");throw Error("Your session expired. Please accept the notice again.");}if(!r.ok||data.error)throw Error(data.error||"Could not complete this answer.");setMessages(m=>[...m,...safeMessages([{role:"assistant",content:data.answer||"No supported answer was returned.",sources:data.sources,mode:data.mode,excerpts:data.excerpts}])]);}
 catch(e){if(controller.signal.aborted)setMessages(m=>[...m,{role:"assistant",content:"Answer stopped.",error:true}]);else{const text=e instanceof Error?e.message:"Could not connect. Please try again.";setMessages(m=>[...m,{role:"assistant",content:text,error:true}]);}}
 finally{request.current=null;setBusy(false);input.current?.focus();}}
 function expand(){setExpanded(value=>!value);}
 function collapse(){setExpanded(false);setMenu(false);expandButton.current?.focus();}
 function close(){setOpen(false);setExpanded(false);setMenu(false);requestAnimationFrame(()=>launcher.current?.focus({preventScroll:true}));}
 function changeConversation(id?:string){
  if(busy)return;
  const current={id:activeId,messages,draft:question};
  const chats=[current,...savedChats.filter(c=>c.id!==current.id)];
  const selected=id?chats.find(c=>c.id===id):undefined;
  setSavedChats(chats.filter(c=>c.messages.length||c.draft||c.id===id));
  setActiveId(selected?.id||crypto.randomUUID());
  setMessages(selected?.messages||[]);setQuestion(selected?.draft||"");setError("");setMenu(false);setDeleting(null);
  requestAnimationFrame(()=>input.current?.focus());
 }
 function deleteConversation(id:string){
  if(busy)return;
  const remaining=savedChats.filter(c=>c.id!==id);
  setSavedChats(remaining);setDeleting(null);
  if(id===activeId){
   const next=remaining[0];setActiveId(next?.id||crypto.randomUUID());
   setMessages(next?.messages||[]);setQuestion(next?.draft||"");setError("");
  }
 }
 const currentChat={id:activeId,messages,draft:question};
 const chatEntries=[currentChat,...savedChats.filter(c=>c.id!==currentChat.id)];
 const chatTitle=(chat:Conversation)=>chat.messages.find(m=>m.role==="user")?.content.slice(0,65)||"New conversation";
 function submit(e:FormEvent){e.preventDefault();void ask(question);}
 if(!siteReady)return null;
 return <div ref={root} className={`${styles.root} ${expanded?styles.maximized:""}`} data-lenis-prevent>
 <button type="button" className={styles.backdrop} aria-label="Return to compact chat" tabIndex={-1} aria-hidden={!expanded} onClick={collapse}/>
 {open&&<section ref={panel} id="shc-widget-panel" className={`${styles.panel} ${expanded?styles.expanded:""}`} role="dialog" aria-modal={expanded} aria-labelledby="shc-widget-heading">
 <div className={styles.workspace}>
 {expanded&&token&&<>
 <button className={styles.mobileShade} hidden={!menu} aria-label="Close conversation list" onClick={()=>setMenu(false)}/>
 <aside className={[styles.sidebar,menu?styles.sidebarOpen:""].join(" ")} data-lenis-prevent>
 <Image className={styles.sidebarLogo} src="/shc-brand.png" alt="Shun Hing College, HKU" width={240} height={145} unoptimized/>
 <button className={styles.newChat} onClick={()=>changeConversation()} disabled={busy}>＋ <span>New conversation</span></button>
 <nav className={styles.chatList} aria-label="Recent chats"><h3>Recent chats</h3>
 {chatEntries.map(chat=><div className={styles.chatRow} key={chat.id}>
 <button className={styles.chatChoice} aria-current={chat.id===activeId?"true":undefined} title={chatTitle(chat)} onClick={()=>changeConversation(chat.id)} disabled={busy}><Icon name="chat"/><span>{chatTitle(chat)}</span></button>
 <button className={styles.deleteChat} aria-label={"Delete chat: "+chatTitle(chat)} onClick={()=>setDeleting(chat.id)} disabled={busy}><Icon name="clear"/></button>
 {deleting===chat.id&&<div className={styles.deleteConfirm}><p>Delete this conversation?</p><button onClick={()=>deleteConversation(chat.id)}>Delete</button><button onClick={()=>setDeleting(null)}>Cancel</button></div>}
 </div>)}
 </nav><p className={styles.savedNote}>Chats saved on this browser.</p>
 <div className={styles.sidebarFooter}><a href="https://shunhingcollege.hku.hk/" target="_blank" rel="noopener noreferrer">Shun Hing College ↗</a><a href="https://jockeyv3.hku.hk/" target="_blank" rel="noopener noreferrer">JCSV III website ↗</a><div><Image src="/shc-hku.png" alt="HKU crest" width={42} height={48} unoptimized/><span>The University<br/>of Hong Kong</span></div></div>
 </aside></>}
 <div className={styles.chatMain}>
 <header className={styles.header}>{expanded&&token&&<button className={styles.menuButton} aria-label="Toggle conversation list" aria-expanded={menu} onClick={()=>setMenu(v=>!v)}>☰</button>}<span className={styles.mark}><Icon name="chat"/></span><div><h2 id="shc-widget-heading" ref={heading} tabIndex={-1}>{expanded?"Shun Hing College › Student help desk":"Ask SHC"}</h2>{!expanded&&<p>Shun Hing College · Student help desk</p>}</div><div className={styles.tools}>{token&&messages.length>0&&<button aria-label="New conversation" title="New conversation" onClick={()=>changeConversation()} disabled={busy}><Icon name="plus"/></button>}<button ref={expandButton} aria-label={expanded?"Collapse chat":"Expand chat"} title={expanded?"Collapse chat":"Expand chat"} aria-pressed={expanded} onClick={expand}><Icon name={expanded?"collapse":"expand"}/></button><button aria-label="Close chat widget" title="Close" onClick={close}><Icon name="close"/></button></div></header>
 {!token?<><div className={styles.privacy} data-lenis-prevent><Image src="/shc-brand.png" alt="Shun Hing College" width={130} height={78} unoptimized/><h3>Before we chat</h3><p>Please read and accept this privacy notice.</p><ul><li>Your question, recent conversation and relevant document excerpts go to HKU’s API gateway and Microsoft Azure’s DeepSeek service. Processing may occur outside Hong Kong; their data policies apply.</li><li>Chats stay in this browser until cleared. Other people using this browser profile may read them.</li><li>Hidden-citation sources may contribute facts. Admin-only files are excluded from chat requests.</li><li>Do not share passwords, student IDs, medical details, identifiable complaints or other confidential information.</li><li>Anonymous consent and usage records are kept for up to 90 days. Questions and answers are not stored in our analytics. Cloud and model providers may retain operational records.</li><li>20 generated answers per browser each day; resets at 8 a.m. Hong Kong time. Expanding this chat keeps the same allowance. Browser identifiers cannot verify your identity across devices or browsers.</li></ul><a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noopener noreferrer">Microsoft privacy statement ↗</a> · <a href="https://www.hku.hk/about/policies_reports/privacy_policy.html" target="_blank" rel="noopener noreferrer">HKU privacy policy ↗</a><p className={styles.small}>Notice version 23 October 2026. Decline by closing this panel. Accepting does not waive your privacy rights.</p></div><div className={styles.consent}><button className={styles.primary} onClick={()=>void accept()} disabled={accepting||!ready}>{accepting?"Saving your choice…":"Yes, I understand and agree"}</button></div></>:<><div className={styles.body} data-lenis-prevent aria-live="polite" aria-relevant="additions"><div className={styles.greeting}><strong>Hi there 👋</strong><p>Ask me about Shun Hing College and JCSV III.</p></div>{messages.map((m,i)=><article key={i} className={m.role==="user"?styles.user:styles.assistant}><span className={styles.messageLabel}>{m.role==="user"?"You":"Ask SHC"}</span><div className={styles.bubble}>{messageText(m.content)}</div>{m.excerpts?.map((e,n)=><blockquote className={styles.excerpt} key={n}><strong>{e.title}</strong><p>{e.text}</p></blockquote>)}{m.sources?.length?<details className={styles.sources}><summary>Sources · {m.sources.length}</summary><ul>{m.sources.map((s,n)=><li key={s.id+n}>{/^https:\/\//i.test(s.url)?<a href={s.url} target="_blank" rel="noopener noreferrer">{n+1}. {s.title} ↗</a>:<span>{n+1}. {s.title}</span>}</li>)}</ul></details>:null}</article>)}{busy&&<p className={styles.thinking} role="status"><span/>Finding an answer in the college sources…</p>}{!messages.length&&<div className={styles.suggestions}>{suggestions.map(q=><button key={q} onClick={()=>void ask(q)}>{q}</button>)}</div>}<div ref={end}/></div><div className={styles.allowance} role="status">{allowance?<><strong>{allowance.remaining} / {allowance.limit}</strong> generated answers left today<span>Resets 8 a.m. HKT</span></>:"Checking daily allowance…"}</div><form className={styles.composer} onSubmit={submit}><textarea ref={input} aria-label="Ask SHC a question" placeholder="Write your question…" rows={1} value={question} maxLength={1500} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void ask(question);}}}/>{busy?<button type="button" className={styles.send} aria-label="Stop generating answer" onClick={()=>request.current?.abort()}><span className={styles.stop}/></button>:<button className={styles.send} aria-label="Send question" disabled={!question.trim()||!ready}><Icon name="send"/></button>}</form><p className={styles.footnote}>{storageFailure?"Browser storage unavailable. Chats may not be saved.":"Saved on this browser. Verify important details with SHC."}</p></>}
 {error&&<p className={styles.error} role="alert">{error}</p>}
 </div></div></section>}
 <button ref={launcher} className={styles.launcher} aria-label={open?"Close Ask SHC":"Open Ask SHC"} aria-expanded={open} aria-controls="shc-widget-panel" tabIndex={expanded?-1:0} aria-hidden={expanded} onClick={()=>{if(open)close();else setOpen(true);}}><Icon name={open?"close":"chat"}/>{!open&&<span>Ask SHC</span>}</button>
 </div>;
}
