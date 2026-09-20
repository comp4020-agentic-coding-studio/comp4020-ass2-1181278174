import { runExperiment } from './compute.ts';
// Capture the sender and nonce before executing a strategy. User code cannot
// forge a successful result by posting a second message directly to the frame.
const send = self.postMessage.bind(self);
self.onmessage = (event: MessageEvent) => {
    const { input, nonce } = event.data;
    try {
        const result = runExperiment(input, { allowCustom: true, progress: count => send({ nonce, progress: count }) });
        send({ nonce, result });
    }
    catch (error) {
        send({ nonce, error: error instanceof Error ? error.message : String(error) });
    }
};
