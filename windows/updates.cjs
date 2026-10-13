// electron-updater supplies text, HTML, or an array of versioned release notes.
// Native dialogs display plain text; remote release notes never become markup.
function plainText(value){
 if(typeof value!=='string')return '';
 return value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'')
  .replace(/<li\b[^>]*>/gi,'\n• ').replace(/<\/(?:p|h[1-6]|ul|ol|div)>|<br\s*\/?\s*>/gi,'\n')
  .replace(/<[^>]*>/g,'')
  .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(match,entity)=>{
   const key=entity.toLowerCase();
   if(key[0]!=='#')return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[key];
   const code=key[1]==='x'?parseInt(key.slice(2),16):Number(key.slice(1));
   return code>0&&code<=0x10ffff?String.fromCodePoint(code):match;
  }).replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
function releaseNotes(info){
 const notes=info?.releaseNotes;
 const text=Array.isArray(notes)?notes.map(entry=>{
  const body=plainText(entry.note);return body?`Scenic ${entry.version}\n${body}`:'';
 }).filter(Boolean).join('\n\n'):plainText(notes);
 return text||'Release notes are unavailable for this update.';
}
function updateDetail(info,instruction){return `What's new in Scenic ${info.version}\n\n${releaseNotes(info)}${instruction?'\n\n'+instruction:''}`;}
module.exports={plainText,releaseNotes,updateDetail};
