import source from '../../.generated/lab-worker.js?raw';
import type { LabConfig, LabRun } from './model.ts';
/** Each experiment has a fresh, terminable worker inside an opaque-origin
 * frame. Its inherited CSP blocks network and external scripts. */
export function startRun(input: LabConfig, onProgress: (count: number) => void = () => { }) {
    const frame = document.createElement('iframe'), token = crypto.randomUUID();
    frame.hidden = true;
    frame.title = 'Isolated experiment runner';
    frame.setAttribute('sandbox', 'allow-scripts');
    let settled = false, timer: ReturnType<typeof setTimeout>, rejectRun: (e: Error) => void;
    const cleanup = () => { clearTimeout(timer); window.removeEventListener('message', receive); frame.contentWindow?.postMessage({ token, cancel: true }, '*'); frame.remove(); };
    let resolveRun: (r: LabRun) => void;
    const receive = (event: MessageEvent) => {
        if (event.source !== frame.contentWindow || event.data?.token !== token || settled)
            return;
        if (event.data.ready) {
            frame.contentWindow!.postMessage({ token, source, input }, '*');
            return;
        }
        if (event.data.progress !== undefined) {
            onProgress(event.data.progress);
            return;
        }
        if (event.data.result || event.data.error) {
            settled = true;
            const data = event.data;
            cleanup();
            if (data.error)
                rejectRun(new Error(data.error));
            else
                resolveRun(data.result);
        }
    };
    const promise = new Promise<LabRun>((resolve, reject) => { resolveRun = resolve; rejectRun = reject; });
    window.addEventListener('message', receive);
    // This bootstrap never evaluates the strategy. The worker inherits this
    // frame's policy, and has neither parent DOM nor app-origin storage.
    frame.srcdoc = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; connect-src 'none'"><script>
    const token=${JSON.stringify(token)};let worker;
    addEventListener('message',event=>{if(event.source!==parent||event.data.token!==token)return;
      if(event.data.cancel){worker?.terminate();return;}
      const nonce=crypto.randomUUID();const url=URL.createObjectURL(new Blob([event.data.source],{type:'text/javascript'}));
      worker=new Worker(url);URL.revokeObjectURL(url);
      worker.onmessage=e=>{if(e.data?.nonce===nonce)parent.postMessage({token,...e.data},'*');};
      worker.onerror=e=>parent.postMessage({token,error:e.message||'Worker failed'},'*');
      worker.postMessage({nonce,input:event.data.input});
    });parent.postMessage({token,ready:true},'*');<\/script>`;
    document.body.append(frame);
    const custom = Object.values(input.strategies).some(s => s.mode === 'custom');
    timer = setTimeout(() => { if (!settled) {
        settled = true;
        cleanup();
        rejectRun(new Error(`Run stopped after ${custom ? 8 : 45} seconds. Reduce the search budget or fix the strategy; no fallback result was substituted.`));
    } }, custom ? 8000 : 45000);
    return { promise, cancel: () => { if (!settled) {
            settled = true;
            cleanup();
            rejectRun(new Error('Run cancelled. The previous result is retained.'));
        } } };
}
