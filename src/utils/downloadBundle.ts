// utils/downloadBundle.ts
//
// Builds a .lingodrill bundle and hands it to the browser as a download. Shared
// by the editor's Export button and the per-sequence Export dialog in the
// Fragment Library, so both write the same file under the same name.

import { exportBundle } from "../core/bundle/exportBundle"
import type { Sequence, SubtitleFile } from "../core/domain/types"

export interface DownloadBundleInput {
  audioBlob: Blob
  /** File name of the audio; the bundle is named after it. */
  audioName: string
  waveform: number[]
  sequences: Sequence[]
  subtitleFiles: SubtitleFile[]
  includeAudio: boolean
}

export async function downloadBundle(input: DownloadBundleInput): Promise<void> {
  const { audioBlob, audioName } = input
  const bundleBlob = await exportBundle({
    audioBlob,
    audioName,
    audioMimeType: audioBlob.type || "audio/mpeg",
    audioSize: audioBlob.size,
    waveform: input.waveform,
    sequences: input.sequences,
    subtitleFiles: input.subtitleFiles,
    includeAudio: input.includeAudio,
  })

  const url = URL.createObjectURL(bundleBlob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${audioName.replace(/\.[^.]+$/, "")}.lingodrill`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
