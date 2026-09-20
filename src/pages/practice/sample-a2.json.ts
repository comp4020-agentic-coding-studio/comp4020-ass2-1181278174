import { runExperiment } from '../../lab/compute';
import { defaultConfig } from '../../lab/model';
export function GET(){return new Response(JSON.stringify({format:'slop3969-experiment',version:2,run:runExperiment(defaultConfig(12))},null,2),{headers:{'Content-Type':'application/json'}});}
