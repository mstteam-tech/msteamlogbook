/* Team Bulls v10.10.9 — mantém a semana escolhida na grade ao registrar a sessão. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_WEEK_SELECTION_FIX_V10109__)return;
  window.__TEAM_BULLS_WEEK_SELECTION_FIX_V10109__=true;

  const VERSION='10.10.9-weekselection1';
  let selectedContext=null;

  function clampWeek(value){return Math.max(1,Math.min(8,Number(value)||1));}
  function rememberWeek(week){
    selectedContext={workoutId:String(CUR_WORKOUT||''),week:clampWeek(week)};
    LAST_SESSION_WEEK=selectedContext.week;
    return selectedContext.week;
  }
  function currentContextWeek(){
    if(!selectedContext||String(CUR_WORKOUT||'')!==selectedContext.workoutId)return 0;
    return clampWeek(selectedContext.week);
  }

  function install(){
    if(typeof openStudentWeekExercise!=='function'||typeof openLogSessionModal!=='function')return false;
    if(openLogSessionModal.__tbWeekSelectionFix)return true;
    if(typeof V104_OPEN_LOG_SESSION!=='function')return false;

    const baseOpenWorkout=typeof openWorkout==='function'?openWorkout:null;
    const baseOpenStudentWeekExercise=openStudentWeekExercise;
    const baseChangeExerciseWeek=typeof changeExerciseWeek==='function'?changeExerciseWeek:null;
    const baseOpenLogSessionModal=openLogSessionModal;
    const baseSessionModal=V104_OPEN_LOG_SESSION;
    const baseSyncSessionWeekFromDate=typeof syncSessionWeekFromDate==='function'?syncSessionWeekFromDate:null;
    const baseOnSessionWeekChange=typeof onSessionWeekChange==='function'?onSessionWeekChange:null;

    if(baseOpenWorkout){
      const fixedOpenWorkout=function(id){
        selectedContext=null;
        return baseOpenWorkout.apply(this,arguments);
      };
      fixedOpenWorkout.__tbWeekSelectionFix=true;
      openWorkout=fixedOpenWorkout;
    }

    openStudentWeekExercise=function(eid,week){
      const selected=rememberWeek(week);
      return baseOpenStudentWeekExercise.call(this,eid,selected);
    };
    openStudentWeekExercise.__tbWeekSelectionFix=true;

    if(baseChangeExerciseWeek){
      changeExerciseWeek=function(delta,trainerMode){
        const result=baseChangeExerciseWeek.apply(this,arguments);
        if(!trainerMode&&CUR_WORKOUT)rememberWeek(LAST_SESSION_WEEK);
        return result;
      };
      changeExerciseWeek.__tbWeekSelectionFix=true;
    }

    if(baseSyncSessionWeekFromDate){
      syncSessionWeekFromDate=function(force=false){
        const result=baseSyncSessionWeekFromDate.apply(this,arguments);
        if(document.getElementById('modal-session')?.classList.contains('open')&&CUR_WORKOUT){
          const select=document.getElementById('input-session-week');
          if(select)rememberWeek(select.value);
        }
        return result;
      };
      syncSessionWeekFromDate.__tbWeekSelectionFix=true;
    }

    if(baseOnSessionWeekChange){
      onSessionWeekChange=function(){
        const result=baseOnSessionWeekChange.apply(this,arguments);
        if(CUR_WORKOUT){
          const select=document.getElementById('input-session-week');
          if(select)rememberWeek(select.value);
        }
        return result;
      };
      onSessionWeekChange.__tbWeekSelectionFix=true;
    }

    const fixedOpenLogSessionModal=function(){
      const selected=currentContextWeek();
      if(!selected)return baseOpenLogSessionModal.apply(this,arguments);

      /*
       * A camada de ciclo v10.4 recalculava a semana pela data de hoje toda vez
       * que o modal era aberto. Isso anulava a semana que o aluno acabou de tocar
       * na grade. Quando existe uma escolha explícita da grade, abrimos pelo
       * wrapper anterior ao recálculo automático e mantemos exatamente essa semana.
       * Se o aluno alterar a data ou o seletor dentro do modal, os handlers acima
       * continuam atualizando a semana normalmente.
       */
      LAST_SESSION_WEEK=selected;
      const result=baseSessionModal.apply(this,arguments);
      const select=document.getElementById('input-session-week');
      if(select&&Number(select.value)!==selected){
        select.value=String(selected);
        SESSION_EDITOR_WEEK=selected;
        if(typeof populateSessionEditorForWeek==='function')populateSessionEditorForWeek(selected);
      }
      return result;
    };
    fixedOpenLogSessionModal.__tbWeekSelectionFix=true;
    fixedOpenLogSessionModal.__tbBase=baseOpenLogSessionModal;
    openLogSessionModal=fixedOpenLogSessionModal;

    window.TeamBullsWeekSelectionFix=Object.freeze({
      version:VERSION,
      selectedWeek:()=>currentContextWeek()||clampWeek(LAST_SESSION_WEEK)
    });
    return true;
  }

  if(!install()){
    window.addEventListener('team-bulls-v107-ready',()=>install(),{once:true});
    setTimeout(install,900);
  }
})();
