import {
  AudioOutlined,
  DeleteOutlined,
  FileTextOutlined,
  StopOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Input, Space, Tag, Typography, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { audioTranscriptionService } from '../services/audioTranscriptionService';

type Props = {
  childId: string;
  consultationMode: boolean;
  initialText?: string;
  onApply: (value: { transcript: string; summary?: string }) => void;
};

const MAX_AUDIO_SIZE_MB = 25;
const AUDIO_EXTENSION_PATTERN = /\.(mp3|mp4|mpeg|mpga|wav|m4a|ogg|oga|webm|flac)$/i;

const extensionFromMime = (mime: string) => {
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mp4')) return 'm4a';
  return 'webm';
};

export function VoiceTranscriptionRecorder({
  childId,
  consultationMode,
  initialText = '',
  onApply,
}: Props) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState(initialText);
  const [summary, setSummary] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recordingSupported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined';

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const replaceAudio = (file: File) => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setTranscript('');
    setSummary('');
    setWarning(null);
    setError(null);
  };

  const start = async () => {
    if (!recordingSupported || recording) return;
    setStarting(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const preferredMime = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
      ].find((mime) => MediaRecorder.isTypeSupported(mime));

      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (!chunksRef.current.length) return;

        const mime = recorder.mimeType || preferredMime || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mime });
        const extension = extensionFromMime(mime);
        const file = new File(
          [blob],
          `gravacao-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`,
          { type: mime },
        );
        replaceAudio(file);
        message.success('Gravação finalizada. Clique em “Transcrever com Whisper”.');
      };

      recorder.start(1000);
      setRecording(true);
      message.info('Gravação iniciada. Fale próximo ao microfone.');
    } catch (err: any) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setError(err?.message || 'Não foi possível acessar o microfone.');
    } finally {
      setStarting(false);
    }
  };

  const stop = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    setRecording(false);
  };

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    const isAudio = file.type.startsWith('audio/') || AUDIO_EXTENSION_PATTERN.test(file.name);
    if (!isAudio) {
      message.error('Selecione um arquivo de áudio válido.');
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_AUDIO_SIZE_MB * 1024 * 1024) {
      message.error(`O áudio deve ter no máximo ${MAX_AUDIO_SIZE_MB} MB.`);
      return Upload.LIST_IGNORE;
    }

    replaceAudio(file as File);
    message.success('Áudio carregado. Clique em “Transcrever com Whisper”.');
    return false;
  };

  const transcribe = async () => {
    if (!audioFile) {
      message.warning('Grave ou selecione um arquivo de áudio primeiro.');
      return;
    }

    setProcessing(true);
    setError(null);
    setWarning(null);
    try {
      const result = await audioTranscriptionService.transcribe({
        childId,
        file: audioFile,
        consultationMode,
      });
      setTranscript(result.transcript || '');
      setSummary(result.summary || '');
      setWarning(result.warning || null);
      message.success(
        consultationMode
          ? 'Consulta transcrita e resumida.'
          : 'Áudio transcrito com sucesso.',
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Não foi possível transcrever o áudio.',
      );
    } finally {
      setProcessing(false);
    }
  };

  const apply = () => {
    const text = transcript.trim();
    if (!text) {
      message.warning('Transcreva o áudio ou informe o texto antes de aplicar.');
      return;
    }
    onApply({ transcript: text, summary: consultationMode ? summary.trim() || undefined : undefined });
    message.success(
      consultationMode
        ? 'Transcrição e resumo adicionados à consulta.'
        : 'Transcrição adicionada à anotação.',
    );
  };

  const clear = () => {
    if (recording) stop();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(null);
    setAudioUrl(null);
    setTranscript('');
    setSummary('');
    setWarning(null);
    setError(null);
  };

  return (
    <Card
      size="small"
      className="voice-recorder-card"
      title={
        <Space>
          <AudioOutlined />
          <span>{consultationMode ? 'Gravar ou enviar áudio da consulta' : 'Gravar ou enviar áudio'}</span>
          {recording && <Tag color="red">GRAVANDO</Tag>}
        </Space>
      }
    >
      {!recordingSupported && (
        <Alert
          type="warning"
          showIcon
          message="A gravação não está disponível neste navegador."
          description="Você ainda pode selecionar um arquivo MP3, WAV, M4A, OGG ou WEBM para transcrição."
          style={{ marginBottom: 12 }}
        />
      )}
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
      {warning && <Alert type="warning" showIcon message={warning} style={{ marginBottom: 12 }} />}

      <Space wrap style={{ marginBottom: 12 }}>
        {!recording ? (
          <Button
            type="primary"
            icon={<AudioOutlined />}
            loading={starting}
            disabled={!recordingSupported || processing}
            onClick={() => void start()}
          >
            Iniciar gravação
          </Button>
        ) : (
          <Button danger icon={<StopOutlined />} onClick={stop}>
            Parar gravação
          </Button>
        )}

        <Upload
          accept="audio/*,.mp3,.mp4,.mpeg,.mpga,.wav,.m4a,.ogg,.oga,.webm,.flac"
          showUploadList={false}
          beforeUpload={beforeUpload}
          disabled={recording || processing}
        >
          <Button icon={<UploadOutlined />} disabled={recording || processing}>
            Enviar áudio
          </Button>
        </Upload>

        <Button
          icon={<FileTextOutlined />}
          loading={processing}
          disabled={!audioFile || recording}
          onClick={() => void transcribe()}
        >
          Transcrever com Whisper
        </Button>

        <Button
          type="primary"
          ghost
          icon={<FileTextOutlined />}
          disabled={!transcript || processing}
          onClick={apply}
        >
          {consultationMode ? 'Aplicar transcrição e resumo' : 'Aplicar transcrição'}
        </Button>

        <Button
          icon={<DeleteOutlined />}
          disabled={!audioFile && !transcript && !recording}
          onClick={clear}
        >
          Limpar
        </Button>
      </Space>

      {audioUrl && (
        <div className="voice-audio-preview">
          <Typography.Text type="secondary">
            Áudio selecionado: {audioFile?.name}
          </Typography.Text>
          <audio controls src={audioUrl} preload="metadata" />
        </div>
      )}

      {(transcript || processing) && (
        <div className="voice-transcript-preview">
          <Typography.Text strong>Transcrição</Typography.Text>
          <Input.TextArea
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            rows={7}
            maxLength={30000}
            showCount
            disabled={processing}
            placeholder="A transcrição produzida pelo Whisper aparecerá aqui."
          />
        </div>
      )}

      {consultationMode && summary && (
        <div className="voice-transcript-preview" style={{ marginTop: 12 }}>
          <Typography.Text strong>Resumo da consulta</Typography.Text>
          <Input.TextArea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={9}
            maxLength={15000}
            showCount
            disabled={processing}
          />
        </div>
      )}

      <Typography.Paragraph type="secondary" className="voice-recorder-help">
        {consultationMode
          ? 'O áudio é enviado ao backend para transcrição pelo Whisper. O resumo organiza somente informações mencionadas na consulta. Revise nomes, doses, datas, diagnósticos e orientações antes de salvar.'
          : 'O áudio é enviado ao backend para transcrição pelo Whisper. Revise o texto antes de salvar a anotação.'}
      </Typography.Paragraph>
    </Card>
  );
}
