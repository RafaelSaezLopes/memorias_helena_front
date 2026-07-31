import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import {
  Alert, Button, Card, Col, DatePicker, Form, Input, Modal, Popconfirm, Row, Select,
  Space, Switch, Table, Tag, TimePicker, Tooltip, message,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { medicationsService, type MedicationApi, type MedicationInput } from '../../services/medicationsService';
import { professionalsService, type ProfessionalApi } from '../../services/professionalsService';

function cleanText(value?: string | null) {
  const text = value?.trim();
  return text ? text : null;
}

function formatDate(value?: string | null) {
  return value ? dayjs(value).format('DD/MM/YYYY') : '—';
}

function formatTime(value?: string | null) {
  if (!value) return '—';
  return value.substring(0, 5);
}

export default function MedicationsPage() {
  const { child } = useAuth();
  const [items, setItems] = useState<MedicationApi[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MedicationApi | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    if (!child?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [medications, professionalItems] = await Promise.all([
        medicationsService.list(child.id),
        professionalsService.list(child.id),
      ]);
      setItems(medications);
      setProfessionals(professionalItems);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Não foi possível carregar os medicamentos.');
    } finally {
      setLoading(false);
    }
  }, [child?.id]);

  useEffect(() => { void load(); }, [load]);

  const professionalOptions = useMemo(
    () => professionals.map((item) => ({ label: item.name, value: item.id })),
    [professionals],
  );

  const start = (item?: MedicationApi) => {
    const medication = item ?? null;
    setEditing(medication);
    form.resetFields();
    if (medication) {
      form.setFieldsValue({
        name: medication.name,
        activeIngredient: medication.activeIngredient,
        dosage: medication.dosage,
        doseAmount: medication.doseAmount,
        frequency: medication.frequency,
        professionalId: medication.professionalId,
        startDate: dayjs(medication.startDate),
        startTime: medication.startTime ? dayjs(medication.startTime, 'HH:mm:ss') : null,
        endDate: medication.endDate ? dayjs(medication.endDate) : null,
        reason: medication.reason,
        notes: medication.notes,
        inUse: medication.inUse,
      });
    } else {
      form.setFieldsValue({ startDate: dayjs(), startTime: dayjs(), inUse: true });
    }
    setOpen(true);
  };

  const save = async () => {
    if (!child?.id) return;
    const values = await form.validateFields();
    const startTime = values.startTime as Dayjs | null | undefined;
    const input: MedicationInput = {
      childId: child.id,
      professionalId: values.professionalId ?? null,
      name: values.name.trim(),
      activeIngredient: cleanText(values.activeIngredient),
      dosage: cleanText(values.dosage),
      doseAmount: cleanText(values.doseAmount),
      frequency: cleanText(values.frequency),
      startDate: values.startDate.format('YYYY-MM-DD'),
      startTime: startTime ? startTime.format('HH:mm:ss') : null,
      endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : null,
      reason: cleanText(values.reason),
      notes: cleanText(values.notes),
      inUse: values.inUse ?? true,
    };

    setSaving(true);
    try {
      if (editing) {
        await medicationsService.update(editing.id, input);
        message.success('Medicamento atualizado no banco de dados.');
      } else {
        await medicationsService.create(input);
        message.success('Medicamento cadastrado no banco de dados.');
      }
      setOpen(false);
      setEditing(null);
      form.resetFields();
      await load();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? err?.message ?? 'Não foi possível salvar o medicamento.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await medicationsService.remove(id);
      message.success('Medicamento excluído.');
      await load();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? err?.message ?? 'Não foi possível excluir o medicamento.');
    }
  };

  return (
    <>
      <PageHeader
        title="Medicamentos"
        subtitle="Histórico de medicamentos e tratamentos prescritos."
        action={() => start()}
        actionLabel="Novo medicamento"
      />

      {error && (
        <Alert type="error" showIcon message={error}
          action={<Button onClick={() => void load()}>Tentar novamente</Button>}
          style={{ marginBottom: 16 }} />
      )}

      <Card>
        <Table rowKey="id" loading={loading} dataSource={items}
          locale={{ emptyText: 'Nenhum medicamento cadastrado.' }}
          columns={[
            { title: 'Medicamento', dataIndex: 'name' },
            { title: 'Dosagem', dataIndex: 'dosage', render: (v) => v || '—' },
            { title: 'Frequência', dataIndex: 'frequency', render: (v) => v || '—' },
            { title: 'Início', render: (_, r) => `${formatDate(r.startDate)} às ${formatTime(r.startTime)}` },
            { title: 'Término', dataIndex: 'endDate', render: (v) => v ? formatDate(v) : 'Atual' },
            { title: 'Médico', render: (_, r) => r.professional?.name ?? '—' },
            { title: 'Situação', dataIndex: 'inUse', render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'EM USO' : 'FINALIZADO'}</Tag> },
            {
              title: 'Ações', width: 120, render: (_, r) => (
                <Space>
                  <Tooltip title="Editar"><Button icon={<EditOutlined />} onClick={() => start(r)} /></Tooltip>
                  <Popconfirm title="Excluir medicamento?" description="Esta ação não pode ser desfeita." onConfirm={() => void remove(r.id)} okText="Excluir" cancelText="Cancelar">
                    <Tooltip title="Excluir"><Button danger icon={<DeleteOutlined />} /></Tooltip>
                  </Popconfirm>
                </Space>
              ),
            },
          ]} scroll={{ x: 1100 }} />
      </Card>

      <Modal title={editing ? 'Editar medicamento' : 'Cadastrar medicamento'} open={open}
        onCancel={() => { setOpen(false); setEditing(null); form.resetFields(); }}
        onOk={() => void save()} okText="Salvar" cancelText="Cancelar" confirmLoading={saving} width={760} destroyOnHidden>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={12}><Form.Item label="Nome do medicamento" name="name" rules={[{ required: true, message: 'Informe o medicamento.' }]}><Input /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Princípio ativo" name="activeIngredient"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}><Form.Item label="Dosagem prescrita" name="dosage"><Input placeholder="Ex.: 500 mg" /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Quantidade por dose" name="doseAmount"><Input placeholder="Ex.: 5 ml ou 1 comprimido" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}><Form.Item label="Frequência" name="frequency"><Input placeholder="Ex.: a cada 8 horas" /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Profissional que prescreveu" name="professionalId"><Select allowClear showSearch optionFilterProp="label" options={professionalOptions} placeholder="Selecione" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={8}><Form.Item label="Data de início" name="startDate" rules={[{ required: true, message: 'Informe a data de início.' }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item label="Horário em que começou" name="startTime" rules={[{ required: true, message: 'Informe o horário de início.' }]}><TimePicker format="HH:mm" minuteStep={5} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item label="Data de término" name="endDate"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item label="Motivo do uso" name="reason"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item label="Observações" name="notes"><Input.TextArea rows={3} placeholder="Orientações, reações, horários das próximas doses ou outras informações." /></Form.Item>
          <Form.Item label="Medicamento em uso" name="inUse" valuePropName="checked"><Switch checkedChildren="Sim" unCheckedChildren="Não" /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
