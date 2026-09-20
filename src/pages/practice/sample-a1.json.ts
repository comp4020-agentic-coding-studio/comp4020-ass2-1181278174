import { runExperiment } from '../../lab/compute';
import { defaultConfig } from '../../lab/model';
export function GET(){const input=defaultConfig(6);input.caseId='canonical-six';return new Response(JSON.stringify({format:'slop3969-experiment',version:2,run:runExperiment(input)},null,2),{headers:{'Content-Type':'application/json'}});}
