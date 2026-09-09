/** Visual drivetrain state; units are model-space, never hub telemetry. */
export type DriveMotion={speed:number;steer:number;distance:number;heading:number;roll:number};
export const restingDrive=():DriveMotion=>({speed:0,steer:0,distance:0,heading:0,roll:0});
export function advanceDrive(s:DriveMotion,fb:number,lr:number,dt:number,radius:number,wheelbase:number,enabled:boolean){
 const h=Math.max(0,Math.min(dt,.05)),target=enabled?Math.sign(fb)*3:0;
 const a=1-Math.exp(-h/(target===0?.09:.22));
 s.speed+=(target-s.speed)*a;s.steer+=((enabled?Math.sign(lr)*.34:0)-s.steer)*(1-Math.exp(-h/.08));
 if(Math.abs(s.speed)<.002&&target===0)s.speed=0;if(Math.abs(s.steer)<.001&&lr===0)s.steer=0;
 const travel=s.speed*h;s.distance+=travel;s.roll=(s.roll+travel/Math.max(radius,.01))%(Math.PI*2);
 s.heading+=travel*Math.tan(s.steer)/Math.max(wheelbase,.1);
 return s.speed!==0||s.steer!==0;
}
