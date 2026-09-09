import type {ModelData} from './model-types';
/** Open-cockpit camera conversion. These are explicit removals, not clipping
 * or a rule that deletes everything classified as chassis. Original assemblies
 * remain untouched in Explore and the stock assembly guide.
 */
export const preparationSteps=[159,160,161,162,213] as const;
export const preparationParts=[298,299,300,301,302,303,786,787,788,789,936,937,938,939] as const;
export function mountPreparation(model:ModelData){
 const removed=new Set<number>(preparationParts);
 for(const p of model.parts)if(['roof','doors'].includes(p.group))removed.add(p.id);
 for(const s of model.steps)if(['chassis6','chassis9','seat1'].includes(s.name)||preparationSteps.some(n=>n===s.step))for(const id of s.parts)removed.add(id);
 return removed;
}
