const results=[],check=(value,name)=>{if(!value)throw Error(name);results.push(name);},request=(action,payload={})=>ScenicDesktop.request(action,payload),until=async(fn,name)=>{for(let i=0;i<100;i++){if(await fn())return;await new Promise(r=>setTimeout(r,20));}throw Error('Timed out: '+name);};
try{
 doc=ScenicProjectFile.parse(clipboardFixture);workspace={version:2,activeProject:doc.projectId,projects:[doc]};doc.active=doc.scenes[0].id;selected=null;selectedIds.clear();history=[];future=[];commit();
 const wall={id:uid(),type:'wall',name:'Independent curve',x:200,y:200,x2:500,y2:200,thickness:8,curve:{x:20,y:80}};scene().objects.push(wall);
 addObject('asset:bounce-board',{x:300,y:300});const board=object();board.bounceSide='Black';
 const source=scene(),before=JSON.stringify(source);setSelection([wall.id,board.id]);showShots(false);canvas.focus();
 await request('qaCopy');await until(async()=>(await request('qaClipboardState')).text.startsWith('SCENIC OBJECTS 2\n'),'native advanced copy');
 check((await request('qaClipboardState')).copies===0,'Native Mac routes new format through structured object clipboard');
 activateScene(doc.scenes[1].id);canvas.focus();const count=scene().objects.length;await request('qaPaste');await until(()=>scene().objects.length===count+2,'native advanced paste');
 const copiedWall=scene().objects.find(o=>o.type==='wall'&&o.curve),copiedBoard=scene().objects.find(o=>o.asset==='bounce-board');check(copiedWall&&copiedBoard&&copiedBoard.bounceSide==='Black','Native paste preserves curve and modifier fields across scenes');check(JSON.stringify(source)===before,'Native advanced clipboard preserves source scene');
 copiedWall.curve.y=500;check(source.objects.find(o=>o.id===wall.id).curve.y===80,'Native pasted geometry controls are independent');
 undo();check(scene().objects.length===count,'Advanced native paste undoes atomically');redo();check(scene().objects.length===count+2,'Advanced native paste redoes atomically');
 const input=$('scene-title');input.focus();input.select();const state=await request('qaClipboardState');await request('qaCopy');await until(async()=>(await request('qaClipboardState')).copies>state.copies,'normal text copy');check(true,'Native ordinary text copy still uses standard responder chain');
 return {passed:true,count:results.length,results};
}catch(e){return {passed:false,count:results.length,results,error:e.message};}
