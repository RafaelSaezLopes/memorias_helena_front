import { DeleteOutlined, EditOutlined, FileTextOutlined, MedicineBoxOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Col, DatePicker, Empty, Form, Input, Modal, Popconfirm, Radio, Row, Select, Space, Spin, Tag, TimePicker, Timeline, Typography, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { VoiceTranscriptionRecorder } from '../../components/VoiceTranscriptionRecorder';
import { useAuth } from '../../contexts/AuthContext';
import { dailyNotesService, type DailyNoteApi } from '../../services/dailyNotesService';
import { professionalsService, type ProfessionalApi, type SpecialtyApi } from '../../services/professionalsService';

type FormValues = {
  type: 'DIA' | 'CONSULTA';
  date: Dayjs;
  time: Dayjs;
  title: string;
  content: string;
  mood?: string;
  professionalId?: string;
  specialtyId?: string;
  tags?: string[];
};

const moodLabel: Record<string, string> = { MUITO_BEM: 'Muito bem', BEM: 'Bem', NORMAL: 'Normal', IRRITADA: 'Irritada', CANSADA: 'Cansada', MAL: 'Mal' };
const moodColor: Record<string, string> = { MUITO_BEM: 'green', BEM: 'cyan', NORMAL: 'blue', IRRITADA: 'orange', CANSADA: 'gold', MAL: 'red' };
const splitTags = (tags?: string | null) => (tags || '').split(',').map((x) => x.trim()).filter(Boolean);

export default function DailyNotesPage() {
  const { child } = useAuth();
  const [notes, setNotes] = useState<DailyNoteApi[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalApi[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DailyNoteApi | null>(null);
  const [filter, setFilter] = useState<'TODOS' | 'DIA' | 'CONSULTA'>('TODOS');
  const [month, setMonth] = useState(dayjs());
  const [form] = Form.useForm<FormValues>();
  const noteType = Form.useWatch('type', form);
  const selectedProfessionalId = Form.useWatch('professionalId', form);

  const load = async () => {
    if (!child?.id) return;
    setLoading(true); setError(null);
    try {
      const from = month.startOf('month').toISOString();
      const to = month.endOf('month').toISOString();
      const [notesData, professionalsData, specialtiesData] = await Promise.all([
        dailyNotesService.list(child.id, from, to),
        professionalsService.list(child.id),
        professionalsService.listSpecialties(),
      ]);
      setNotes(notesData);
      setProfessionals(professionalsData);
      setSpecialties(specialtiesData);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Não foi possível carregar as anotações.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [child?.id, month.format('YYYY-MM')]);

  useEffect(() => {
    if (!selectedProfessionalId) return;
    const professional = professionals.find((x) => x.id === selectedProfessionalId);
    if (professional?.specialtyId) form.setFieldValue('specialtyId', professional.specialtyId);
  }, [selectedProfessionalId, professionals, form]);

  const filtered = useMemo(() => notes
    .filter((note) => filter === 'TODOS' || (filter === 'DIA' ? note.type === 'Daily' : note.type === 'Appointment'))
    .sort((a, b) => dayjs(b.occurredAt).valueOf() - dayjs(a.occurredAt).valueOf()), [notes, filter]);

  const showCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ date: dayjs(), time: dayjs(), type: 'DIA', mood: 'NORMAL', tags: [] });
    setOpen(true);
  };

  const showEdit = (note: DailyNoteApi) => {
    setEditing(note);
    const occurred = dayjs(note.occurredAt);
    form.setFieldsValue({
      type: note.type === 'Appointment' ? 'CONSULTA' : 'DIA', date: occurred, time: occurred,
      title: note.title, content: note.content, mood: note.mood || undefined,
      professionalId: note.professionalId || undefined, specialtyId: note.specialtyId || undefined,
      tags: splitTags(note.tags),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!child?.id) return;
    const values = await form.validateFields();
    setSaving(true);
    try {
      const occurredAt = values.date.hour(values.time.hour()).minute(values.time.minute()).second(0).millisecond(0).toISOString();
      const input = {
        childId: child.id,
        type: values.type === 'CONSULTA' ? 'Appointment' as const : 'Daily' as const,
        occurredAt, title: values.title.trim(), content: values.content.trim(),
        mood: values.type === 'DIA' ? values.mood || null : null,
        professionalId: values.type === 'CONSULTA' ? values.professionalId || null : null,
        specialtyId: values.type === 'CONSULTA' ? values.specialtyId || null : null,
        tags: values.tags?.map((x) => x.trim().replace(/^#/, '')).filter(Boolean).join(',') || null,
      };
      if (editing) await dailyNotesService.update(editing.id, input);
      else await dailyNotesService.create(input);
      message.success(editing ? 'Anotação atualizada no banco' : 'Anotação salva no banco');
      setOpen(false); form.resetFields(); await load();
    } catch (err: any) {
      if (!err?.errorFields) message.error(err?.response?.data?.message || 'Não foi possível salvar a anotação.');
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    try { await dailyNotesService.remove(id); message.success('Anotação excluída'); await load(); }
    catch (err: any) { message.error(err?.response?.data?.message || 'Não foi possível excluir.'); }
  };

  return <>
    <PageHeader title="Diário e anotações" subtitle="Registre acontecimentos do dia, sintomas, comportamentos e comentários sobre consultas." action={showCreate} actionLabel="Nova anotação" />
    {error && <Alert type="error" showIcon message={error} action={<Button onClick={() => void load()}>Tentar novamente</Button>} style={{ marginBottom: 16 }} />}
    <Card className="filter-card"><Row gutter={[12, 12]} align="middle"><Col flex="auto"><Radio.Group value={filter} onChange={(event) => setFilter(event.target.value)} optionType="button" buttonStyle="solid"><Radio.Button value="TODOS">Todos</Radio.Button><Radio.Button value="DIA">Dia a dia</Radio.Button><Radio.Button value="CONSULTA">Consultas</Radio.Button></Radio.Group></Col><Col><DatePicker picker="month" value={month} onChange={(value) => value && setMonth(value)} format="MMMM [de] YYYY" allowClear={false} /></Col><Col><Button type="primary" icon={<PlusOutlined />} onClick={showCreate}>Adicionar</Button></Col></Row></Card>
    <Card className="daily-timeline-card">
      <Spin spinning={loading}>
      {filtered.length ? <Timeline items={filtered.map((note) => {
        const tags = splitTags(note.tags); const occurred = dayjs(note.occurredAt);
        return { color: note.type === 'Appointment' ? 'purple' : 'blue', dot: note.type === 'Appointment' ? <MedicineBoxOutlined /> : <FileTextOutlined />, children: <div className="diary-entry">
          <div className="diary-entry-header"><div><Space wrap><Typography.Title level={4}>{note.title}</Typography.Title><Tag color={note.type === 'Appointment' ? 'purple' : 'blue'}>{note.type === 'Appointment' ? 'CONSULTA' : 'DIA A DIA'}</Tag>{note.mood && <Tag color={moodColor[note.mood]}>{moodLabel[note.mood] || note.mood}</Tag>}</Space><Typography.Text type="secondary">{occurred.format('DD/MM/YYYY')} às {occurred.format('HH:mm')}</Typography.Text></div><Space><Button size="small" icon={<EditOutlined />} onClick={() => showEdit(note)}>Editar</Button><Popconfirm title="Excluir esta anotação?" onConfirm={() => void remove(note.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm></Space></div>
          {note.type === 'Appointment' && (note.professional || note.specialty) && <div className="consultation-meta"><strong>{note.professional?.name || 'Profissional não informado'}</strong>{note.specialty?.name && <span>{note.specialty.name}</span>}</div>}
          <Typography.Paragraph className="diary-content">{note.content}</Typography.Paragraph>
          {!!tags.length && <Space wrap>{tags.map((tag) => <Tag key={tag}>#{tag}</Tag>)}</Space>}
        </div> };
      })} /> : !loading && <Empty description="Nenhuma anotação encontrada neste período" />}
      </Spin>
    </Card>
    <Modal title={editing ? 'Editar anotação' : 'Nova anotação'} open={open} onCancel={() => setOpen(false)} onOk={() => void save()} okText="Salvar" confirmLoading={saving} width={720} destroyOnHidden>
      <Form form={form} layout="vertical">
        <Form.Item label="Tipo de anotação" name="type" rules={[{ required: true }]}><Radio.Group optionType="button" buttonStyle="solid"><Radio.Button value="DIA">Comentário do dia</Radio.Button><Radio.Button value="CONSULTA">Comentário de consulta</Radio.Button></Radio.Group></Form.Item>
        <Row gutter={16}><Col xs={24} sm={12}><Form.Item label="Data" name="date" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col><Col xs={24} sm={12}><Form.Item label="Horário" name="time" rules={[{ required: true }]}><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col></Row>
        <Form.Item label="Título" name="title" rules={[{ required: true, message: 'Informe um título' }]}><Input placeholder={noteType === 'CONSULTA' ? 'Ex.: Retorno com a pediatra' : 'Ex.: Dia tranquilo na escola'} maxLength={200} /></Form.Item>
        {noteType === 'DIA' && <Form.Item label="Como ela estava?" name="mood"><Select options={Object.entries(moodLabel).map(([value, label]) => ({ value, label }))} /></Form.Item>}
        {noteType === 'CONSULTA' && <Row gutter={16}><Col xs={24} sm={12}><Form.Item label="Profissional" name="professionalId"><Select allowClear showSearch optionFilterProp="label" placeholder="Selecione o profissional" options={professionals.map((p) => ({ value: p.id, label: p.name }))} /></Form.Item></Col><Col xs={24} sm={12}><Form.Item label="Especialidade" name="specialtyId"><Select allowClear showSearch optionFilterProp="label" placeholder="Selecione a especialidade" options={specialties.map((s) => ({ value: s.id, label: s.name }))} /></Form.Item></Col></Row>}
        <VoiceTranscriptionRecorder
          childId={child!.id}
          consultationMode={noteType === 'CONSULTA'}
          initialText={form.getFieldValue('content') || ''}
          onApply={({ transcript, summary }) => {
            const current = (form.getFieldValue('content') || '').trim();
            const voiceText = noteType === 'CONSULTA'
              ? `TRANSCRIÇÃO DA CONSULTA:
${transcript}${summary ? `

RESUMO DA CONSULTA:
${summary}` : ''}`
              : transcript;
            form.setFieldValue('content', current ? `${current}

${voiceText}` : voiceText);
          }}
        />
        <Form.Item label={noteType === 'CONSULTA' ? 'Comentários, transcrição e resumo da consulta' : 'Comentário do dia'} name="content" rules={[{ required: true, message: 'Escreva a anotação ou use o gravador de voz' }]}><Input.TextArea rows={10} maxLength={15000} showCount placeholder="Descreva o que aconteceu, sintomas, comportamento, orientações, dúvidas ou próximos passos..." /></Form.Item>
        <Form.Item label="Marcadores" name="tags"><Select mode="tags" tokenSeparators={[',']} placeholder="Ex.: escola, sono, dor, consulta" /></Form.Item>
      </Form>
    </Modal>
  </>;
}
