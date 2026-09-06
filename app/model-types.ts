export type Part={id:number;geo:number;group:string;step:number;matrix:number[]};
export type BufferLocation={offset:number;count:number;error?:number};
export type GeometryInfo={name:string;description:string;colorHex:string;bounds:number[][];position:BufferLocation;normal:BufferLocation;color:BufferLocation;index:BufferLocation;indexLow:BufferLocation};
export type ModelData={partCount:number;phaseCount:number;geometries:GeometryInfo[];parts:Part[];steps:{step:number;group:string;parts:number[];name:string}[];groups:{id:string;label:string;count:number}[];bounds:number[];source:{author:string;url:string;license:string;notes:string}};
export type ViewerMode='explore'|'build';
