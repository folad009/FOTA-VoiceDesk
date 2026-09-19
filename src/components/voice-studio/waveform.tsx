"use client"

import { cn } from "cn"

export function WaveformBars({
  peaks,
  progress = 0,
  className,
}: {
  peaks: number[]
  progress?: number
  className?: string
}) {
  return (
    <div
      className={cn("flex h-14 items-end gap-[2px]", className)}
      aria-hidden
    >
      {peaks.map((peak, index) => {
        const played = peaks.length === 0 ? false : index / peaks.length <= progress
        return (
          <span
            key={`${index}-${peak}`}
            className={cn(
              "min-w-px flex-1 rounded-full transition-colors",
              played ? "bg-primary" : "bg-primary/20",
            )}
            style={{ height: `${peak}%` }}
          />
        )
      })}
    </div>
  )
}

export async function extractWaveformPeaks(file: File, bars = 64): Promise<number[]> {
  const AudioContextCtor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) {
    return Array.from({ length: bars }, (_, index) => 20 + ((index * 13) % 60))
  }

  const context = new AudioContextCtor()
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer())
    const channel = buffer.getChannelData(0)
    const block = Math.max(1, Math.floor(channel.length / bars))
    const peaks: number[] = []
    for (let index = 0; index < bars; index += 1) {
      let max = 0
      const start = index * block
      for (let offset = 0; offset < block; offset += 1) {
        const value = Math.abs(channel[start + offset] ?? 0)
        if (value > max) {
          max = value
        }
      }
      peaks.push(Math.max(8, Math.round(max * 100)))
    }
    return peaks
  } catch {
    return Array.from({ length: bars }, (_, index) => 18 + ((index * 17) % 70))
  } finally {
    await context.close().catch(() => undefined)
  }
}
