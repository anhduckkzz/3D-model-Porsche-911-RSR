import type {ModelData} from './model-types';
export type AssemblyNode={id:number;parent:number|null;name:string;label:string;group:string;children:number[];parts:number[];events:number[];start:number;end:number};
export type AssemblyEvent={node:number;kind:'part'|'attach';parts:number[];child?:number};
export type AssemblyPlan={version:number;root:number;nodes:AssemblyNode[];events:AssemblyEvent[]};
export function assemblyFrame(plan:AssemblyPlan,step:number){
 const index=Math.max(0,Math.min(plan.events.length-1,step-1)),event=plan.events[index],node=plan.nodes[event.node];
 const visible=new Set<number>();for(const i of node.events){if(i>index)break;for(const id of plan.events[i].parts)visible.add(id)}
 const ancestors:AssemblyNode[]=[];let parent=node.parent;while(parent!==null){ancestors.unshift(plan.nodes[parent]);parent=plan.nodes[parent].parent}
 const context=new Set<number>();for(const ancestor of ancestors)for(const i of ancestor.events){if(i>=index)break;for(const id of plan.events[i].parts)context.add(id)}
 return {event,node,visible,context,ancestors,fresh:new Set(event.parts),localStep:node.events.indexOf(index)+1,localCount:node.events.length};
}
export function assemblyLabel(node:AssemblyNode,data:ModelData){
 if(node.parent===null)return 'Porsche 911 RSR';
 const labels:Record<string,string>={engine:'Động cơ boxer',frontaxle:'Trục trước',dashboard:'Bảng điều khiển',leftdoor:'Cửa trái',rightdoor:'Cửa phải',roof:'Mui xe',spoiler:'Cánh gió',rearbump:'Cản sau',hood:'Nắp trước',seat:'Ghế',headlight:'Đèn trước',steering:'Cơ cấu lái',shocksupport:'Giá giảm xóc'};
 for(const [key,label]of Object.entries(labels))if(node.name.toLowerCase().includes(key))return label+' · '+String(node.id).padStart(2,'0');
 return (data.groups.find(g=>g.id===node.group)?.label??node.label)+' · '+String(node.id).padStart(2,'0');
}
