/* Temporary offline TestFlight demo. Set enabled=false to hide Load Demo before public launch. */
(function(root){
'use strict';
const enabled=true,key='scenic-the-last-cue-v1';
function project(){
 const story=`FICTIONAL DEMO — THE LAST CUE
Original demo script. All characters are fictional adults (Maya, 22; Leo, 23).

INT. COLLEGE BLACK-BOX THEATRE — EVENING
A desk, chair, prop notebook and practical lamp wait on the rehearsal floor. Maya, the stage manager, sets the notebook beside the lamp. Leo, the lighting operator, checks the cue list.
MAYA: From the top. Desk set, notebook ready. Stand by cue twelve.
LEO: Standing by.
Maya crosses to the chair. The lamp comes on, but the stage wash stays dark.
MAYA: Hold. We missed the wash before the practical.
LEO: I followed thirteen. My mistake. Reset twelve?
MAYA: Reset. We have time to get it right.
Leo returns to his mark. Maya replaces the notebook and clears the chair.
MAYA: Stand by twelve. Go.
The wash rises. The practical glows. Maya sits and opens the notebook.
LEO: Cue complete.
MAYA: And rehearsal complete.

DEMO NOTES
Use Play scene to preview Maya and Leo's blocking. Select cameras A–D and edit lens, position or linked shot. Turn the stage wash off to recreate the missed cue, then undo. Scene notes hold this script and travel in .scenic files. This is a separate editable demo production; Load Demo reopens it without resetting edits.`;
 const shots=[
  ['1A','Wide','24','Establish the rehearsal floor as Maya sets the notebook and Leo stands by.','Static'],
  ['1B','Medium','50','Maya calls hold when the stage wash misses cue twelve.','Static'],
  ['1C','Insert','85','Notebook and practical lamp: Leo discovers cue thirteen was selected.','Static'],
  ['1D','Medium wide','35','Reset and complete the rehearsal together as the wash rises.','Static']
 ].map(([number,size,lens,description,movement],i)=>({id:'demo-shot-'+i,checked:false,day:'1',scene:'1',number,description,size,movement,camera:String.fromCharCode(65+i),lens,equipment:'Tripod',setupMinutes:'5',shootMinutes:'3',actualMinutes:'',status:'Planned',takes:'',circleTake:'',priority:'Normal',notes:'Fictional rehearsal demo · The Last Cue'}));
 const item=(id,asset,type,name,x,y,width,height)=>({id,asset,type,name,x,y,width:width*3,height:height*3,rotation:0});
 const actors=[['maya','Maya · stage manager (adult)',400,370,0,'#cf7d96'],['leo','Leo · lighting operator (adult)',720,320,140,'#7b9cc9']].map(([id,name,x,y,rotation,color])=>({id,name,type:'actor',x,y,rotation,color,marks:[{x,y,rotation,notes:'Stand by cue twelve'},{x:x-80,y:y+80,rotation,notes:'Reset and complete rehearsal'}],showRoute:true,pathDuration:6}));
 const cameras=[[510,780,-90,24],[240,620,-40,50],[720,540,-150,85],[830,760,-125,35]].map(([x,y,rotation,lens],i)=>({id:'demo-camera-'+i,type:'camera',name:'Camera '+String.fromCharCode(65+i)+' · '+shots[i].number,x,y,rotation,lens,fov:2*Math.atan(36/(2*lens))*180/Math.PI,sensorWidth:36,viewDistance:900,shot:shots[i].size,height:'Eye level',notes:shots[i].description,shotId:shots[i].id}));
 const scene={id:'demo-rehearsal',title:'INT. BLACK-BOX THEATRE — EVENING',subtitle:'The Last Cue · rehearsal',ambient:35,notes:story,shotList:shots,objects:[
  item('demo-room','room-rectangle','room','Black-box rehearsal floor · 24 × 20 ft',540,480,288,240),
  item('demo-desk','desk','set','Rehearsal desk',510,360,48,24),
  item('demo-chair','chair','set','Maya’s chair',510,475,20,22),
  item('demo-notebook','book','prop','Prop notebook · cue list',480,350,6,9),
  {id:'demo-practical',asset:'practical',type:'light',name:'Practical lamp · cue thirteen',x:555,y:350,rotation:0,power:50,temperature:2800,beam:360,radius:230,enabled:true},
  {id:'demo-wash',asset:'led-panel',type:'light',name:'Stage wash · cue twelve',x:540,y:160,rotation:90,power:65,temperature:4300,beam:100,radius:700,enabled:true},
  ...actors,...cameras
 ]};
 scene.objects[0].thickness=9;scene.objects[0].keepProportions=false;
 return {version:1,projectId:key,demoKey:key,name:'DEMO · The Last Cue',theme:'light',active:scene.id,scenes:[scene],editorSettings:{grid:true,snap:true,simulation:true}};
}
const api={enabled,key,project};
if(typeof module==='object'&&module.exports)module.exports=api;else root.ScenicDemo=api;
})(typeof window==='object'?window:globalThis);
