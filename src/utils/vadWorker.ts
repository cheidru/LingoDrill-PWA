// utils/vadWorker.ts
//
// Runs Silero VAD off the main thread. detectSpeech.ts starts it; see there for
// why. A classic worker (no runtime imports) so importScripts() can pull the
// same CDN builds of onnxruntime-web and vad-web the page loads — every URL and
// option arrives in the "init" message, so they are defined in one place only.
//
// Two steps: "init" loads the model and answers "ready"; only then does the
// page transfer the samples with "run". A worker that cannot start therefore
// never takes the samples, and the page can still run VAD itself.

import type { VadWorkerMessage, VadWorkerRequest } from "./detectSpeech"

interface VadDetector {
  run: (audio: Float32Array, sampleRate: number) => AsyncIterable<{ start: number; end: number }>
}

interface WorkerGlobals {
  ort?: { env: { wasm: { wasmPaths: string; numThreads: number } } }
  vad?: { NonRealTimeVAD: { new: (options: Record<string, unknown>) => Promise<VadDetector> } }
  importScripts: (...urls: string[]) => void
  postMessage: (message: VadWorkerMessage) => void
  onmessage: ((event: MessageEvent<VadWorkerRequest>) => void) | null
}

const scope = self as unknown as WorkerGlobals

let detector: VadDetector | null = null

function fail(stage: "init" | "run", err: unknown): void {
  scope.postMessage({
    type: "error",
    stage,
    message: err instanceof Error ? err.message : String(err),
  })
}

scope.onmessage = async (event) => {
  const req = event.data

  if (req.type === "init") {
    try {
      scope.importScripts(req.ortScriptUrl, req.vadScriptUrl)
      if (!scope.ort || !scope.vad?.NonRealTimeVAD) throw new Error("VAD library not loaded")

      // In a worker neither library can work out where it was loaded from, so
      // both asset locations are spelled out. There is no SharedArrayBuffer on
      // GitHub Pages, so onnxruntime runs single-threaded either way.
      scope.ort.env.wasm.wasmPaths = req.wasmPaths
      scope.ort.env.wasm.numThreads = 1

      detector = await scope.vad.NonRealTimeVAD.new({ ...req.options, modelURL: req.modelUrl })
      scope.postMessage({ type: "ready" })
    } catch (err) {
      fail("init", err)
    }
    return
  }

  try {
    if (!detector) throw new Error("VAD worker was not initialised")
    for await (const { start, end } of detector.run(req.samples, req.sampleRate)) {
      scope.postMessage({ type: "segment", start, end })
    }
    scope.postMessage({ type: "done" })
  } catch (err) {
    fail("run", err)
  }
}
