const assert=require('node:assert/strict'),s=require('../dist/solar.js'),m=require('../dist/model.js'),catalog=require('../dist/catalog.js');
const near=(actual,expected,tolerance=.02)=>assert(Math.abs(actual-expected)<tolerance,`${actual} differs from ${expected}`);
// Independent published NREL SPA example; our NOAA/Meeus approximation is not full SPA.
// https://docs.nlr.gov/docs/fy08osti/34302.pdf Appendix A5, Table A5.1.
const ref=s.position(Date.parse('2003-10-17T19:30:30Z'),39.742476,-105.1786);
near(ref.azimuth,194.340241);near(ref.altitude,90-50.111622);
for(const [date,expected] of [['2026-01-15',-5],['2026-07-15',-4]])assert.equal(s.localInstant(date,12,'America/New_York').offset,expected);
assert(s.localInstant('2026-03-08',2.5,'America/New_York').error,'Nonexistent spring time is rejected');
const first=s.localInstant('2026-11-01',1.5,'America/New_York'),second=s.localInstant('2026-11-01',1.5,'America/New_York','Later');assert(first.ambiguous);assert.equal(second.ms-first.ms,3600000);
assert.equal(s.localInstant('2026-07-15',12,'Asia/Kathmandu').offset,5.75);
assert(s.localInstant('2026-02-30',12,'UTC').error);assert(s.localInstant('2026-02-01',12,'Not/AZone').error);
const sun={id:'sun',type:'light',asset:'sun',name:'Sun',x:0,y:0,enabled:true,...catalog.lightPresets.sun,solarReal:true,shootDate:'2026-06-21',time:12,latitude:40.7128,longitude:-74.006,timeZone:'America/New_York',northAngle:0};
const noon=s.state(sun);assert(noon.daylight);assert.equal(noon.events.sunrise[0],'05:25');assert.equal(noon.events.sunset[0],'20:31');
const rotated=s.state({...sun,northAngle:90});near(rotated.rayAngle-noon.rayAngle,Math.PI/2,1e-10);near(rotated.azimuth,noon.azimuth,1e-10);
assert.equal(s.state({...sun,time:0}).strength,0);
assert(s.state({...sun,latitude:null}).error);assert(s.state({...sun,timeZone:''}).error);
const arctic={...sun,latitude:78.2232,longitude:15.6469,timeZone:'Arctic/Longyearbyen'};
assert.match(s.state(arctic).events.polar,/above/);assert.match(s.state({...arctic,shootDate:'2026-12-21'}).events.polar,/below/);
const nz=s.state({...sun,latitude:-36.8485,longitude:174.7633,timeZone:'Pacific/Auckland',shootDate:'2026-12-21'});assert(nz.daylight);assert(nz.events.sunrise.length&&nz.events.sunset.length);
const dateLine=s.state({...sun,latitude:1.8721,longitude:-157.4278,timeZone:'Pacific/Kiritimati'});assert(dateLine.events.sunrise.length&&dateLine.events.sunset.length,'UTC+14 civil date events');
const southern=s.state({...sun,latitude:-33.8688,longitude:151.2093,timeZone:'Australia/Sydney',shootDate:'2026-12-21'});assert(southern.altitude>65);
const project={version:1,name:'Sun study',active:'s',scenes:[{id:'s',title:'Exterior',ambient:30,objects:[sun]}]};assert(m.validProject(project));assert(m.validProject(JSON.parse(JSON.stringify(project))));
for(const [key,val] of [['latitude',91],['longitude',-181],['northAngle',NaN],['shootDate','2026-02-30'],['solarReal','yes'],['dstOccurrence','invalid']]){const copy=structuredClone(project);copy.scenes[0].objects[0][key]=val;assert(!m.validProject(copy),key+' rejected');}
assert(m.validProject({...project,scenes:[{...project.scenes[0],objects:[{...sun,latitude:null,longitude:null}]}]}),'An unfinished setup can autosave');
assert.deepEqual(m.sunState(sun),noon);assert.equal(m.sunState({...sun,solarReal:false}).altitude,75,'Legacy manual sunlight preserved');
console.log('Solar verified: independent NREL reference, geographic direction/elevation, DST gap/repeat, fractional zones, date line, southern hemisphere, polar day/night, map north, night, invalid input, and project persistence.');
