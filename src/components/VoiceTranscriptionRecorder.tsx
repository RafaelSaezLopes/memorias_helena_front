import {
  AudioOutlined,
  DeleteOutlined,
  FileTextOutlined,
  StopOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Input, Space, Tag, Typography, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionErrorEventLike = Event & {
  error: string;
  message?: string;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type Props = {
  consultationMode: boolean;
  initialText?: string;
  onApply: (value: { transcript: string; summary?: string }) => void;
};

const normalizeText = (value: string) => value
  .replace(/\s+/g, ' ')
  .replace(/\s+([,.!?;:])/g, '$1')
  .trim();

const splitSentences = (text: string) => normalizeText(text)
  .split(/(?<=[.!?])\s+|\n+/)
  .map((sentence) => sentence.trim())
  .filter((sentence) => sentence.length > 8);

const includesAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

/**
 * Resumo local e determinístico. Não inventa informações: apenas reorganiza
 * frases que realmente aparecem na transcrição.
 */
export const buildConsultationSummary = (transcript: string) => {
  const sentences = splitSentences(transcript);
  if (!sentences.length) return '';

  const groups: Array<{ title: string; terms: string[]; lines: string[] }> = [
    { title: 'Motivo e sintomas', terms: ['sintom', 'dor', 'febre', 'queixa', 'motivo', 'urin', 'xixi', 'infecção', 'perda', 'urgência'], lines: [] },
    { title: 'Avaliação do profissional', terms: ['diagnóst', 'avalia', 'resultado', 'observou', 'explicou', 'considerou', 'hipótese'], lines: [] },
    { title: 'Medicamentos e cuidados', terms: ['remédio', 'medicamento', 'dose', 'dosagem', 'ml', 'comprimido', 'tomar', 'aplicar', 'tratamento', 'cuidado'], lines: [] },
    { title: 'Exames e procedimentos', terms: ['exame', 'ultrassom', 'cintilografia', 'urina', 'sangue', 'procedimento', 'cirurgia', 'coleta'], lines: [] },
    { title: 'Retorno e próximos passos', terms: ['retorno', 'voltar', 'agendar', 'acompanhar', 'próximo', 'orientou', 'recomendou', 'encaminhou'], lines: [] },
  ];

  const unclassified: string[] = [];
  sentences.forEach((sentence) => {
    const lower = sentence.toLocaleLowerCase('pt-BR');
    const group = groups.find((item) => includesAny(lower, item.terms));
    if (group) group.lines.push(sentence);
    else unclassified.push(sentence);
  });

  const populated = groups.filter((group) => group.lines.length > 0);
  const result: string[] = [];

  populated.forEach((group) => {
    result.push(`${group.title}:`);
    group.lines.slice(0, 4).forEach((line) => result.push(`• ${line}`));
    result.push('');
  });

  if (unclassified.length) {
    result.push('Outros pontos mencionados:');
    unclassified.slice(0, 4).forEach((line) => result.push(`• ${line}`));
  }

  return result.join('\n').trim();
};

export function VoiceTranscriptionRecorder({ consultationMode, initialText = '', onApply }: Props) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const finalTextRef = useRef('');
  const shouldRestartRef = useRef(false);

  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [transcript, setTranscript] = useState(initialText);
  const [interimText, setInterimText] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const SpeechRecognitionApi = useMemo(
    () => window.SpeechRecognition || window.webkitSpeechRecognition,
    [],
  );
  const recordingSupported = Boolean(SpeechRecognitionApi && navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      recognitionRef.current?.abort();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const stopResources = () => {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRecording(false);
    setInterimText('');
  };

  const createRecognition = () => {
    if (!SpeechRecognitionApi) return null;
    const recognition = new SpeechRecognitionApi();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalPart = '';
      let interimPart = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const spoken = result[0]?.transcript || '';
        if (result.isFinal) finalPart += `${spoken} `;
        else interimPart += spoken;
      }
      if (finalPart) {
        finalTextRef.current = normalizeText(`${finalTextRef.current} ${finalPart}`);
        setTranscript(finalTextRef.current);
      }
      setInterimText(interimPart.trim());
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return;
      if (event.error === 'aborted') return;
      const messages: Record<string, string> = {
        'not-allowed': 'Permissão do microfone negada. Libere o microfone nas configurações do navegador.',
        'audio-capture': 'Não foi possível acessar o microfone.',
        network: 'A transcrição do navegador perdeu a conexão. Tente novamente.',
      };
      setError(messages[event.error] || event.message || `Erro na transcrição: ${event.error}`);
    };

    recognition.onend = () => {
      if (!shouldRestartRef.current) return;
      try { recognition.start(); } catch { /* o navegador ainda pode estar finalizando a sessão anterior */ }
    };

    return recognition;
  };

  const start = async () => {
    if (!recordingSupported || recording) return;
    setStarting(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      finalTextRef.current = normalizeText(transcript || initialText);

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        if (!chunksRef.current.length) return;
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        setAudioFileName(`gravacao-${new Date().toISOString().replace(/[:.]/g, '-')}.${(recorder.mimeType || 'audio/webm').includes('ogg') ? 'ogg' : 'webm'}`);
      };
      recorder.start(1000);

      const recognition = createRecognition();
      if (!recognition) throw new Error('Reconhecimento de voz indisponível.');
      recognitionRef.current = recognition;
      shouldRestartRef.current = true;
      recognition.start();
      setRecording(true);
      message.info('Gravação iniciada. Fale próximo ao microfone.');
    } catch (err: any) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setError(err?.message || 'Não foi possível iniciar o gravador.');
    } finally {
      setStarting(false);
    }
  };

  const stop = () => {
    stopResources();
    message.success('Gravação finalizada. Revise a transcrição antes de aplicar.');
  };

  const clear = () => {
    stopResources();
    finalTextRef.current = '';
    setTranscript('');
    setInterimText('');
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioFileName(null);
    setError(null);
  };


  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|oga|webm|flac)$/i.test(file.name);
    if (!isAudio) {
      message.error('Selecione um arquivo de áudio válido.');
      return Upload.LIST_IGNORE;
    }

    const maxSizeMb = 25;
    if (file.size > maxSizeMb * 1024 * 1024) {
      message.error(`O áudio deve ter no máximo ${maxSizeMb} MB.`);
      return Upload.LIST_IGNORE;
    }

    stopResources();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(file));
    setAudioFileName(file.name);
    setError(null);
    message.success('Arquivo de áudio carregado. Ouça e revise a transcrição antes de aplicar.');
    return false;
  };

  const apply = () => {
    const text = normalizeText(`${transcript} ${interimText}`);
    if (!text) {
      message.warning('Ainda não há texto transcrito.');
      return;
    }
    onApply({
      transcript: text,
      summary: consultationMode ? buildConsultationSummary(text) : undefined,
    });
    message.success(consultationMode ? 'Transcrição e resumo adicionados à consulta' : 'Transcrição adicionada à anotação');
  };

  return (
    <Card size="small" className="voice-recorder-card" title={
      <Space>
        <AudioOutlined />
        <span>{consultationMode ? 'Gravar e transcrever consulta' : 'Ditado por voz'}</span>
        {recording && <Tag color="red">GRAVANDO</Tag>}
      </Space>
    }>
      {!recordingSupported && (
        <Alert
          type="warning"
          showIcon
          message="A gravação com transcrição em tempo real não está disponível neste navegador."
          description="Você ainda pode enviar um arquivo de áudio, ouvi-lo e preencher ou revisar a transcrição manualmente. Para ditado automático, use Chrome ou Edge por HTTPS."
          style={{ marginBottom: 12 }}
        />
      )}
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}

      <Space wrap style={{ marginBottom: 12 }}>
        {!recording ? (
          <Button type="primary" icon={<AudioOutlined />} loading={starting} disabled={!recordingSupported} onClick={() => void start()}>
            {transcript ? 'Continuar gravação' : 'Iniciar gravação'}
          </Button>
        ) : (
          <Button danger icon={<StopOutlined />} onClick={stop}>Parar gravação</Button>
        )}
        <Upload
          accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.webm,.flac"
          showUploadList={false}
          beforeUpload={beforeUpload}
          disabled={recording}
        >
          <Button icon={<UploadOutlined />} disabled={recording}>Enviar áudio</Button>
        </Upload>
        <Button icon={<FileTextOutlined />} disabled={!transcript && !interimText} onClick={apply}>
          {consultationMode ? 'Aplicar transcrição e resumo' : 'Aplicar transcrição'}
        </Button>
        <Button icon={<DeleteOutlined />} disabled={!transcript && !audioUrl && !recording} onClick={clear}>Limpar</Button>
      </Space>

      {(transcript || interimText || audioUrl) && (
        <div className="voice-transcript-preview">
          <Typography.Text strong>Transcrição</Typography.Text>
          <Input.TextArea
            value={normalizeText(`${transcript} ${interimText}`)}
            onChange={(event) => {
              finalTextRef.current = event.target.value;
              setTranscript(event.target.value);
              setInterimText('');
            }}
            rows={6}
            maxLength={15000}
            showCount
            placeholder={audioUrl
              ? 'Ouça o arquivo e revise ou digite aqui a transcrição. A transcrição automática de arquivos enviados exige um serviço de reconhecimento no backend.'
              : 'A transcrição aparecerá aqui durante a gravação.'}
          />
        </div>
      )}

      {audioUrl && (
        <div className="voice-audio-preview">
          <Typography.Text type="secondary">Áudio selecionado{audioFileName ? `: ${audioFileName}` : ''}</Typography.Text>
          <audio controls src={audioUrl} preload="metadata" />
        </div>
      )}

      <Typography.Paragraph type="secondary" className="voice-recorder-help">
        {consultationMode
          ? 'Ao aplicar, o texto completo e um resumo organizado serão colocados no campo da consulta. Arquivos enviados podem ser ouvidos aqui; revise ou digite a transcrição antes de aplicar. Nomes, medicamentos, doses e datas devem ser conferidos.'
          : 'Ao aplicar, a fala será inserida no campo de comentário. Revise o texto antes de salvar.'}
      </Typography.Paragraph>
    </Card>
  );
}
