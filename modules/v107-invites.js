/* Team Bulls v10.10.9 — convites individuais de uso único. */
'use strict';
(function(){
  const TB=window.TeamBulls107;if(!TB)return;
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function randomCode(){
    const bytes=new Uint8Array(15);crypto.getRandomValues(bytes);
    let raw='';for(const byte of bytes)raw+=alphabet[byte%alphabet.length];
    return'TB-'+raw.slice(0,5)+'-'+raw.slice(5,10)+'-'+raw.slice(10,15);
  }
  function normalizeCode(value){return String(value||'').normalize('NFKC').trim().toUpperCase().replace(/\s+/g,'');}
  async function sha256(value){
    if(!crypto?.subtle)throw new Error('Este navegador não oferece a criptografia necessária para validar convites.');
    const bytes=new TextEncoder().encode(normalizeCode(value));
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    return[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  }
  function inviteValid(data){
    if(!data||data.active!==true||data.usedBy)return false;
    const expiry=data.expiresAt?.toMillis?data.expiresAt.toMillis():new Date(data.expiresAt||0).getTime();
    return Number.isFinite(expiry)&&expiry>Date.now();
  }
  TB.createInvite=async function(days=7){
    if(CURRENT_USER?.role!=='trainer')throw new Error('Somente o treinador pode criar convites.');
    if(!await TB.ensureCloud())throw new Error('Firebase indisponível.');
    const safeDays=Math.max(1,Math.min(30,Math.trunc(Number(days)||7)));
    for(let attempt=0;attempt<4;attempt++){
      const code=randomCode(),id=await sha256(code),ref=db.collection('studentInvites').doc(id);
      const existing=await cloudGet(ref,'verificar convite');if(existing.exists)continue;
      const expiresAt=firebase.firestore.Timestamp.fromMillis(Date.now()+safeDays*86400000);
      await cloudWrite(ref.set({trainerId:CURRENT_USER.uid,active:true,createdAt:firebase.firestore.FieldValue.serverTimestamp(),expiresAt,usedAt:null,usedBy:'',revokedAt:null}),'criar convite');
      await TB.audit('Convite criado',{entity:'convite',summary:'Convite de uso único por '+safeDays+' dias',metadata:{inviteId:id,expiresAt:expiresAt.toDate().toISOString()}});
      return{id,code,active:true,expiresAt:expiresAt.toDate().toISOString()};
    }
    throw new Error('Não foi possível gerar um convite exclusivo. Tente novamente.');
  };
  TB.loadInvites=async function(){
    if(CURRENT_USER?.role!=='trainer'||!await TB.ensureCloud())return[];
    const snap=await cloudGet(db.collection('studentInvites').where('trainerId','==',CURRENT_USER.uid).limit(120),'convites');
    return snap.docs.map(doc=>{
      const data=doc.data(),expiresAt=data.expiresAt?.toDate?data.expiresAt.toDate().toISOString():String(data.expiresAt||''),createdAt=data.createdAt?.toDate?data.createdAt.toDate().toISOString():'';
      return{...data,id:doc.id,expiresAt,createdAt,valid:inviteValid(data)};
    }).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  };
  TB.revokeInvite=async function(id){
    if(CURRENT_USER?.role!=='trainer'||!id)throw new Error('Convite inválido.');
    await cloudWrite(db.collection('studentInvites').doc(id).update({active:false,revokedAt:firebase.firestore.FieldValue.serverTimestamp()}),'revogar convite');
    await TB.audit('Convite revogado',{entity:'convite',metadata:{inviteId:id}});return true;
  };
  TB.copyText=async function(value){
    try{await navigator.clipboard.writeText(String(value||''));showToast('✓ Copiado para a área de transferência');return true;}
    catch(error){window.prompt('Copie o conteúdo abaixo:',String(value||''));return false;}
  };
  TB.inviteHash=sha256;

  async function registrationState(uid,inviteId,trainerId){
    if(!uid||!db)return'unknown';
    try{
      const snap=await withTimeout(db.collection('users').doc(uid).get(),6000,'confirmar resultado do cadastro');
      if(!snap.exists)return'missing';
      const data=snap.data()||{};
      return data.role==='student'&&String(data.inviteId||'')===String(inviteId||'')&&String(data.trainerId||'')===String(trainerId||'')?'committed':'conflict';
    }catch(error){return'unknown';}
  }
  function uncertainCommit(error){
    const code=String(error?.code||'').toLowerCase();
    const message=String(error?.message||'').toLowerCase();
    return code==='unavailable'||code==='deadline-exceeded'||code==='auth/network-request-failed'||code==='team-bulls/timeout'||message.includes('network')||message.includes('offline');
  }
  async function finishRegisteredAccount(email,pass,cred,userData){
    cacheUserProfile({...userData,uid:cred.user.uid});
    await rememberOfflineCredential(email,pass,cred.user.uid,userData);
    window.TeamBullsAuthFields?.clearSecrets?.();
  }
  function suspendAuthListenerForRegistration(){
    try{
      if(typeof AUTH_UNSUBSCRIBE==='function'){
        AUTH_UNSUBSCRIBE();
        AUTH_UNSUBSCRIBE=null;
        AUTH_CALLBACK_SEEN=false;
        AUTH_PROCESSING_UID='';
        return true;
      }
    }catch(error){console.warn('Não foi possível pausar o observador de autenticação durante o cadastro:',error);}
    return false;
  }
  function resumeAuthListenerAfterRegistration(wasSuspended){
    if(!wasSuspended)return;
    try{
      AUTH_HANDLED=false;
      AUTH_PROCESSING_UID='';
      if(typeof startAuthListener==='function')startAuthListener();
    }catch(error){console.error('Não foi possível restaurar o observador de autenticação:',error);}
  }

  /* Cadastro seguro: o código fixo foi substituído por um documento aleatório,
     expirável e consumido na mesma transação que cria o perfil do aluno.
     A transação NÃO recebe timeout artificial: abortá-la localmente enquanto o
     servidor ainda confirma o commit poderia consumir o convite e depois apagar
     a conta Auth, deixando um cadastro órfão.

     O observador global de autenticação é pausado somente durante esta janela.
     createUserWithEmailAndPassword autentica a conta antes de o documento /users
     existir; sem essa pausa, o guard de sessão pode interpretar a ausência
     temporária do perfil como cadastro incompleto, deslogar o usuário e fazer a
     transação seguinte falhar com permission-denied. */
  doRegister=async function(){
    clearAuthError('reg-error');
    const name=document.getElementById('reg-name').value.trim();
    const email=document.getElementById('reg-email').value.trim();
    const pass=document.getElementById('reg-pass').value;
    const code=normalizeCode(document.getElementById('reg-code').value);
    if(!name||!email||!pass||!code){showAuthError('reg-error','Preencha nome, e-mail, senha e convite.');return;}
    if(name.length>100){showAuthError('reg-error','O nome deve ter no máximo 100 caracteres.');return;}
    if(pass.length<8){showAuthError('reg-error','Use uma senha com pelo menos 8 caracteres.');return;}
    if(!navigator.onLine){showAuthError('reg-error','O cadastro inicial exige conexão com a internet.');return;}
    const btn=document.getElementById('btn-register');if(btn.disabled)return;
    btn.disabled=true;btn.textContent='VALIDANDO CONVITE...';
    let cred=null,inviteId='',userData=null,authListenerSuspended=false;
    try{
      if(!await ensureFirebaseReady())throw new Error('Não foi possível carregar a conexão segura.');
      inviteId=await sha256(code);const inviteRef=db.collection('studentInvites').doc(inviteId);
      const precheck=await cloudGet(inviteRef,'validar convite');
      if(!precheck.exists||!inviteValid(precheck.data())){const error=new Error('Convite inválido, expirado ou já utilizado.');error.code='team-bulls/invalid-invite';throw error;}
      btn.textContent='CRIANDO CONTA...';AUTH_HANDLED=false;startBootWatchdog();
      authListenerSuspended=suspendAuthListenerForRegistration();
      cred=await withTimeout(auth.createUserWithEmailAndPassword(email,pass),12000,'criação da conta');
      await withTimeout(cred.user.getIdToken(true),6000,'atualização da credencial de cadastro');
      userData={name:name.slice(0,100),email,role:'student',status:'active',trainerId:String(precheck.data().trainerId||''),inviteId,createdAt:firebase.firestore.FieldValue.serverTimestamp()};
      await db.runTransaction(async transaction=>{
        const fresh=await transaction.get(inviteRef);if(!fresh.exists||!inviteValid(fresh.data())){const error=new Error('Este convite acabou de expirar ou já foi usado.');error.code='team-bulls/invalid-invite';throw error;}
        if(String(fresh.data().trainerId||'')!==userData.trainerId)throw new Error('Convite inconsistente.');
        transaction.set(db.collection('users').doc(cred.user.uid),userData);
        transaction.update(inviteRef,{active:false,usedBy:cred.user.uid,usedAt:firebase.firestore.FieldValue.serverTimestamp()});
      });
      await finishRegisteredAccount(email,pass,cred,userData);
    }catch(error){
      AUTH_HANDLED=false;
      if(cred?.user&&userData&&uncertainCommit(error)){
        const state=await registrationState(cred.user.uid,inviteId,userData.trainerId);
        if(state==='committed'){
          await finishRegisteredAccount(email,pass,cred,userData);
          return;
        }
        if(state==='unknown'){
          try{await auth.signOut();}catch(signOutError){}
          showAuthError('reg-error','Não foi possível confirmar o resultado do cadastro. Para evitar apagar uma conta que pode ter sido criada, tente entrar com este mesmo e-mail antes de usar outro convite.');
          return;
        }
      }
      if(cred?.user){try{await cred.user.delete();}catch(cleanupError){try{await auth.signOut();}catch(signOutError){}}}
      const messages={
        'auth/email-already-in-use':'E-mail já cadastrado.','auth/invalid-email':'E-mail inválido.','auth/weak-password':'Senha muito fraca.',
        'team-bulls/invalid-invite':'Convite inválido, expirado ou já utilizado. Peça um novo ao treinador.',
        'team-bulls/timeout':'O servidor demorou para concluir o cadastro. Tente entrar com a mesma conta antes de cadastrar novamente.',
        'permission-denied':'O Firebase recusou a criação do perfil. Atualize o app e, se persistir, confira se as regras atuais do Firestore foram publicadas.'
      };
      showAuthError('reg-error',messages[error.code]||error.message||'Não foi possível criar a conta.');
    }finally{
      resumeAuthListenerAfterRegistration(authListenerSuspended);
      btn.disabled=false;btn.textContent='CRIAR NOVO REGISTRO';
    }
  };

  /* A camada de integridade legada era carregada depois deste módulo e podia
     substituir doRegister por uma cópia antiga. Em instalações que ainda tenham
     esse arquivo no cache, restauramos imediatamente o fluxo canônico depois de
     cada módulo diferido. Isso torna o hotfix compatível até com caches antigos. */
  doRegister.__tbCanonicalInviteRegistration=true;
  const CANONICAL_REGISTER=doRegister;
  function enforceCanonicalRegistration(){
    if(typeof doRegister==='function'&&doRegister!==CANONICAL_REGISTER){
      console.warn('[Team Bulls] Fluxo legado de cadastro ignorado; restaurando cadastro seguro por convite.');
      doRegister=CANONICAL_REGISTER;
    }
  }
  window.addEventListener('team-bulls-runtime-state',enforceCanonicalRegistration);
  window.addEventListener('team-bulls-runtime-ready',enforceCanonicalRegistration);
  window.addEventListener('pageshow',enforceCanonicalRegistration);

  function updateRegisterCopy(){
    const input=document.getElementById('reg-code');if(!input)return;
    const label=input.closest('.form-group')?.querySelector('.form-label');
    if(label)label.innerHTML='Convite individual <span style="color:var(--accent)">*uso único</span>';
    input.placeholder='Ex.: TB-ABCDE-FGHIJ-KLMNO';input.maxLength=23;input.autocapitalize='characters';
    const passLabel=document.getElementById('reg-pass')?.closest('.form-group')?.querySelector('.form-label');if(passLabel)passLabel.textContent='Senha (mín. 8 caracteres)';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',updateRegisterCopy,{once:true});else updateRegisterCopy();
})();