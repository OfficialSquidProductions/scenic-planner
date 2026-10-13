/* Scene coordinates stay stable for existing projects: three world units = one inch. */
(function(root){
'use strict';
const UNITS_PER_INCH=3;
function formatLength(units){
 const inches=Math.round(Math.abs(units)/UNITS_PER_INCH*10)/10,sign=units<0&&inches?'−':'';
 if(inches<12)return `${sign}${inches} in`;
 const feet=Math.floor(inches/12),rest=Math.round((inches-feet*12)*10)/10;
 return `${sign}${feet} ft${rest?` ${rest} in`:''}`;
}
function parseLength(text){
 const s=String(text).trim().toLowerCase().replace(/[′’]/g,"'").replace(/[″”]/g,'"').replace(/−/g,'-');
 const match=s.match(/^([+-])?\s*(?:(\d+(?:\.\d+)?)\s*(?:ft|feet|foot|')\s*)?(?:(\d+(?:\.\d+)?)\s*(?:in|inches|inch|")?\s*)?$/);
 if(!match||(!match[2]&&!match[3]))return null;
 const value=((Number(match[2])||0)*12+(Number(match[3])||0))*UNITS_PER_INCH*(match[1]==='-'?-1:1);
 return Number.isFinite(value)?value:null;
}
const shapes={
 laptop:['M1 0H23V16H1Z M0 17H24V24H0Z','M4 3H20V13H4Z M4 19H20 M9 22H15'],
 remote:['M3 0H21V24H3Z','M7 4H10 M15 4H17 M8 10H16 M12 8V12 M7 17H9 M15 17H17 M7 21H9 M15 21H17'],
 controller:['M5 2H19L24 21Q21 25 16 18H8Q3 25 0 21Z','M4 9H10 M7 6V12 M17 7H18 M20 10H21 M10 16H14'],
 phone:['M2 0H22V24H2Z','M5 4H19V19H5Z M10 22H14'],
 mug:['M1 0H18V24H1Z M18 5H24V19H18','M5 4H14V20H5Z'],
 book:['M0 0H24V24H0Z','M4 0V24 M8 5H20 M8 9H20'],
 bottle:['M7 0H17V5L22 10V24H2V10L7 5Z','M2 14H22 M7 4H17'],
 keys:['M0 12A6 6 0 1 1 12 12A6 6 0 1 1 0 12Z M12 10H24V14H21V19H17V14H12','M4 12H8'],
 bag:['M0 5H24V24H0Z','M6 5V0H18V5 M0 12H24 M10 10V15H14V10'],
 plate:['M24 12A12 12 0 1 1 0 12A12 12 0 1 1 24 12Z','M19 12A7 7 0 1 1 5 12A7 7 0 1 1 19 12Z'],
 headphones:['M0 14V10A12 10 0 0 1 24 10V14H19V10A7 6 0 0 0 5 10V14Z M0 14H6V24H0Z M18 14H24V24H18Z',''],
 camera:['M0 5H24V24H0Z M3 0H10V5H3Z','M18 14A6 6 0 1 1 6 14A6 6 0 1 1 18 14Z M19 8H21'],
 sofa:['M0 0H24V24H0Z','M3 4H21V18H3Z M0 18H24 M8 4V18 M16 4V18 M3 0V24 M21 0V24'],
 armchair:['M0 0H24V24H0Z','M4 5H20V19H4Z M0 19H24 M4 0V24 M20 0V24'],
 table:['M0 0H24V24H0Z','M2 2H22V22H2Z'],
 chair:['M0 0H24V24H0Z','M0 5H24 M3 5V24 M21 5V24'],
 car:['M3 0H21L24 5V19L21 24H3L0 19V5Z','M4 6H20L18 10H6Z M6 16H18L20 20H4Z M3 7V19 M21 7V19 M0 3H4 M20 3H24 M0 21H4 M20 21H24'],
 bed:['M0 0H24V24H0Z','M2 2H11V7H2Z M13 2H22V7H13Z M0 9H24 M2 11H22V22H2Z'],
 dresser:['M0 0H24V24H0Z','M0 8H24 M0 16H24 M10 4H14 M10 12H14 M10 20H14'],
 counter:['M0 0H24V24H0Z','M0 4H24 M8 4V24 M16 4V24'],
 sink:['M0 0H24V24H0Z','M3 5H21V21H3Z M10 0V8H14 M13 14A1 1 0 1 1 11 14A1 1 0 1 1 13 14Z'],
 stove:['M0 0H24V24H0Z','M9 7A3 3 0 1 1 3 7A3 3 0 1 1 9 7Z M21 7A3 3 0 1 1 15 7A3 3 0 1 1 21 7Z M9 17A3 3 0 1 1 3 17A3 3 0 1 1 9 17Z M21 17A3 3 0 1 1 15 17A3 3 0 1 1 21 17Z'],
 fridge:['M0 0H24V24H0Z','M0 7H24 M3 10V20 M3 2V5'],
 tv:['M0 0H24V24H0Z','M2 4H22V20H2Z M8 22H16'],
 rug:['M0 0H24V24H0Z','M2 2H22V22H2Z M4 4H20V20H4Z'],
 plant:['M24 12A12 12 0 1 1 0 12A12 12 0 1 1 24 12Z','M12 12Q0 0 12 2Q24 0 12 12Q24 24 12 22Q0 24 12 12 M12 12Q0 24 2 12Q0 0 12 12Q24 0 22 12Q24 24 12 12'],
 tub:['M0 0H24V24H0Z','M3 3H21V21H3Z M10 0V6H14 M13 17A1 1 0 1 1 11 17A1 1 0 1 1 13 17Z'],
 toilet:['M2 0H22V7H2Z M4 7H20V16Q20 24 12 24Q4 24 4 16Z','M7 10H17V16Q17 21 12 21Q7 21 7 16Z'],
 door:['M0 0H2V24H0Z','M2 0H24 M24 0A22 24 0 0 1 2 24'],
 wardrobe:['M0 0H24V24H0Z','M12 0V24 M9 10V14 M15 10V14'],
 lamp:['M24 12A12 12 0 1 1 0 12A12 12 0 1 1 24 12Z','M18 12A6 6 0 1 1 6 12A6 6 0 1 1 18 12Z M12 6V18 M6 12H18']
};
const entries=[
 ['room-square','Square room','walls','Room shapes',144,144,'room-square'],
 ['room-rectangle','Rectangular room','walls','Room shapes',192,144,'room-square'],
 ['room-circle','Circular room','walls','Room shapes',144,144,'room-circle'],
 ['room-l','L-shaped room','walls','Room shapes',192,192,'room-l'],
 ['laptop','Laptop','props','Electronics',14,10,'laptop'],['remote','Remote','props','Electronics',7,2,'remote'],['controller','Game controller','props','Electronics',6.5,4.5,'controller'],['phone','Phone','props','Electronics',3,6,'phone'],['headphones','Headphones','props','Electronics',7,8,'headphones'],['hand-camera','Handheld camera','props','Electronics',6,4,'camera'],
 ['mug','Mug','props','Everyday objects',5,4,'mug'],['book','Book','props','Everyday objects',6,9,'book'],['bottle','Bottle','props','Everyday objects',3,3,'bottle'],['keys','Keys','props','Everyday objects',3,2,'keys'],['bag','Bag','props','Everyday objects',16,12,'bag'],['plate','Plate','props','Everyday objects',10,10,'plate'],
 ['car','Car','set','Vehicles',72,180,'car'],['sofa','Sofa','set','Living room',84,36,'sofa'],['armchair','Armchair','set','Living room',34,34,'armchair'],['coffee-table','Coffee table','set','Living room',48,24,'table'],['side-table','Side table','set','Living room',20,20,'table'],['tv','TV & console','set','Living room',60,16,'tv'],['rug','Rug','set','Living room',96,60,'rug'],['plant','Potted plant','set','Living room',18,18,'plant'],['floor-lamp','Floor lamp','set','Living room',16,16,'lamp'],
 ['dining-table','Dining table','set','Kitchen & dining',72,36,'table'],['chair','Dining chair','set','Kitchen & dining',20,22,'chair'],['counter','Kitchen counter','set','Kitchen & dining',72,25,'counter'],['island','Kitchen island','set','Kitchen & dining',72,36,'counter'],['sink','Sink','set','Kitchen & dining',30,25,'sink'],['stove','Stove','set','Kitchen & dining',30,26,'stove'],['fridge','Refrigerator','set','Kitchen & dining',36,30,'fridge'],
 ['bed','Queen bed','set','Bedroom',60,80,'bed'],['nightstand','Nightstand','set','Bedroom',24,18,'table'],['dresser','Dresser','set','Bedroom',60,20,'dresser'],['wardrobe','Wardrobe','set','Bedroom',60,24,'wardrobe'],['desk','Desk','set','Bedroom',48,24,'table'],
 ['tub','Bathtub','set','Bathroom',30,60,'tub'],['toilet','Toilet','set','Bathroom',20,28,'toilet'],['vanity','Vanity & basin','set','Bathroom',36,22,'sink'],['door','Hinged door','set','Doors & windows',36,36,'door']
];
entries.push(
 ['door-double','Double doors','set','Doors & windows',72,36,'door'],
 ['door-french','French doors','set','Doors & windows',60,30,'door'],
 ['door-sliding','Sliding door','set','Doors & windows',72,8,'door'],
 ['door-pocket','Pocket door','set','Doors & windows',36,8,'door'],
 ['door-garage','Garage door','set','Doors & windows',108,8,'door'],
 ['window','Window','set','Doors & windows',48,8,'window'],
 ['window-wide','Wide picture window','set','Doors & windows',96,8,'window'],
 ['window-double','Double window','set','Doors & windows',72,8,'window'],
 ['led-panel','LED panel','lights','Studio lights',18,6,'panel'],
 ['softbox','Softbox','lights','Studio lights',36,18,'softbox'],
 ['fresnel','Fresnel spotlight','lights','Studio lights',12,12,'spot'],
 ['tube-light','LED tube','lights','Studio lights',48,3,'panel'],
 ['practical','Practical lamp','lights','Practical lights',14,14,'lamp'],
 ['overhead','Overhead light','lights','Practical lights',24,24,'lamp'],
 ['sun','Sun','lights','Daylight',36,36,'sun']
);
shapes.window=['M0 0H24V24H0Z','M0 6H24 M0 18H24 M12 0V24'];
shapes.panel=['M0 0H24V24H0Z','M3 3H21V21H3Z M6 0V24 M12 0V24 M18 0V24'];
shapes.softbox=['M6 0H18L24 6V18L18 24H6L0 18V6Z','M12 0V24 M0 12H24'];
shapes.spot=['M3 0H21V18L17 24H7L3 18Z','M3 6H21 M3 12H21 M3 18H21'];
shapes.sun=['M18 12A6 6 0 1 1 6 12A6 6 0 1 1 18 12Z','M12 0V3 M12 21V24 M0 12H3 M21 12H24 M3 3L5 5 M19 19L21 21 M3 21L5 19 M19 5L21 3'];
shapes['room-square']=['M1 1H23V23H1Z',''];
shapes['room-circle']=['M23 12A11 11 0 1 1 1 12A11 11 0 1 1 23 12Z',''];
shapes['room-l']=['M1 1H12V12H23V23H1Z',''];
const items=entries.map(([id,name,category,group,width,height,shape])=>({id,name,category,group,width:width*UNITS_PER_INCH,height:height*UNITS_PER_INCH,shape}));
const lightPresets={
 'led-panel':{power:75,temperature:5600,beam:120,radius:650},
 softbox:{power:65,temperature:5600,beam:140,radius:550},
 fresnel:{power:90,temperature:3200,beam:45,radius:900},
 'tube-light':{power:50,temperature:5600,beam:180,radius:400},
 practical:{power:45,temperature:2700,beam:360,radius:300},
 overhead:{power:65,temperature:4000,beam:360,radius:500},
 sun:{power:80,temperature:5600,beam:360,radius:1000,kind:'sun',rotation:0,time:12,sunrise:6,sunset:18,riseDirection:90,setDirection:270}
};
const api={lightPresets,UNITS_PER_INCH,formatLength,parseLength,items,shapes,get:id=>items.find(item=>item.id===id)};
if(typeof module==='object'&&module.exports)module.exports=api;else root.ScenicCatalog=api;
})(globalThis);
