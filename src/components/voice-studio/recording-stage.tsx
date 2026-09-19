"use client"

import { useEffect, useRef, useState } from "react"
import { PauseIcon, PlayIcon } from "lucide-react"

import { formatDuration, formatFileSize } from "@/server/campaigns/wizard-draft"
import { Button } from "@/components/ui/button"
import { WaveformBars } from "@/components/voice-studio/waveform"

export function RecordingStage({
  src,
  peaks,
  durationSeconds,
  fileName,
  fileSizeBytes,
}: {
  src: string
  peaks: number[]
  durationSeconds: number
  fileName?: string
  fileSizeBytes?: number | null
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    const onTime = () => {
      const duration = audio.duration || durationSeconds || 1
      setElapsed(audio.currentTime)
      setProgress(duration > 0 ? audio.currentTime / duration : 0)
    }
    const onEnded = () => {
      setPlaying(false)
      setProgress(1)
    }

    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("ended", onEnded)
    return () => {
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("ended", onEnded)
    }
  }, [durationSeconds, src])

  function togglePlayback() {
    const audio = audioRef.current
    if (!audio) {
      return
    }
    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }
    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="icon"
          variant={playing ? "secondary" : "default"}
          aria-label={playing ? "Pause recording" : "Play recording"}
          onClick={togglePlayback}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {fileName || "Recorded message"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {formatDuration(elapsed)} / {formatDuration(durationSeconds)}
            {fileSizeBytes != null ? ` · ${formatFileSize(fileSizeBytes)}` : ""}
          </p>
        </div>
      </div>
      <WaveformBars peaks={peaks} progress={progress} className="h-16" />
    </div>
  )
}
