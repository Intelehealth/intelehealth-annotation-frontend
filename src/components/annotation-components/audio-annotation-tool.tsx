'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square, Edit3, Trash2, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnnotationLabel {
  name: string;
  type: 'bbox' | 'polygon' | 'point' | 'line' | 'text' | 'classification';
  color: string;
  description?: string;
}

interface AudioSegment {
  id: string;
  startTime: number;
  endTime: number;
  transcription: string;
  label: string;
}

interface AudioAnnotationToolProps {
  audioUrl: string;
  annotations: AudioSegment[];
  labels: string[];
  annotationLabels: AnnotationLabel[];
  selectedLabel?: string | null;
  onAnnotationChange: (annotations: AudioSegment[]) => void;
  disabled?: boolean;
}

export function AudioAnnotationTool({
  audioUrl,
  annotations,
  labels,
  annotationLabels,
  selectedLabel: externalSelectedLabel,
  onAnnotationChange,
  disabled = false,
}: AudioAnnotationToolProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordStartTime, setRecordStartTime] = useState(0);
  const [internalSelectedLabel, setInternalSelectedLabel] =
    useState<string>('');
  const [transcription, setTranscription] = useState('');
  const [editingAnnotation, setEditingAnnotation] =
    useState<AudioSegment | null>(null);

  // Use external selectedLabel if provided, otherwise use internal state
  const selectedLabel = externalSelectedLabel || internalSelectedLabel;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const stopAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
  };

  const seekTo = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = time;
  };

  const startRecording = () => {
    if (!selectedLabel) {
      alert('Please select a label first');
      return;
    }

    setIsRecording(true);
    setRecordStartTime(currentTime);
  };

  const stopRecording = () => {
    if (!isRecording) return;

    setIsRecording(false);
    const endTime = currentTime;

    if (endTime > recordStartTime) {
      const newSegment: AudioSegment = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        startTime: recordStartTime,
        endTime: endTime,
        transcription: transcription,
        label: selectedLabel,
      };

      onAnnotationChange([...annotations, newSegment]);
      setTranscription('');
    }
  };

  const removeAnnotation = (id: string) => {
    onAnnotationChange(annotations.filter((ann) => ann.id !== id));
  };

  const editAnnotation = (annotation: AudioSegment) => {
    setEditingAnnotation(annotation);
  };

  const saveEdit = (newLabel: string, newTranscription: string) => {
    if (!editingAnnotation) return;

    const updatedAnnotations = annotations.map((ann) =>
      ann.id === editingAnnotation.id
        ? { ...ann, label: newLabel, transcription: newTranscription }
        : ann,
    );

    onAnnotationChange(updatedAnnotations);
    setEditingAnnotation(null);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getCurrentSegment = () => {
    return annotations.find(
      (ann) => currentTime >= ann.startTime && currentTime <= ann.endTime,
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Volume2 className="h-5 w-5" />
            <span>Audio Annotation</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Audio Player */}
            <div>
              <Label className="text-sm font-medium">Audio Player</Label>
              <div className="mt-2 space-y-2">
                <audio ref={audioRef} src={audioUrl} preload="metadata" />

                {/* Progress Bar */}
                <div className="relative">
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                    {/* Annotation markers */}
                    {annotations.map((annotation) => (
                      <div
                        key={annotation.id}
                        className="absolute top-0 h-2 bg-green-500 opacity-70"
                        style={{
                          left: `${(annotation.startTime / duration) * 100}%`,
                          width: `${
                            ((annotation.endTime - annotation.startTime) /
                              duration) *
                            100
                          }%`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center space-x-2">
                  <Button size="sm" onClick={togglePlay} disabled={disabled}>
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={stopAudio}
                    disabled={disabled}
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600">
                    {getCurrentSegment()
                      ? `Current: ${getCurrentSegment()?.label}`
                      : 'No segment'}
                  </span>
                </div>
              </div>
            </div>

            {/* Recording Controls */}
            <div>
              <Label className="text-sm font-medium">Segment Recording</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant={isRecording ? 'destructive' : 'default'}
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={disabled || !selectedLabel}
                  >
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                  </Button>
                  {isRecording && (
                    <span className="text-sm text-red-600">
                      Recording: {formatTime(recordStartTime)} -{' '}
                      {formatTime(currentTime)}
                    </span>
                  )}
                </div>

                {/* Transcription Input */}
                <div>
                  <Label className="text-sm font-medium">Transcription</Label>
                  <Textarea
                    placeholder="Enter transcription for this segment..."
                    value={transcription}
                    onChange={(e) => setTranscription(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Existing Annotations */}
            {annotations.length > 0 && (
              <div>
                <Label className="text-sm font-medium">
                  Annotations ({annotations.length})
                </Label>
                <div className="mt-2 max-h-48 overflow-y-auto space-y-2 pr-2 border border-gray-200 rounded-lg p-3">
                  {annotations.map((annotation) => (
                    <div
                      key={annotation.id}
                      className={cn(
                        'p-3 border border-gray-200 rounded-lg',
                        getCurrentSegment()?.id === annotation.id &&
                          'border-blue-500 bg-blue-50',
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">{annotation.label}</Badge>
                          <span className="text-sm text-gray-600">
                            {formatTime(annotation.startTime)} -{' '}
                            {formatTime(annotation.endTime)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => seekTo(annotation.startTime)}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editAnnotation(annotation)}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAnnotation(annotation.id)}
                            disabled={disabled}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {annotation.transcription && (
                        <p className="text-sm text-gray-700 italic">
                          "{annotation.transcription}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Edit Annotation Modal */}
            {editingAnnotation && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                  <h3 className="text-lg font-medium mb-4">Edit Annotation</h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Label</Label>
                      <select
                        className="mt-1 w-full p-2 border border-gray-300 rounded"
                        value={editingAnnotation.label}
                        onChange={(e) =>
                          saveEdit(
                            e.target.value,
                            editingAnnotation.transcription,
                          )
                        }
                      >
                        {labels.map((label) => (
                          <option key={label} value={label}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Transcription
                      </Label>
                      <Textarea
                        value={editingAnnotation.transcription}
                        onChange={(e) =>
                          saveEdit(editingAnnotation.label, e.target.value)
                        }
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setEditingAnnotation(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
