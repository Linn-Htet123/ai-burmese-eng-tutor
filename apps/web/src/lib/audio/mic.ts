/** Mic capture through an AudioWorklet that posts ~20 ms float frames at the device rate. */
export interface MicHandle {
  sampleRate: number;
  stop: () => void;
}

export async function startMic(ctx: AudioContext, onFrame: (frame: Float32Array) => void): Promise<MicHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
  });
  await ctx.audioWorklet.addModule("/worklets/mic-capture.js");
  const source = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, "mic-capture");
  const mute = ctx.createGain();
  mute.gain.value = 0;
  node.port.onmessage = (e: MessageEvent<Float32Array>) => onFrame(e.data);
  source.connect(node);
  node.connect(mute).connect(ctx.destination);
  return {
    sampleRate: ctx.sampleRate,
    stop: () => {
      node.port.onmessage = null;
      source.disconnect();
      node.disconnect();
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}
