const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');
// The system save dialog confirms replacement; stage beside the chosen file so
// a failed write cannot truncate the recipient's existing project.
async function writeExport(destination,data){
 const temp=path.join(path.dirname(destination),'.scenic-'+randomUUID()+'.tmp');let handle;
 try{
  handle=await fs.open(temp,'wx',0o600);await handle.writeFile(data);await handle.sync();await handle.close();handle=null;
  await fs.rename(temp,destination);
 }finally{if(handle)await handle.close();await fs.rm(temp,{force:true});}
}
module.exports={writeExport};
