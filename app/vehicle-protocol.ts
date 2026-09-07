export const CONTROL_CHARACTERISTIC='0000ae3b-0000-1000-8000-00805f9b34fb';
export function clampMotor(value:number){if(!Number.isFinite(value))throw new Error('Invalid motor command');return value===0?0:Math.sign(value)*Math.max(25,Math.min(100,Math.round(Math.abs(value))))}
export function motorFrame(fb=0,lr=0){const f=clampMotor(fb)&255,l=(lr===0?0:Math.sign(lr)*100)&255;return new Uint8Array([0xab,0xcd,1,f,l,0,0,(f+l)&255])}
export type Direction='forward'|'backward'|'left'|'right';
/** Independent keyboard/pointer ownership; opposite inputs cancel. Steering never extends on repeat. */
export class DriveIntent{
 held=new Map<string,Direction>();turnId=0;turnUntil=0;turn:0|1|-1=0;
 press(source:string,direction:Direction,now:number,pulse:number){if(this.held.has(source))return;this.held.set(source,direction);if(direction==='left'||direction==='right'){this.turnId++;this.turn=direction==='left'?-1:1;this.turnUntil=now+Math.max(100,Math.min(500,pulse))}}
 release(source:string){const direction=this.held.get(source);this.held.delete(source);if((direction==='left'&&this.turn===-1)||(direction==='right'&&this.turn===1)){this.turn=0;this.turnUntil=0}}
 clear(){this.held.clear();this.turn=0;this.turnUntil=0}
 sample(now:number,speed:number,pulse:number){const directions=new Set(this.held.values());const fb=Number(directions.has('forward'))-Number(directions.has('backward'));const conflict=directions.has('left')&&directions.has('right');return {type:'drive',fb:fb?clampMotor(fb*speed):0,turn:!conflict&&now<this.turnUntil?this.turn:0,pulse_ms:Math.max(100,Math.min(500,Math.round(pulse))),turn_id:this.turnId}}
}
