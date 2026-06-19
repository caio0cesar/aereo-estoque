import React, { useState } from "react";
import { updatePassword, signOut } from "../services/supabase.jsx";
import { DuckIcon, C } from "./shared.jsx";

export default function ResetPasswordScreen({onDone}){
  const [password,setPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");
  const [showPassword,setShowPassword]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState(false);
  const [focused,setFocused]=useState("");

  async function handleSubmit(){
    if(!password||!confirmPassword){setError("Preencha os dois campos.");return;}
    if(password.length<6){setError("A senha deve ter no mínimo 6 caracteres.");return;}
    if(password!==confirmPassword){setError("As senhas não coincidem.");return;}
    setLoading(true);setError("");
    try{
      await updatePassword(password);
      setSuccess(true);
      await signOut();
    }catch(e){
      setError(e.message||"Erro ao atualizar senha.");
    }finally{
      setLoading(false);
    }
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
      React.createElement("div",{style:{fontSize:26,fontWeight:800,color:"#e4f5f0",lineHeight:1.2,marginBottom:6}},success?"Senha":"Nova"),
      React.createElement("div",{style:{fontSize:26,fontWeight:800,color:"#1dd1a1",lineHeight:1.2}},success?"Atualizada! ✅":"Senha 🔒"),
      React.createElement("div",{style:{fontSize:13,color:"#3f7068",marginTop:10}},success?"Faça login com sua nova senha":"Defina uma nova senha para sua conta")
    ),
    React.createElement("div",{className:"login-card",style:{width:"100%",maxWidth:360,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:24,backdropFilter:"blur(10px)",overflow:"hidden"}},
      success?(
        React.createElement(React.Fragment,null,
          React.createElement("div",{style:{background:"rgba(29,209,161,0.12)",border:"1px solid rgba(29,209,161,0.3)",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#1dd1a1",textAlign:"center"}},"✓ Sua senha foi alterada com sucesso!"),
          React.createElement("button",{onClick:onDone,style:{background:"linear-gradient(135deg,#1dd1a1,#17a880)",color:"#071e26",border:"none",borderRadius:12,padding:"14px",fontWeight:800,fontSize:15,width:"100%",cursor:"pointer",boxShadow:"0 4px 20px rgba(29,209,161,0.3)"}},"Ir para o login")
        )
      ):(
        React.createElement(React.Fragment,null,
          error&&React.createElement("div",{style:{background:"rgba(255,107,107,0.12)",border:"1px solid rgba(255,107,107,0.25)",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#ff6b6b",textAlign:"center"}},error),
          React.createElement("div",{style:{marginBottom:14}},
            React.createElement("label",{style:{fontSize:11,color:"#6aada0",fontWeight:700,letterSpacing:"0.08em",display:"block",marginBottom:6}},"NOVA SENHA"),
            React.createElement("div",{style:{position:"relative"}},
              React.createElement("input",{type:showPassword?"text":"password",value:password,onChange:e=>{setPassword(e.target.value);setError("");},onFocus:()=>setFocused("password"),onBlur:()=>setFocused(""),placeholder:"Mínimo 6 caracteres",style:{background:focused==="password"?"rgba(29,209,161,0.06)":"rgba(255,255,255,0.05)",border:"1px solid "+(focused==="password"?"rgba(29,209,161,0.5)":"rgba(255,255,255,0.1)"),borderRadius:12,padding:"12px 40px 12px 16px",color:"#e4f5f0",fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",transition:"all 0.2s"}}),
              React.createElement("button",{type:"button",onClick:()=>setShowPassword(!showPassword),style:{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center"}},
                showPassword?EyeOpen:EyeClosed
              )
            )
          ),
          React.createElement("div",{style:{marginBottom:16}},
            React.createElement("label",{style:{fontSize:11,color:"#6aada0",fontWeight:700,letterSpacing:"0.08em",display:"block",marginBottom:6}},"CONFIRMAR SENHA"),
            React.createElement("input",{type:showPassword?"text":"password",value:confirmPassword,onChange:e=>{setConfirmPassword(e.target.value);setError("");},onFocus:()=>setFocused("confirm"),onBlur:()=>setFocused(""),onKeyDown:e=>{if(e.key==="Enter")handleSubmit();},placeholder:"Repita a nova senha",style:{background:focused==="confirm"?"rgba(29,209,161,0.06)":"rgba(255,255,255,0.05)",border:"1px solid "+(focused==="confirm"?"rgba(29,209,161,0.5)":"rgba(255,255,255,0.1)"),borderRadius:12,padding:"12px 16px",color:"#e4f5f0",fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",transition:"all 0.2s"}})
          ),
          React.createElement("button",{onClick:handleSubmit,disabled:loading,style:{background:loading?"rgba(29,209,161,0.4)":"linear-gradient(135deg,#1dd1a1,#17a880)",color:"#071e26",border:"none",borderRadius:12,padding:"14px",fontWeight:800,fontSize:15,width:"100%",cursor:loading?"not-allowed":"pointer",boxShadow:loading?"none":"0 4px 20px rgba(29,209,161,0.3)",transition:"all 0.2s"}},loading?"Salvando...":"Salvar nova senha")
        )
      )
    ),
    React.createElement("div",{style:{marginTop:24,fontSize:11,color:"#2a5a50",textAlign:"center"}},"Estoque Aéreo v1.1")
  );
}
