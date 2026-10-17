const assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {writeExport}=require('../windows/files.cjs');
(async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'scenic-export-')),file=path.join(root,'project.scenic');
 try{
  await writeExport(file,Buffer.from('original'));assert.equal(await fs.readFile(file,'utf8'),'original');
  const open=fs.open;
  fs.open=async(...args)=>{const handle=await open(...args);handle.writeFile=async()=>{throw Error('Simulated disk full');};return handle;};
  try{await assert.rejects(writeExport(file,Buffer.from('replacement')),/disk full/);}finally{fs.open=open;}
  assert.equal(await fs.readFile(file,'utf8'),'original','Failed write preserves existing file');
  assert.deepEqual(await fs.readdir(root),['project.scenic'],'Temporary file is cleaned after failure');
  await writeExport(file,Buffer.from('confirmed replacement'));assert.equal(await fs.readFile(file,'utf8'),'confirmed replacement');
  console.log('PASS: atomic desktop export; confirmed replacement; disk failure preserves original; temporary cleanup.');
 }finally{await fs.rm(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
