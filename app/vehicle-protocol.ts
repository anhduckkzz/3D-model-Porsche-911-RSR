export const CONTROL_CHARACTERISTIC='0000ae3b-0000-1000-8000-00805f9b34fb';
export function clampMotor(value:number){if(!Number.isFinite(value))throw new Error('Invalid motor command');return value===0?0:Math.sign(value)*Math.max(25,Math.min(100,Math.round(Math.abs(value))))}
export function motorFrame(fb=0,lr=0){const f=clampMotor(fb)&255,l=(lr===0?0:Math.sign(lr)*100)&255;return new Uint8Array([0xab,0xcd,1,f,l,0,0,(f+l)&255])}
export type Direction='forward'|'backward'|'left'|'right';
/** Independent keyboard/pointer ownership. Held steering stays active until release, matching the original BLE hold loop. */
export class DriveIntent{
 held=new Map<string,Direction>();turnId=0;
 press(source:string,direction:Direction,_now=0,_pulse=500){if(this.held.has(source))return;this.held.set(source,direction);if(direction==='left'||direction==='right')this.turnId++}
 release(source:string){this.held.delete(source)}
 clear(){this.held.clear()}
 sample(_now:number,speed:number,pulse=500){
  const directions=new Set(this.held.values());
  const fb=Number(directions.has('forward'))-Number(directions.has('backward'));
  const left=directions.has('left'),right=directions.has('right');
  const turn=left===right?0:left?-1:1;
  return {type:'drive',fb:fb?clampMotor(fb*speed):0,turn,pulse_ms:Math.max(100,Math.min(500,Math.round(pulse))),turn_id:this.turnId};
 }
}
