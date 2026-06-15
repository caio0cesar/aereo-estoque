import React, { useState, useEffect } from "react";
import { signIn, resetPassword, signUp, getSectorsPublic } from "../services/supabase.jsx";
import { DuckIcon, C } from "./shared.jsx";
import { todayFull } from "../utils/dates.jsx";

async function loadPersisted(){try{const r=localStorage.getItem("aereo-v7");return r?JSON.parse(r):null;}catch(e){return null;}}

export default function LoginScreen({onLogin}){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [showPassword,setShowPassword]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [focused,setFocused]=useState("");
  const [resetMode,setResetMode]=useState(false);
  const [resetEmail,setResetEmail]=useState("");
  const [resetLoading,setResetLoading]=useState(false);
  const [resetMsg,setResetMsg]=useState("");
  const [signupMode,setSignupMode]=useState(false);
  const [signupName,setSignupName]=useState("");
  const [signupEmail,setSignupEmail]=useState("");
  const [signupPassword,setSignupPassword]=useState("");
  const [signupSectorId,setSignupSectorId]=useState("");
  const [sectors,setSectors]=useState([]);
  const [signupLoading,setSignupLoading]=useState(false);
  const [signupMsg,setSignupMsg]=useState("");

  async function handleLogin(){
    if(!email||!password){setError("Preencha email e senha.");return;}
    setLoading(true);setError("");
    try{ await signIn(email,password); onLogin(); }
    catch(e){ setError(e.message||"Email ou senha incorretos."); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{
    if(signupMode&&sectors.length===0) getSectorsPublic().then(setSectors);
  },[signupMode]);

  async function handleSignup(){
    if(!signupName||!signupEmail||!signupPassword||!signupSectorId){setSignupMsg("Preencha todos os campos.");return;}
    if(signupPassword.length<6){setSignupMsg("A senha deve ter no mínimo 6 caracteres.");return;}
    setSignupLoading(true);setSignupMsg("");
    try{
      await signUp(signupEmail,signupPassword,signupName,signupSectorId);
      setSignupMsg("✓ Conta criada! Verifique seu email para confirmar, depois faça login.");
    }catch(e){ setSignupMsg(e.message||"Erro ao criar conta."); }
    finally{ setSignupLoading(false); }
  }

  async function handleReset(){
    if(!resetEmail){setResetMsg("Digite seu email.");return;}
    setResetLoading(true);setResetMsg("");
    try{ await resetPassword(resetEmail); setResetMsg("✓ Email enviado! Verifique sua caixa de entrada."); }
    catch(e){ setResetMsg(e.message||"Erro ao enviar email."); }
    finally{ setResetLoading(false); }
  }

  async function handleBackup(){
    try{
      const local=await loadPersisted();
      if(!local){alert("Nenhum dado local para backup.");return;}
      const blob=new Blob([JSON.stringify(local,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url; a.download="backup_estoque_"+todayFull().replace(/\//g,"-")+".json"; a.click();
      URL.revokeObjectURL(url);
    }catch(e){alert("Erro no backup: "+e.message);}
  }

  const loginCSS="@keyframes floatDuck{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-12px) rotate(3deg)}}"+
    "@keyframes ripple{0%{transform:scale(0.8);opacity:0.6}100%{transform:scale(2.2);opacity:0}}"+
    "@keyframes fadeSlideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}"+
    ".login-duck{animation:floatDuck 3s ease-in-out infinite;}"+
    ".login-ripple{animation:ripple 2.5s ease-out infinite;}"+
    ".login-ripple2{animation:ripple 2.5s ease-out infinite 0.8s;}"+
    ".login-ripple3{animation:ripple 2.5s ease-out infinite 1.6s;}"+
    ".login-card{animation:fadeSlideUp 0.4s ease;}";

  const EyeOpen = React.createElement("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"#6aada0",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},
    React.createElement("path",{d:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"}),
    React.createElement("circle",{cx:12,cy:12,r:3})
  );
  const EyeClosed = React.createElement("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"#6aada0",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},
    React.createElement("path",{d:"M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"}),
    React.createElement("path",{d:"M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"}),
    React.createElement("line",{x1:1,y1:1,x2:23,y2:23})
  );

  return React.createElement("div",{style:{background:"linear-gradient(160deg,#051820 0%,#071e26 40%,#0a2d38 100%)",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,position:"relative",overflow:"hidden"}},
    React.createElement("style",null,loginCSS),
    React.createElement("div",{style:{position:"absolute",inset:0,pointerEvents:"none"}},
      React.createElement("div",{style:{position:"absolute",top:"10%",left:"5%",width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(29,209,161,0.06) 0%,transparent 70%)"}}),
      React.createElement("div",{style:{position:"absolute",bottom:"15%",right:"8%",width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,rgba(29,209,161,0.04) 0%,transparent 70%)"}})
    ),
    React.createElement("div",{style:{position:"relative",marginBottom:32,display:"flex",flexDirection:"column",alignItems:"center"}},
      React.createElement("div",{style:{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:80,height:20}},
        React.createElement("div",{className:"login-ripple",style:{position:"absolute",inset:0,borderRadius:"50%",border:"2px solid rgba(29,209,161,0.4)"}}),
        React.createElement("div",{className:"login-ripple2",style:{position:"absolute",inset:0,borderRadius:"50%",border:"2px solid rgba(29,209,161,0.3)"}}),
        React.createElement("div",{className:"login-ripple3",style:{position:"absolute",inset:0,borderRadius:"50%",border:"2px solid rgba(29,209,161,0.2)"}})
      ),
      React.createElement("div",{className:"login-duck"},React.createElement(DuckIcon,{size:90}))
    ),
    React.createElement("div",{className:"login-card",style:{textAlign:"center",marginBottom:32}},
      React.createElement("div",{style:{fontSize:13,color:"#1dd1a1",fontWeight:700,letterSpacing:"0.15em",marginBottom:8,textTransform:"uppercase"}},"Estoque Aéreo"),
      React.createElement("div",{style:{fontSize:26,fontWeight:800,color:"#e4f5f0",lineHeight:1.2,marginBottom:6}},"Bem Vindo,"),
      React.createElement("div",{style:{fontSize:26,fontWeight:800,color:"#1dd1a1",lineHeight:1.2}},"Operador! 👋"),
      React.createElement("div",{style:{fontSize:13,color:"#3f7068",marginTop:10}},"Faça login para continuar")
    ),
    React.createElement("div",{className:"login-card",style:{width:"100%",maxWidth:360,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:24,backdropFilter:"blur(10px)",overflow:"hidden"}},
      !resetMode&&!signupMode?(
        React.createElement(React.Fragment,null,
          error&&React.createElement("div",{style:{background:"rgba(255,107,107,0.12)",border:"1px solid rgba(255,107,107,0.25)",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#ff6b6b",textAlign:"center"}},error),
          React.createElement("div",{style:{marginBottom:14}},
            React.createElement("label",{style:{fontSize:11,color:"#6aada0",fontWeight:700,letterSpacing:"0.08em",display:"block",marginBottom:6}},"EMAIL"),
            React.createElement("input",{type:"email",value:email,onChange:e=>{setEmail(e.target.value);setError("");},onFocus:()=>setFocused("email"),onBlur:()=>setFocused(""),onKeyDown:e=>{if(e.key==="Enter")handleLogin();},placeholder:"seu@email.com",style:{background:focused==="email"?"rgba(29,209,161,0.06)":"rgba(255,255,255,0.05)",border:"1px solid "+(focused==="email"?"rgba(29,209,161,0.5)":"rgba(255,255,255,0.1)"),borderRadius:12,padding:"12px 16px",color:"#e4f5f0",fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",transition:"all 0.2s"}})
          ),
          React.createElement("div",{style:{marginBottom:8}},
            React.createElement("label",{style:{fontSize:11,color:"#6aada0",fontWeight:700,letterSpacing:"0.08em",display:"block",marginBottom:6}},"SENHA"),
            React.createElement("div",{style:{position:"relative"}},
              React.createElement("input",{type:showPassword?"text":"password",value:password,onChange:e=>{setPassword(e.target.value);setError("");},onFocus:()=>setFocused("password"),onBlur:()=>setFocused(""),onKeyDown:e=>{if(e.key==="Enter")handleLogin();},placeholder:"••••••••",style:{background:focused==="password"?"rgba(29,209,161,0.06)":"rgba(255,255,255,0.05)",border:"1px solid "+(focused==="password"?"rgba(29,209,161,0.5)":"rgba(255,255,255,0.1)"),borderRadius:12,padding:"12px 40px 12px 16px",color:"#e4f5f0",fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",transition:"all 0.2s"}}),
              React.createElement("button",{type:"button",onClick:()=>setShowPassword(!showPassword),style:{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center"}},
                showPassword?EyeOpen:EyeClosed
              )
            )
          ),
          React.createElement("button",{onClick:()=>{setResetMode(true);setError("");},style:{background:"none",border:"none",color:"#3f7068",fontSize:11,textAlign:"right",width:"100%",marginBottom:16,cursor:"pointer"}},"Esqueci minha senha"),
          React.createElement("button",{onClick:handleLogin,disabled:loading,style:{background:loading?"rgba(29,209,161,0.4)":"linear-gradient(135deg,#1dd1a1,#17a880)",color:"#071e26",border:"none",borderRadius:12,padding:"14px",fontWeight:800,fontSize:15,width:"100%",cursor:loading?"not-allowed":"pointer",boxShadow:loading?"none":"0 4px 20px rgba(29,209,161,0.3)",transition:"all 0.2s"}},loading?"Entrando...":"Entrar"),
          React.createElement("button",{onClick:()=>{setSignupMode(true);setError("");setSignupMsg("");},style:{background:"none",border:"none",color:"#3f7068",fontSize:11,textAlign:"center",width:"100%",marginTop:14,cursor:"pointer"}},"Não tem conta? Criar conta")
        )
      ):resetMode?(
        React.createElement(React.Fragment,null,
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:14}},
            React.createElement("button",{onClick:()=>{setResetMode(false);setResetMsg("");},style:{background:"none",border:"none",color:C.muted,fontSize:20,cursor:"pointer",padding:0}},"←"),
            React.createElement("span",{style:{fontWeight:700,fontSize:14,color:C.text}},"Recuperar senha")
          ),
          resetMsg&&React.createElement("div",{style:{background:resetMsg.includes("✓")?"rgba(29,209,161,0.12)":"rgba(255,107,107,0.12)",border:"1px solid "+(resetMsg.includes("✓")?"rgba(29,209,161,0.3)":"rgba(255,107,107,0.3)"),borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:resetMsg.includes("✓")?"#1dd1a1":"#ff6b6b",textAlign:"center"}},resetMsg),
          React.createElement("div",{style:{fontSize:12,color:C.muted,marginBottom:10}},"Digite seu email para receber o link de redefinição:"),
          React.createElement("input",{type:"email",value:resetEmail,onChange:e=>{setResetEmail(e.target.value);setResetMsg("");},placeholder:"seu@email.com",style:{marginBottom:12}}),
          React.createElement("button",{onClick:handleReset,disabled:resetLoading,style:{background:resetLoading?"rgba(29,209,161,0.4)":"linear-gradient(135deg,#1dd1a1,#17a880)",color:"#071e26",border:"none",borderRadius:12,padding:"13px",fontWeight:800,fontSize:14,width:"100%",cursor:resetLoading?"not-allowed":"pointer"}},resetLoading?"Enviando...":"Enviar link de recuperação")
        )
      ):(
        React.createElement(React.Fragment,null,
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:14}},
            React.createElement("button",{onClick:()=>{setSignupMode(false);setSignupMsg("");},style:{background:"none",border:"none",color:C.muted,fontSize:20,cursor:"pointer",padding:0}},"←"),
            React.createElement("span",{style:{fontWeight:700,fontSize:14,color:C.text}},"Criar conta")
          ),
          signupMsg&&React.createElement("div",{style:{background:signupMsg.includes("✓")?"rgba(29,209,161,0.12)":"rgba(255,107,107,0.12)",border:"1px solid "+(signupMsg.includes("✓")?"rgba(29,209,161,0.3)":"rgba(255,107,107,0.3)"),borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:signupMsg.includes("✓")?"#1dd1a1":"#ff6b6b",textAlign:"center"}},signupMsg),
          React.createElement("div",{style:{marginBottom:10}},
            React.createElement("label",{style:{fontSize:11,color:"#6aada0",fontWeight:700,letterSpacing:"0.08em",display:"block",marginBottom:6}},"Nome"),
            React.createElement("input",{value:signupName,onChange:e=>{setSignupName(e.target.value);setSignupMsg("");},placeholder:"Digite seu nome"})
          ),
          React.createElement("div",{style:{marginBottom:10}},
            React.createElement("label",{style:{fontSize:11,color:"#6aada0",fontWeight:700,letterSpacing:"0.08em",display:"block",marginBottom:6}},"EMAIL"),
            React.createElement("input",{type:"email",value:signupEmail,onChange:e=>{setSignupEmail(e.target.value);setSignupMsg("");},placeholder:"seu@email.com"})
          ),
          React.createElement("div",{style:{marginBottom:10}},
            React.createElement("label",{style:{fontSize:11,color:"#6aada0",fontWeight:700,letterSpacing:"0.08em",display:"block",marginBottom:6}},"SENHA"),
            React.createElement("input",{type:"password",value:signupPassword,onChange:e=>{setSignupPassword(e.target.value);setSignupMsg("");},placeholder:"Mínimo 6 caracteres"})
          ),
          React.createElement("div",{style:{marginBottom:14}},
            React.createElement("label",{style:{fontSize:11,color:"#6aada0",fontWeight:700,letterSpacing:"0.08em",display:"block",marginBottom:6}},"SEU SETOR"),
            React.createElement("select",{value:signupSectorId,onChange:e=>{setSignupSectorId(e.target.value);setSignupMsg("");}},
              React.createElement("option",{value:""},"Selecione..."),
              sectors.map(s=>React.createElement("option",{key:s.id,value:s.id},(s.mascot?s.mascot+" ":"")+s.name))
            )
          ),
          React.createElement("button",{onClick:handleSignup,disabled:signupLoading,style:{background:signupLoading?"rgba(29,209,161,0.4)":"linear-gradient(135deg,#1dd1a1,#17a880)",color:"#071e26",border:"none",borderRadius:12,padding:"14px",fontWeight:800,fontSize:15,width:"100%",cursor:signupLoading?"not-allowed":"pointer"}},signupLoading?"Criando...":"Criar conta")
        )
      ),
      React.createElement("button",{onClick:handleBackup,style:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"#3f7068",borderRadius:10,padding:"8px 12px",fontSize:11,width:"100%",marginTop:14,cursor:"pointer"}},"💾 Backup local")
    ),
    React.createElement("div",{style:{marginTop:24,fontSize:11,color:"#2a5a50",textAlign:"center"}},"Estoque Aéreo v1.1")
  );
}
