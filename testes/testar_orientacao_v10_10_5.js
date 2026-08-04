/* Regression test: the virtual keyboard must not be treated as physical landscape. */
'use strict';
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const interactionPath=path.join(__dirname,'..','interaction_v10_10_5.js');
let source=fs.readFileSync(interactionPath,'utf8').split('\n/* Team Bulls v10.10.5 — navegação móvel')[0];
source=source.replace(/\}\)\(\);\s*$/, 'globalThis.__orientationTest={isPhysicalLandscape};})();');
if(!source.includes('__orientationTest'))throw new Error('Não foi possível instrumentar o teste de orientação.');
function editableInput(){return{disabled:false,readOnly:false,type:'email',matches(selector){if(selector==='textarea,[contenteditable="true"]')return false;if(selector==='input')return true;return false;},closest(){return null;}};}
function evaluate({type='',angle=undefined,legacy=undefined,screenWidth=0,screenHeight=0,innerWidth=360,innerHeight=800,keyboard=false,active=false}){
  const classes=new Set(keyboard?['virtual-keyboard-open']:[]);
  const context={
    console,
    setTimeout(){return 1;},clearTimeout(){},requestAnimationFrame(){return 1;},
    Element:function(){},CustomEvent:function(){},location:{reload(){},href:'https://example.test/'},history:{},
    navigator:{},CURRENT_USER:null,
    document:{
      readyState:'loading',body:{classList:{contains(){return false;},remove(){}}},
      documentElement:{classList:{contains:name=>classes.has(name),toggle(){}},setAttribute(){},removeAttribute(){}},
      activeElement:active?editableInput():null,
      addEventListener(){},querySelector(){return null;},querySelectorAll(){return[];}
    },
    screen:{width:screenWidth,height:screenHeight,orientation:type||angle!==undefined?{type,angle}:undefined},
    innerWidth,innerHeight,orientation:legacy,
    matchMedia(){return{matches:true};},addEventListener(){},removeEventListener(){},visualViewport:null
  };
  context.window=context;context.globalThis=context;
  vm.createContext(context);vm.runInContext(source,context,{filename:'interaction_v10_10_5.js'});
  return context.__orientationTest.isPhysicalLandscape();
}
const cases=[
  ['retrato físico com teclado e viewport largo',false,{type:'portrait-primary',angle:0,innerWidth:720,innerHeight:390,keyboard:true,active:true}],
  ['paisagem física',true,{type:'landscape-primary',angle:90,innerWidth:720,innerHeight:390}],
  ['fallback por dimensões físicas em retrato',false,{screenWidth:360,screenHeight:800,innerWidth:720,innerHeight:390,keyboard:true,active:true}],
  ['fallback por dimensões físicas em paisagem',true,{screenWidth:800,screenHeight:360,innerWidth:720,innerHeight:390}],
  ['último fallback ignora teclado ativo',false,{innerWidth:720,innerHeight:390,keyboard:true,active:true}],
  ['último fallback sem teclado reconhece paisagem',true,{innerWidth:720,innerHeight:390}]
];
for(const [name,expected,input] of cases){const actual=evaluate(input);if(actual!==expected)throw new Error(`${name}: esperado ${expected}, recebido ${actual}`);}
console.log(`APROVADO: ${cases.length} cenários de orientação física e teclado virtual.`);
