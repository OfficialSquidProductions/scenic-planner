/* Offline solar geometry. Meeus equations and refraction described by NOAA:
   https://gml.noaa.gov/grad/solcalc/calcdetails.html
   Angles are degrees; geographic longitude is positive east. */
(function(root){
'use strict';
const rad=Math.PI/180,deg=180/Math.PI,day=86400000,wrap=n=>(n%360+360)%360,clamp=n=>Math.max(-1,Math.min(1,n));
const formatters=new Map(),states=new Map(),days=new Map();
function formatter(zone){if(!formatters.has(zone))formatters.set(zone,new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}));return formatters.get(zone);}
function parts(ms,zone){const p={};for(const v of formatter(zone).formatToParts(new Date(ms)))if(v.type!=='literal')p[v.type]=Number(v.value);return p;}
function dateOK(date){if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;const ms=Date.parse(date+'T00:00:00Z');return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===date&&Number(date.slice(0,4))>=1900&&Number(date.slice(0,4))<=2100;}
function zoneOK(zone){try{if(typeof zone!=='string'||!zone||zone.length>100)return false;formatter(zone);return true;}catch{return false;}}
function localInstant(date,hour,zone,occurrence='Earlier'){
 if(!dateOK(date))return {error:'Choose a shoot date between 1900 and 2100.'};
 if(!zoneOK(zone))return {error:'Enter a valid time zone, e.g. America/New_York.'};
 if(!Number.isFinite(hour)||hour<0||hour>=24)return {error:'Choose a time from 00:00 to 23:59.'};
 const target=Date.parse(date+'T00:00:00Z')+Math.round(hour*60)*60000,offsets=new Set();
 // Sample both sides of any daylight-saving transition, including half-hour changes.
 for(let h=-36;h<=36;h+=6){const ms=target+h*3600000,p=parts(ms,zone);offsets.add(Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-ms);}
 const candidates=[...offsets].map(offset=>target-offset).filter(ms=>{const p=parts(ms,zone);return Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)===target;}).sort((a,b)=>a-b);
 if(!candidates.length)return {error:'This local time is skipped by daylight saving. Choose another time.'};
 const ms=occurrence==='Later'?candidates.at(-1):candidates[0];return {ms,ambiguous:candidates.length>1,offset:(target-ms)/3600000};
}
function position(ms,latitude,longitude){
 const t=(ms/day+2440587.5-2451545)/36525;
 const l=wrap(280.46646+t*(36000.76983+.0003032*t)),m=wrap(357.52911+t*(35999.05029-.0001537*t)),e=.016708634-t*(.000042037+.0000001267*t);
 const center=Math.sin(m*rad)*(1.914602-t*(.004817+.000014*t))+Math.sin(2*m*rad)*(.019993-.000101*t)+Math.sin(3*m*rad)*.000289;
 const omega=125.04-1934.136*t,lambda=(l+center-.00569-.00478*Math.sin(omega*rad))*rad;
 const obliquity=(23+(26+(21.448-t*(46.815+t*(.00059-.001813*t)))/60)/60+.00256*Math.cos(omega*rad))*rad;
 const decl=Math.asin(Math.sin(obliquity)*Math.sin(lambda)),y=Math.tan(obliquity/2)**2;
 const eq=4*deg*(y*Math.sin(2*l*rad)-2*e*Math.sin(m*rad)+4*e*y*Math.sin(m*rad)*Math.cos(2*l*rad)-.5*y*y*Math.sin(4*l*rad)-1.25*e*e*Math.sin(2*m*rad));
 const utc=new Date(ms),minutes=utc.getUTCHours()*60+utc.getUTCMinutes()+utc.getUTCSeconds()/60;
 const hourAngle=(((minutes+eq+4*longitude)%1440+1440)%1440/4-180)*rad,lat=latitude*rad;
 const geometricAltitude=Math.asin(clamp(Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(hourAngle)))*deg;
 const azimuth=wrap(Math.atan2(Math.sin(hourAngle),Math.cos(hourAngle)*Math.sin(lat)-Math.tan(decl)*Math.cos(lat))*deg+180);
 const h=geometricAltitude,tan=Math.tan(h*rad);
 const refraction=(h>85?0:h>5?58.1/tan-.07/tan**3+.000086/tan**5:h>-.575?1735+h*(-518.2+h*(103.4+h*(-12.79+h*.711))):-20.774/tan)/3600;
 return {azimuth,altitude:geometricAltitude+refraction,geometricAltitude};
}
function dateString(ms,zone){const p=parts(ms,zone);return `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;}
function clock(ms,zone){const p=parts(ms,zone);return `${String(p.hour).padStart(2,'0')}:${String(p.minute).padStart(2,'0')}`;}
function events(date,latitude,longitude,zone){
 const key=JSON.stringify([date,latitude,longitude,zone]);if(days.has(key))return days.get(key);
 const base=Date.parse(date+'T00:00:00Z'),result={sunrise:[],sunset:[]};let above=0,below=0;
 const height=ms=>position(ms,latitude,longitude).geometricAltitude+.833;
 let previous=base-18*3600000,prev=height(previous);
 // Search a UTC window containing the entire local civil date, even at the date line.
 for(let ms=previous+600000;ms<=base+42*3600000;ms+=600000){const current=height(ms);
  if(dateString(ms,zone)===date){if(current>=0)above++;else below++;}
  if((prev<0)!==(current<0)){let a=previous,b=ms;for(let i=0;i<20;i++){const mid=(a+b)/2;if((height(a)<0)===(height(mid)<0))a=mid;else b=mid;}const crossing=(a+b)/2;if(dateString(crossing,zone)===date)result[current>prev?'sunrise':'sunset'].push(clock(crossing+30000,zone));}
  previous=ms;prev=current;
 }
 result.polar=above&&!below?'Sun above horizon all day':below&&!above?'Sun below horizon all day':null;
 if(days.size>64)days.clear();days.set(key,result);return result;
}
function state(o){
 const key=JSON.stringify([o.shootDate,o.time,o.latitude,o.longitude,o.timeZone,o.northAngle,o.dstOccurrence,o.power]);if(states.has(key))return states.get(key);
 let result={daylight:false,strength:0,temperature:5600,azimuth:0,altitude:0,rayAngle:0};
 if(!Number.isFinite(o.latitude)||!Number.isFinite(o.longitude)||Math.abs(o.latitude)>90||Math.abs(o.longitude)>180)result.error='Enter the shoot latitude and longitude.';
 else{const instant=localInstant(o.shootDate,o.time,o.timeZone,o.dstOccurrence);if(instant.error)result.error=instant.error;else{const p=position(instant.ms,o.latitude,o.longitude),height=Math.max(0,Math.sin(p.altitude*rad));result={...result,...p,...instant,daylight:p.geometricAltitude>-.833,strength:p.geometricAltitude>-.833?height**.65*(o.power/100):0,temperature:Math.round(2400+height*3600),rayAngle:(p.azimuth+(o.northAngle||0)+90)*rad,events:events(o.shootDate,o.latitude,o.longitude,o.timeZone)};}}
 if(states.size>128)states.clear();states.set(key,result);return result;
}
function validFields(o){
 if(o.solarReal!==undefined&&typeof o.solarReal!=='boolean')return false;
 if(['latitude','longitude','northAngle'].some(k=>o[k]!==undefined&&o[k]!==null&&(!Number.isFinite(o[k])||Math.abs(o[k])>(k==='latitude'?90:k==='longitude'?180:360))))return false;
 if(o.shootDate!==undefined&&o.shootDate!==''&&!dateOK(o.shootDate))return false;
 // Invalid/unfinished zones can be saved and corrected, but never used to render sunlight.
 if(o.timeZone!==undefined&&(typeof o.timeZone!=='string'||o.timeZone.length>100))return false;
 if(o.dstOccurrence!==undefined&&!['Earlier','Later'].includes(o.dstOccurrence))return false;
 return true;
}
const api={position,localInstant,events,state,validFields,dateOK,zoneOK};if(typeof module==='object'&&module.exports)module.exports=api;else root.ScenicSolar=api;
})(typeof globalThis!=='undefined'?globalThis:this);
