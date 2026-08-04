'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const source=fs.readFileSync(path.join(__dirname,'..','interaction_v10_10_5.js'),'utf8');
const marker='/* Team Bulls v10.10.5 — navegação móvel integrada ao histórico e ao contexto interno. */';
const navigation=marker+source.split(marker)[1];

let activeScreen='screen-ts-day';
let modalOpen=false;
const listeners={};
const stack=[];
let stackIndex=-1;
const context={
  console,
  setTimeout(fn){fn();return 1;},
  clearTimeout(){},
  location:{href:'https://example.test/TeamBulls/'},
  CUR_WORKOUT:null,CUR_DAY:'',CUR_EX:null,
  VIEW_STUDENT:{uid:'student-1'},
  VIEW_STUDENT_WORKOUT:{id:'workout-1'},
  VIEW_STUDENT_DAY:'Dia A',
  VIEW_STUDENT_EXERCISE:null,
  CURRENT_DIET_ID:'',CURRENT_DIET_VARIANT_ID:'',
  document:{
    readyState:'complete',
    querySelector(selector){return selector==='.screen.active'?{id:activeScreen}:null;},
    querySelectorAll(selector){return selector==='.modal-backdrop.open'&&modalOpen?[{id:'modal-exercise'}]:[];},
    addEventListener(){}
  },
  addEventListener(type,fn){(listeners[type]??=[]).push(fn);},
  history:{
    state:null,
    replaceState(state){this.state=state;if(stackIndex<0){stack.push(state);stackIndex=0;}else stack[stackIndex]=state;},
    pushState(state){stack.splice(stackIndex+1);stack.push(state);stackIndex=stack.length-1;this.state=state;},
    back(){if(stackIndex<=0)return;stackIndex--;this.state=stack[stackIndex];for(const fn of listeners.popstate||[])fn({state:this.state});}
  },
  showScreen(id){activeScreen=id;},
  openModal(){modalOpen=true;},
  closeModal(){modalOpen=false;}
};
context.window=context;
vm.createContext(context);
vm.runInContext(navigation,context,{filename:'interaction_v10_10_5-navigation.js'});

function assert(condition,message){if(!condition)throw new Error(message);}

// Troca de dia dentro da mesma tela deve ser registrada no histórico.
context.VIEW_STUDENT_DAY='Dia B';
context.showScreen('screen-ts-day');
assert(context.TeamBullsNavigation.signature().includes('Dia B'),'o histórico não reconheceu a troca de contexto na mesma tela');

// Abrir e fechar o editor não pode restaurar o Dia A.
context.openModal('modal-exercise');
context.TeamBullsNavigation.syncCurrent();
context.closeModal('modal-exercise');
assert(context.VIEW_STUDENT_DAY==='Dia B','fechar o editor restaurou o dia anterior');
assert(activeScreen==='screen-ts-day','a tela do dia não foi preservada');

// O gesto voltar, depois do fechamento do modal, deve voltar ao dia anterior apenas quando solicitado.
context.history.back();
assert(context.VIEW_STUDENT_DAY==='Dia A','o gesto voltar não recuperou o contexto anterior');


const core=fs.readFileSync(path.join(__dirname,'..','app_v10_10_5_core.js'),'utf8');
const trainerSync=core.indexOf("syncExerciseDestinationBeforeClose('student',localWorkout,dayName)");
const trainerClose=core.indexOf("closeModal('modal-exercise');",trainerSync);
assert(trainerSync>=0&&trainerClose>trainerSync,'o destino do treinador não é fixado antes de fechar o editor');
assert(core.includes('const targetWorkout=exerciseModalWorkout();'),'o editor não trava o protocolo de destino');
assert(core.includes('validateExerciseModalDay(targetWorkout,dayName)'),'o dia selecionado não é validado antes da gravação');

console.log('APROVADO: troca de dia, fechamento do editor e histórico preservam o destino correto do exercício.');
