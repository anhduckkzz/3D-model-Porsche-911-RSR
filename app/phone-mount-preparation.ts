import type {ModelData} from './model-types';

/**
 * The camera bridge is an add-on to the intact 42096.  Keep this function as
 * the single scene-facing preparation policy so Drive/Advanced never hide
 * stock bodywork just to make the mount appear to fit.
 */
export const preparationSteps=[] as const;
export const preparationParts=[] as const;

export function mountPreparation(_model:ModelData){
 return new Set<number>();
}
