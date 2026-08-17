/* Team Bulls v10.10.9 — proteção contra cadastro parcialmente confirmado. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_REGISTRATION_INTEGRITY_V10109__)return;
  window.__TEAM_BULLS_REGISTRATION_INTEGRITY_V10109__=true;

  const VERSION='10.10.9-registration1';
  function normalizeCode(value){return String(value||'').normalize('NFKC').trim().toUpperCase().replace(/\s+/g,'');}
  function inviteValid(data){
    if(!data||data.active!==true||data.usedBy)return false;
    const expiry=data.expiresAt?.toMillis?data.expiresAt.toMillis():new Date(data.expiresAt||0).getTime();
    return Number.isFinite(expiry)&&expiry>Date.now();
  }
  function uncertainCommit(error){
    const code=String(error?.code||'').toLowerCase(),message=String(error?.message||'').toLowerCase();
    return code==='unavailable'||code==='deadline-exceeded'||code==='auth/network-request-failed'||code==='team-bulls/timeout'||message.includes('network')||message.includes('offline');
  }
  async function registrationState(uid,inviteId,trainerId){
    try{
      const snap=await withTimeout(db.collection('users').doc(uid).get(),6000,'confirmar resultado do cadastro');
      if(!snap.exists)return'missing';
      const data=snap.data()||{};
      return data.role==='student'&&String(data.inviteId||'')===String(inviteId||'')&&String(data.trainerId||'')===String(trainerId||'')?'committed':'conflict';
    }catch(error){return'unknown';}
  }
  async function finishRegisteredAccount(email,pass,cred,userData){
    cacheUserProfile({...userData,uid:cred.user.uid});
    await rememberOfflineCredential(email,pass,cred.user.uid,userData);
    window.TeamBullsAuthFields?.clearSecrets?.();
  }

  function install(){
    const TB=window.TeamBulls107;
    if(!TB||typeof TB.inviteHash!=='function'||typeof doRegister!=='function')return false;
    if(doRegister.__tbRegistrationIntegrity)return true;
    const secured=async function(){
      clearAuthError('reg-error');
      const name=document.getElementById('reg-name').value.trim(),email=document.getElementById('reg-email').value.trim(),pass=document.getElementById('reg-pass').value,code=normalizeCode(document.getElementById('reg-code').value);
      if(!name||!email||!pass||!code){showAuthError('reg-error','Preencha nome, e-mail, senha e convite.');return;}
      if(name.length>100){showAuthError('reg-error','O nome deve ter no máximo 100 caracteres.');return;}
      if(pass.length<8){showAuthError('reg-error','Use uma senha com pelo menos 8 caracteres.');return;}
      if(!navigator.onLine){showAuthError('reg-error','O cadastro inicial exige conexão com a internet.');return;}
      const btn=document.getElementById('btn-register');if(!btn||btn.disabled)return;
      btn.disabled=true;btn.textContent='VALIDANDO CONVITE...';
      let cred=null,inviteId='',userData=null;
      try{
        if(!await ensureFirebaseReady())throw new Error('Não foi possível carregar a conexão segura.');
        inviteId=await TB.inviteHash(code);const inviteRef=db.collection('studentInvites').doc(inviteId),precheck=await cloudGet(inviteRef,'validar convite');
        if(!precheck.exists||!inviteValid(precheck.data())){const error=new Error('Convite inválido, expirado ou já utilizado.');error.code='team-bulls/invalid-invite';throw error;}
        btn.textContent='CRIANDO CONTA...';AUTH_HANDLED=false;startBootWatchdog();
        cred=await withTimeout(auth.createUserWithEmailAndPassword(email,pass),12000,'criação da conta');
        userData={name:name.slice(0,100),email,role:'student',status:'active',trainerId:String(precheck.data().trainerId||''),inviteId,createdAt:firebase.firestore.FieldValue.serverTimestamp()};
        /* Não envolver runTransaction em Promise.race/withTimeout. O SDK precisa
           concluir sua própria confirmação para não confundirmos commit tardio
           com falha e apagarmos uma conta que já consumiu o convite. */
        await db.runTransaction(async transaction=>{
          const fresh=await transaction.get(inviteRef);
          if(!fresh.exists||!inviteValid(fresh.data())){const error=new Error('Este convite acabou de expirar ou já foi usado.');error.code='team-bulls/invalid-invite';throw error;}
          if(String(fresh.data().trainerId||'')!==userData.trainerId)throw new Error('Convite inconsistente.');
          transaction.set(db.collection('users').doc(cred.user.uid),userData);
          transaction.update(inviteRef,{active:false,usedBy:cred.user.uid,usedAt:firebase.firestore.FieldValue.serverTimestamp()});
        });
        await finishRegisteredAccount(email,pass,cred,userData);
      }catch(error){
        AUTH_HANDLED=false;
        if(cred?.user&&userData&&uncertainCommit(error)){
          const state=await registrationState(cred.user.uid,inviteId,userData.trainerId);
          if(state==='committed'){await finishRegisteredAccount(email,pass,cred,userData);return;}
          if(state==='unknown'){
            try{await auth.signOut();}catch(signOutError){}
            showAuthError('reg-error','Não foi possível confirmar o resultado do cadastro. Tente entrar com este mesmo e-mail antes de usar outro convite.');return;
          }
        }
        if(cred?.user){try{await cred.user.delete();}catch(cleanupError){try{await auth.signOut();}catch(signOutError){}}}
        const messages={'auth/email-already-in-use':'E-mail já cadastrado.','auth/invalid-email':'E-mail inválido.','auth/weak-password':'Senha muito fraca.','team-bulls/invalid-invite':'Convite inválido, expirado ou já utilizado. Peça um novo ao treinador.','team-bulls/timeout':'O servidor demorou para responder. Tente entrar com a mesma conta antes de cadastrar novamente.'};
        showAuthError('reg-error',messages[error.code]||error.message||'Não foi possível criar a conta.');
      }finally{btn.disabled=false;btn.textContent='CRIAR NOVO REGISTRO';}
    };
    secured.__tbRegistrationIntegrity=true;doRegister=secured;
    window.TeamBullsRegistrationIntegrity=Object.freeze({version:VERSION});
    return true;
  }

  if(!install()){
    const retry=()=>{if(install())return;setTimeout(install,0);};
    if(document.readyState==='complete')retry();else window.addEventListener('load',retry,{once:true});
  }
})();