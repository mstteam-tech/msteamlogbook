import fs from 'node:fs';
const source=fs.readFileSync('modules/student-guidance-v10_10_9-v2.js','utf8');
for(const required of ['input-diet-hydration-ml','renderStaticInstructions','openStretchGuide','markInstructionAcknowledged','forcedPromptToken']){
  if(!source.includes(required))throw new Error('Ausente: '+required);
}
console.log('Student guidance smoke OK.');
