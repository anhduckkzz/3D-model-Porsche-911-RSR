import entries from '../public/showroom.json';
export type ShowroomCar = typeof entries[number];
export const cars:ShowroomCar[]=entries;
export const ownerCar=cars.find(c=>c.ownerTools)!;
export const findCar=(id:string|null)=>cars.find(c=>c.id===id&&c.available);
