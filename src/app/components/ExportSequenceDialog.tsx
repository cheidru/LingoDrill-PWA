// app/components/ExportSequenceDialog.tsx
//
// Exports a single sequence from the Fragment Library as a .lingodrill bundle.
// The bundle carries the audio the sequence actually plays — a processed copy
// if it has one — so the fragment times still land on the right words.

import { useState } from "react"
import type { Sequence, SubtitleFile } from "../../core/domain/types"
import { sequenceAudioId } from "../../core/domain/sequenceAudio"
import { WaveformCacheStorage } from "../../infrastructure/indexeddb/waveformCacheStorage"
import { downloadBundle } from "../../utils/downloadBundle"
import { useSharedAudioEngine } from "../hooks/useSharedAudioEngine"
import { useT } from "../../utils/i18n"

type Props = {
  sequence: Sequence
  subtitleFiles: SubtitleFile[]
  onClose: () => void
}

export function ExportSequenceDialog({ sequence, subtitleFiles, onClose }: Props) {
  const t = useT()
  const { files, getBlob } = useSharedAudioEngine()
  const [includeAudio, setIncludeAudio] = useState(true)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const audioId = sequenceAudioId(sequence)
      const blob = await getBlob(audioId)
      if (!blob) {
        alert(t("bundle.audioNotFound"))
        return
      }
      // A missing cache entry just means the waveform is rebuilt after import
      const waveform = (await new WaveformCacheStorage().get(audioId)) ?? []
      /* A processed copy is named after the file it came from, so the bundle
         does not arrive under the copy's internal name. */
      const audioName = files.find(f => f.id === sequence.audioId)?.name
        ?? files.find(f => f.id === audioId)?.name
        ?? "audio"
      await downloadBundle({
        audioBlob: blob,
        audioName,
        waveform,
        sequences: [sequence],
        subtitleFiles,
        includeAudio,
      })
      onClose()
    } catch (err) {
      console.error("Export failed:", err)
      alert(t("bundle.exportFailed"))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={exporting ? undefined : onClose}>
      <div className="modal-box export-seq" onClick={e => e.stopPropagation()}>
        <h3 className="export-seq__title">{t("bundle.exportSequenceTitle", { label: sequence.label })}</h3>
        <p className="export-seq__hint">{t("bundle.exportSequenceHint")}</p>
        <label className="export-bundle__checkbox export-seq__checkbox">
          <input
            type="checkbox"
            checked={includeAudio}
            onChange={e => setIncludeAudio(e.target.checked)}
            disabled={exporting}
          />
          <span>{t("bundle.includeAudio")}</span>
        </label>
        <p className="export-seq__hint">
          {includeAudio ? t("bundle.includeAudioOn") : t("bundle.includeAudioOff")}
        </p>
        <div className="modal-actions">
          <button className="btn-primary" onClick={handleExport} disabled={exporting}>
            {exporting ? t("bundle.exporting") : t("bundle.export")}
          </button>
          <button onClick={onClose} disabled={exporting}>{t("common.cancel")}</button>
        </div>
      </div>
    </div>
  )
}
